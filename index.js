const Discord = require('discord.js');
const client = new Discord.Client();
const { prefix, token } = require('./auth.json');
const { initializeDatabase, getPlayerByRank } = require('./db/database');
const { getUser, requestClientCredentialsToken } = require('./api.js');
const { createImage } = require('./image/jimp.js');
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
                message.react('👍').then(r => {
                    message.react('👎');
                });

                // First argument is a filter function
                message.awaitReactions((reaction, user) => user.id != message.author.id && (reaction.emoji.name == '👍' || reaction.emoji.name == '👎'),
                    { max: 1, time: 30000 }).then(collected => {
                        if (collected.first().emoji.name == '👍') {
                            //message.reply(`Player ${player.apiv2.username} has been claimed by ${messauge.author.name}!`); 
                            message.reply(`Player has been claimed!`);            
                        }
                        else
                            message.reply('Operation canceled.');
                    }).catch(() => {
                        message.reply('No reaction after 30 seconds, operation canceled');
                    });
            });
        // const result = await getUser(apiToken, 8759374);
        // console.log(result);
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