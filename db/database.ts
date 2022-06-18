import admin from 'firebase-admin';
import { firestoreKey, workflow } from '../auth.json';
import { DatabaseStatistics, Player, Leaderboard, Server, ServerUser } from '../types';
import Discord from 'discord.js';
import { Intents } from 'discord.js';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

const millisecondsPerHour = 3600000;

admin.initializeApp({
    // @ts-ignore
    credential: admin.credential.cert(firestoreKey),
});
const db = admin.firestore();

// connect to firestore
export function initializeDatabase() {
    console.log('Database initialized!');
    return db;
}

// set document in player database (osu apiv2)
export async function setPlayer(player) {
    if (player) {
        const docRef = db.collection('players').doc(player.id.toString());
        await docRef.set(
            {
                apiv2: player,
                dateUpdated: new Date(),
                usernameLowercase: player.username.toLowerCase(),
                rollIndex: Math.random() * 9_223_372_036_854,
            },
            { merge: true }
        );
    } else {
        console.log(`Failed to set player ${player.id}`);
    }
}
// set discord user in the database
export async function setDiscordUser(discordUser) {
    if (discordUser) {
        const usersRef = workflow === 'development' ? db.collection('testing-users') : db.collection('users');
        console.log(discordUser.id.toString());
        const docRef = usersRef.doc(discordUser.id.toString());
        await docRef.set(
            {
                discord: discordUser,
                dateUpdated: new Date(),
            },
            { merge: true }
        );
    } else {
        console.log(`Failed to set user ${discordUser.id}`);
    }
}
export async function setPremium(user, months) {
    const currentDateMs = new Date().getTime();
    const premiumExpiryMs = currentDateMs + months * 2629800000;
    if (user) {
        console.log(user);
        const usersRef = workflow === 'development' ? db.collection('testing-users') : db.collection('users');
        const docRef = usersRef.doc(user.discord.id.toString());
        await docRef.set(
            {
                premium: premiumExpiryMs,
            },
            { merge: true }
        );
    } else {
        console.log(`Failed to set premium date for user ${user.discord.username}`);
    }
}
export async function populateUsers() {
    const serversRef = db.collection('servers');
    const serversSnapshot = await serversRef.limit(3).get();
    const serverCount = serversSnapshot.size;
    const serverIds = [];
    serversSnapshot.docs.forEach((doc) => {
        console.log(doc.id);
        serverIds.push(doc.id);
    });
    for (let i = 0; i < serverCount; i++) {
        console.log(`Now entering server ${serverIds[i]}`);
        const serverRef = serversRef.doc(serverIds[i].toString());
        const usersSnapshot = await serverRef.collection('users').get();
        const userCount = usersSnapshot.size;
        const userIds = [];
        for (let i = 0; i < userCount; i++) {
            const userDoc = await usersSnapshot.docs[i].data();
            let userDiscord;
            if (!userDoc.discord) {
                userDiscord = await client.users.fetch(userIds[i]);
                console.log(`Found user ${userDiscord.username}.`);
            }
            if (!userIds.includes(userDiscord.id)) {
                userIds.push(userDiscord.id);
                await setDiscordUser(userDiscord);
                console.log(`User ${userDiscord.username} has been set in the users collection.`);
            }
        }
    }
}
export async function setUserRollCounter(discord, count) {
    if (discord) {
        const usersRef = workflow === 'development' ? db.collection('testing-users') : db.collection('users');
        const userRef = usersRef.doc(discord.id);
        await userRef.set({ discord: discord, rollCounter: count }, { merge: true });
    } else {
        console.log(`Failed to set user roll counter.`);
    }
}
export async function setUserClaimCounter(discord, count) {
    if (discord) {
        const usersRef = workflow === 'development' ? db.collection('testing-users') : db.collection('users');
        const userRef = usersRef.doc(discord.id);
        await userRef.set({ discord: discord, claimCounter: count }, { merge: true });
    } else {
        console.log(`Failed to set user claim counter.`);
    }
}
// set the counter for how many times a player has been claimed
export async function setPlayerClaimCounter(player, count) {
    if (player) {
        // it's player.id in osu apiv2, but player.apiv2.id in my database
        const playerId = player.apiv2.id.toString();
        // set the claim counter in the player database
        const playersRef = db.collection('players').doc(playerId);
        await playersRef.set({ claimCounter: count }, { merge: true });
        // set the claim counter in the leaderboard database
        const leaderboardRef =
            workflow === 'development'
                ? db.collection('testing-leaderboards').doc('claimed')
                : db.collection('leaderboards').doc('claimed');
        const claimedLeaderboardData = await getLeaderboardData('claimed');
        const claimedPlayers = claimedLeaderboardData.players ?? {};
        claimedPlayers[playerId] = count;
        await leaderboardRef.set({ players: claimedPlayers }, { merge: true });
    } else {
        console.log(`Failed to set player counter for ${player.id}`);
    }
}
// set the counter for how many times a player has been rolled
export async function setPlayerRollCounter(player, count) {
    if (player) {
        // it's player.id in osu apiv2, but player.apiv2.id in my database
        const playerId = player.apiv2.id.toString();
        // set the claim counter in the player database
        const playersRef = db.collection('players').doc(playerId);
        // use the alternative leaderboard database if I'm testing

        await playersRef.set({ rollCounter: count }, { merge: true });
        // set the claim counter in the leaderboard database
        const leaderboardRef =
            workflow === 'development'
                ? db.collection('testing-leaderboards').doc('rolled')
                : db.collection('leaderboards').doc('rolled');
        const rolledLeaderboardData = await getLeaderboardData('rolled');
        const rolledPlayers = rolledLeaderboardData.players ?? {};
        rolledPlayers[playerId] = count;
        // rolledPlayers = [{ playerId: 111, count: 1 }, { playerId: 1121, count: 3 }, { playerId: 141, count: 6 }]
        await leaderboardRef.set({ players: rolledPlayers }, { merge: true });
    } else {
        console.log(`Failed to set player counter for ${player.id}`);
    }
}

