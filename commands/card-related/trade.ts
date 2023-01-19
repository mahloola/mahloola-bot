import { getPlayerByUsername, getServerUserDoc, setOwnedPlayer } from '../../db/database';

export async function trade(inboundMessage) {
    const words = inboundMessage.content.split(' ');
    if (words.length === 1) {
        inboundMessage.channel.send(
            'Please enter a user to trade with.\nUsage: `;trade @user2 <card> <optional:user2card>`.'
        );
        return;
    }
    const user2DiscordId = words[1].substring(2, words[1].length - 1);
    let user2 = await getServerUserDoc(inboundMessage.guild.id, user2DiscordId);
    if (user2 == null) {
        inboundMessage.channel.send(
            'Please enter a user to trade with.\nUsage: `;trade @user2 <card> <optional:user2card>`.'
        );
        return;
    }
    let username1 = words[2];
    let username2;

    let player2;
    console.log(words);
    if (words.length >= 4) {
        username2 = words[3];
        player2 = await getPlayerByUsername(username2);
        console.log(player2.apiv2.username);
    }

    let player = await getPlayerByUsername(username1);
    if (player !== null && player2 !== null) {
        if (words.length >= 4) {
            inboundMessage.channel.send(
                `${words[1]} ${inboundMessage.author.username} would like to give you ${username1} in return for ${username2}. Type 'y' or 'Y' to confirm.`
            );
        } else {
            inboundMessage.channel.send(
                `${words[1]} ${inboundMessage.author.username} would like to give you ${username1}. Type 'y' or 'Y' to confirm.`
            );
        }

        const userResponse = await inboundMessage.channel.awaitMessages({
            filter: (sender) => {
                return sender.author.id == user2DiscordId;
            },
            max: 1,
            time: 60000,
            errors: ['time'],
        });

        if (userResponse.content == 'y' || userResponse.content == 'Y') {
            await setOwnedPlayer(inboundMessage.guild.id, user2.discord.id, player.apiv2.id);
            inboundMessage.channel.send(
                `${inboundMessage.author} Successfully gave **${player.apiv2.username}** to ${inboundMessage.author.username}.`
            );
            if (words.length >= 3) {
                await setOwnedPlayer(inboundMessage.guild.id, inboundMessage.author.id, player2.apiv2.id);
                inboundMessage.channel.send(
                    `${inboundMessage.author} Successfully gave **${player2.apiv2.username}** to ${user2.discord.username}.`
                );
            }
        }
    } else {
        if (username1.includes('@everyone') || username1.includes('@here')) {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        } else {
            inboundMessage.channel.send(
                `Could not find a player called ${username1}. \nUsage: \`;trade @user2 <card> <optional: user2card>\`\nExample: \`;trade @mahIooIa mrekk chocomint\``
            );
        }
    }
}
