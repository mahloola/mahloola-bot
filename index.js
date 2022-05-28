const Discord = require('discord.js');
const { MessageAttachment, Intents } = require("discord.js");
const client = new Discord.Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const { initializeDatabase, getPlayerByRank, getPlayerByUsername, getOwnedPlayers, setOwnedPlayer,
    getPlayer, setPlayerClaimCounter, getDatabaseStatistics, setDatabaseStatistics, updateDatabaseStatistics, getServerStatistics, setServerStatistics, updateServerStatistics, setPinnedPlayer,
    getPinnedPlayers, deletePinnedPlayer, getServerUsersRef,
    getServerUserDoc, getServerUserIds, getUserRef, updateUserElo, updateUserEloByPlayers,
    setRollResetTime, setRolls, setClaimResetTime, getLeaderboardData } = require('./db/database');
const { createImage } = require('./image/jimp.js');
const paginationEmbed = require('discord.js-pagination');
const { prefix, token } = require('./auth.json');
const ADMIN_DISCORD_ID = "198773384794996739";

client.on("ready", async function () {
    initializeDatabase();
    updateDatabaseStatistics();
    let databaseStatistics = await getDatabaseStatistics();
    console.log(`\nCurrent Statistics\n------------------\nRolls   | ${databaseStatistics.rolls}\nServers | ${databaseStatistics.servers}\nUsers   | ${databaseStatistics.users}\n`);

    client.on('messageCreate', async (inboundMessage) => {
        // if the message either doesn't start with the prefix or was sent by a bot, exit early
        if (!inboundMessage.content.startsWith(prefix) || inboundMessage.author.bot) return;

        const args = inboundMessage.content.slice(prefix.length).trim().split(/ +/);
        const commandText = args.shift().toLowerCase(); // make lowercase work too

        const commandMapping = {
            ['roll']: roll,
            ['rolls']: rolls,
            ['cards']: cards,
            ['stats']: stats,
            ['trade']: trade,
            ['avg']: avg,
            ['pin']: pin,
            ['unpin']: unpin,
            ['claimed']: claimed,
            ['help']: help,
            ['commands']: help,
            ['leaderboard']: leaderboard,
            ['lb']: leaderboard
        }
        const command = commandMapping[commandText];
        if (command) {
            try {
                await command(inboundMessage, args);
            } catch (error) {
                console.trace();
                console.error(error);
            }
        }
    })
})
client.login(token);

