import { User, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { NonDmChannel, Player } from '../../types';
import {
    deleteOwnedPlayer,
    getDiscordUser,
    getPlayerByUsername,
    getServerUserDoc,
    setOwnedPlayer,
    setPlayer,
} from '../../db/database';

export async function trade(interaction, otherUser: User, cards, otherCards) {
    if (otherUser == interaction.user) {
        interaction.reply(`${interaction.user} You can't trade yourself.`);
        return;
    }
    if (cards.includes('@everyone') || cards.includes('@here')) {
        interaction.reply(`${interaction.user} u asshole`);
        return;
    }
    if (otherCards) {
        if (otherCards.includes('@everyone') || otherCards.includes('@here')) {
            interaction.reply(`${interaction.user} u asshole`);
            return;
        }
    }

    const discordUser1 = await getServerUserDoc(interaction.guild.id, interaction.user.id); // giving user
    const discordUser2 = await getServerUserDoc(interaction.guild.id, otherUser.id); // receiving user
    const validCards = []; // player ids to give
    const validOtherCards = []; // player ids to receive
    let playerList = ''; // readable format of the players to give
    let otherPlayerList = ''; // readable format of the players to receive

    const cardsArray = cards.split(',');
    const usernameList = [];
    for (let i = 0; i < cardsArray.length; i++) {
        const player = await getPlayerByUsername(cardsArray[i].trim());
        if (!player) {
            interaction.reply(`${interaction.user} Player **${cardsArray[i]}** does not exist in the database.`);
            return;
        }
        if (!discordUser1.ownedPlayers.includes(player.apiv2.id)) {
            interaction.reply(`${interaction.user} You don't own **${player.apiv2.username}**.`);
            return;
        }

        if (discordUser2?.ownedPlayers?.includes(player.apiv2.id)) {
            interaction.reply(`${interaction.user} ${otherUser.username} already owns **${player.apiv2.username}**.`);
            return;
        }

        // if the card in question passes all checks
        if (!validCards.includes(player.apiv2.id)) {
            validCards.push(player.apiv2.id);
            usernameList.push(player.apiv2.username);
            playerList = usernameList.join(', ');
        }
    }

    if (otherCards) {
        const otherCardsArray = otherCards.split(',');
        const otherUsernameList = [];
        for (let i = 0; i < otherCardsArray.length; i++) {
            const player = await getPlayerByUsername(otherCardsArray[i].trim());
            if (!player) {
                interaction.reply(
                    `${interaction.user} Player **${otherCardsArray[i]}** does not exist in the database.`
                );
                return;
            }
            if (!discordUser2?.ownedPlayers?.includes(player.apiv2.id)) {
                interaction.reply(
                    `${interaction.user} ${otherUser.username} doesn't own **${player.apiv2.username}**.`
                );
                return;
            }
            if (discordUser1.ownedPlayers.includes(player.apiv2.id)) {
                interaction.reply(`${interaction.user} You already own **${player.apiv2.username}**.`);
                return;
            }
            // if the card in question passes all checks
            if (!validOtherCards.includes(player.apiv2.id)) {
                validOtherCards.push(player.apiv2.id);

                otherUsernameList.push(player.apiv2.username);
                otherPlayerList = otherUsernameList.join(', ');
            }
        }
    }

    const acceptButton = new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success);

    const declineButton = new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);

    let confirmationMessage;
    // type out the confirmation message
    if (validOtherCards.length) {
        confirmationMessage = await interaction.reply({
            content: `${otherUser} ${interaction.user.username} would like to give you **${playerList}** in return for **${otherPlayerList}**.`,
            components: [buttonRow],
        });
    } else {
        confirmationMessage = await interaction.reply({
            content: `${otherUser} ${interaction.user.username} would like to give you **${playerList}**.`,
            components: [buttonRow],
        });
    }

    const collectorFilter = (i) => i.user.id === otherUser.id;
    try {
        const confirmation = await confirmationMessage.awaitMessageComponent({ filter: collectorFilter, time: 60000 });

        if (confirmation.customId === 'accept') {
            // what user 1 is giving to user 2

            for (let i = 0; i < validCards.length; i++) {
                await setOwnedPlayer(interaction.guild.id, otherUser.id, validCards[i]);
                await deleteOwnedPlayer(interaction.guild.id, interaction.user.id, validCards[i]);
            }

            // what user 2 is giving to user 1
            if (validOtherCards.length) {
                for (let i = 0; i < validOtherCards.length; i++) {
                    await setOwnedPlayer(interaction.guild.id, interaction.user.id, validOtherCards[i]);
                    await deleteOwnedPlayer(interaction.guild.id, otherUser.id, validOtherCards[i]);
                }
            }
            const timestamp = new Date();
            console.log(
                `${timestamp.toLocaleTimeString().slice(0, 5)} | ${(interaction.channel as NonDmChannel).guild.name}: ${
                    interaction.user.username
                } traded ${otherUser.username} ${playerList} for ${
                    otherPlayerList.length > 0 ? otherPlayerList : 'nothing'
                }.`
            );
            await confirmationMessage.edit({
                content: `${interaction.user} ${otherUser} The trade deal has been completed.`,
                components: [],
            });
        } else if (confirmation.customId === 'decline') {
            await confirmationMessage.edit({ content: 'Trade declined.', components: [] });
        }
    } catch (e) {
        await confirmationMessage.edit({
            content: 'Confirmation not received within 1 minute, cancelling',
            components: [],
        });
    }
}
