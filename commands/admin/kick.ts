import Discord, { Intents } from 'discord.js';
import { adminDiscordId } from '../../auth.json';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});
export async function kick(inboundMessage, serverPrefix) {
    if (inboundMessage.author.id !== adminDiscordId) {
        inboundMessage.channel.send('You need to be mahloola to use this command.');
        return;
    } else {
        const serverId = inboundMessage.content.substring(5 + serverPrefix.length);
        const server = await client.guilds.fetch(`${serverId}`);
        if (server) {
            console.log(server.name);
            await server.leave();
            inboundMessage.channel.send(`Successfully left ${server.name}.`);
        } else {
            inboundMessage.channel.send(`Server was not found.`);
        }
    }
}
