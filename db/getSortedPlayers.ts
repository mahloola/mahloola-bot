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
    const top10k = playerList.slice(0, 10000);
    top10k.sort((a, b) => {
        // change this line to sort by x field
        return b.apiv2.statistics.global_rank - a.apiv2.statistics.global_rank;
    });
    let hoursPlayedLeaderboardString = '';
    let sum = 0;
    hoursPlayedLeaderboardString += 'rank,hours\n';
    for (let i = 0; i < top10k.length; i++) {
        // if (top3000[i]) {
        //     // change this line to display x user statistic
        //     hitsPerPlayLeaderboardString += `${(i + 1 + '.').padEnd(5, ' ')}${top3000[i].apiv2.username.padEnd(
        //         15,
        //         ' '
        //     )} | ${top3000[i].apiv2.statistics.play_time}\n`;
        // }
        // sum += top3000[i].apiv2.statistics.play_time;
        if (top10k[i]) {
            // change this line to display x user statistic
            hoursPlayedLeaderboardString += `${top10k[i].apiv2.statistics.global_rank},${(
                top10k[i].apiv2.statistics.play_time /
                60 /
                60
            ).toFixed(0)}\n`;
        }
    }
    // write to file
    fs.writeFile('db/sortedPlayers.txt', hoursPlayedLeaderboardString, (err) => {
        if (err) throw err;
    });
    return top10k;
}

main();
