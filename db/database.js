const admin = require("firebase-admin");
let db;
const { firestoreKey, workflow } = require('../auth.json');

// connect to firestore
module.exports.initializeDatabase = function () {
  admin.initializeApp({
    credential: admin.credential.cert(firestoreKey),
  });
  db = admin.firestore();
  console.log("Database initialized!");
  return db;
}

// set document in player database (osu apiv2)
module.exports.setPlayer = async function (player) {
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
module.exports.setPlayerClaimCounter = async function (player, count) {
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
    const leaderboardRef = (workflow === 'development') ? db.collection("testing-leaderboards").doc("claimed") : db.collection("leaderboards").doc("claimed");
    const claimedLeaderboardData = await module.exports.getLeaderboardData('claimed');
    const claimedPlayers = claimedLeaderboardData.players ?? {}
    claimedPlayers[playerId] = count;
    await leaderboardRef.set(
      { players: claimedPlayers },
      { merge: true }
    );
  } else {
    console.log(`Failed to set player counter for ${player.id}`);
  }
}
// set the counter for how many times a player has been rolled
module.exports.setPlayerRollCounter = async function (player, count) {
  if (player) {

    // it's player.id in osu apiv2, but player.apiv2.id in my database
    const playerId = player.apiv2.id.toString();
    // set the claim counter in the player database
    const playersRef = db.collection("players").doc(playerId);
    // use the alternative leaderboard database if I'm testing

    await playersRef.set(
      { rollCounter: count },
      { merge: true }
    );
    // set the claim counter in the leaderboard database
    const leaderboardRef = (workflow === 'development') ? db.collection("testing-leaderboards").doc("rolled") : db.collection("leaderboards").doc("rolled");
    const rolledLeaderboardData = await module.exports.getLeaderboardData('rolled');
    let rolledPlayers = rolledLeaderboardData.players ?? {}
    rolledPlayers[playerId] = count;
    // rolledPlayers = [{ playerId: 111, count: 1 }, { playerId: 1121, count: 3 }, { playerId: 141, count: 6 }]
    await leaderboardRef.set(
      { players: rolledPlayers },
      { merge: true }
    );
  } else {
    console.log(`Failed to set player counter for ${player.id}`);
  }
}

// get document in player database (osu apiv2)
module.exports.getPlayer = async function (userId) {
  const playerDoc = await db.collection("players").doc(userId.toString()).get();
  return playerDoc.exists ? playerDoc.data() : null;
}

