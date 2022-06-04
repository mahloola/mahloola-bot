import Discord from 'discord.js';
import { MessageAttachment, Intents } from 'discord.js'
import { initializeDatabase, getPlayerByRank, getPlayerByUsername, getOwnedPlayers,
    setOwnedPlayer, getPlayer, setPlayerClaimCounter, setPlayerRollCounter,
    getDatabaseStatistics, setDatabaseStatistics, updateDatabaseStatistics,
    getServerStatistics, setServerStatistics, updateServerStatistics,
    setPinnedPlayer, getPinnedPlayers, deletePinnedPlayer, getServerUsersRef,
    getServerUserRef, getServerUserDoc, getServerUserIds, getServersRef,
    getServerDoc, updateUserElo, updateUserEloByPlayers, setRollResetTime,
    setRolls, setClaimResetTime, getLeaderboardData, setPrefix }
    from './db/database'
import { createPlayerCard } from './image/jimp'
// import paginationEmbed from 'discord.js-pagination';
import { defaultPrefix, token, workflow } from './auth.json'

const client = new Discord.Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const ADMIN_DISCORD_ID = "198773384794996739";
let serverPrefix;

client.on("ready", async function () {
    const db = initializeDatabase();

    const databaseStatistics = await getDatabaseStatistics();
    const statisticsVersion = workflow === 'development' ? 'Testing' : 'Current';
    console.log(`\n${statisticsVersion} Statistics\n------------------\nRolls   | ${databaseStatistics.rolls}\nServers | ${databaseStatistics.servers}\nUsers   | ${databaseStatistics.users}\nPlayers | ${databaseStatistics.players}`);

    client.on('messageCreate', async (inboundMessage) => {
        const serverDoc = await getServerDoc(inboundMessage.guild.id);
        if (serverDoc) {
            if (serverDoc.prefix === undefined) {
                serverPrefix = defaultPrefix;
            }
            else {
                serverPrefix = serverDoc.prefix;
            }
            serverPrefix = (serverDoc.prefix === undefined ? defaultPrefix : serverDoc.prefix);
        }
        else {
            serverPrefix = defaultPrefix;
        }
        // if the message either doesn't start with the prefix or was sent by a bot, exit early
        if (!inboundMessage.content.startsWith(serverPrefix) || inboundMessage.author.bot) return;

        const args = inboundMessage.content.slice(serverPrefix.length).trim().split(/ +/);
        const commandText = args.shift().toLowerCase(); // make lowercase work too

        const commandMapping = {
            ['roll']: roll,
            ['r']: roll,
            ['rolls']: rolls,
            ['claim']: claim,
            ['cards']: cards,
            ['stats']: stats,
            ['trade']: trade,
            ['avg']: avg,
            ['pin']: pin,
            ['unpin']: unpin,
            ['claimed']: claimed,
            ['rolled']: rolled,
            ['help']: help,
            ['commands']: help,
            ['leaderboard']: leaderboard,
            ['lb']: leaderboard,
            ['prefix']: prefix,
            ['updatestats']: updatestats
        }
        const command = commandMapping[commandText];
        if (command) {
            try {
                await command(inboundMessage, db, databaseStatistics);
            } catch (err) {
                console.trace();
                console.log(err);
            }
        }
    })
})
client.login(token);

