const Discord = require('discord.js');
const { MessageAttachment } = require("discord.js");
const { Intents } = require('discord.js');
const client = new Discord.Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const { prefix, token } = require('./auth.json');
const { initializeDatabase } = require('./db/database');
const { getPlayerByRank, getOwnedPlayers, setOwnedPlayer, getPlayer, getDatabaseMetadata, setDatabaseMetadata, updateMetadata } = require('./db/database');
const { createImage } = require('./image/jimp.js');

client.on("ready", async function () {
    initializeDatabase();
    let metadata = await getDatabaseMetadata();

    client.on('messageCreate', async (inboundMessage) => {

        // if the message either doesn't start with the prefix or was sent by a bot, exit early
        if (!inboundMessage.content.startsWith(prefix) || inboundMessage.author.bot) return;

        const args = inboundMessage.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase(); // make lowercase work too

        // roll for a random player
        if (command === 'roll') {
            metadata.rolls++;
            setDatabaseMetadata(metadata);
            let player;
            while (!player) {
                const rank = Math.floor(Math.random() * 10000) + 1;
                player = await getPlayerByRank(rank);
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
                    setOwnedPlayer(outboundMessage.guild.id, claimingUser.id, player.apiv2.id);
                    outboundMessage.channel.send(`**${player.apiv2.username}** has been claimed by **${claimingUser.username}**!`);
                } catch (error) {
                    console.log(`Nobody reacted to ${player.apiv2.username} after 30 seconds, operation canceled`);
                }
            }

        }

        if (command === 'cards') {
            let playerIds = await getOwnedPlayers(message.guild.id, message.author.id);
            let ownedPlayers = [];
            let ownedPlayersNames = "";

            for (let i = 0; i < playerIds.length; i++) {
                let player = await getPlayer(playerIds[i]);
                ownedPlayers.push(player);
                //ownedPlayersNames.concat(" ", ownedPlayers[i].apiv2.username);
                ownedPlayersNames += `${ownedPlayers[i].apiv2.username}\t#${ownedPlayers[i].apiv2.statistics.global_rank}\n`;
            }
            message.channel.send(ownedPlayersNames);
            ownedPlayers.sort((a, b) => {
                return a.apiv2.statistics.global_rank - b.apiv2.statistics.global_rank;
            });


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
        if (command === 'help') {
            message.channel.send("Commands:\nhelp, roll, cards, metadata")
        }
        if (command === 'metadata') {
            //updateMetadata();
            const metadata = await getDatabaseMetadata();
            message.channel.send(`Total Users: ${metadata.users}\nTotal Servers: ${metadata.servers}\nTotal Rolls: ${metadata.rolls}`)
        }
    })
})

client.login(token);