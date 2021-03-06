import Discord, { Intents } from 'discord.js';
import { getServerUserDoc, getServerUserIds, getServerUserRef, updateUserElo } from '../../db/database';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

export async function lb(inboundMessage) {
    // get every user ID in the server
    const userIds = await getServerUserIds(inboundMessage.channel.guildId);
    const users = [];

    console.log(`${inboundMessage.author.username} used ;leaderboard in ${inboundMessage.guild.name}.`);

    //
    for (let i = 0; i < userIds.length; i++) {
        // get a specific user (to check if they have 10+ cards)
        const user = await getServerUserDoc(inboundMessage.channel.guildId, userIds[i]);

        await updateUserElo(inboundMessage.channel.guildId, userIds[i]);

        // if the user has 10+ cards
        if (user.elo != undefined) {
            // get their discord info
            const userDiscordInfo = await client.users.fetch(userIds[i]);
            const userDiscordInfoJSON = userDiscordInfo.toJSON();

            const userRef = await getServerUserRef(inboundMessage.channel.guildId, userIds[i]);

            // set discord info in the database
            await userRef.set({ discord: userDiscordInfoJSON }, { merge: true });
            // finally, push all the qualified users to an array
            users.push(user);
        }
    }

    // sort qualified users by elo
    const sortedUsers = users.sort((a, b) => {
        return a.elo - b.elo;
    });

    // create the embed message
    const embed = new Discord.MessageEmbed();

    // populate the embed message
    embed.setTitle(`${inboundMessage.guild.name} Leaderboard`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
        iconURL: inboundMessage.author.avatarURL(),
        url: inboundMessage.author.avatarURL(),
    });
    embed.setThumbnail(inboundMessage.guild.iconURL());
    let embedDescription = `\`\`\`#    | User\n`;
    embedDescription += `----------------\n`;
    sortedUsers.slice(0, 10).forEach((player) => {
        switch (player.elo.toFixed(0).toString().length) {
            // determine how many spaces to add for table alignment
            case 1:
                embedDescription += `${player.elo.toFixed(0)}    | ${player.discord.username} \n`;
                break;
            case 2:
                embedDescription += `${player.elo.toFixed(0)}   | ${player.discord.username} \n`;
                break;
            case 3:
                embedDescription += `${player.elo.toFixed(0)}  | ${player.discord.username} \n`;
                break;
            case 4:
                embedDescription += `${player.elo.toFixed(0)} | ${player.discord.username} \n`;
                break;
        }
    });

    embedDescription += `\`\`\``;
    embed.setDescription(`${embedDescription}`);
    embed.setFooter({
        text: `own 10+ cards to show up here`,
        iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png`,
    });
    embed.setTimestamp(Date.now());

    // send the message
    inboundMessage.channel.send({ embeds: [embed] });
}