// get document in player database (osu apiv2)
export async function getPlayer(userId): Promise<Player> {
    const playerDoc = await db.collection('players').doc(userId.toString()).get();
    return playerDoc.exists ? (playerDoc.data() as Player) : null;
}

//
export async function getPlayerByUsername(username): Promise<Player> {
    const playersRef = db.collection('players');
    const snapshot = await playersRef.where('usernameLowercase', '==', username.toLowerCase()).get(); // doc(userId.toString())

    let latestDate = new Date(0);
    let playerDoc;
    snapshot.forEach((doc) => {
        if (doc.data().dateUpdated > latestDate) {
            latestDate = doc.data().dateUpdated;
            playerDoc = doc;
        }
    });
    return playerDoc ? (playerDoc.data() as Player) : null;
}

// the main function used for retrieving from roll
export async function getPlayerByRank(rank): Promise<Player> {
    const playersRef = db.collection('players');
    const snapshot = await playersRef.where('apiv2.statistics.global_rank', '==', rank).get(); // doc(userId.toString())

    // if there's two users with the same rank, get the latest added one
    let latestDate = new Date(0);
    let playerDoc;
    snapshot.forEach((doc) => {
        if (doc.data().dateUpdated > latestDate) {
            latestDate = doc.data().dateUpdated;
            playerDoc = doc;
        }
    });
    return playerDoc ? (playerDoc.data() as Player) : null;
}

