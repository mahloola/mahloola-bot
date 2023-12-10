import { getServerUserDoc } from '../../db/database';
import simplifiedPlayers from '../../db/simplifiedPlayers.json';
import Discord from 'discord.js';
export async function recent(interaction, serverPrefix, db, databaseStatistics, client) {
    const user = await getServerUserDoc(interaction.guild.id, interaction.user.id);
    const playerIds = user.ownedPlayers;
    const playerNames = [];
    const playerRanks = [];
    for (let i = 0; i < playerIds.length; i++) {
        if (simplifiedPlayers[playerIds[i]]) {
            playerNames.push(simplifiedPlayers[playerIds[i]][0]);
            playerRanks.push(simplifiedPlayers[playerIds[i]][1]);
        }
    }
    let description = '';
    const count = playerIds.length > 5 ? 5 : playerIds.length;
    for (let i = 0; i < count; i++) {
        description += `**${i + 1}**. ${playerNames[playerNames.length - i - 1]} (${
            playerRanks[playerRanks.length - i - 1] ? `#${playerRanks[playerRanks.length - i - 1]}` : `unranked`
        })\n ▸ <https://osu.ppy.sh/u/${playerIds[playerIds.length - i - 1]}>\n`;
    }

    const embed = new Discord.MessageEmbed();

    embed.setTitle(`Recent 5 Claims for ${interaction.user.username}`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${interaction.user.username}`,
        iconURL: interaction.user.avatarURL(),
        url: interaction.user.avatarURL(),
    });
    embed.setThumbnail(interaction.user.avatarURL());
    embed.setDescription(description.replaceAll('_', '\\_')); // fix usernames with underscores
    embed.setTimestamp(Date.now());
    interaction.reply({ embeds: [embed] });
}
