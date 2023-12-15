import { getDiscordUser, getPlayerByUsername, getServerUserDoc, setOwnedPlayer } from '../../db/database';

export async function trade(interaction, otherUser, cards, otherCards) {
    
    const discordUser1 = await getServerUserDoc(interaction.guild.id, interaction.user.id);
    const discordUser2 = await getServerUserDoc(interaction.guild.id, otherUser.id);
    const cardsArray = cards.split(',');
    const otherCardsArray = otherCards.split(',');
    for (let i = 0; i < cardsArray.length; i++) {
        if (!discordUser1.ownedPlayers.includes(cardsArray[i])) {
            interaction.reply(
                `${interaction.user} You don't own a player named **${cardsArray[i]} to ${receivingUser.discord.username}.`
            );
        }
    }
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
