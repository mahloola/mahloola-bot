const Discord = require('discord.js');
const client = new Discord.Client();
const { prefix, token } = require('./auth.json');
const { initializeDatabase, getUserByRank } = require('./db/database');
const { getUser, requestClientCredentialsToken } = require ('./api.js');
const { createImage } = require('./image/jimp.js');
const apiToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMTA0MCIsImp0aSI6ImE2M2VjZGNkZjUxODdhYjJmMWMzMjAxNTJiMGZkYjI4YjllZTAxZmJiN2MxYzA5ODQwNzVlNWZiMjNmYzNlNjA4YzlmOGQ1YjM2MmJjYzEyIiwiaWF0IjoxNjM3MTMzODU2LjkzNTA3NSwibmJmIjoxNjM3MTMzODU2LjkzNTA3OCwiZXhwIjoxNjM3MjIwMTg1LjMwNjg1NSwic3ViIjoiIiwic2NvcGVzIjpbInB1YmxpYyJdfQ.fpun5hmO3pagk1qp8w8TM754AvcL3TF-NwibInwuBnDH28VZLf6sOu0IBvb4oKldebs9NtIaDIL7kS89L2eJs-z6_aLMyZaYGVRNKoBY9nuFrblxYAvCTwfVwuPixbbgB_H71nklDq1hPiJDR8NQSz21X4r0Zv-jyI_-h9wzbD4EiWbV01_uurud8lBiZhFpyTXkJDgD7VA_wQMCHQYrMz58SPUBggThZirDrHn0VfWZjhrdbnTQelqH0U7udZFdYqGltdEEJFSlTioYi8jJMYFt_WByLNiPGC_FIOzQPWduO9WHT4QsPPqLPYC0PZUHF4981EkGaNyH7dS7SXrTRSPgsk4vhUVyI9hmOF8JiaU0ovuK48Q8xGxFnLzRvjk6sUoe0U9ZlOAETE1f2uP5ug5MJghF8ajkaTllb5vvdvdYk2J_NrtUAk2bV3U_PkWjIaim8IQ1egBk3bgJH2Rirg27S_so52D6lqgZSgjljXCFOAPm7VwSL0aoJnKBUQeOlMPsJ_QYk1LDhoQ2Iyzmpg2I2-fggyGvk-fN4amKjlNjuYZP7GZOiVRiyEbCbih5wWXcg52IVHAbsxB9SWF1pkyg9-3M-grXzicrNYk3FHn18AoiRHyJuJ_Kzolx1MSOEl9JWrPYMcY4_mLObQeBI1oXJj1T067q7hgVBlJBIVE";

initializeDatabase();

client.on('message', async(message)=>{

    // if the message either doesn't start with the prefix or was sent by a bot, exit early
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase(); // make lowercase work too

    // roll for a random player
    if (command === 'roll') {
        const number = Math.floor(Math.random() * 10000) + 1;
        let user = await getUserByRank(number);
        //message.channel.send(user.username + ": " + user.pp_rank);
        await createImage(user);
        message.channel.send({file: "image/cache/osuCard-" + user.username + ".png"});
		message.react('😄');
        const result = await getUser(apiToken, 8759374);
        console.log(result);
    }

    // using arguments
    if (command === 'args-info') {
        if (!args.length) {
            return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
        }
        else if (args[0] === 'foo') {
            return message.channel.send('bar');
        }
    
        message.channel.send(`First argument: ${args[0]}`);
        message.channel.send(`Arguments: ${args}`);
    }
    
    if (command === 'image') {
        await console.log(readImage(user));
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