const roll = async (inboundMessage, args) => {
    let user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
    let resetTime;
    let currentRolls;
    if (user) {
        resetTime = user.rollResetTime;
        currentRolls = user.rolls;
    }
    else {  // if user doesn't exist yet
        await setRollResetTime(inboundMessage.guild.id, inboundMessage.author.id);
        await setClaimResetTime(inboundMessage.guild.id, inboundMessage.author.id, 0);
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 10);
        user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
        currentRolls = user.rolls;
        resetTime = user.rollResetTime;
    }
    // if user is past their cooldown
    const timestamp = new Date();
    let currentTime = timestamp.getTime();
    if (currentTime > resetTime) {
        currentRolls = 10;
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 10);
        await setRollResetTime(inboundMessage.guild.id, inboundMessage.author.id);
    }
    // exit if user does not have enough rolls
    if (currentRolls <= 0 && inboundMessage.author.id !== ADMIN_DISCORD_ID) {
        let resetTimeMs = user.rollResetTime;
        let timeRemaining = resetTimeMs - currentTime;
        let timeRemainingInMinutes = (timeRemaining / 60000).toFixed(0);
        if (timeRemainingInMinutes == 1 || timeRemainingInMinutes == 0) {
            inboundMessage.channel.send(`${inboundMessage.author} You've run out of rolls. Your rolls will restock in one minute**.`);
        }
        else {
            inboundMessage.channel.send(`${inboundMessage.author} You've run out of rolls. Your rolls will restock in **${timeRemainingInMinutes} minutes**.`);
        }
        return;
    }

    // update statistics
    const statistics = await getDatabaseStatistics();
    statistics.rolls++;
    setDatabaseStatistics(statistics);

    // update user available rolls
    currentTime > resetTime ?
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 9) :
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, currentRolls - 1);

    // get a random player (rank 1 - 10,000)
    let player;
    while (!player) {
        const rank = Math.floor(Math.random() * 10000) + 1;
        player = await getPlayerByRank(rank);
    }
    console.log(`${timestamp.toLocaleTimeString().slice(0, 5)} | ${inboundMessage.channel.guild.name}: ${inboundMessage.author.username} rolled ${player.apiv2.username}.`);

    await createImage(player);
    const file = new MessageAttachment(`image/cache/osuCard-${player.apiv2.username}.png`);
    const outboundMessage = await inboundMessage.channel.send({ files: [file] })
    outboundMessage.react('👍');

    const reactions = await outboundMessage.awaitReactions({
        filter: (reaction, user) => user.id != outboundMessage.author.id && reaction.emoji.name == '👍',
        max: 1,
        time: 60000
    });

    const reaction = reactions.get('👍');
    try {
        const reactionUsers = await reaction.users.fetch();
        let claimingUser;
        for (const [userId, userObject] of reactionUsers) {
            if (userId !== outboundMessage.author.id) {
                const claimingUserDoc = await getServerUserDoc(outboundMessage.guild.id, userId);
                const claimResetTime = claimingUserDoc.claimResetTime;
                if (currentTime > claimResetTime || inboundMessage.author.id === ADMIN_DISCORD_ID) {
                    claimingUser = userObject;
                    await setOwnedPlayer(outboundMessage.guild.id, claimingUser.id, player.apiv2.id)
                        .then(async () => {
                            player.claimCounter === undefined ? await setPlayerClaimCounter(player, 1) : await setPlayerClaimCounter(player, player.claimCounter + 1);
                            if (claimingUserDoc.ownedPlayers === undefined) {
                                outboundMessage.channel.send(`**${player.apiv2.username}** has been claimed by **${claimingUser.username}**! You may claim **9** more cards with no cooldown.`);
                            }
                            else if (claimingUserDoc.ownedPlayers.length >= 9) {
                                await setClaimResetTime(outboundMessage.guild.id, claimingUser.id, (currentTime + 3600000));
                                outboundMessage.channel.send(`**${player.apiv2.username}** has been claimed by **${claimingUser.username}**!`);
                            }
                            else {
                                outboundMessage.channel.send(`**${player.apiv2.username}** has been claimed by **${claimingUser.username}**! You may claim **${9 - claimingUserDoc.ownedPlayers.length}** more cards with no cooldown.`);
                            }
                        })
                    console.log(`${timestamp.toLocaleTimeString().slice(0, 5)} | ${inboundMessage.channel.guild.name}: ${inboundMessage.author.username} claimed ${player.apiv2.username}.`);

                }
                else {
                    let timeRemaining = claimResetTime - currentTime;
                    let timeRemainingInMinutes = (timeRemaining / 60000).toFixed(0);
                    if (timeRemainingInMinutes == 1 || timeRemainingInMinutes == 0) {
                        outboundMessage.channel.send(`${userObject} You may claim again in **one** minute!`);
                    }
                    else {
                        outboundMessage.channel.send(`${userObject} You may claim again in **${(timeRemainingInMinutes)}** minutes!`);
                    }

                }
            }
        }

    } catch (error) {
        outboundMessage.reactions.removeAll()
            .catch(error => console.error('Failed to clear reactions:', error));
    }
};

const rolls = async (inboundMessage, args) => {
    let user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
    let currentRolls;
    let resetTimestamp;
    if (user) {
        currentRolls = user.rolls;
        resetTimestamp = user.rollResetTime;
    }
    else {
        await setRolls(inboundMessage.channel.guildId, inboundMessage.author.id, 10);
        await setRollResetTime(inboundMessage.channel.guildId, inboundMessage.author.id);
        currentRolls = 10;
        resetTimestamp = new Date().getTime();
        user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
    }

    let resetTime = new Date(resetTimestamp);
    const currentTime = new Date().getTime();
    if (currentTime > resetTime) {
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 10);
        currentRolls = 10;
    }

    let timeRemaining = resetTime - currentTime;
    let timeRemainingInMinutes = (timeRemaining / 60000).toFixed(0);
    if (currentRolls === 1) {
        inboundMessage.channel.send(`You have 1 final roll remaining. Your restock is in **${timeRemainingInMinutes}** minutes.`);
    }
    else if (currentRolls === 10 || resetTime === null) {
        inboundMessage.channel.send(`You have 10 rolls remaining.`);
    }
    else if (currentRolls > 0 && resetTime != null) {
        inboundMessage.channel.send(`You have ${currentRolls} rolls remaining. Your restock is in **${timeRemainingInMinutes}** minutes.`);
    }
    else {
        if (timeRemainingInMinutes == 1 || timeRemainingInMinutes == 0) {
            inboundMessage.channel.send(`${inboundMessage.author} You've run out of rolls. Your rolls will restock in one minute**.`);
        }
        else {
            inboundMessage.channel.send(`${inboundMessage.author} You've run out of rolls. Your rolls will restock in **${timeRemainingInMinutes} minutes**.`);
        }

    }

};

