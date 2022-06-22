import { NonDmChannel } from '../../types';
import { getUser, requestClientCredentialsToken } from '../../scraper/api';
import { getPlayerByUsername, setPlayer } from '../../db/database';
import { adminDiscordId } from '../../auth.json';
import Discord, { Intents } from 'discord.js';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});
let serverPrefix;

export async function add(inboundMessage) {
    // check if user is an administrator
    if (inboundMessage.author.id === adminDiscordId) {
        const userId = inboundMessage.content.substring(4 + serverPrefix.length);
        // check if user entered a parameter
        if (userId) {
            if (userId === '@everyone' || userId === '@here') {
                inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
                return;
            } else {
                const apiToken = await requestClientCredentialsToken();
                const player = await getUser(apiToken, userId);
                if (player) {
                    await setPlayer(player);

                    if (getPlayerByUsername(player.username)) {
                        const timestamp = new Date();
                        console.log(
                            `${timestamp.toLocaleTimeString().slice(0, 5)} | ${
                                (inboundMessage.channel as NonDmChannel).guild.name
                            }: ${inboundMessage.author.username} added ${player.username} to the database successfully.`
                        );
                        inboundMessage.channel.send(
                            `${inboundMessage.author} ${player.username} was successfully added to the database.`
                        );
                    }
                } else {
                    inboundMessage.channel.send(`${inboundMessage.author} User ${userId} was not found.`);
                }
            }
        } else {
            inboundMessage.channel.send(`${inboundMessage.author} Please enter an osu! User ID.`);
        }
    } else {
        inboundMessage.channel.send(`${inboundMessage.author} You need to be premium to use this command.`);
    }
}