// DB UTILITY FUNCTIONS
export function getServersRef() {
    const serversRef = workflow === 'development' ? db.collection('testing-servers') : db.collection('servers');
    return serversRef;
}
export async function getServerDoc(serverId): Promise<Server> {
    const serversRef = getServersRef();
    const serverDoc = await serversRef.doc(serverId.toString()).get();
    return serverDoc.exists ? (serverDoc.data() as Server) : null;
}
export function getServerUsersRef(serverId) {
    const serversRef = getServersRef();
    const serverDoc = serversRef.doc(serverId.toString());
    const usersRef = serverDoc.collection('users');
    return usersRef;
}
export async function getServerUserDoc(serverId, userId): Promise<ServerUser> {
    const usersRef = getServerUsersRef(serverId);
    const userDoc = await usersRef.doc(userId.toString()).get();
    return userDoc.exists ? (userDoc.data() as ServerUser) : null;
}
export function getServerUserRef(serverId, userId) {
    const usersRef = getServerUsersRef(serverId);
    const userRef = usersRef.doc(userId.toString());
    return userRef;
}
export async function getServerUserIds(serverId) {
    const userIds: string[] = [];
    const usersRef = getServerUsersRef(serverId);
    const userDocs = await usersRef.get();
    userDocs.forEach((doc) => {
        userIds.push(doc.id);
    });
    return userIds;
}
export async function getDiscordUser(discordId) {
    const usersRef = workflow === 'development' ? db.collection('testing-users') : db.collection('users');
    const userDoc = await usersRef.doc(discordId).get();
    return userDoc.exists ? userDoc.data() : null;
}
export async function getLeaderboardData(type): Promise<Leaderboard> {
    const leaderboardRef =
        workflow === 'development' ? db.collection('testing-leaderboards') : db.collection('leaderboards');
    const leaderboardDoc = await leaderboardRef.doc(type).get();
    return leaderboardDoc.exists ? (leaderboardDoc.data() as Leaderboard) : null;
}
export async function setPrefix(serverId, newPrefix) {
    const serversRef = getServersRef();
    const serverDoc = serversRef.doc(serverId.toString());
    await serverDoc.set({ prefix: newPrefix }, { merge: true });
}

// this is when a user claims a card
export async function setOwnedPlayer(serverId, userId, playerId) {
    const serversRef = getServersRef();
    const serverDoc = serversRef.doc(serverId.toString());
    const serverUsersRef = serverDoc.collection('users');
    const userRef = serverUsersRef.doc(userId.toString());

    // set the player to be considered owned across the whole server
    await serverDoc.set({ ownedPlayers: admin.firestore.FieldValue.arrayUnion(playerId) }, { merge: true });

    await userRef.set({ ownedPlayers: admin.firestore.FieldValue.arrayUnion(playerId) }, { merge: true });
}

export async function getOwnedPlayers(serverId, userId, perPage) {
    const userRef = await getServerUserRef(serverId, userId);
    const userDoc = await userRef.get();
    const user = userDoc.data() as ServerUser;
    return user?.ownedPlayers;
}

// PINNING FUNCTIONS
export async function setPinnedPlayer(serverId, userId, pinnedUserId) {
    const userRef = await getServerUserRef(serverId, userId);
    await userRef.set({ pinnedPlayers: admin.firestore.FieldValue.arrayUnion(pinnedUserId) }, { merge: true });
}
export async function getPinnedPlayers(serverId, userId, perPage) {
    const userRef = await getServerUserRef(serverId, userId);
    const userDoc = await userRef.get();
    const user = userDoc.data() as ServerUser;
    return user?.pinnedPlayers;
}
export async function deletePinnedPlayer(serverId, userId, pinnedUserId) {
    const userRef = await getServerUserRef(serverId, userId);
    const userSnapshot = await userRef.get();
    const user = userSnapshot.data();

    const updatedOwnedUsers = user.pinnedPlayers.filter((id) => id !== pinnedUserId);
    await userRef.update({ pinnedPlayers: updatedOwnedUsers });
}

// this is when the claim cooldown ends for a particular user
export async function setRollResetTime(serverId, userId) {
    const userRef = await getServerUserRef(serverId, userId);
    const date = new Date();
    date.setMinutes(date.getMinutes() + 60);
    await userRef.set({ rollResetTime: date.getTime() }, { merge: true });
}

export async function setClaimResetTime(serverId, userId, time) {
    const userRef = await getServerUserRef(serverId, userId);
    await userRef.set({ claimResetTime: time }, { merge: true });
}

// If roll succeeds returns true, otherwise returns false
export async function attemptRoll(serverId, userId): Promise<boolean> {
    // everything involving rolls and roll reset times happens inside this transaction to prevent race conditions
    return await db.runTransaction(async (t) => {
        const userRef = getServerUserRef(serverId, userId);
        const userDoc = await t.get(userRef);
        const user = userDoc.data() as ServerUser;
        let dataToSet: ServerUser = null;
        let rollSuccess;

        if (!user || user.rollResetTime === undefined) {
            // user doesn't exist yet
            rollSuccess = true;
            dataToSet = {
                rollResetTime: Date.now() + 1 * millisecondsPerHour,
                rolls: 10 - 1,
            };
        } else if (Date.now() > user.rollResetTime) {
            // user is past their cooldown
            rollSuccess = true;
            dataToSet = {
                rollResetTime: Date.now() + 1 * millisecondsPerHour,
                rolls: 10 - 1,
            };
        } else if (user.rolls > 0) {
            // user has rolled recently but still has enough rolls
            rollSuccess = true;
            dataToSet = {
                rolls: user.rolls - 1,
            };
        } else {
            // roll failed: user does not have enough rolls
            rollSuccess = false;
        }

        // perform writes and end transaction
        if (dataToSet) {
            t.set(userRef, dataToSet, { merge: true });
        }
        return rollSuccess;
    });
}

