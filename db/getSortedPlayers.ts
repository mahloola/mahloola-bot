import { initializeDatabase } from './database';
import * as fs from 'fs';

// this is an unrelated module that sorts the top 10,000 players by any api data field and prints out the result to a neatly formatted txt

async function main() {
    const db = initializeDatabase();
    let player;
    const playerList = [];
    const playersRef = db.collection('players');
    const snapshot = await playersRef.get();
    snapshot.forEach((doc) => {
        player = doc.data();
        playerList.push(player);
    });
    playerList.sort((a, b) => {
        // change this line to sort by x field
        return a.apiv2.statistics.global_rank - b.apiv2.statistics.global_rank;
    });
    const top100 = playerList.slice(0, 100);
    top100.sort((a, b) => {
        // change this line to sort by x field
        return b.apiv2.scores_first_count - a.apiv2.scores_first_count;
    });
    let hitsPerPlayLeaderboardString = '';
    for (let i = 0; i < top100.length; i++) {
        if (top100[i]) {
            // change this line to display x user statistic
            hitsPerPlayLeaderboardString += `${(i + 1 + '.').padEnd(5, ' ')}${top100[i].apiv2.username.padEnd(
                15,
                ' '
            )} | ${top100[i].apiv2.scores_first_count}\n`;
        }
    }
    // write to file
    fs.writeFile('db/sortedPlayers.txt', hitsPerPlayLeaderboardString, (err) => {
        if (err) throw err;
    });
    return top100;
}

main();
