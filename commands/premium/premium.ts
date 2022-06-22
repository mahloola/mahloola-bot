import { getDiscordUser } from '../../db/database';

export async function premium(inboundMessage, serverPrefix) {
    let discordId = inboundMessage.content.substring(8 + serverPrefix.length);
    if (!discordId) {
        discordId = inboundMessage.author.id;
    }
    if (discordId.includes('@everyone') || discordId.includes('@here')) {
        inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
        return;
    } else {
        const user = await getDiscordUser(discordId);
        if (user) {
            const currentDate = new Date().getTime();
            if (user.premium > currentDate) {
                inboundMessage.channel.send(
                    `${
                        inboundMessage.author.id === discordId
                            ? 'You currently have'
                            : `${inboundMessage.author} currently has`
                    } premium valid until <t:${user.premium.toString().slice(0, -3)}:f>.`
                );
            } else {
                inboundMessage.channel.send(
                    `${inboundMessage.author} ${user.discord.username} does not currently have mahloola BOT premium.`
                );
            }
        } else {
            inboundMessage.channel.send(`${inboundMessage.author} User ${discordId} was not found in the database.`);
        }
    }
}
