
const admin = require("firebase-admin");
let db;
const { firestoreKey } = require('../auth.json');

// connect to firestore
function initializeDatabase() {
  admin.initializeApp({
    credential: admin.credential.cert(firestoreKey),
  });
  db = admin.firestore();
  console.log("Database initialized!");
  return db;
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

// set the counter for how many times a player has been claimed
async function setPlayerClaimCounter(player, count) {
  if (player) {
    // it's player.id in osu apiv2, but player.apiv2.id in my database
    const playerId = player.apiv2.id.toString();
    // set the claim counter in the player database
    const playersRef = db.collection("players").doc(playerId);
    await playersRef.set(
      { claimCounter: count },
      { merge: true }
    );
    // set the claim counter in the leaderboard database
    const leaderboardRef = db.collection("leaderboards").doc("claimed");
    await leaderboardRef.set(
      { players: admin.firestore.FieldValue.arrayUnion({ playerId, count }) },
      { merge: true }
    );
  } else {
    console.log(`Failed to set player counter for ${player.id}`);
  }
}

// get document in player database (osu apiv2)
async function getPlayer(userId) {
  const playerDoc = await db.collection("players").doc(userId.toString()).get();
  return playerDoc.exists ? playerDoc.data() : null;
}

async function getPlayerByUsername(username) {
  const playersRef = db.collection("players");
  const snapshot = await playersRef
    .where("apiv2.username", "==", username)
    .get(); // doc(userId.toString())

  let latestDate = new Date(0);
  let playerDoc;
  snapshot.forEach((doc) => {
    if (doc.data().dateUpdated > latestDate) {
      latestDate = doc.data().dateUpdated;
      playerDoc = doc;
    }
  });
  return playerDoc ? playerDoc.data() : null;
}

// the main function used for retrieving from roll
async function getPlayerByRank(rank) {
  const playersRef = db.collection("players");
  const snapshot = await playersRef
    .where("apiv2.statistics.global_rank", "==", rank)
    .get(); // doc(userId.toString())

  // if there's two users with the same rank, get the latest added one
  let latestDate = new Date(0);
  let playerDoc;
  snapshot.forEach((doc) => {
    if (doc.data().dateUpdated > latestDate) {
      latestDate = doc.data().dateUpdated;
      playerDoc = doc;
    }
  });
  return playerDoc ? playerDoc.data() : null;
}

// DB UTILITY FUNCTIONS
function getServerUsersRef(serverId) {
  const serversRef = db.collection("servers");
  const serverDoc = serversRef.doc(serverId.toString());
  const usersRef = serverDoc.collection('users');
  return usersRef;
}
async function getServerUserDoc(serverId, userId) {
  const usersRef = getServerUsersRef(serverId);
  const userDoc = await usersRef.doc(userId.toString()).get();
  return userDoc.exists ? userDoc.data() : null;
}
async function getServerUserRef(serverId, userId) {
  const usersRef = getServerUsersRef(serverId);
  const userRef = await usersRef.doc(userId.toString());
  return userRef;
}
async function getServerUserIds(serverId) {
  let userIds = []
  const usersRef = getServerUsersRef(serverId);
  const userDocs = await usersRef.get();
  userDocs.forEach(doc => {
    userIds.push(doc.id);
  });
  return userIds;
}

async function getLeaderboardData(type) {
  if (type == "claimed") {
    const leaderboardRef = db.collection("leaderboards");
    const leaderboardDoc = await leaderboardRef.doc("claimed").get();
    return leaderboardDoc.exists ? leaderboardDoc.data() : null;
  }
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
  const userDoc = await getServerUserRef(serverId, userId);
  const user = await userDoc.get();
  return user.data() ? user.data().ownedPlayers : null;
}

// PINNING FUNCTIONS
async function setPinnedPlayer(serverId, userId, pinnedUserId) {
  const userRef = await getServerUserRef(serverId, userId);
  await userRef.set(
    { pinnedPlayers: admin.firestore.FieldValue.arrayUnion(pinnedUserId) },
    { merge: true }
  );
}
async function getPinnedPlayers(serverId, userId, perPage) {
  const userDoc = await getServerUserRef(serverId, userId);
  const user = await userDoc.get();
  return user.data() ? user.data().pinnedPlayers : null;
}
async function deletePinnedPlayer(serverId, userId, pinnedUserId) {
  const userRef = await getServerUserRef(serverId, userId);
  const userSnapshot = await userRef.get();
  const user = userSnapshot.data()

  const updatedOwnedUsers = user.pinnedPlayers.filter(id => id !== pinnedUserId)
  await userRef.update({ pinnedPlayers: updatedOwnedUsers }, { merge: true })
}

// this is when the claim cooldown ends for a particular user
async function setRollResetTime(serverId, userId) {
  const userRef = await getServerUserRef(serverId, userId);
  let date = new Date();
  date.setMinutes(date.getMinutes() + 60);
  await userRef.set(
    { 'rollResetTime': date.getTime() },
    { merge: true }
  );
}

async function setClaimResetTime(serverId, userId, time) {
  const userRef = await getServerUserRef(serverId, userId);
  await userRef.set(
    { 'claimResetTime': time },
    { merge: true }
  );

}

// this is the number of current rolls available to the user
async function setRolls(serverId, userId, rolls) {
  const userRef = await getServerUserRef(serverId, userId);
  await userRef.set(
    { 'rolls': rolls },
    { merge: true }
  );
}

// gets Top-10-Average for a particular user, while getting owned player documents first (**1000 MS RUNTIME**)
async function updateUserElo(serverId, userId) {
  let user = await getServerUserDoc(serverId, userId);
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
async function setServerStatistics(serverId, stats) {
  const serversRef = db.collection("servers");
  await serversRef.doc(serverId.toString()).set(stats);
}
async function getServerStatistics(serverId) {
  const serversRef = db.collection("servers");
  const serverDoc = await serversRef.doc(serverId.toString()).get();
  return serverDoc.statistics;
}
async function updateDatabaseStatistics() {
  let statistics = await getDatabaseStatistics();
  let serverCount = 0;
  let serverIds = [];
  let userCount = 0;
  const serversSnapshot = await db.collection('servers').get();
  const serversRef = db.collection("servers");
  serverCount = serversSnapshot.size; // will return the collection size
  statistics.servers = serverCount;
  serversSnapshot.docs.forEach(doc => {
    serverIds.push(doc.id);
  });
  for (let i = 0; i < serverCount; i++) {
    const serverRef = serversRef.doc(serverIds[i].toString());
    const usersSnapshot = await serverRef.collection("users").get();
    userCount += usersSnapshot.size;
  }

  statistics.users = userCount;
  statistics.servers = serverCount;
  setDatabaseStatistics(statistics);
  return statistics;
}

async function updateServerStatistics(serverId) {
  let statistics = await getServerStatistics();
  const serversRef = db.collection("servers");
  const serverRef = await serversRef.doc(serverId.toString());
  const usersSnapshot = await serverRef.get();
  statistics.users = usersSnapshot.size;
  setServerStatistics(statistics);
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
  setPlayerClaimCounter,
  getPlayer,
  getPlayerByRank,
  getPlayerByUsername,
  setOwnedPlayer,
  getOwnedPlayers,
  getLeaderboardData,
  setDatabaseStatistics,
  getDatabaseStatistics,
  updateDatabaseStatistics,
  setServerStatistics,
  getServerStatistics,
  updateServerStatistics,
  updateUserElo,
  updateUserEloByPlayers,
  setPinnedPlayer,
  getPinnedPlayers,
  deletePinnedPlayer,
  getServerUsersRef,
  getServerUserDoc,
  getServerUserIds,
  getServerUserRef,
  setRollResetTime,
  setClaimResetTime,
  setRolls,
};
