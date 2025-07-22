import auth from '../../config/auth.js';
import { getPlayerByUsername, setOwnedPlayer } from '../../db/database.js';
const { adminDiscordId } = auth;
export async function givecard(inboundMessage) {
    const words = inboundMessage.content.split(' ');
    if (inboundMessage.author.id !== adminDiscordId) {
        inboundMessage.channel.send('You need to be mahloola to use this command.');
        return;
    } else {
        const userId = words[1];
        const serverId = words.length >= 4 ? words[2] : inboundMessage.guild.id;
        const username = words.length >= 4 ? words[3] : words[2];
        const player = await getPlayerByUsername(username);
        if (player !== null) {
            await setOwnedPlayer(serverId, userId, player.apiv2.id);
            inboundMessage.channel.send(
                `${inboundMessage.author} Successfully gave **${player.apiv2.username}** to User ${userId}.`
            );
        } else {
            inboundMessage.channel.send(`Could not find a player called ${username}`);
        }
    }
}
