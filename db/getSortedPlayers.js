const { initializeDatabase } = require('./database');
const fs = require('fs')

// this module sorts the top 10,000 players by any api data field and prints out the result to a neatly formatted txt 

async function main() {
    const db = initializeDatabase()
    let player;
    const playerList = [];
    const playersRef = db.collection("players");
    const snapshot = await playersRef.get();
    snapshot.forEach((doc) => {
        player = doc.data();
        playerList.push(player);
    });
    playerList.sort((a, b) => {
        // change this line to sort by x field
        return new Date(a.apiv2.join_date) - new Date(b.apiv2.join_date);
    })
    let hitsPerPlayLeaderboardString = "";
    for (let i = 0; i < playerList.length; i++) {
        if (playerList[i]) {
            // change this line to display x user statistic
            hitsPerPlayLeaderboardString += (`${((i + 1) + '.').padEnd(5, ' ')}${playerList[i].apiv2.username.padEnd(15, ' ')} | ${playerList[i].apiv2.join_date.substring(2, 10)}\n`);
        }
    }
    // write to file
    fs.writeFile('db/sortedPlayers.txt', hitsPerPlayLeaderboardString, (err) => {
        if (err) throw err;
    })
    return playerList;

}

main()