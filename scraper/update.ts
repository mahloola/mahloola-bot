import dotenv from 'dotenv';
import { readFile, writeFile } from 'fs/promises';
import { trimPlayerDocument } from '../commands/util/trimPlayerDocument.js';
import { getDatabaseStatistics, initializeDatabase, setDatabaseStatistics, setPlayer } from '../db/database.js';
import { createPlayerCard } from '../image/jimp.js';
import { PlayerApiv2 } from '../types.js';
import { getUser, requestClientCredentialsToken } from './api.js';
dotenv.config();

const db = initializeDatabase();

async function updateDatabase() {
    const playersSnapshot = await db.collection('players').get();
    const apiToken = await requestClientCredentialsToken();

    const simplifiedPlayersJSON = await readFile('db/simplifiedPlayers.json', 'utf8');
    const simplifiedPlayers = JSON.parse(simplifiedPlayersJSON);
    const simplifiedPlayersLowercaseJSON = await readFile('db/simplifiedPlayersLowercase.json', 'utf8');
    const simplifiedPlayersLowercase = JSON.parse(simplifiedPlayersLowercaseJSON);

    for (let i = 0; i < playersSnapshot.size; i++) {
        try {
            // get player object
            const player = playersSnapshot.docs[i].data();
            // osu api call with the user id
            const updatedPlayer = await getUser(apiToken, player.apiv2.id);
            if (updatedPlayer) {
                const trimmedPlayer: PlayerApiv2 = trimPlayerDocument(updatedPlayer);
                // if the user exists in the osu database
                await setPlayer(trimmedPlayer);
                console.log(
                    `${i + 1}. ${trimmedPlayer.username} has been updated from rank ${player.apiv2?.global_rank} to ${
                        trimmedPlayer.global_rank
                    }`
                );
                await createPlayerCard(trimmedPlayer, player.claimCounter ?? 0);
                simplifiedPlayers[trimmedPlayer.id] = [trimmedPlayer.username, trimmedPlayer.global_rank];
                simplifiedPlayersLowercase[trimmedPlayer.id] = [
                    trimmedPlayer.username.toLowerCase(),
                    trimmedPlayer.global_rank,
                ];
            } else {
                // if the user was banned since the last update
                await db.collection('players').doc(player.apiv2.id.toString()).delete();
                console.log(`${player.apiv2.username} was banned and deleted from the database.`);
            }
        } catch (err) {
            console.error(err);
        }
    }

    // update players-simplified
    writeFile('db/simplifiedPlayers.json', JSON.stringify(simplifiedPlayers));
    writeFile('db/simplifiedPlayersLowercase.json', JSON.stringify(simplifiedPlayersLowercase));

    // update player count in the database statistics
    const currentStats = await getDatabaseStatistics();
    currentStats.players = Object.keys(simplifiedPlayers).length;
    await setDatabaseStatistics(currentStats);
}

updateDatabase();
