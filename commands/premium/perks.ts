import Discord from 'discord.js';
export async function perks(interaction) {
    const embed = new Discord.EmbedBuilder();
    embed.setTitle('Donation Perks');
    embed.setThumbnail(
        `https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`
    );
    embed.setAuthor({
        name: `${interaction.user.username}`,
        iconURL: interaction.user.avatarURL(),
        url: interaction.user.avatarURL(),
    });
    const description = `
**For $3 a month**:
• 12 rolls instead of 10 per hour
• Add 3 custom users to the database per week
• Pin up to 15 players instead of 10

**One-time Purchases**:
• $5 - Customize your card
• $5 - Add 3 players to the database (no limit)
`;
    embed.setDescription(description);
    embed.setColor('#D9A6BD');
    interaction.reply({ embeds: [embed] });
}
