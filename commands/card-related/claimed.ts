import Discord from 'discord.js';
import { getLeaderboardData, getPlayer, getPlayerByUsername } from '../../db/database';

export async function claimed(inboundMessage, serverPrefix) {
    const lbData = await getLeaderboardData('claimed');
    if (inboundMessage.content.length > 8 + serverPrefix.length) {
        const username = inboundMessage.content.substring(8 + serverPrefix.length);
        if (username.includes('@everyone') || username.includes('@here')) {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        } else {
            const player = await getPlayerByUsername(username);
            if (player) {
                lbData.players[player.apiv2.id] === 1
                    ? inboundMessage.channel.send(
                          `${inboundMessage.author} ${player.apiv2.username} has been claimed once.`
                      )
                    : lbData.players[player.apiv2.id] > 1
                    ? inboundMessage.channel.send(
                          `${inboundMessage.author} ${player.apiv2.username} has been claimed ${
                              lbData.players[player.apiv2.id]
                          } times.`
                      )
                    : inboundMessage.channel.send(
                          `${inboundMessage.author} ${player.apiv2.username} has never been claimed.`
                      );
            } else {
                inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found.`);
            }
        }
    } else {
        const players = lbData.players;
        let sortedPlayerIds = Object.keys(players).sort((id1, id2) => players[id2] - players[id1]);
        // create the embed message
        const embed = new Discord.MessageEmbed();

        // populate the embed message
        embed.setTitle(`Global Claim Leaderboard`);
        embed.setColor('#D9A6BD');
        embed.setAuthor({
            name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
            iconURL: inboundMessage.author.avatarURL(),
            url: inboundMessage.author.avatarURL(),
        });
        embed.setThumbnail(
            `https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`
        );
        let embedDescription = `\`\`\`Player          | Times Claimed\n`;
        embedDescription += `---------------------\n`;

        sortedPlayerIds = sortedPlayerIds.slice(0, 10);
        for (let i = 0; i < sortedPlayerIds.length; i++) {
            const playerObject = await getPlayer(sortedPlayerIds[i]);
            const username = playerObject.apiv2.username;
            let spaces = '';
            for (let i = 0; i < 16 - username.length; i++) {
                spaces += ' ';
            }
            //console.log(players[sortedPlayerIds[i]]);
            embedDescription += `${username}${spaces}| ${players[sortedPlayerIds[i]]}\n`;
        }
        embedDescription += `\`\`\``;
        embed.setDescription(`${embedDescription}`);
        embed.setFooter({
            text: `this command may take a while`,
            iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png`,
        });
        embed.setTimestamp(Date.now());

        // send the message
        inboundMessage.channel.send({ embeds: [embed] });
    }
}
