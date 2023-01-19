import Discord, { Intents } from 'discord.js';
import { adminDiscordId } from '../../auth.json';

export async function msg(interaction, serverPrefix, db, databaseStatistics, client, msg) {
    const mahloola = client.users.cache.get(adminDiscordId);
    const embed = new Discord.MessageEmbed();
    embed.setTitle(`${interaction.user.username} from *${interaction.guild.name}* says:`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${interaction.user.username}#${interaction.user.discriminator}`,
        iconURL: interaction.user.avatarURL(),
        url: interaction.user.avatarURL(),
    });
    embed.setThumbnail(interaction.guild.iconURL());
    embed.setDescription(msg + `\nServer *${interaction.guild.id}*\nUser *${interaction.user.id}*`);
    embed.setTimestamp(Date.now());

    // send the message
    await mahloola.send({ embeds: [embed] });
    interaction.reply(`${interaction.user} Your message has been delivered to mahloola.`);
}
