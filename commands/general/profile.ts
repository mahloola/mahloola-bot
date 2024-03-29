import Discord from 'discord.js';
import { getDiscordUser } from '../../db/database';

export async function profile(interaction) {
    const user = await getDiscordUser(interaction.user.id);
    const description = `
**Rolls**: ${user?.rollCounter.toLocaleString() ?? 0}
**Claims**: ${user?.claimCounter.toLocaleString() ?? 0}
`;
    const embed = new Discord.EmbedBuilder();

    embed.setTitle(`${user.discord.username}'s Stats`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${interaction.user.username}`,
        iconURL: interaction.user.avatarURL(),
        url: interaction.user.avatarURL(),
    });
    embed.setThumbnail(interaction.user.avatarURL());
    embed.setDescription(description);
    embed.setTimestamp(Date.now());

    interaction.reply({ embeds: [embed] });
}
