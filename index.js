const Discord = require('discord.js');
const client = new Discord.Client();
const { prefix, token } = require('./auth.json');
const { initializeDatabase, getPlayerByRank } = require('./db/database');
const { getUser, requestClientCredentialsToken } = require('./api.js');
const { createImage } = require('./image/jimp.js');
let apiToken;

initializeDatabase();
apiToken = requestClientCredentialsToken();

client.on('message', async (message) => {

    // if the message either doesn't start with the prefix or was sent by a bot, exit early
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase(); // make lowercase work too

    // roll for a random player
    if (command === 'roll') {
        const number = Math.floor(Math.random() * 10000) + 1;

        let player = await getPlayerByRank(number);

        if (player) {
            await createImage(player);
            message.channel.send({ file: "image/cache/osuCard-" + player.apiv2.username + ".png" })
                .then((m) => {
                    m.react('😄');
                    // const filter = (reaction, user) => {
                    //     return ['😄'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                    // };
                    // m.awaitReactions()
                    //     .then(collected => {
                    //         const reaction = collected.first();
                    //         if (reaction.emoji.name === '😄') {
                    //             message.reply('pwned');
                    //         }
                    //     })
                    //     .catch(collected => {
                    //         message.reply('You reacted with neither a thumbs up, nor a thumbs down.');
                    //     });
                });
        }
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