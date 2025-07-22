import auth from '../../config/auth.js';
import { getDiscordUser, setPremium } from '../../db/database.js';
const { adminDiscordId } = auth;

export async function givepremium(inboundMessage, serverPrefix) {
    if (inboundMessage.author.id !== adminDiscordId) {
        inboundMessage.channel.send('You need to be mahloola to use this command.');
        return;
    } else {
        const discordId = inboundMessage.content.substring(12 + serverPrefix.length);
        const user = await getDiscordUser(discordId);
        if (user) {
            setPremium(user, 1).then(() => {
                inboundMessage.channel.send(
                    `${inboundMessage.author} Successfully gave **${user.discord.username}** one month of mahloola BOT premium.`
                );
            });
        } else {
            inboundMessage.channel.send(`${inboundMessage.author} Discord user was not found.`);
        }
    }
}
