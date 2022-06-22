import Discord, { Intents } from 'discord.js';
import { adminDiscordId } from '../../auth.json';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

export async function msg(inboundMessage, serverPrefix) {
    const msg = inboundMessage.content.substring(serverPrefix.length + inboundMessage.content.split(' ')[0].length);
    const mahloola = client.users.cache.get(adminDiscordId);
    const embed = new Discord.MessageEmbed();
    embed.setTitle(`${inboundMessage.author.username} from *${inboundMessage.guild.name}* says:`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
        iconURL: inboundMessage.author.avatarURL(),
        url: inboundMessage.author.avatarURL(),
    });
    embed.setThumbnail(inboundMessage.guild.iconURL());
    embed.setDescription(msg);
    embed.setTimestamp(Date.now());

    // send the message
    await mahloola.send({ embeds: [embed] });
    inboundMessage.channel.send(`${inboundMessage.author} Your message has been delivered to mahloola.`);
}
