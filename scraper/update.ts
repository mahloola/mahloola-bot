import dotenv from 'dotenv';
import { getUser } from './api';
import { setPlayer, initializeDatabase, setDatabaseStatistics, getDatabaseStatistics } from '../db/database';
import * as fs from 'fs';
import { requestClientCredentialsToken } from './api';
import { createPlayerCard } from '../image/jimp';
dotenv.config();

const db = initializeDatabase();
let apiToken;

async function updateDatabase() {
    const playersSnapshot = await db.collection('players').get();
    apiToken = await requestClientCredentialsToken();
    const simplifiedPlayers = {};
    for (let i = 0; i < playersSnapshot.size; i++) {
        try {
            // get player object
            const player = playersSnapshot.docs[i].data();
            // osu api call with the user id
            const updatedPlayer = await getUser(apiToken, player.apiv2.id);
            if (updatedPlayer) {
                // if the user exists in the osu database
                await setPlayer(updatedPlayer);
                await createPlayerCard(updatedPlayer, player.claimCount);
                console.log(
                    `${updatedPlayer.username.padEnd(
                        16,
                        ' '
                    )} has been updated from rank ${player.apiv2.statistics.global_rank.toString().padEnd(4, ' ')} to ${
                        updatedPlayer.statistics.global_rank
                    }`
                );
                await createPlayerCard(updatedPlayer, player.claimCounter);
                simplifiedPlayers[updatedPlayer.id] = [
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
    // update player count in the database statistics
    const currentStats = await getDatabaseStatistics();
    currentStats.players = playersSnapshot.size;
    await setDatabaseStatistics(currentStats);
}

updateDatabase();
