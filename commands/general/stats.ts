import Discord, { Message } from 'discord.js';
import { getDatabaseStatistics } from '../../db/database';

export async function stats(interaction) {
    // create the embed message

    const statistics = await getDatabaseStatistics();
    //inboundMessage.channel.send(`Total Users: ${statistics.users}\nTotal Servers: ${statistics.servers}\nTotal Rolls: ${statistics.rolls}`)
    const description = `
**Users**: ${statistics.users}
**Servers**: ${statistics.servers}
**Rolls**: ${statistics.rolls}
`;
    const embed = new Discord.EmbedBuilder();

    embed.setTitle(`mahloola BOT Global Stats`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${interaction.user.username}`,
        iconURL: interaction.user.avatarURL(),
        url: interaction.user.avatarURL(),
    });
    embed.setThumbnail(
        `https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`
    );
    embed.setDescription(description);
    embed.setFooter({
        text: `;updatestats to update`,
        iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png`,
    });
    embed.setTimestamp(Date.now());

    // send the message
    interaction.reply({ embeds: [embed] });
    //updateStatistics();
}
