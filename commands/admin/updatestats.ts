import { updateDatabaseStatistics } from '../../db/database.js';

// this doesn't actually require admin but it was made for me so I'm putting it here
export async function updatestats(inboundMessage) {
    inboundMessage.channel.send(`${inboundMessage.author} Updating database statistics...`);
    updateDatabaseStatistics().then(async () => {
        inboundMessage.channel.send(`${inboundMessage.author} Database statistics have been updated.`);
    });
}