// 
module.exports.getPlayerByUsername = async function (username) {
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
module.exports.getPlayerByRank = async function (rank) {
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
module.exports.getServersRef = function () {
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
  return serversRef;
}
module.exports.getServerDoc = async function (serverId) {
  const serversRef = module.exports.getServersRef(serverId);
  const serverDoc = await serversRef.doc(serverId.toString()).get();
  return serverDoc.exists ? serverDoc.data() : null;
}
module.exports.getServerUsersRef = function (serverId) {
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
  const serverDoc = serversRef.doc(serverId.toString());
  const usersRef = serverDoc.collection('users');
  return usersRef;
}
module.exports.getServerUserDoc = async function (serverId, userId) {
  const usersRef = module.exports.getServerUsersRef(serverId);
  const userDoc = await usersRef.doc(userId.toString()).get();
  return userDoc.exists ? userDoc.data() : null;
}
module.exports.getServerUserRef = async function (serverId, userId) {
  const usersRef = module.exports.getServerUsersRef(serverId);
  const userRef = await usersRef.doc(userId.toString());
  return userRef;
}
module.exports.getServerUserIds = async function (serverId) {
  let userIds = []
  const usersRef = module.exports.getServerUsersRef(serverId);
  const userDocs = await usersRef.get();
  userDocs.forEach(doc => {
    userIds.push(doc.id);
  });
  return userIds;
}

module.exports.getLeaderboardData = async function (type) {
  const leaderboardRef = (workflow === 'development') ? db.collection("testing-leaderboards") : db.collection("leaderboards");
  const leaderboardDoc = await leaderboardRef.doc(type).get();
  return leaderboardDoc.exists ? leaderboardDoc.data() : null;
}
module.exports.setPrefix = async function (serverId, newPrefix) {
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
  const serverDoc = serversRef.doc(serverId.toString());
  await serverDoc.set(
    { 'prefix': newPrefix },
    { merge: true }
  );
}

// this is when a user claims a card
module.exports.setOwnedPlayer = async function (serverId, userId, playerId) {
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
  const serverDoc = serversRef.doc(serverId.toString());
  const serverUsersRef = serverDoc.collection("users");
  const userRef = serverUsersRef.doc(userId.toString());

  // set the player to be considered owned across the whole server
  await serverDoc.set(
    { ownedPlayers: admin.firestore.FieldValue.arrayUnion(playerId) },
    { merge: true }
  );

  await userRef.set(
    { ownedPlayers: admin.firestore.FieldValue.arrayUnion(playerId) },
    { merge: true }
  );
}

module.exports.getOwnedPlayers = async function (serverId, userId, perPage) {
  const userDoc = await module.exports.getServerUserRef(serverId, userId);
  const user = await userDoc.get();
  return user.data() ? user.data().ownedPlayers : null;
}

// PINNING FUNCTIONS
module.exports.setPinnedPlayer = async function (serverId, userId, pinnedUserId) {
  const userRef = await module.exports.getServerUserRef(serverId, userId);
  await userRef.set(
    { pinnedPlayers: admin.firestore.FieldValue.arrayUnion(pinnedUserId) },
    { merge: true }
  );
}
module.exports.getPinnedPlayers = async function (serverId, userId, perPage) {
  const userDoc = await module.exports.getServerUserRef(serverId, userId);
  const user = await userDoc.get();
  return user.data() ? user.data().pinnedPlayers : null;
}
module.exports.deletePinnedPlayer = async function (serverId, userId, pinnedUserId) {
  const userRef = await module.exports.getServerUserRef(serverId, userId);
  const userSnapshot = await userRef.get();
  const user = userSnapshot.data()

  const updatedOwnedUsers = user.pinnedPlayers.filter(id => id !== pinnedUserId)
  await userRef.update({ pinnedPlayers: updatedOwnedUsers }, { merge: true })
}

// this is when the claim cooldown ends for a particular user
module.exports.setRollResetTime = async function (serverId, userId) {
  const userRef = await module.exports.getServerUserRef(serverId, userId);
  let date = new Date();
  date.setMinutes(date.getMinutes() + 60);
  await userRef.set(
    { 'rollResetTime': date.getTime() },
    { merge: true }
  );
}

module.exports.setClaimResetTime = async function (serverId, userId, time) {
  const userRef = await module.exports.getServerUserRef(serverId, userId);
  await userRef.set(
    { 'claimResetTime': time },
    { merge: true }
  );

}

// this is the number of current rolls available to the user
module.exports.setRolls = async function (serverId, userId, rolls) {
  const userRef = await module.exports.getServerUserRef(serverId, userId);
  await userRef.set(
    { 'rolls': rolls },
    { merge: true }
  );
}

// gets Top-10-Average for a particular user, while getting owned player documents first (**1000 MS RUNTIME**)
module.exports.updateUserElo = async function (serverId, userId) {
  let user = await module.exports.getServerUserDoc(serverId, userId);
  // if user owns less than 10 players, they are unranked
  if (user.ownedPlayers == undefined || user.ownedPlayers.length < 10) {
    return null;
  }
  let playerIds = user.ownedPlayers;
  const ownedPlayerPromises = [];
  for (const id of playerIds) {
    ownedPlayerPromises.push(module.exports.getPlayer(id));
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
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
  await serversRef.doc(serverId).collection('users').doc(userId).set({ elo: avgRanks }, { merge: true });
  return avgRanks;
}

// gets Top-10-Average for a particular user, but doesn't need to get player documents first
module.exports.updateUserEloByPlayers = async function (serverId, userId, ownedPlayers) {
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
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
  await serversRef.doc(serverId).collection('users').doc(userId).set({ elo: avgRanks }, { merge: true });
  return avgRanks;
}

// global statistics
module.exports.setDatabaseStatistics = async function (stats) {
  const statisticsRef = (workflow === 'development') ? db.collection("testing-statistics") : db.collection("statistics");
  await statisticsRef.doc("global").set(stats);
}
module.exports.getDatabaseStatistics = async function () {
  const statisticsRef = (workflow === 'development') ? db.collection("testing-statistics") : db.collection("statistics");
  const doc = await statisticsRef.doc("global").get();
  return doc.data();
}
module.exports.setServerStatistics = async function (serverId, stats) {
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
  await serversRef.doc(serverId.toString()).set(stats);
}
module.exports.getServerStatistics = async function (serverId) {
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
  const serverDoc = await serversRef.doc(serverId.toString()).get();
  return serverDoc.statistics;
}
module.exports.updateDatabaseStatistics = async function () {
  let statistics = await module.exports.getDatabaseStatistics();
  let serverCount = 0;
  let serverIds = [];
  let userCount = 0;
  const serversSnapshot = await db.collection('servers').get();
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
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
  module.exports.setDatabaseStatistics(statistics);
  return statistics;
}

module.exports.updateServerStatistics = async function (serverId) {
  let statistics = await module.exports.getServerStatistics();
  const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
  const serverRef = await serversRef.doc(serverId.toString());
  const usersSnapshot = await serverRef.get();
  statistics.users = usersSnapshot.size;
  module.exports.setServerStatistics(statistics);
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
