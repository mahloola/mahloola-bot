import Discord from 'discord.js';
export async function perks(inboundMessage) {
    const embed = new Discord.MessageEmbed();
    embed.setTitle('Donation Perks');
    embed.setThumbnail(
        `https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`
    );
    embed.setAuthor({
        name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
        iconURL: inboundMessage.author.avatarURL(),
        url: inboundMessage.author.avatarURL(),
    });
    const description = `
**For $3 a month**:
• 12 rolls instead of 10 per hour
• Add 3 custom users to the database per week

**One-time Purchases**:
• $5 - Customize your card
• $5 - Add 3 players to the database (no limit)
`;
    embed.setDescription(description);
    embed.setColor('#D9A6BD');
    inboundMessage.channel.send({ embeds: [embed] });
}
