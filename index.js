const Discord = require('discord.js');
const { MessageAttachment, Intents } = require("discord.js");
const client = new Discord.Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const { initializeDatabase, getPlayerByRank, getOwnedPlayers, setOwnedPlayer,
    getPlayer, getDatabaseStatistics, setDatabaseStatistics, setPinnedPlayer,
    getPinnedPlayers, deletePinnedPlayer, getServers, getServerUsers,
    getServerUser, getUserRef, updateStatistics, updateUserElo, updateUserEloByPlayers,
    setResetTime, getResetTime, setRolls, getRolls } = require('./db/database');
const { createImage } = require('./image/jimp.js');
const paginationEmbed = require('discord.js-pagination');
const { prefix, token } = require('./auth.json');

client.on("ready", async function () {
    initializeDatabase();
    let statistics = await getDatabaseStatistics();
    console.log(`\nCurrent Statistics\n------------------\nRolls   | ${statistics.rolls}\nServers | ${statistics.servers}\nUsers   | ${statistics.users}\n`);

    client.on('messageCreate', async (inboundMessage) => {

        // if the message either doesn't start with the prefix or was sent by a bot, exit early
        if (!inboundMessage.content.startsWith(prefix) || inboundMessage.author.bot) return;

        const args = inboundMessage.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase(); // make lowercase work too

        // roll for a random player
        if (command === 'roll') {
            let resetTime = await getResetTime(inboundMessage.guild.id, inboundMessage.author.id);
            let currentRolls = await getRolls(inboundMessage.guild.id, inboundMessage.author.id);

            // if user doesn't exist yet
            if (resetTime === null || currentRolls === null || resetTime === undefined || currentRolls === undefined) {
                await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 5);
                await setResetTime(inboundMessage.guild.id, inboundMessage.author.id);
            }

            // if user is past their cooldown
            const timestamp = new Date();
            const currentTime = timestamp.getTime();
            if (currentTime > resetTime) {
                await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 5);
                await setResetTime(inboundMessage.guild.id, inboundMessage.author.id);
            }
            currentRolls = await getRolls(inboundMessage.guild.id, inboundMessage.author.id);
            // if user has available rolls
            if (currentRolls > 0) {
                // update statistics
                statistics.rolls++;
                setDatabaseStatistics(statistics);

                // update user available rolls

                console.log(`Rolls before: ${await getRolls(inboundMessage.guild.id, inboundMessage.author.id)}`)
                if (currentTime > resetTime) {
                    await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 4);
                }
                else {
                    await setRolls(inboundMessage.guild.id, inboundMessage.author.id, currentRolls - 1);
                }
                console.log(`Rolls now: ${await getRolls(inboundMessage.guild.id, inboundMessage.author.id)}`)

                // get a random player (rank 1 - 10,000)
                let player;
                while (!player) {
                    const rank = Math.floor(Math.random() * 10000) + 1;
                    player = await getPlayerByRank(rank);
                }
                console.log(`${inboundMessage.channel.guild.name}: ${inboundMessage.author.username} rolled ${player.apiv2.username}.`);

                if (player) {
                    await createImage(player);
                    const file = new MessageAttachment(`image/cache/osuCard-${player.apiv2.username}.png`);
                    const outboundMessage = await inboundMessage.channel.send({ files: [file] })
                    outboundMessage.react('👍');

                    const reactions = await outboundMessage.awaitReactions({
                        filter: (reaction, user) => user.id != outboundMessage.author.id && reaction.emoji.name == '👍',
                        max: 1,
                        time: 30000
                    });

                    const reaction = reactions.get('👍');
                    try {
                        const reactionUsers = await reaction.users.fetch();
                        let claimingUser;
                        for (const [userId, user] of reactionUsers) {
                            if (userId !== outboundMessage.author.id) {
                                claimingUser = user;
                            }
                        }
                        if (!claimingUser) {
                            outboundMessage.reply('Operation cancelled.');
                            return;
                        }

                        await setOwnedPlayer(outboundMessage.guild.id, claimingUser.id, player.apiv2.id);
                        //await updateUserElo(inboundMessage.guild.id, claimingUser.id);

                        //await setResetTime(outboundMessage.guild.id, claimingUser.id);
                        outboundMessage.channel.send(`**${player.apiv2.username}** has been claimed by **${claimingUser.username}**!`);
                    } catch (error) {
                        outboundMessage.reactions.removeAll()
                            .catch(error => console.error('Failed to clear reactions:', error));
                    }
                }
            }
            else {
                let resetTimeMs = await getResetTime(inboundMessage.channel.guildId, inboundMessage.author.id);
                let timeRemaining = resetTimeMs - currentTime;
                let timeRemainingInMinutes = (timeRemaining / 60000).toFixed(0);
                inboundMessage.channel.send(`You've run out of rolls. Your rolls will restock at **${timeRemainingInMinutes} minutes**.`);
            }
        }
        if (command === 'rolls') {
            let currentRolls = await getRolls(inboundMessage.channel.guildId, inboundMessage.author.id);
            let resetTimestamp = await getResetTime(inboundMessage.channel.guildId, inboundMessage.author.id);

            if (currentRolls === undefined || resetTimestamp === null || currentRolls === null || resetTimestamp === undefined) {
                await setRolls(inboundMessage.channel.guildId, inboundMessage.author.id, 5);
                await setResetTime(inboundMessage.channel.guildId, inboundMessage.author.id);
                currentRolls = await getRolls(inboundMessage.channel.guildId, inboundMessage.author.id);
                resetTimestamp = await getResetTime(inboundMessage.channel.guildId, inboundMessage.author.id);
            }

            let resetTime = new Date(resetTimestamp);
            const timestamp = new Date();
            const currentTime = timestamp.getTime();
            if (currentTime > resetTime) {
                const userRef = await getUserRef(inboundMessage.channel.guildId, inboundMessage.author.id);
                await userRef.set(
                    { 'resetTime': null },
                    { merge: true }
                );
            }

            let resetTimeMs = await getResetTime(inboundMessage.channel.guildId, inboundMessage.author.id);
            let timeRemaining = resetTimeMs - currentTime;
            let timeRemainingInMinutes = (timeRemaining / 60000).toFixed(0);
            if (currentRolls === 1) {
                inboundMessage.channel.send(`You have 1 final roll remaining. Your restock is in **${timeRemainingInMinutes}** minutes.`);
            }
            else if (currentRolls === 5 || resetTimeMs === null) {
                inboundMessage.channel.send(`You have 5 rolls remaining.`);
            }
            else if (currentRolls > 0 && resetTimeMs != null) {
                inboundMessage.channel.send(`You have ${currentRolls} rolls remaining. Your restock is in **${timeRemainingInMinutes}** minutes.`);
            }
            else {
                inboundMessage.channel.send(`You've run out of rolls. Your rolls will restock in **${timeRemainingInMinutes}** minutes.`);
            }

        }
        if (command === 'cards') {

            let playerIds = await getOwnedPlayers(inboundMessage.guild.id, inboundMessage.author.id, 10);

            // check if user owns anybody first
            if (playerIds) {
                try {

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

                }
                catch (err) {
                    console.log(err);
                }
            }

            else {
                inboundMessage.channel.send("You don't own any players.");
            }
        }

        if (command === 'stats') {
            //updateStatistics();
            const statistics = await getDatabaseStatistics();
            inboundMessage.channel.send(`Total Users: ${statistics.users}\nTotal Servers: ${statistics.servers}\nTotal Rolls: ${statistics.rolls}`)
        }
        if (command === 'trade') {
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
            let user2 = await getServerUser(serverId, user.id).catch((err) => console.error(`Couldn't retrieve user ${user.id}: ${err}`))
            //inboundMessage.channel.send(`${user}, who would you like to trade with?`);
            //let user2 = await getServerUsers(serverId).where(userResponse.first().content, '==', getServerUser(serverId, user.id).apiv2.username);
        }
        if (command === 'avg') {
            const elo = await updateUserElo(inboundMessage.channel.guildId, inboundMessage.author.id);
            if (elo == null) {
                inboundMessage.channel.send("You are unranked; you need to own at least 10 players.");
            }
            else {
                inboundMessage.channel.send(`${inboundMessage.author} Your top 10 average is **${elo.toString()}**.`);
            }
        }
        if (command === 'pin') {
            let pinnedId = parseInt(inboundMessage.content.substring(5));
            const user = await getServerUser(inboundMessage.channel.guildId, inboundMessage.author.id);
            const validFlag = user?.ownedPlayers?.includes(pinnedId);
            if (validFlag) {
                await setPinnedPlayer(inboundMessage.channel.guildId, inboundMessage.author.id, pinnedId).catch(err => console.error(err));
                inboundMessage.channel.send(`${inboundMessage.author} pin successful.`)
            }
            else {
                inboundMessage.channel.send(`${inboundMessage.author} You do not own a player with ID ${pinnedId}.`);
            }
        }
        if (command === 'unpin') {
            let pinnedId = parseInt(inboundMessage.content.substring(7));
            const user = await getServerUser(inboundMessage.channel.guildId, inboundMessage.author.id);
            const validFlag = user?.pinnedPlayers?.includes(pinnedId);
            if (validFlag) {
                await deletePinnedPlayer(inboundMessage.channel.guildId, inboundMessage.author.id, pinnedId).catch(err => console.error(err));
                inboundMessage.channel.send(`${inboundMessage.author} User ${pinnedId} has been unpinned.`)
            }
            else {
                inboundMessage.channel.send(`${inboundMessage.author} You do not have a player with ID ${pinnedId} pinned.`);
            }
        }
        if (command === 'help' || command === 'commands') {
            inboundMessage.channel.send(`**Commands**\n\`\`\`
Card-Related
    roll: Roll for a top 10,000 player. Claim by reacting with 👍
    rolls: Check your available rolls.
    cards: Display all of your owned cards.
    pin(userId): Pin cards to the top of your cards page by typing ;pin UserID.
    unpin(userId): Remove pins from your cards page.
    trade: Trade cards between your friends.

General
    help: Display all commands.
    stats: Display global bot stats.
    \`\`\`
**Discord**
    https://discord.gg/DGdzyapHkW`);
        }

    })
})

client.login(token);