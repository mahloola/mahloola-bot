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

async function getOwnedPlayers(serverId, userId) {
  const serversRef = db.collection("servers");
  const serverDoc = serversRef.doc(serverId.toString());
  const serverUsersRef = serverDoc.collection("users");
  const userRef = serverUsersRef.doc(userId.toString());

  const doc = await userRef.get();
  if (!doc.exists) {
    console.log("No such document!");
  } else {
    console.log("Document data:", doc.data());
  }
  return doc.data().ownedPlayers;
}

async function setDatabaseMetadata(meta) {
  const metadataDoc = await db.collection("metadata").doc("metadata");
  await metadataDoc.set({ metadata: meta }, { merge: true });
}

async function getDatabaseMetadata() {
  const doc = await db.collection("metadata").doc("metadata").get();
  return doc.data().metadata;
}

async function setServerMetadata(metadata) {
  const metadataDoc = await db.collection("metadata").doc("metadata");
  await metadataDoc.set({ metadata }, { merge: true });
}

async function getServerMetadata(serverId, userId) {
  const doc = await db.collection("metadata").doc("metadata").get();
  return doc.data();
}

async function updateMetadata() {
  let metadata = getDatabaseMetadata();
  db.collection("servers")
    .get()
    .then((snap) => {
      metadata.servers = snap.size; // will return the collection size

      let totalUsers;
      db.collection("servers").forEach((doc) => {
        doc
          .collection("users")
          .get()
          .then((snap) => {
            const numUsers = snap.size; // will return the collection size
            console.log(numUsers);
            totalUsers += numUsers;
          });
      });
      console.log(totalUsers);
      metadata.users = totalUsers;
    });
  setDatabaseMetadata(metadata);
}

module.exports = {
  initializeDatabase,
  setPlayer,
  getPlayer,
  getPlayerByRank,
  setOwnedPlayer,
  getOwnedPlayers,
  setDatabaseMetadata,
  getDatabaseMetadata,
  setServerMetadata,
  getServerMetadata,
  updateMetadata,
};
