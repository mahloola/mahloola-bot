import { getDiscordUser } from '../../db/database';

export async function premium(interaction, serverPrefix) {
    // let discordId = inboundMessage.content.substring(8 + serverPrefix.length);
    // if (!discordId) {
    //     discordId = inboundMessage.author.id;
    // }
    // if (discordId.includes('@everyone') || discordId.includes('@here')) {
    //     inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
    //     return;
    // } else {
        let discordId = interaction.user.id;
        const user = await getDiscordUser(discordId);
        if (user) {
            const currentDate = new Date().getTime();
            if (user.premium > currentDate) {
                interaction.reply(
                    `${
                        interaction.user.id === discordId
                            ? 'You currently have'
                            : `${interaction.user} currently has`
                    } premium valid until <t:${user.premium.toString().slice(0, -3)}:f>.`
                );
            } else {
                interaction.reply(
                    `${interaction.user} ${user.discord.username} does not currently have mahloola BOT premium.`
                );
            }
        } else {
            interaction.reply(`${interaction.user} User ${discordId} was not found in the database.`);
        }
    // }
}
