import dotenv from 'dotenv';
import { readFile, writeFile } from 'fs/promises';
import { trimPlayerDocument } from '../commands/util/trimPlayerDocument.js';
import { initializeDatabase, setPlayer } from '../db/database.js';
import { createPlayerCard } from '../image/jimp.js';
import { OsuPlayer, OsuPlayerSimplified } from '../types.js';
import { getRanking, getUser, requestClientCredentialsToken } from './api.js';

dotenv.config();
const apiToken = await requestClientCredentialsToken();
const db = initializeDatabase();

const startingPage = 1;

async function getExistingPlayerIds(): Promise<number[]> {
    const playersSnapshot = await db.collection('players').get();
    const playerIds = [];
    for (let i = 0; i < playersSnapshot.size; i++) {
        const player = playersSnapshot.docs[i].data();
        playerIds.push(player.apiv2?.id);
    }
    return playerIds;
}

const simplifiedPlayersJSON = await readFile('db/simplifiedPlayers.json', 'utf8');
const simplifiedPlayers = JSON.parse(simplifiedPlayersJSON);
const simplifiedPlayersLowercaseJSON = await readFile('db/simplifiedPlayersLowercase.json', 'utf8');
const simplifiedPlayersLowercase = JSON.parse(simplifiedPlayersLowercaseJSON);

const existingPlayerIds: number[] = await getExistingPlayerIds();

for (let page = startingPage; page < 201; page++) {
    const rankingData = await getRanking(apiToken, page);
    const playerDataList: OsuPlayerSimplified[] = rankingData.ranking;

    const updatePlayerJSON = async (player: OsuPlayer) => {
        simplifiedPlayers[player?.id] = [player.username, player.statistics?.global_rank];
        simplifiedPlayersLowercase[player?.id] = [player.username.toLowerCase(), player.statistics?.global_rank];
    };

    for (const [i, playerData] of playerDataList.entries()) {
        try {
            const index = page * 50 + i;
            const playerExists = existingPlayerIds.includes(playerData.user?.id);
            if (playerExists) {
                console.log(`${index}. Player exists: ${playerData.user?.username} (#${playerData.global_rank})`);
                continue;
            }

            const updatedPlayer: OsuPlayer = await getUser(apiToken, playerData.user?.id);
            const trimmedPlayer = trimPlayerDocument(updatedPlayer);
            await setPlayer(trimmedPlayer);
            await updatePlayerJSON(updatedPlayer);
            await createPlayerCard(trimmedPlayer, 0);
            console.log(
                `${index}. New player added to db: ${updatedPlayer.username} (#${updatedPlayer.statistics?.global_rank})`
            );
        } catch (err) {
            console.log(`Error scraping player ${playerData.user?.username}: `, err);
        }
    }
}

writeFile('db/simplifiedPlayers.json', JSON.stringify(simplifiedPlayers));
writeFile('db/simplifiedPlayersLowercase.json', JSON.stringify(simplifiedPlayersLowercase));
