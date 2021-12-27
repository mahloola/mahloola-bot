const Discord = require('discord.js');
const client = new Discord.Client();
const { prefix, token } = require('./auth.json');
const { initializeDatabase, getPlayerByRank, getOwnedPlayers, setOwnedPlayer, getPlayer } = require('./db/database');
const { getUser, requestClientCredentialsToken } = require('./api.js');
const { createImage } = require('./image/jimp.js');
const { Console } = require('winston/lib/winston/transports');
let apiToken;

initializeDatabase();
apiToken = requestClientCredentialsToken();

// debug
// async function asdf() {
//     let player = await getPlayerByRank(3192);
//     await createImage(player);
// }
// asdf()

client.on('message', async (message) => {

    // if the message either doesn't start with the prefix or was sent by a bot, exit early
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase(); // make lowercase work too

    // roll for a random player
    if (command === 'roll') {
        let player;
        while (!player) {
            const rank = Math.floor(Math.random() * 10000) + 1;
            player = await getPlayerByRank(rank);
        }

        await createImage(player);
        message.channel.send({ file: "image/cache/osuCard-" + player.apiv2.username + ".png" })
            .then((message) => {
                message.react('👍');

                // First argument is a filter function
                message.awaitReactions((reaction, user) => user.id != message.author.id && (reaction.emoji.name == '👍'),
                    { max: 1, time: 30000 }).then((reactions) => {
                        let claimingUser;
                        for (const [key, user] of reactions.get('👍')?.users.entries()) {
                            if (user.id !== message.author.id) {
                                claimingUser = user;
                            }
                        }
                        if (!claimingUser) {
                            message.reply('Operation cancelled.');
                            return;
                        }
                        setOwnedPlayer(message.guild.id, claimingUser.id, player.apiv2.id);
                        message.channel.send(`**${player.apiv2.username}** has been claimed by **${claimingUser.username}**!`);
                        
                        //     .then(message.reply(`Player ${player.apiv2.username} has been claimed!`));
                        //message.channel.send(`**${player.apiv2.username}** has been claimed by **${reactions.first().users.}**!`)
                    }).catch((err) => {
                        console.log(err);
                        message.reply('No reaction after 30 seconds, operation canceled');
                    });
            });
        // const result = await getUser(apiToken, 8759374);
        // console.log(result);
    }

    if (command === 'cards') {
        let playerIds = await getOwnedPlayers(message.guild.id, "198773384794996739");
        let ownedPlayers = [];
        for (let i = 0; i < playerIds.length; i++) {
            let player = await getPlayer(playerIds[i]);
            ownedPlayers.push(player);
            console.log("You own: " + ownedPlayers[i].apiv2.username);
        }
        for (let i = 0; i < ownedPlayers.length; i++) {
            message.channel.send(ownedPlayers[i].apiv2.username);
        }
    }

    // using mentions
    if (command === 'kick') {
        // grab the "first" mentioned user from the message
        // this will return a `User` object, just like `message.author`
        const taggedUser = message.mentions.users.first();
        message.channel.send(`You wanted to kick: ${taggedUser.username}`);
    }

    // PING PONG
    if (message.content === `${prefix}ping`) {
        message.channel.send('Pong.');
    } else if (message.content === `${prefix}beep`) {
        message.channel.send('Boop.');
    }

    // SERVER DETAILS
    //if (message.content === `${prefix}`)
})



client.login(token);