import Discord from 'discord.js';
import { getServerUserDoc, getServerUsers, getServerUserRef, updateUserElo } from '../../db/database';

export async function lb(interaction, serverPrefix, db, databaseStatistics, client) {
    // get every user ID in the server

    const serverUsers = await getServerUsers(interaction.channel.guildId);
    const users = [];

    console.log(`${interaction.user.username} used ;leaderboard in ${interaction.guild.name}.`);

    // THIS STEP TAKES FAR TOO MUCH TIME
    const t2 = Date.now();
    for (let i = 0; i < serverUsers.length; i++) {

        // get a specific user (to check if they have 10+ cards)
        const user = serverUsers[i];
        // await updateUserElo(interaction.channel.guildId, userIds[i]);

        // if the user has 10+ cards
        if (user.elo != undefined) {
            // get their discord info
            const userDiscordInfo = await client.users.fetch(user.discord.id);
            const userDiscordInfoJSON = userDiscordInfo.toJSON();

            const userRef = getServerUserRef(interaction.channel.guildId, user.discord.id);

            // set discord info in the database
            userRef.set({ discord: userDiscordInfoJSON }, { merge: true });
            // finally, push all the qualified users to an array
            users.push(user);
        }
    }
    console.log(Date.now() - t2);
    // sort qualified users by elo
    const sortedUsers = users.sort((a, b) => {
        return a.elo - b.elo;
    });

    
    // create the embed message
    const embed = new Discord.EmbedBuilder();

    // populate the embed message
    embed.setTitle(`${interaction.guild.name} Leaderboard`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${interaction.user.username}`,
        iconURL: interaction.user.avatarURL(),
        url: interaction.user.avatarURL(),
    });
    embed.setThumbnail(interaction.guild.iconURL());
    let embedDescription = `\`\`\`#    | User\n`;
    embedDescription += `----------------\n`;
    sortedUsers.slice(0, 10).forEach((player) => {
        embedDescription += `${player.elo.toString().padEnd(4)} | ${player.discord.username} \n`;
    });

    embedDescription += `\`\`\``;
    embed.setDescription(`${embedDescription}`);
    embed.setFooter({
        text: `own 10+ cards to show up here`,
        iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png`,
    });
    embed.setTimestamp(Date.now());

    // send the message
    interaction.reply({ embeds: [embed] });
    //interaction.reply("leaderboard command is under maintenance sorry gyze");
}
