const Discord = require('discord.js');
const { MessageAttachment, Intents } = require("discord.js");
const client = new Discord.Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const { initializeDatabase, getPlayerByRank, getOwnedPlayers, setOwnedPlayer, getPlayer, getDatabaseStatistics, setDatabaseStatistics, setPinnedPlayer, getPinnedPlayers, deletePinnedPlayer, getServers, getServerUsers, getServerUser, updateStatistics, updateUserElo } = require('./db/database');
const { createImage } = require('./image/jimp.js');
const { prefix, token } = require('./auth.json');

client.on("ready", async function () {
    initializeDatabase();
    let statistics = await getDatabaseStatistics();

    client.on('messageCreate', async (inboundMessage) => {

        // if the message either doesn't start with the prefix or was sent by a bot, exit early
        if (!inboundMessage.content.startsWith(prefix) || inboundMessage.author.bot) return;

        const args = inboundMessage.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase(); // make lowercase work too

        // roll for a random player
        if (command === 'roll') {
            statistics.rolls++;
            setDatabaseStatistics(statistics);
            let player;
            while (!player) {
                const rank = Math.floor(Math.random() * 10000) + 1;
                player = await getPlayerByRank(rank);
                let serverId = inboundMessage.guild.id
                let serversCollection = await getServers();
                const serverDoc = await serversCollection.doc(serverId.toString());
            }
            await createImage(player);
            if (player) {
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
                    // let test = getServerUser(outboundMessage.guild.id, claimingUser.id);
                    // if (test == null) {
                    //     console.log("User doesn't exist yet");
                    // }
                    // else {
                    //     console.log(`User exists and owns ${test.ownedPlayers}`);
                    // }
                    await setOwnedPlayer(outboundMessage.guild.id, claimingUser.id, player.apiv2.id);
                    //await updateUserElo(inboundMessage.guild.id, claimingUser.id);
                    outboundMessage.channel.send(`**${player.apiv2.username}** has been claimed by **${claimingUser.username}**!`);
                } catch (error) {
                    outboundMessage.reactions.removeAll()
                        .catch(error => console.error('Failed to clear reactions:', error));
                }
            }

        }

        if (command === 'cards') {

            // let mentionedUser = inboundMessage.mentions.users.first();

            // check if user owns anybody first
            let playerIds = await getOwnedPlayers(inboundMessage.guild.id, inboundMessage.author.id, 10);
            if (playerIds) {
                try {

                    // get full list of players
                    let ownedPlayers = [];
                    let ownedPlayersNames = [];
                    let ownedPlayersRanks = [];
                    for (let i = 0; i < playerIds.length; i++) {
                        let player = await getPlayer(playerIds[i]);
                        ownedPlayers.push(player);
                    }

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
                    let pinnedPlayers = [];
                    if (pinnedPlayerIds) {
                        for (let i = 0; i < pinnedPlayerIds.length; i++) {
                            let pinnedPlayer = await getPlayer(pinnedPlayerIds[i]);
                            pinnedPlayers.push(pinnedPlayer);
                        }
                    }

                    // get the top 10 average
                    const elo = await updateUserElo(inboundMessage.guild.id, inboundMessage.author.id);
                    let eloDisplay = elo == null ? "N/A" : elo;

                    // create embed body
                    let pinnedDescription = "";

                    // add pinned players to embed if the user has any
                    if (pinnedPlayers) {
                        pinnedPlayers.forEach(player => (pinnedDescription += `**${player.apiv2.statistics.global_rank}** • ${player.apiv2.username}\n`));
                    }

                    // add all players to embed
                    let embedDescription = "";
                    ownedPlayers.forEach(player => {
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
                    if (pinnedPlayerIds.length > 0) {
                        embed.addField(`Pinned`, pinnedDescription)
                        embed.addField(`All`, embedDescription)
                    }
                    else {
                        embed.addField(`Players`, embedDescription)
                    }
                    embed.setTimestamp(Date.now())
                    // .addField('**Player**', ownedPlayersNames.map(name => name || '---').slice(0, 10).join('\n'), true)
                    // .addField('**Rank**', ownedPlayersRanks.map(name => name || '---').slice(0, 10).join('\n').toString(), true)




                    // send the message
                    inboundMessage.channel.send({ embeds: [embed] });
                }
                catch (err) {
                    console.log(err);
                }
            }

            else {
                inboundMessage.channel.send("You don't own any players.");
            }
            //message.channel.send({ embed: { title: `**${message.author.username}'s owned players**` } }.then(msg => ownedPlayers));
            // const msg = `
            // **${message.author.username}'s owned players**

            // `;
            // for (let i = 0; i < ownedPlayers.length; i++) {
            //     finalmessage = msg.concat(`#${ownedPlayers[i].apiv2.statistics.global_rank} - ${ownedPlayers[i].apiv2.username}\n`);
            // }
            //message.channel.send({ embed: { title: `**${message.author.username}'s owned players**` } }.then(msg => ));

            // await lib.discord.channels['@0.2.0'].messages.create({
            //     "channel_id": `${context.params.event.channel_id}`,
            //     "content": "",
            //     "tts": false,
            //     "embeds": [
            //         {
            //             "type": "rich",
            //             "title": `${message.author.username}'s owned players`,
            //             "description": `${ownedPlayers[i].apiv2.statistics.global_rank} - ${ownedPlayers[i].apiv2.username}`,
            //             "color": 0xff7aff,
            //             "image": {
            //                 "url": `${user.avatarURL}`,
            //                 "height": 100,
            //                 "width": 100
            //             }
            //         }
            //     ]
            // });
        }

        // SERVER DETAILS
        //if (message.content === `${prefix}`)
        if (command === 'help' || command === 'commands') {
            inboundMessage.channel.send("**Commands**\nhelp, roll, cards, trade, stats\n\n**Discord**\nhttps://discord.gg/DGdzyapHkW");
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

            //inboundMessage.channel.send(userResponse.first().user);
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
                inboundMessage.channel.send(`${inboundMessage.author} You do not own a player with ID ${pinnedId}.`);
            }
        }


    })
})

client.login(token);