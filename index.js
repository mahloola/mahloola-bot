const Discord = require('discord.js');
const { MessageAttachment, Intents } = require("discord.js");
const client = new Discord.Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const { initializeDatabase, getPlayerByRank, getOwnedPlayers, setOwnedPlayer, getPlayer, getDatabaseStatistics, setDatabaseStatistics, getServers, getServerUsers, getServerUser, updateStatistics, updateUserElo } = require('./db/database');
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
                // if (player.exists()) {
                //     player = await getPlayerByRank(rank);
                // } 
                let serverId = inboundMessage.guild.id
                // let userId = inboundMessage.author.id;
                let serversCollection = await getServers();
                const serverDoc = await serversCollection.doc(serverId.toString());
                // const serverOwnedPlayers = await serverDoc.get().ownedPlayers;
                // console.log(serverOwnedPlayers);
                // const user = await userDoc.get();
                // while player 
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
                    await updateUserElo(inboundMessage.guild.id, claimingUser.id);
                    outboundMessage.channel.send(`**${player.apiv2.username}** has been claimed by **${claimingUser.username}**!`);
                } catch (error) {
                    console.log(`Nobody reacted to ${player.apiv2.username} after 30 seconds, operation canceled`);
                    outboundMessage.reactions.removeAll()
                        .catch(error => console.error('Failed to clear reactions:', error));
                }
            }

        }

        if (command === 'cards') {
            let playerIds = await getOwnedPlayers(inboundMessage.guild.id, inboundMessage.author.id, 10);
            let ownedPlayers = [];
            let ownedPlayersNames = [];
            let ownedPlayerRanks = [];
            if (playerIds) {
                try {
                    for (let i = 0; i < playerIds.length; i++) {
                        let player = await getPlayer(playerIds[i]);
                        ownedPlayers.push(player);
                    }
                    ownedPlayers.sort((a, b) => {
                        return a.apiv2.statistics.global_rank - b.apiv2.statistics.global_rank;
                    });
                    // for (let i = 0; i < playerIds.length; i++) {
                    let isLongList = 1;
                    if (playerIds.length < 10) {
                        isLongList = 0
                    }
                    if (isLongList == 1) {
                        for (let i = 0; i < 10; i++) {
                            if (playerIds[i] != undefined) {
                                ownedPlayersNames.push(ownedPlayers[i].apiv2.username);
                                ownedPlayerRanks.push(ownedPlayers[i].apiv2.statistics.global_rank);
                            }
                            else {
                                ownedPlayersNames.push("");
                                ownedPlayerRanks.push("");
                            }
                        }
                    }
                    else {
                        for (let i = 0; i < playerIds.length; i++) {
                            if (playerIds[i] != undefined) {
                                ownedPlayersNames.push(ownedPlayers[i].apiv2.username);
                                ownedPlayerRanks.push(ownedPlayers[i].apiv2.statistics.global_rank);
                            }
                            else {
                                ownedPlayersNames.push("");
                                ownedPlayerRanks.push("");
                            }
                        }
                    }
                    console.log('avatar url:' + inboundMessage.author.avatarURL);
                    let embed = new Discord.MessageEmbed()
                        .setTitle(`${inboundMessage.author.username}'s top 10 cards`)
                        .setColor('#D9A6BD')
                        .setAuthor({ name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`, iconURL: inboundMessage.author.avatarURL(), url: inboundMessage.author.avatarURL() })
                        .setThumbnail(inboundMessage.author.avatarURL())
                        .setDescription(`Average: **${await updateUserElo(inboundMessage.guild.id, inboundMessage.author.id)}**`)
                        .setTimestamp(Date.now())
                        .addField('**Player**', `${ownedPlayersNames[0]}\n${ownedPlayersNames[1]}\n${ownedPlayersNames[2]}\n${ownedPlayersNames[3]}\n${ownedPlayersNames[4]}\n${ownedPlayersNames[5]}\n${ownedPlayersNames[6]}\n${ownedPlayersNames[7]}\n${ownedPlayersNames[8]}\n${ownedPlayersNames[9]}`, true)
                        .addField('**Rank**', `${ownedPlayerRanks[0]}\n${ownedPlayerRanks[1]}\n${ownedPlayerRanks[2]}\n${ownedPlayerRanks[3]}\n${ownedPlayerRanks[4]}\n${ownedPlayerRanks[5]}\n${ownedPlayerRanks[6]}\n${ownedPlayerRanks[7]}\n${ownedPlayerRanks[8]}\n${ownedPlayerRanks[9]}`.toString(), true)
                    // ^ THIS IS RETARDED
                    // if (isLongList) {
                    //     for (let i = 0; i < 10; i++) {
                    //         embed.addField(ownedPlayersNames[i], ownedPlayerRanks[i].toString(),);
                    //     }
                    // }
                    // else {
                    //     for (let i = 0; i < playerIds.length; i++) {
                    //         embed.addField(ownedPlayersNames[i], ownedPlayerRanks[i].toString(), true);
                    //     }
                    // }
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

            inboundMessage.channel.send(userResponse.first().user);
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
    })
})

client.login(token);