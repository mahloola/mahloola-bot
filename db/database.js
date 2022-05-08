// const { initializeApp } = require('firebase-admin/app');
// const { sleep } = require('../util/sleep');
const admin = require("firebase-admin");
const { sleep } = require('../util/sleep');
/**
 * @type {admin.firestore.Firestore}
 */
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
  const snapshot = await db
    .collection("players")
    .where("apiv2.statistics.global_rank", "==", rank)
    .get(); // doc(userId.toString())
  const players = snapshot.empty ? [] : snapshot.docs.map((doc) => doc.data())

  // if there's two users with the same rank, get the latest added one
  const sortedPlayers = players.sort((a, b) => b.dateUpdated - a.dateUpdated);
  const player = players.length > 0 ? sortedPlayers[0] : null;
  return player;
}

function getServerUsersRef(serverId) {
  return db
    .collection("servers")
    .doc(serverId.toString())
    .collection('users');
}
async function getServerUser(serverId, userId) {
  const serverUsersRef = getServerUsersRef(serverId);
  const userDoc = await serverUsersRef.doc(userId.toString()).get();
  return userDoc.exists ? userDoc.data() : null;
}
function getUserRef(serverId, userId) {
  const serverUsersRef = getServerUsersRef(serverId);
  const userRef = serverUsersRef.doc(userId.toString());
  return userRef;
}
async function getServerUserIds(serverId) {
  const serverUsersRef = getServerUsersRef(serverId)
  const serverUsersSnapshot = await serverUsersRef.get();
  const userIds = serverUsersSnapshot.docs.map(doc => doc.id);
  return userIds;
}

// this is when a user claims a card
async function setOwnedPlayer(serverId, userId, playerId) {
  const serverRef = db
    .collection("servers")
    .doc(serverId.toString());
  const userRef = getUserRef(serverId, userId);

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

async function getOwnedPlayers(serverId, userId) {
  const userDoc = getUserRef(serverId, userId);
  const user = await userDoc.get();
  return user.data() ? user.data().ownedPlayers : null;
}

// PINNING FUNCTIONS
async function setPinnedPlayer(serverId, userId, pinnedUserId) {
  const userRef = getUserRef(serverId, userId);
  await userRef.set(
    { pinnedPlayers: admin.firestore.FieldValue.arrayUnion(pinnedUserId) },
    { merge: true }
  );
}
async function getPinnedPlayers(serverId, userId, perPage) {
  const userDoc = getUserRef(serverId, userId);
  const user = await userDoc.get();
  return user.data() ? user.data().pinnedPlayers : null;
}
async function deletePinnedPlayer(serverId, userId, pinnedUserId) {
  const userRef = getUserRef(serverId, userId);
  const userSnapshot = await userRef.get();
  const user = userSnapshot.data()

  const updatedOwnedUsers = user.pinnedPlayers.filter(id => id !== pinnedUserId)
  await userRef.set({ pinnedPlayers: updatedOwnedUsers }, { merge: true })
}

// this is when the claim cooldown ends for a particular user
async function setResetTime(serverId, userId) {
  const userRef = getUserRef(serverId, userId);
  let date = new Date();
  date.setMinutes(date.getMinutes() + 60);
  await userRef.set(
    { resetTime: date.getTime() },
    { merge: true }
  );
}
async function getResetTime(serverId, userId) {
  const userRef = getUserRef(serverId, userId);
  const user = await userRef.get();
  return user.data() ? user.data().resetTime : null;
}

// this is the number of current rolls available to the user
async function setRolls(serverId, userId, rolls) {
  const userRef = getUserRef(serverId, userId);
  await userRef.set(
    { 'rolls': rolls },
    { merge: true }
  );
}
async function getRolls(serverId, userId) {
  const userRef = getUserRef(serverId, userId);
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
  if (ownedPlayers.length < 10) {
    return null;
  }
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
async function setDatabaseStatistics(stats) {
  await db.collection("statistics").doc("global").set(stats);
}
async function getDatabaseStatistics() {
  const doc = await db.collection("statistics").doc("global").get();
  return doc.data();
}
async function updateStatistics() {
  let statistics = await getDatabaseStatistics();

  // get total server count
  const serversSnapshot = await db.collection('servers').get();
  statistics.servers = serversSnapshot.size; // will return the collection size

  // get total user count
  const serverIds = serversSnapshot.docs.map(doc => doc.id);
  for (const serverId of serverIds) {
    const usersSnapshot = await db
      .collection("servers")
      .doc(serverId.toString())
      .collection("users")
      .get();
    statistics.users += usersSnapshot.size;
  }

  setDatabaseStatistics(statistics);
  return statistics;

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
  getServerUsersRef,
  getServerUser,
  getServerUserIds,
  getUserRef,
  setResetTime,
  getResetTime,
  setRolls,
  getRolls
};