// this is the number of current rolls available to the user
export async function setRolls(serverId, userId, rolls) {
    const userRef = await getServerUserRef(serverId, userId);
    await userRef.set({ rolls: rolls }, { merge: true });
}

// gets Top-10-Average for a particular user, while getting owned player documents first (**1000 MS RUNTIME**)
export async function updateUserElo(serverId, userId) {
    const user = await getServerUserDoc(serverId, userId);
    // if user owns less than 10 players, they are unranked
    if (user.ownedPlayers == undefined || user.ownedPlayers.length < 10) {
        return null;
    }
    const playerIds = user.ownedPlayers;
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
    const serversRef = getServersRef();
    await serversRef.doc(serverId).collection('users').doc(userId).set({ elo: avgRanks }, { merge: true });
    return avgRanks;
}

// gets Top-10-Average for a particular user, but doesn't need to get player documents first
export async function updateUserEloByPlayers(serverId, userId, ownedPlayers) {
    if (ownedPlayers.length < 10) {
        const serversRef = getServersRef();
        await serversRef.doc(serverId).collection('users').doc(userId).set({ elo: null }, { merge: true });
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
    const serversRef = getServersRef();
    await serversRef.doc(serverId).collection('users').doc(userId).set({ elo: avgRanks }, { merge: true });
    return avgRanks;
}

// global statistics
export async function setDatabaseStatistics(stats) {
    const statisticsRef =
        workflow === 'development' ? db.collection('testing-statistics') : db.collection('statistics');
    await statisticsRef.doc('global').set(stats);
}
export async function getDatabaseStatistics() {
    const statisticsRef =
        workflow === 'development' ? db.collection('testing-statistics') : db.collection('statistics');
    const doc = await statisticsRef.doc('global').get();
    return doc.data() as DatabaseStatistics;
}
export async function setServerStatistics(serverId, stats) {
    const serversRef = getServersRef();
    await serversRef.doc(serverId.toString()).set(stats);
}
export async function getServerStatistics(serverId) {
    const serversRef = getServersRef();
    const serverDoc = await serversRef.doc(serverId.toString()).get();
    return serverDoc.data().statistics;
}
export async function updateDatabaseStatistics() {
    const statistics = await getDatabaseStatistics();
    let serverCount = 0;
    const serverIds = [];
    const serversSnapshot =
        workflow === 'development'
            ? await db.collection('testing-servers').get()
            : await db.collection('servers').get();
    const serversRef = getServersRef();
    serverCount = serversSnapshot.size; // will return the collection size
    statistics.servers = serverCount;
    serversSnapshot.docs.forEach((doc) => {
        serverIds.push(doc.id);
    });
    const totalUsers = [];
    for (let i = 0; i < serverCount; i++) {
        const serverRef = serversRef.doc(serverIds[i].toString());
        const usersSnapshot = await serverRef.collection('users').get();
        const userIds = [];
        usersSnapshot.docs.forEach((doc) => {
            userIds.push(doc.id);
            if (!totalUsers.includes(doc.id)) {
                totalUsers.push(doc.id);
            }
        });
    }

    statistics.users = totalUsers.length;
    statistics.servers = serverCount;
    console.log(statistics);
    setDatabaseStatistics(statistics);
    return statistics;
}

export async function updateServerStatistics(serverId) {
    const statistics = await getServerStatistics(serverId);
    const serversRef = getServersRef();
    const serverRef = serversRef.doc(serverId.toString());
    const userSnapshot = await serverRef.collection('users').get();
    statistics.users = userSnapshot.size;
    setServerStatistics(serverId, statistics);
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
