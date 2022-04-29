// const { initializeApp } = require('firebase-admin/app');
// const { sleep } = require('../util/sleep');
const admin = require("firebase-admin");
let db;

const { firestoreKey } = require('../auth.json');

function initializeDatabase() {
  admin.initializeApp({
    credential: admin.credential.cert(firestoreKey),
  });
  db = admin.firestore();
  console.log("Database initialized!");
}

async function setPlayer(player) {
  if (player) {
    const docRef = db.collection("players").doc(player.id.toString());
    await docRef.set(
      { apiv2: player, dateUpdated: new Date() },
      { merge: true }
    );
  } else {
    console.log("Player is N/A");
  }
}

async function getPlayer(userId) {
  const playerDoc = await db.collection("players").doc(userId.toString()).get();
  return playerDoc.exists ? playerDoc.data() : null;
}

async function getPlayerByRank(rank) {
  let player;
  const playersRef = db.collection("players");
  const snapshot = await playersRef
    .where("apiv2.statistics.global_rank", "==", rank)
    .get(); // doc(userId.toString())
  let latestDate = new Date(0);
  snapshot.forEach((doc) => {
    player = doc.data();
    if (doc.data().dateUpdated > latestDate) {
      latestDate = doc.data().dateUpdated;
      player = doc.data();
    }
  });
  //console.log('User rolled =>', player.apiv2.username);
  return player;
}

async function setOwnedPlayer(serverId, userId, playerId) {
  const serversRef = db.collection("servers");
  const serverRef = serversRef.doc(serverId.toString());
  const serverUsersRef = serverRef.collection("users");
  const userRef = serverUsersRef.doc(userId.toString());

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
  const serversCollection = db.collection("servers");
  const serverDoc = serversCollection.doc(serverId.toString());
  const serverUsersCollection = serverDoc.collection("users");
  const userDoc = serverUsersCollection.doc(userId.toString());
  const user = await userDoc.get();
  if (!user.exists) {
    console.log("No such document!");
  } else {
    console.log("Document data:", user.data());
  }
  return user.data() ? user.data().ownedPlayers : null;

  // let query = user.data().ownedPlayers
  //   // .orderBy('dateUploaded', 'desc')
  //   .limit(perPage + 1);

  // console.log(query.get());

  //   query = query.startAt(serversSnapshot)

  // const querySnapshot = await query.get()
  // return !querySnapshot.empty ? querySnapshot.docs.map((doc) => doc.data()) : []
}

async function setDatabaseStatistics(meta) {
  await db.collection("statistics").doc("global").set(meta);
}

async function getDatabaseStatistics() {
  const doc = await db.collection("statistics").doc("global").get();
  return doc.data();
}

async function getServers() {
  const serversCollection = await db.collection("servers");
  return serversCollection;
}
async function getServerUsers(serverId) {
  const serversCollection = await db.collection("servers");
  const serverDoc = await serversCollection.doc(serverId.toString());
  const usersCollection = await serverDoc.collection('users');
  return usersCollection;
}

async function getServerUser(serverId, userId) {
  const serversCollection = await db.collection("servers");
  const serverDoc = await serversCollection.doc(serverId.toString());
  const usersCollection = await serverDoc.collection('users');
  console.log(serverId, userId);
  const userDoc = await usersCollection.doc(userId.toString()).get();
  console.log(userDoc.data());
  return userDoc.exists ? userDoc.data() : null;
}

async function updateUserElo(serverId, userId) {
  let user = await getServerUser(serverId, userId);
  // if user owns less than 10 players, they are unranked
  if (user.ownedPlayers == undefined || user.ownedPlayers.length < 10) {
    return null;
  }
  let playerIds = user.ownedPlayers;
  let ownedPlayers = [];
  for (let i = 0; i < playerIds.length; i++) {
    let player = await getPlayer(playerIds[i]);
    ownedPlayers.push(player);
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
  getServers,
  getServerUsers,
  getServerUser,
  updateUserElo
};