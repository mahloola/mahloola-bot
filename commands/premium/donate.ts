import Discord, { Intents } from 'discord.js';
import { setDiscordUser } from '../../db/database';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

export async function donate(inboundMessage) {
    const user = await client.users.fetch(inboundMessage.author.id);
    await setDiscordUser(user.toJSON());
    const embed = new Discord.MessageEmbed();
    embed.setThumbnail(
        `https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`
    );
    embed.setAuthor({
        name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
        iconURL: inboundMessage.author.avatarURL(),
        url: inboundMessage.author.avatarURL(),
    });
    embed.setDescription(
        `${inboundMessage.author}, here's your donation link:\nhttps://www.paypal.com/donate/?hosted_button_id=98KA8SY4NNL8U`
    );
    embed.setFooter({
        text: 'donation perks can be seen in ;perks',
        iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png`,
    });
    embed.setColor('#D9A6BD');
    inboundMessage.channel.send({ embeds: [embed] });
}
