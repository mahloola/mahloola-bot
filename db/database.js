// const { initializeApp } = require('firebase-admin/app');
// const { sleep } = require('../util/sleep');
const admin = require("firebase-admin");
const { sleep } = require('../util/sleep');
let db;

const { firestoreKey } = require('../auth.json');

// connect to firestore
function initializeDatabase() {
  admin.initializeApp({
    credential: admin.credential.cert(firestoreKey),
  });
  db = admin.firestore();
  console.log("Database initialized!");
}

// set document in player database (osu apiv2)
async function setPlayer(player) {
  if (player) {
    const docRef = db.collection("players").doc(player.id.toString());
    await docRef.set(
      { apiv2: player, dateUpdated: new Date() },
      { merge: true }
    );
  } else {
    console.log(`Failed to set player ${player.id}`);
  }
}

// get document in player database (osu apiv2)
async function getPlayer(userId) {
  const playerDoc = await db.collection("players").doc(userId.toString()).get();
  return playerDoc.exists ? playerDoc.data() : null;
}

// the main function used for retrieving from roll
async function getPlayerByRank(rank) {
  let player;
  const playersRef = db.collection("players");
  const snapshot = await playersRef
    .where("apiv2.statistics.global_rank", "==", rank)
    .get(); // doc(userId.toString())

  // if there's two users with the same rank, get the latest added one
  let latestDate = new Date(0);
  snapshot.forEach((doc) => {
    player = doc.data();
    if (doc.data().dateUpdated > latestDate) {
      latestDate = doc.data().dateUpdated;
      player = doc.data();
    }
  });
  return player;
}

// DB UTILITY FUNCTIONS
async function getServers() {
  const serversCollection = await db.collection("servers");
  return serversCollection;
}
async function getServerUsers(serverId) {
  const serversCollection = await getServers();
  const serverDoc = await serversCollection.doc(serverId.toString());
  const usersCollection = await serverDoc.collection('users');
  return usersCollection;
}
async function getServerUser(serverId, userId) {
  const usersCollection = await getServerUsers(serverId);
  const userDoc = await usersCollection.doc(userId.toString()).get();
  return userDoc.exists ? userDoc.data() : null;
}
async function getUserRef(serverId, userId) {
  const serversRef = db.collection("servers");
  const serverRef = serversRef.doc(serverId.toString());
  const serverUsersRef = serverRef.collection("users");
  const userRef = serverUsersRef.doc(userId.toString());
  return userRef;
}
async function getServerUserIds(serverId) {
  let userIds = []
  const usersCollection = await getServerUsers(serverId);
  console.log(serverId);
  console.log(usersCollection);
  await usersCollection.onSnapshot(async querySnapshot => {
    await querySnapshot.forEach(doc => {
      userIds.push(doc.id);
    })
  });
  await sleep(1000);
  console.log(userIds);
  return userIds;
}

// this is when a user claims a card
async function setOwnedPlayer(serverId, userId, playerId) {
  const serversRef = db.collection("servers");
  const serverRef = serversRef.doc(serverId.toString());
  const serverUsersRef = serverRef.collection("users");
  const userRef = serverUsersRef.doc(userId.toString());

  // set the player to be considered owned across the whole server
  await serverRef.set(
    { ownedPlayers: admin.firestore.FieldValue.arrayUnion(playerId) },
    { merge: true }
  );

  await userRef.set(
    { ownedPlayers: admin.firestore.FieldValue.arrayUnion(playerId) },
    { merge: true }
  );
}

async function getOwnedPlayers(serverId, userId, perPage) {
  const userDoc = await getUserRef(serverId, userId);
  const user = await userDoc.get();
  return user.data() ? user.data().ownedPlayers : null;
}

// PINNING FUNCTIONS
async function setPinnedPlayer(serverId, userId, pinnedUserId) {
  const userRef = await getUserRef(serverId, userId);
  await userRef.set(
    { pinnedPlayers: admin.firestore.FieldValue.arrayUnion(pinnedUserId) },
    { merge: true }
  );
}
async function getPinnedPlayers(serverId, userId, perPage) {
  const userDoc = await getUserRef(serverId, userId);
  const user = await userDoc.get();
  return user.data() ? user.data().pinnedPlayers : null;
}
async function deletePinnedPlayer(serverId, userId, pinnedUserId) {
  const userRef = await getUserRef(serverId, userId);
  const userSnapshot = await userRef.get();
  const user = userSnapshot.data()

  const updatedOwnedUsers = user.pinnedPlayers.filter(id => id !== pinnedUserId)
  await userRef.update({ pinnedPlayers: updatedOwnedUsers }, { merge: true })
}

