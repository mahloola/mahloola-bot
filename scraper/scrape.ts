import dotenv from 'dotenv';
import { readFile, writeFile } from 'fs/promises';
import { trimPlayerDocument } from '../commands/util/trimPlayerDocument.js';
import { initializeDatabase, setPlayer } from '../db/database.js';
import { createPlayerCard } from '../image/jimp.js';
import { OsuPlayer, OsuPlayerSimplified } from '../types.js';
import { getRanking, getUser, requestClientCredentialsToken } from './api.js';
dotenv.config();

const db = initializeDatabase();

async function getExistingPlayerIds(): Promise<number[]> {
    const playersSnapshot = await db.collection('players').limit(100).get();
    const playerIds = [];
    for (let i = 0; i < playersSnapshot.size; i++) {
        const player = playersSnapshot.docs[i].data();
        playerIds.push(player.apiv2?.id);
    }
    return playerIds;
}

const apiToken = await requestClientCredentialsToken();
const rankingData = await getRanking(apiToken);
const playerDataList: OsuPlayerSimplified[] = rankingData.ranking;

const simplifiedPlayersJSON = await readFile('db/simplifiedPlayers.json', 'utf8');
const simplifiedPlayers = JSON.parse(simplifiedPlayersJSON);
const simplifiedPlayersLowercaseJSON = await readFile('db/simplifiedPlayersLowercase.json', 'utf8');
const simplifiedPlayersLowercase = JSON.parse(simplifiedPlayersLowercaseJSON);

const updatePlayerJSON = async (player: OsuPlayer) => {
    simplifiedPlayers[player?.id] = [player.username, player.statistics?.global_rank];
    simplifiedPlayersLowercase[player?.id] = [player.username.toLowerCase(), player.statistics?.global_rank];
};

const existingPlayerIds: number[] = await getExistingPlayerIds();
for (const [i, playerData] of playerDataList.entries()) {
    try {
        const playerExists = existingPlayerIds.includes(playerData.user?.id);
        if (playerExists) {
            console.log(`${i}. ${playerData.user?.username} (#${playerData.global_rank}) exists, continuing...`);
            continue;
        }

        const updatedPlayer: OsuPlayer = await getUser(apiToken, playerData.user?.id);
        const trimmedPlayer = trimPlayerDocument(updatedPlayer);
        await setPlayer(trimmedPlayer);
        await updatePlayerJSON(updatedPlayer);
        await createPlayerCard(trimmedPlayer, 0);
        console.log(`${i + 1}. ${updatedPlayer.username} (#${updatedPlayer.statistics?.global_rank}) added to db.`);
    } catch (err) {
        console.log(`Error scraping player ${playerData.user?.username}: `, err);
    }
}

writeFile('db/simplifiedPlayers.json', JSON.stringify(simplifiedPlayers));
writeFile('db/simplifiedPlayersLowercase.json', JSON.stringify(simplifiedPlayersLowercase));
