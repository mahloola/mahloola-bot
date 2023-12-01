import dotenv from 'dotenv';
import { getUser } from './api';
import { setPlayer, initializeDatabase, setDatabaseStatistics, getDatabaseStatistics } from '../db/database';
import * as fs from 'fs';
import { requestClientCredentialsToken } from './api';
import { createPlayerCard } from '../image/jimp';
import sizeof from 'firestore-size';
dotenv.config();

const db = initializeDatabase();

function trimPlayerDocument(user) {
    const dataFieldsToDelete = [
        'groups',
        'kudosu',
        'default_group',
        'monthly_playcounts',
        'page',
        'previous_usernames',
        'profile_order',
        'rankHistory',
        'rank_history',
        'replays_watched_counts',
        'user_achievements',
    ];
    for (let i = 0; i < dataFieldsToDelete.length; i++) {
        delete user[dataFieldsToDelete[i]];
    }
    return user;
}
async function updateDatabase() {
    const playersSnapshot = await db.collection('players').get();
    const apiToken = await requestClientCredentialsToken();
    const simplifiedPlayers = {},
        simplifiedPlayersLowercase = {};
    for (let i = 0; i < playersSnapshot.size; i++) {
        try {
            // get player object
            const player = playersSnapshot.docs[i].data();
            // osu api call with the user id
            let updatedPlayer = await getUser(apiToken, player.apiv2.id);
            if (updatedPlayer) {
                updatedPlayer = trimPlayerDocument(updatedPlayer);
                // if the user exists in the osu database
                await setPlayer(updatedPlayer);
                console.log(
                    `${i}. ${updatedPlayer.username} has been updated from rank ${player.apiv2.statistics.global_rank} to ${updatedPlayer.statistics.global_rank}`
                );
                await createPlayerCard(updatedPlayer, player.claimCounter);
                simplifiedPlayers[updatedPlayer.id] = [updatedPlayer.username, updatedPlayer.statistics.global_rank];
                simplifiedPlayersLowercase[updatedPlayer.id] = [
                    updatedPlayer.username.toLowerCase(),
                    updatedPlayer.statistics.global_rank,
                ];
            } else {
                // if the user was banned since the last update
                await db.collection('players').doc(player.apiv2.id.toString()).delete();
                console.log(`${player.apiv2.username} was banned and deleted from the database.`);
            }
        } catch (err) {
            console.log(err);
        }
    }

    // update players-simplified
    fs.writeFile('db/simplifiedPlayers.json', JSON.stringify(simplifiedPlayers), (err) => {
        if (err) throw err;
    });
    fs.writeFile('db/simplifiedPlayersLowercase.json', JSON.stringify(simplifiedPlayersLowercase), (err) => {
        if (err) throw err;
    });
    // update player count in the database statistics
    const currentStats = await getDatabaseStatistics();
    currentStats.players = Object.keys(simplifiedPlayers).length;
    await setDatabaseStatistics(currentStats);
}

updateDatabase();