// this is when the claim cooldown ends for a particular user
async function setResetTime(serverId, userId) {
  const userRef = await getUserRef(serverId, userId);
  let date = new Date();
  date.setMinutes(date.getMinutes() + 30);
  await userRef.set(
    { 'resetTime': date.getTime() },
    { merge: true }
  );
}
async function getResetTime(serverId, userId) {
  const userRef = await getUserRef(serverId, userId);
  const user = await userRef.get();
  return user.data() ? user.data().resetTime : null;
}

// this is the number of current rolls available to the user
async function setRolls(serverId, userId, rolls) {
  const userRef = await getUserRef(serverId, userId);
  await userRef.set(
    { 'rolls': rolls },
    { merge: true }
  );
}
async function getRolls(serverId, userId) {
  const userRef = await getUserRef(serverId, userId);
  const user = await userRef.get();
  return user.data() ? user.data().rolls : null;
}

// gets Top-10-Average for a particular user, while getting owned player documents first (**1000 MS RUNTIME**)
async function updateUserElo(serverId, userId) {
  let user = await getServerUser(serverId, userId);
  // if user owns less than 10 players, they are unranked
  if (user.ownedPlayers == undefined || user.ownedPlayers.length < 10) {
    return null;
  }
  let playerIds = user.ownedPlayers;
  const ownedPlayerPromises = [];
  for (const id of playerIds) {
    ownedPlayerPromises.push(getPlayer(id));
  }
  const ownedPlayers = await Promise.all(ownedPlayerPromises);

  ownedPlayers.sort((a, b) => {
    return a.apiv2.statistics.global_rank - b.apiv2.statistics.global_rank;
  });
  let totalRanks = 0;
  for (let i = 0; i < 10; i++) {
    totalRanks += ownedPlayers[i].apiv2.statistics.global_rank;
  }
  const avgRanks = totalRanks / 10;
  // update elo in the db
  await db.collection("servers").doc(serverId).collection('users').doc(userId).set({ elo: avgRanks }, { merge: true });
  return avgRanks;
}

// gets Top-10-Average for a particular user, but doesn't need to get player documents first
async function updateUserEloByPlayers(serverId, userId, ownedPlayers) {
  ownedPlayers.sort((a, b) => {
    return a.apiv2.statistics.global_rank - b.apiv2.statistics.global_rank;
  });
  let totalRanks = 0;
  for (let i = 0; i < 10; i++) {
    totalRanks += ownedPlayers[i].apiv2.statistics.global_rank;
  }
  const avgRanks = totalRanks / 10;
  // update elo in the db
  await db.collection("servers").doc(serverId).collection('users').doc(userId).set({ elo: avgRanks }, { merge: true });
  return avgRanks;
}

// global statistics
async function setDatabaseStatistics(meta) {
  await db.collection("statistics").doc("global").set(meta);
}
async function getDatabaseStatistics() {
  const doc = await db.collection("statistics").doc("global").get();
  return doc.data();
}
async function updateStatistics() {
  let statistics = getDatabaseStatistics();
  // db.collection("servers")
  //   .get()
  //   .then((snap) => {
  //     metadata.servers = snap.size; // will return the collection size

  //     let totalUsers;
  //     db.collection("servers").forEach((doc) => {
  //       doc
  //         .collection("users")
  //         .get()
  //         .then((snap) => {
  //           const numUsers = snap.size; // will return the collection size
  //           console.log(numUsers);
  //           totalUsers += numUsers;
  //         });
  //     });
  //     console.log(totalUsers);
  //     metadata.users = totalUsers;
  //   });
  //   setDatabaseStatistics(metadata);
}

module.exports = {
  initializeDatabase,
  setPlayer,
  getPlayer,
  getPlayerByRank,
  setOwnedPlayer,
  getOwnedPlayers,
  setDatabaseStatistics,
  getDatabaseStatistics,
  updateStatistics,
  updateUserElo,
  updateUserEloByPlayers,
  setPinnedPlayer,
  getPinnedPlayers,
  deletePinnedPlayer,
  getServers,
  getServerUsers,
  getServerUser,
  getServerUserIds,
  getUserRef,
  setResetTime,
  getResetTime,
  setRolls,
  getRolls
};
