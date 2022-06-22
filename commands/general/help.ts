import Discord from 'discord.js';

export async function help(inboundMessage) {
    const description = `
    **Card-Related**
    \`roll:\` Roll for a top 10,000 player. Claim by reacting with 👍
    \`rolls:\` Check your available rolls.
    \`claim:\` Check when your next claim is available.
    \`cards:\` Display all of your owned cards.
    \`pin *username*:\` Pin cards to the top of your cards page.
    \`unpin *username*:\` Remove pins from your cards page.
    \`view *username*:\` View a player card.
    \`claimed *username*:\` Display the times a user has been claimed.
    \`claimed:\` Display the most claimed players.
    \`rolled *username*:\` Display the times a user has been rolled.
    \`rolled:\` Display the most rolled players.
    \`avg:\` Display the average rank in your top 10 cards.
    \`lb:\` Display server leaderboard based on top 10 card rankings.\n 
    **General**
    \`help:\` Display all commands.
    \`prefix:\` Change the bot prefix (must be an administrator).
    \`stats:\` Display global bot stats.
    \`mystats:\` Display your mahloola BOT stats across all servers.
    \`msg *message*:\` Send a direct message to mahloola about the bot.\n
    **Premium**
    \`donate:\` Support mahloola BOT through Paypal. Premium costs $3.
    \`perks:\` Read a list of perks that are available through donations.
    \`premium:\` Check your current premium status.
    \`add:\` Add a new player to the database (out of top 10k/inactive).\n
    **Discord**
    https://discord.gg/DGdzyapHkW
        `;
    const embed = new Discord.MessageEmbed();

    embed.setTitle(`mahloola BOT commands`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
        iconURL: inboundMessage.author.avatarURL(),
        url: inboundMessage.author.avatarURL(),
    });
    embed.setThumbnail(
        `https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`
    );
    embed.setDescription(description);
    embed.setTimestamp(Date.now());

    // send the message
    inboundMessage.channel.send({ embeds: [embed] });
}