const roll = async (inboundMessage, db, databaseStatistics) => {

    let player;
    const timestamp = new Date();
    const currentTime = timestamp.getTime();

    // const serversRef = (workflow === 'development') ? db.collection("testing-servers") : db.collection("servers");
    // const serverDoc = serversRef.doc(inboundMessage.guild.id.toString());
    // const usersRef = serverDoc.collection(inboundMessage.guild.id);
    // const userDoc = await usersRef.doc(inboundMessage.author.id.toString()).get();
    // let user = userDoc.exists ? await userDoc.data() : null;

    let user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
    let resetTime;
    let currentRolls;
    if (user) {
        resetTime = user.rollResetTime ? user.rollResetTime : 0;
        currentRolls = user.rolls ? user.rolls : 0;
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
    if (currentTime > resetTime) {
        currentRolls = 10;
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 10);
        await setRollResetTime(inboundMessage.guild.id, inboundMessage.author.id);
    }
    // exit if user does not have enough rolls
    if (currentRolls <= 0 && inboundMessage.author.id !== ADMIN_DISCORD_ID) {

        const resetTimeMs = user.rollResetTime;
        const timeRemaining = resetTimeMs - currentTime;
        const timeRemainingInMinutes = Number((timeRemaining / 60000).toFixed(0));
        if (timeRemainingInMinutes == 1 || timeRemainingInMinutes == 0) {
            inboundMessage.channel.send(`${inboundMessage.author} You've run out of rolls. Your rolls will restock in less than a minute.`);
        }
        else {
            inboundMessage.channel.send(`${inboundMessage.author} You've run out of rolls. Your rolls will restock in **${timeRemainingInMinutes} minutes**.`);
        }
        return;
    }

    // update user available rolls
    currentTime > resetTime ?
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 9) :
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, currentRolls - 1);

    // get a random player (rank 1 - 10,000)
    while (!player) {
        const rank = Math.floor(Math.random() * databaseStatistics.players) + 1;
        player = await getPlayerByRank(rank);
    }
    console.log(`${timestamp.toLocaleTimeString().slice(0, 5)} | ${inboundMessage.channel.guild.name}: ${inboundMessage.author.username} rolled ${player.apiv2.username}.`);

    // update statistics
    const statistics = await getDatabaseStatistics();
    statistics.rolls++;
    setDatabaseStatistics(statistics);
    // set the player claimed counter to 1 if they've never been claimed, or increment it if they've been claimed before
    player.claimCounter === undefined ? await setPlayerRollCounter(player, 1) : await setPlayerRollCounter(player, player.claimCounter + 1);

    await createPlayerCard(player.apiv2, player.claimCounter);
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
                const claimResetTime = claimingUserDoc.claimResetTime ? claimingUserDoc.claimResetTime : 0;
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
                    console.log(`${timestamp.toLocaleTimeString().slice(0, 5)} | ${inboundMessage.channel.guild.name}: ${claimingUser.username} claimed ${player.apiv2.username}.`);

                }
                else {
                    const timeRemaining = claimResetTime - currentTime;
                    const timeRemainingInMinutes = Number((timeRemaining / 60000).toFixed(0));
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
            .catch(error => console.error('Failed to clear reactions: DiscordAPIError: Missing Permissions'));
    }

};

