import Discord from 'discord.js';
import { getLeaderboardData, getPlayer, getPlayerByUsername } from '../../db/database';

export async function rolled(interaction, serverPrefix, name) {
    const lbData = await getLeaderboardData('rolled');
    if (name) {
        if (name.includes('@everyone') || name.includes('@here')) {
            interaction.reply(`${interaction.user} mahloola knows your tricks`);
            return;
        } else {
            const player = await getPlayerByUsername(name);
            if (player) {
                lbData.players[player.apiv2.id] === 1
                    ? interaction.reply(
                          `${interaction.user} ${player.apiv2.username} has been rolled once.`
                      )
                    : lbData.players[player.apiv2.id] > 1
                    ? interaction.reply(
                          `${interaction.user} ${player.apiv2.username} has been rolled ${
                              lbData.players[player.apiv2.id]
                          } times.`
                      )
                    : interaction.reply(
                          `${interaction.user} ${player.apiv2.username} has never been rolled.`
                      );
            } else {
                interaction.reply(`${interaction.user} Player "${name}" was not found.`);
            }
        }
    } else {
        const players = lbData.players;
        let sortedPlayerIds = Object.keys(players).sort((id1, id2) => players[id2] - players[id1]);
        // create the embed message
        const embed = new Discord.EmbedBuilder();

        embed.setTitle(`Global Rolled Leaderboard`);
        embed.setColor('#D9A6BD');
        embed.setAuthor({
            name: `${interaction.user.username}`,
            iconURL: interaction.user.avatarURL(),
            url: interaction.user.avatarURL(),
        });
        embed.setThumbnail(
            `https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`
        );
        let embedDescription = `\`\`\`Player          | Times Rolled\n`;
        embedDescription += `---------------------\n`;

        sortedPlayerIds = sortedPlayerIds.slice(0, 10);
        for (let i = 0; i < sortedPlayerIds.length; i++) {
            const playerObject = await getPlayer(sortedPlayerIds[i]);
            const username = playerObject.apiv2.username;
            let spaces = '';
            for (let i = 0; i < 16 - username.length; i++) {
                spaces += ' ';
            }
            embedDescription += `${username}${spaces}| ${players[sortedPlayerIds[i]]}\n`;
        }
        embedDescription += `\`\`\``;
        embed.setDescription(`${embedDescription}`);
        embed.setTimestamp(Date.now());
        // send the message
        interaction.reply({ embeds: [embed] });
    }
}