const cards = async (inboundMessage, args) => {
    let discordUserId;
    let discordUser;
    if (inboundMessage.content.length > (6 + prefix.length)) {
        let discordUsername;
        if (inboundMessage.mentions.users.first()) {
            discordUser = inboundMessage.mentions.users.first();
        }
        else {
            discordUsername = inboundMessage.content.substring(6 + prefix.length);
            discordUser = await client.users.cache.find(user => user.username == discordUsername);
        }
        discordUser ? discordUserId = discordUser.id : inboundMessage.channel.send(`${inboundMessage.author} User "${discordUsername}" was not found.`);
    }
    else {
        discordUserId = inboundMessage.author.id
    }
    let playerIds = await getOwnedPlayers(inboundMessage.guild.id, discordUserId, 10);

    // check if user owns anybody first
    if (!playerIds) {
        discordUserId == inboundMessage.author.id ? inboundMessage.channel.send("You don't own any players.") : inboundMessage.channel.send(`${discordUser.username} doesn't own any players.`)
        return;
    }
    // get full list of players
    let ownedPlayersNames = [];
    let ownedPlayersRanks = [];

    const ownedPlayerPromises = [];
    for (const id of playerIds) {
        ownedPlayerPromises.push(getPlayer(id));
    }
    const ownedPlayers = await Promise.all(ownedPlayerPromises);

    // sort players by rank
    ownedPlayers.sort((a, b) => {
        return a.apiv2.statistics.global_rank - b.apiv2.statistics.global_rank;
    });

    // store names and ranks into arrays for easier use
    for (let i = 0; i < playerIds.length; i++) {
        ownedPlayersNames.push(ownedPlayers[i].apiv2.username);
        ownedPlayersRanks.push(ownedPlayers[i].apiv2.statistics.global_rank);
    }

    // get pinned players
    let pinnedPlayerIds = await getPinnedPlayers(inboundMessage.guild.id, inboundMessage.author.id, 10);

    const pinnedPlayerPromises = [];

    if (pinnedPlayerIds) {
        for (const id of pinnedPlayerIds) {
            pinnedPlayerPromises.push(getPlayer(id));
        }
    }
    const pinnedPlayers = await Promise.all(pinnedPlayerPromises);

    // get the top 10 average
    const elo = await updateUserEloByPlayers(inboundMessage.guild.id, inboundMessage.author.id, ownedPlayers);
    let eloDisplay = elo == null ? "N/A" : elo;

    // create embed body
    let pinnedDescription = "";

    // sort pinned players
    pinnedPlayers.sort((a, b) => {
        return a.apiv2.statistics.global_rank - b.apiv2.statistics.global_rank;
    });

    // add pinned players to embed if the user has any
    if (pinnedPlayers) {
        pinnedPlayers.forEach(player => (pinnedDescription += `**${player.apiv2.statistics.global_rank}** • ${player.apiv2.username}\n`));
    }

    // add all players to embed
    let embedDescription = "";
    ownedPlayers.slice(0, 10).forEach(player => {
        embedDescription += `**${player.apiv2.statistics.global_rank}** • ${player.apiv2.username}\n`;
    });

    // create the embed message
    let embed = new Discord.MessageEmbed();

    // add the rest of the information
    embed.setTitle(`${inboundMessage.author.username}'s cards`)
    embed.setColor('#D9A6BD')
    embed.setAuthor({ name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`, iconURL: inboundMessage.author.avatarURL(), url: inboundMessage.author.avatarURL() })
    embed.setThumbnail(inboundMessage.author.avatarURL())
    embed.setDescription(`Top 10 Avg: **${eloDisplay}**\n`)
    if (pinnedPlayerIds?.length > 0) {
        embed.addField(`Pinned`, pinnedDescription);
        embed.addField(`All`, embedDescription)
    }
    else {
        embed.addField(`Players`, embedDescription)
    }
    embed.setTimestamp(Date.now())

    // send the message
    inboundMessage.channel.send({ embeds: [embed] });

    const embed2 = embed;
};

const stats = async (inboundMessage, args) => {
    //updateStatistics();
    let statistics = await getDatabaseStatistics();
    inboundMessage.channel.send(`Total Users: ${statistics.users}\nTotal Servers: ${statistics.servers}\nTotal Rolls: ${statistics.rolls}`)
};

const trade = async (inboundMessage, args) => {
    let user = inboundMessage.author;
    let serverId = inboundMessage.guild.id
    inboundMessage.channel.send(`${user}, who would you like to trade with?`);
    const userResponse = await inboundMessage.channel.awaitMessages({
        filter: (sender) => { return sender.author.id == user.id },
        max: 1,
        time: 30000,
        errors: ['time']
    });

    inboundMessage.channel.send("lol this command doesn't work yet");
    //inboundMessage.channel.send(await getServerUser(serverId, user.id).ownedPlayers[0]);
    let user2 = await getServerUserDoc(serverId, user.id).catch((err) => console.error(`Couldn't retrieve user ${user.id}: ${err}`))
    //inboundMessage.channel.send(`${user}, who would you like to trade with?`);
    //let user2 = await getServerUsers(serverId).where(userResponse.first().content, '==', getServerUserDoc(serverId, user.id).apiv2.username);
};

const avg = async (inboundMessage, args) => {
    const elo = await updateUserElo(inboundMessage.channel.guildId, inboundMessage.author.id);
    if (elo == null) {
        inboundMessage.channel.send("You are unranked; you need to own at least 10 players.");
    }
    else {
        inboundMessage.channel.send(`${inboundMessage.author} Your top 10 average is **${elo.toString()}**.`);
    }
};

const pin = async (inboundMessage, args) => {
    let username = inboundMessage.content.substring(5);
    if (username) {
        let player = await getPlayerByUsername(username);
        if (player) {
            const user = await getServerUserDoc(inboundMessage.channel.guildId, inboundMessage.author.id);
            const validFlag = user?.ownedPlayers?.includes(player.apiv2.id);
            if (validFlag) {
                await setPinnedPlayer(inboundMessage.channel.guildId, inboundMessage.author.id, player.apiv2.id).catch(err => console.error(err));
                inboundMessage.channel.send(`${inboundMessage.author} pinned ${username} successfully.`)
            }
            else {
                inboundMessage.channel.send(`${inboundMessage.author} You do not own a player with the username "${username}".`);
            }
        }
        else {
            inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found.`);
        }
    }
    else {
        inboundMessage.channel.send(`${inboundMessage.author} Please enter the username of the player you want to pin.`)
    }

};

const unpin = async (inboundMessage, args) => {
    let username = inboundMessage.content.substring(7);
    if (username) {
        let player = await getPlayerByUsername(username);
        if (player) {
            const user = await getServerUserDoc(inboundMessage.channel.guildId, inboundMessage.author.id);
            const validFlag = user?.ownedPlayers?.includes(player.apiv2.id);
            if (validFlag) {
                await deletePinnedPlayer(inboundMessage.channel.guildId, inboundMessage.author.id, player.apiv2.id).catch(err => console.error(err));
                inboundMessage.channel.send(`${inboundMessage.author} unpinned ${username} successfully.`)
            }
            else {
                inboundMessage.channel.send(`${inboundMessage.author} You do not own a player with the username "${username}".`);
            }
        }
        else {
            inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found.`);
        }
    }
    else {
        inboundMessage.channel.send(`${inboundMessage.author} Please enter the username of the player you want to unpin.`)
    }

};

const claimed = async (inboundMessage, args) => {
    if (inboundMessage.content.length > (8 + prefix.length)) {
        let username = inboundMessage.content.substring(8 + prefix.length);
        const player = await getPlayerByUsername(username);
        if (player) {
            player.claimCounter === 1 ? inboundMessage.channel.send(`${player.apiv2.username} has been claimed once.`)
                : player.claimCounter > 1 ? inboundMessage.channel.send(`${player.apiv2.username} has been claimed ${player.claimCounter} times.`)
                    : inboundMessage.channel.send(`${player.apiv2.username} has never been claimed.`);
        }
        else {
            inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found.`);
        }

    }
    else {
        const lb = await getLeaderboardData("claimed");
        let players = lb.players;
        players.sort((a, b) => {
            return a.count - b.count;
        });
        // create the embed message
        let embed = new Discord.MessageEmbed();

        // populate the embed message
        embed.setTitle(`Claimed Leaderboard`)
        embed.setColor('#D9A6BD')
        embed.setAuthor({ name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`, iconURL: inboundMessage.author.avatarURL(), url: inboundMessage.author.avatarURL() })
        embed.setThumbnail(inboundMessage.guild.iconURL());
        let embedDescription = `\`\`\`Player          | Claimed\n`;
        embedDescription += `---------------------\n`;
        players = players.slice(0, 10);
        for (let i = 0; i < players.length; i++) {
            const playerObject = await getPlayer(players[i].playerId);
            const username = playerObject.apiv2.username;
            let spaces = '';
            for (let i = 0; i < (16 - username.length); i++) {
                spaces += ' ';
            }
            embedDescription += `${username}${spaces}| ${players[i].count.toFixed(0)}\n`;
        }
        embedDescription += `\`\`\``
        embed.setDescription(`${embedDescription}`)
        embed.setFooter({ text: `updated every server restart`, iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png` })
        embed.setTimestamp(Date.now())

        // send the message
        inboundMessage.channel.send({ embeds: [embed] });
    }
}

const leaderboard = async (inboundMessage, args) => {

    // get every user ID in the server
    let userIds = await getServerUserIds(inboundMessage.channel.guildId);
    let users = [];

    console.log(`${inboundMessage.author.username} used ;leaderboard in ${inboundMessage.guild.name}.`);

    // 
    for (let i = 0; i < userIds.length; i++) {

        // get a specific user (to check if they have 10+ cards)
        let user = await getServerUserDoc(inboundMessage.channel.guildId, userIds[i]);

        // if the user has 10+ cards
        if (user.elo != undefined) {

            // get their discord info
            const userDiscordInfo = await client.users.fetch(userIds[i]);
            const userDiscordInfoJSON = userDiscordInfo.toJSON();

            // fix these fields because they can't be defined
            userDiscordInfoJSON.banner = "";
            userDiscordInfoJSON.accentColor = "";
            userDiscordInfoJSON.hexAccentColor = "";
            userDiscordInfoJSON.bannerURL = "";

            const userRef = await getUserRef(inboundMessage.channel.guildId, userIds[i]);

            // set discord info in the database
            await userRef.set(
                { 'discord': userDiscordInfoJSON },
                { merge: true }
            );
            // finally, push all the qualified users to an array
            users.push(user);
        }
    }

    // sort qualified users by elo
    const sortedUsers = users.sort((a, b) => {
        return a.elo - b.elo;
    });

    // create the embed message
    let embed = new Discord.MessageEmbed();

    // populate the embed message
    embed.setTitle(`${inboundMessage.guild.name} Leaderboard`)
    embed.setColor('#D9A6BD')
    embed.setAuthor({ name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`, iconURL: inboundMessage.author.avatarURL(), url: inboundMessage.author.avatarURL() })
    embed.setThumbnail(inboundMessage.guild.iconURL());
    let embedDescription = `\`\`\`#    | User\n`;
    embedDescription += `----------------\n`;
    sortedUsers.slice(0, 10).forEach(player => {
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
    embedDescription += `\`\`\``
    embed.setDescription(`${embedDescription}`)
    embed.setFooter({ text: `own 10+ cards to show up here`, iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png` })
    embed.setTimestamp(Date.now())

    // send the message
    inboundMessage.channel.send({ embeds: [embed] });
}

const help = async (inboundMessage, args) => {
    inboundMessage.channel.send(`**Commands**\n\`\`\`
Card-Related
    roll: Roll for a top 10,000 player. Claim by reacting with 👍
    rolls: Check your available rolls.
    cards: Display all of your owned cards.
    pin(username): Pin cards to the top of your cards page by typing ;pin <username>.
    unpin(username): Remove pins from your cards page.
    claimed(optional:username): Display the most claimed players, or the number of times a specific user has been claimed.
    avg: Display the average rank in your top 10 cards.
    lb: Display server leaderboard based on users' top 10 card ranking.

General
    help: Display all commands.
    stats: Display global bot stats.
    \`\`\`
**Discord**
https://discord.gg/DGdzyapHkW`);
};