const rolls = async (inboundMessage) => {
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

    const resetTime = new Date(resetTimestamp).getTime();
    const currentTime = new Date().getTime();
    if (currentTime > resetTime) {
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 10);
        currentRolls = 10;
    }

    const timeRemaining = resetTime - currentTime;
    const timeRemainingInMinutes = Number((timeRemaining / 60000).toFixed(0));
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
            inboundMessage.channel.send(`${inboundMessage.author} You've run out of rolls. Your rolls will restock in less than a minute.`);
        }
        else {
            inboundMessage.channel.send(`${inboundMessage.author} You've run out of rolls. Your rolls will restock in **${timeRemainingInMinutes} minutes**.`);
        }

    }

};
const claim = async (inboundMessage) => {
    const user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
    let resetTime;
    const currentTime = new Date().getTime();
    if (user) { // if user exists in the database
        resetTime = user.claimResetTime;
    }
    else { // if user doesn't exist yet 
        await setClaimResetTime(inboundMessage.channel.guildId, inboundMessage.author.id, currentTime);
        resetTime = currentTime;
    }
    if (currentTime > resetTime) { // if user is past their cooldown
        await setClaimResetTime(inboundMessage.channel.guildId, inboundMessage.author.id, currentTime); // set their reset time to 'now'
        resetTime = currentTime;
    }
    const timeRemaining = resetTime - currentTime;
    const timeRemainingInMinutes = Number((timeRemaining / 60000).toFixed(0));
    if (timeRemainingInMinutes > 1) {
        inboundMessage.channel.send(`${inboundMessage.author} You have **${timeRemainingInMinutes}** minutes left until you can claim again.`);
    }
    else if (timeRemainingInMinutes === 1) {
        inboundMessage.channel.send(`${inboundMessage.author} You can claim again in one minute.`);
    }
    else if (timeRemainingInMinutes < 1 && timeRemainingInMinutes > 0) {
        inboundMessage.channel.send(`${inboundMessage.author} You have less than a minute left until you can claim again.`);
    }
    else {
        inboundMessage.channel.send(`${inboundMessage.author} You can claim now.`);
    }
}
const cards = async (inboundMessage) => {
    let discordUserId;
    let discordUser;
    if (inboundMessage.content.length > (6 + serverPrefix.length)) {
        let discordUsername;
        if (discordUsername === '@everyone' || discordUsername === '@here') {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        }
        else {
            if (inboundMessage.mentions.users.first()) {
                discordUser = inboundMessage.mentions.users.first();
            }
            else {
                discordUsername = inboundMessage.content.substring(6 + serverPrefix.length);
                discordUser = await client.users.cache.find(user => user.username == discordUsername);
            }
            if (discordUser) {
                discordUserId = discordUser.id;
            } else {
                inboundMessage.channel.send(`${inboundMessage.author} User "${discordUsername}" was not found. (check capitalization)`);
                return;
            }
        }
    }
    else {
        discordUserId = inboundMessage.author.id
        discordUser = inboundMessage.author
    }
    const playerIds = await getOwnedPlayers(inboundMessage.guild.id, discordUserId, 10);

    // check if user owns anybody first
    if (!playerIds) {
        discordUserId == inboundMessage.author.id ? inboundMessage.channel.send("You don't own any players.") : inboundMessage.channel.send(`${discordUser.username} doesn't own any players.`)
        return;
    }
    // get full list of players
    const ownedPlayersNames = [];
    const ownedPlayersRanks = [];

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
    const pinnedPlayerIds = await getPinnedPlayers(inboundMessage.guild.id, discordUserId, 10);

    const pinnedPlayerPromises = [];

    if (pinnedPlayerIds) {
        for (const id of pinnedPlayerIds) {
            pinnedPlayerPromises.push(getPlayer(id));
        }
    }
    const pinnedPlayers = await Promise.all(pinnedPlayerPromises);

    // get the top 10 average
    const elo = await updateUserEloByPlayers(inboundMessage.guild.id, discordUserId, ownedPlayers);
    const eloDisplay = elo == null ? "N/A" : elo;

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
    const embed = new Discord.MessageEmbed();

    // add the rest of the information
    embed.setTitle(`${discordUser.username}'s cards`)
    embed.setColor('#D9A6BD')
    embed.setAuthor({ name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`, iconURL: inboundMessage.author.avatarURL(), url: inboundMessage.author.avatarURL() })
    embed.setThumbnail(discordUser.avatarURL())
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
};

const stats = async (inboundMessage) => {
    // create the embed message

    const statistics = await getDatabaseStatistics();
    //inboundMessage.channel.send(`Total Users: ${statistics.users}\nTotal Servers: ${statistics.servers}\nTotal Rolls: ${statistics.rolls}`)
    const description = `
**Users**: ${statistics.users}
**Servers**: ${statistics.servers}
**Rolls**: ${statistics.rolls}
**Players**: ${statistics.players}
`;
    const embed = new Discord.MessageEmbed();

    embed.setTitle(`mahloola BOT Global Stats`)
    embed.setColor('#D9A6BD')
    embed.setAuthor({ name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`, iconURL: inboundMessage.author.avatarURL(), url: inboundMessage.author.avatarURL() })
    embed.setThumbnail(`https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`)
    embed.setDescription(description)
    embed.setFooter({ text: `'players' refers to cards you can roll`, iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png` })
    embed.setTimestamp(Date.now())

    // send the message
    inboundMessage.channel.send({ embeds: [embed] });
    //updateStatistics();

};

const trade = async (inboundMessage) => {
    const user = inboundMessage.author;
    const serverId = inboundMessage.guild.id
    inboundMessage.channel.send(`${user}, who would you like to trade with?`);
    const userResponse = await inboundMessage.channel.awaitMessages({
        filter: (sender) => { return sender.author.id == user.id },
        max: 1,
        time: 30000,
        errors: ['time']
    });

    inboundMessage.channel.send("lol this command doesn't work yet");
    //inboundMessage.channel.send(await getServerUser(serverId, user.id).ownedPlayers[0]);
    const user2 = await getServerUserDoc(serverId, user.id).catch((err) => console.error(`Couldn't retrieve user ${user.id}: ${err}`))
    //inboundMessage.channel.send(`${user}, who would you like to trade with?`);
    //let user2 = await getServerUsers(serverId).where(userResponse.first().content, '==', getServerUserDoc(serverId, user.id).apiv2.username);
};

const avg = async (inboundMessage) => {
    const elo = await updateUserElo(inboundMessage.channel.guildId, inboundMessage.author.id);
    if (elo == null) {
        inboundMessage.channel.send("You are unranked; you need to own at least 10 players.");
    }
    else {
        inboundMessage.channel.send(`${inboundMessage.author} Your top 10 average is **${elo.toString()}**.`);
    }
};

const pin = async (inboundMessage) => {
    const username = inboundMessage.content.substring(4 + serverPrefix.length);
    if (username) {
        if (username === '@everyone' || username === '@here') {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        }
        else {
            const player = await getPlayerByUsername(username);
            if (player) {
                const user = await getServerUserDoc(inboundMessage.channel.guildId, inboundMessage.author.id);
                const validFlag = user?.ownedPlayers?.includes(player.apiv2.id);
                if (validFlag) {
                    await setPinnedPlayer(inboundMessage.channel.guildId, inboundMessage.author.id, player.apiv2.id).catch(err => console.error(err));
                    inboundMessage.channel.send(`${inboundMessage.author} pinned ${username} successfully.`)
                }
                else {
                    inboundMessage.channel.send(`${inboundMessage.author} You do not own a player with the username "${username}". (check capitalization)`);
                }
            }
            else {
                inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found. (check capitalization)`);
            }
        }

    }
    else {
        inboundMessage.channel.send(`${inboundMessage.author} Please enter the username of the player you want to pin.`)
    }

};

const unpin = async (inboundMessage) => {
    const username = inboundMessage.content.substring(6 + serverPrefix.length);
    if (username) {
        if (username === '@everyone' || username === '@here') {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        }
        else {
            const player = await getPlayerByUsername(username);
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
                inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found. (check capitalization)`);
            }
        }
    }
    else {
        inboundMessage.channel.send(`${inboundMessage.author} Please enter the username of the player you want to unpin.`)
    }

};

const claimed = async (inboundMessage) => {
    const lbData = await getLeaderboardData("claimed");
    if (inboundMessage.content.length > (8 + serverPrefix.length)) {
        const username = inboundMessage.content.substring(8 + serverPrefix.length);
        if (username === '@everyone' || username === '@here') {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        }
        else {
            const player = await getPlayerByUsername(username);
            if (player) {
                lbData.players[player.apiv2.id] === 1 ? inboundMessage.channel.send(`${inboundMessage.author} ${player.apiv2.username} has been claimed once.`)
                    : lbData.players[player.apiv2.id] > 1 ? inboundMessage.channel.send(`${inboundMessage.author} ${player.apiv2.username} has been claimed ${lbData.players[player.apiv2.id]} times.`)
                        : inboundMessage.channel.send(`${inboundMessage.author} ${player.apiv2.username} has never been claimed.`);
            }
            else {
                inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found. (check capitalization)`);
            }
        }
    }
    else {

        const players = lbData.players;
        let sortedPlayerIds = Object.keys(players).sort((id1, id2) => players[id2] - players[id1])
        // create the embed message
        const embed = new Discord.MessageEmbed();

        // populate the embed message
        embed.setTitle(`Global Claim Leaderboard`)
        embed.setColor('#D9A6BD')
        embed.setAuthor({ name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`, iconURL: inboundMessage.author.avatarURL(), url: inboundMessage.author.avatarURL() })
        embed.setThumbnail(`https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`);
        let embedDescription = `\`\`\`Player          | Times Claimed\n`;
        embedDescription += `---------------------\n`;

        sortedPlayerIds = sortedPlayerIds.slice(0, 10);
        for (let i = 0; i < sortedPlayerIds.length; i++) {
            const playerObject = await getPlayer(sortedPlayerIds[i]);
            const username = playerObject.apiv2.username;
            let spaces = '';
            for (let i = 0; i < (16 - username.length); i++) {
                spaces += ' ';
            }
            //console.log(players[sortedPlayerIds[i]]);
            embedDescription += `${username}${spaces}| ${players[sortedPlayerIds[i]]}\n`;
        }
        embedDescription += `\`\`\``
        embed.setDescription(`${embedDescription}`)
        embed.setFooter({ text: `this command may take a while`, iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png` })
        embed.setTimestamp(Date.now())

        // send the message
        inboundMessage.channel.send({ embeds: [embed] });
    }
}
const rolled = async (inboundMessage) => {
    inboundMessage.channel.send(`This feature is temporarily disabled until the data is fixed.`);
    // const lbData = await getLeaderboardData("rolled");
    // if (inboundMessage.content.length > (8 + serverPrefix.length)) {
    //     let username = inboundMessage.content.substring(7 + serverPrefix.length);
    //     if (username === '@everyone' || username === '@here') {
    //         inboundMessage.channel.send(`${inboundMessage.author} u think ur sneaky`);
    //         return;
    //     }
    //     else {
    //         const player = await getPlayerByUsername(username);
    //         if (player) {
    //             lbData.players[player.apiv2.id] === 1 ? inboundMessage.channel.send(`${inboundMessage.author} ${player.apiv2.username} has been rolled once.`)
    //                 : lbData.players[player.apiv2.id] > 1 ? inboundMessage.channel.send(`${inboundMessage.author} ${player.apiv2.username} has been rolled ${lbData.players[player.apiv2.id]} times.`)
    //                     : inboundMessage.channel.send(`${inboundMessage.author} ${player.apiv2.username} has never been rolled.`);
    //         }
    //         else {
    //             inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found. (check capitalization)`);
    //         }
    //     }
    // }
    // else {
    //     const lb = await getLeaderboardData("rolled");
    //     let players = lb.players;
    //     let sortedPlayerIds = Object.keys(players).sort((id1, id2) => players[id2] - players[id1])
    //     // create the embed message
    //     let embed = new Discord.MessageEmbed();

    //     // populate the embed message
    //     embed.setTitle(`Global Rolled Leaderboard`)
    //     embed.setColor('#D9A6BD')
    //     embed.setAuthor({ name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`, iconURL: inboundMessage.author.avatarURL(), url: inboundMessage.author.avatarURL() })
    //     embed.setThumbnail(`https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`);
    //     let embedDescription = `\`\`\`Player          | Times Rolled\n`;
    //     embedDescription += `---------------------\n`;
    //     //console.log(sortedPlayerIds);
    //     sortedPlayerIds = sortedPlayerIds.slice(0, 10);
    //     for (let i = 0; i < sortedPlayerIds.length; i++) {
    //         const playerObject = await getPlayer(sortedPlayerIds[i]);
    //         const username = playerObject.apiv2.username;
    //         let spaces = '';
    //         for (let i = 0; i < (16 - username.length); i++) {
    //             spaces += ' ';
    //         }
    //         //console.log(players[sortedPlayerIds[i]]);
    //         embedDescription += `${username}${spaces}| ${players[sortedPlayerIds[i]]}\n`;
    //     }
    //     embedDescription += `\`\`\``
    //     embed.setDescription(`${embedDescription}`)
    //     embed.setFooter({ text: `this command may take a while`, iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png` })
    //     embed.setTimestamp(Date.now())

    //     // send the message
    //     inboundMessage.channel.send({ embeds: [embed] });
    // }
}
const prefix = async (inboundMessage) => {

    const newPrefix = inboundMessage.member.permissionsIn(inboundMessage.channel).has("ADMINISTRATOR") ? inboundMessage.content.substring(7 + serverPrefix.length) : null;
    if (newPrefix) {
        await setPrefix(inboundMessage.guild.id, newPrefix);
        inboundMessage.channel.send(`${inboundMessage.author} The mahloola BOT server prefix for ${inboundMessage.guild.name} has been set to \`${newPrefix}\`.`);
    }
    else {
        inboundMessage.channel.send(`${inboundMessage.author} You must be an administrator to change the prefix.`)
    }
}
const leaderboard = async (inboundMessage) => {

    // get every user ID in the server
    const userIds = await getServerUserIds(inboundMessage.channel.guildId);
    const users = [];

    console.log(`${inboundMessage.author.username} used ;leaderboard in ${inboundMessage.guild.name}.`);

    // 
    for (let i = 0; i < userIds.length; i++) {

        // get a specific user (to check if they have 10+ cards)
        const user = await getServerUserDoc(inboundMessage.channel.guildId, userIds[i]);

        // if the user has 10+ cards
        if (user.elo != undefined) {

            // get their discord info
            const userDiscordInfo = await client.users.fetch(userIds[i]);
            const userDiscordInfoJSON = userDiscordInfo.toJSON();

            // fix these fields because they can't be defined
            // userDiscordInfoJSON.banner = "";
            // userDiscordInfoJSON.accentColor = "";
            // userDiscordInfoJSON.hexAccentColor = "";
            // userDiscordInfoJSON.bannerURL = "";

            const userRef = await getServerUserRef(inboundMessage.channel.guildId, userIds[i]);

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
    const embed = new Discord.MessageEmbed();

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
const updatestats = async (inboundMessage) => {
    inboundMessage.channel.send(`${inboundMessage.author} Updating database statistics...`);
    updateDatabaseStatistics().then(async () => {
        inboundMessage.channel.send(`${inboundMessage.author} Database statistics have been updated.`);
    })
}
const help = async (inboundMessage) => {
    // create the embed message


    const description = `
**Card-Related**
\`roll:\` Roll for a top 10,000 player. Claim by reacting with 👍
\`rolls:\` Check your available rolls.
\`claim:\` Check when your next claim is available.
\`cards:\` Display all of your owned cards.
\`pin(username):\` Pin cards to the top of your cards page.
\`unpin(username):\` Remove pins from your cards page.
\`claimed(username):\` Display the times a user has been claimed.
\`claimed:\` Display the most claimed players.
\`rolled(username):\` Display the times a user has been rolled.
\`rolled:\` Display the most rolled players.
\`avg:\` Display the average rank in your top 10 cards.
\`lb:\` Display server leaderboard based on top 10 card rankings.\n 
**General**
\`help:\` Display all commands.
\`prefix:\` Change the bot prefix (must be an administrator).
\`stats:\` Display global bot stats.\n
**Discord**
https://discord.gg/DGdzyapHkW
    `;
    const embed = new Discord.MessageEmbed();

    embed.setTitle(`mahloola BOT commands`)
    embed.setColor('#D9A6BD')
    embed.setAuthor({ name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`, iconURL: inboundMessage.author.avatarURL(), url: inboundMessage.author.avatarURL() })
    embed.setThumbnail(`https://cdn.discordapp.com/attachments/656735056701685760/980370406957531156/d26384fbd9990c9eb5841d500c60cf9d.png`)
    embed.setDescription(description)
    embed.setTimestamp(Date.now())

    // send the message
    inboundMessage.channel.send({ embeds: [embed] });

};
