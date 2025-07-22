import Discord from 'discord.js';
import { setDiscordUser } from '../../db/database.js';

export async function donate(interaction: Discord.CommandInteraction<Discord.CacheType>) {
    await setDiscordUser(interaction.user.toJSON());
    const embed = new Discord.EmbedBuilder();
    embed.setThumbnail(
        `https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`
    );
    embed.setAuthor({
        name: `${interaction.user.username}`,
        iconURL: interaction.user.avatarURL(),
        url: interaction.user.avatarURL(),
    });
    embed.setDescription(
        `${interaction.user}, here's your donation link:\nhttps://www.paypal.com/donate/?hosted_button_id=98KA8SY4NNL8U`
    );
    embed.setFooter({
        text: 'donation perks can be seen in ;perks',
        iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png`,
    });
    embed.setColor('#D9A6BD');
    interaction.reply({ embeds: [embed] });
}
