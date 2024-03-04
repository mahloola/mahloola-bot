import Discord from "discord.js";

const createEmbed = (title, color, author, thumbnail, description, footer) => {
    const embed = new Discord.EmbedBuilder();
    embed.setTitle(title);
    embed.setColor(color);
    embed.setAuthor(author);
    embed.setThumbnail(thumbnail);
    embed.setDescription(description);
    embed.setFooter(footer);
    embed.setTimestamp(Date.now());
    return embed;
}

export default createEmbed;