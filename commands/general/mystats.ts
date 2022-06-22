import Discord from 'discord.js';
import { getDiscordUser } from '../../db/database';

export async function mystats(inboundMessage) {
    const user = await getDiscordUser(inboundMessage.author.id);
    const description = `
**Rolls**: ${user.rollCounter ?? 0}
**Claims**: ${user.claimCounter ?? 0}
`;
    const embed = new Discord.MessageEmbed();

    embed.setTitle(`${user.discord.username}'s Stats`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
        iconURL: inboundMessage.author.avatarURL(),
        url: inboundMessage.author.avatarURL(),
    });
    embed.setThumbnail(inboundMessage.author.avatarURL());
    embed.setDescription(description);
    embed.setTimestamp(Date.now());

    inboundMessage.channel.send({ embeds: [embed] });
}
