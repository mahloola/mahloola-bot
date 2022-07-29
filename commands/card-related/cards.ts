const paginationEmbed = import('discordjs-button-pagination');
import { MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import Discord, { Intents } from 'discord.js';
import { getServerUserDoc, updateUserElo, updateUserEloByPlayers } from '../../db/database';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});
import simplifiedPlayers from '../../db/simplifiedPlayers.json';

export async function cards(inboundMessage, serverPrefix) {
    let discordUserId;
    let discordUser;
    if (inboundMessage.content.length > 6 + serverPrefix.length) {
        const username = inboundMessage.content.substring(6 + serverPrefix.length);
        if (username.includes('@everyone') || username.includes('@here')) {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        } else {
            if (inboundMessage.mentions.users.first()) {
                discordUser = inboundMessage.mentions.users.first();
            } else {
                const username = inboundMessage.content.substring(6 + serverPrefix.length);
                discordUser = await client.users.cache.find((user) => user.username == username);
            }
            if (discordUser) {
                discordUserId = discordUser.id;
            } else {
                inboundMessage.channel.send(`${inboundMessage.author} User "${username}" was not found.`);
                return;
            }
        }
    } else {
        discordUserId = inboundMessage.author.id;
        discordUser = inboundMessage.author;
    }

    const player = await getServerUserDoc(inboundMessage.guild.id, discordUserId);

    // get owned player ids from user document
    const playerIds = player.ownedPlayers ?? null;

    // check for valid owned players, store them in ownedPlayerObjects
    const ownedPlayerObjects = [];
    if (playerIds) {
        for (const id of playerIds) {
            if (simplifiedPlayers[id]) {
                ownedPlayerObjects.push(simplifiedPlayers[id]);
            }
        }
    }
    
    // check if user owns anybody first
    if (!ownedPlayerObjects.length) {
        discordUserId == inboundMessage.author.id
            ? inboundMessage.channel.send("You don't own any players.")
            : inboundMessage.channel.send(`${discordUser.username} doesn't own any players.`);
        return;
    }

    // sort players by rank
    ownedPlayerObjects.sort((a, b) => {
        if (a[1] === null) {
            return 1;
        }
        if (b[1] === null) {
            return -1;
        }
        return a[1] - b[1];
    });
    const ownedPlayersNames = [],
        ownedPlayersRanks = [];
    for (const id of playerIds) {
        ownedPlayersNames.push(ownedPlayerObjects[0]);
        ownedPlayersRanks.push(ownedPlayerObjects[1]);
    }

    // get pinned player ids from user document
    const pinnedPlayerIds = player.pinnedPlayers ?? null;
    const pinnedPlayerObjects = [];

    // create embed body
    let pinnedDescription = '';

    if (pinnedPlayerIds) {
        // check for valid pinned players, store them in pinnedPlayerObjects
        for (let i = 0; i < pinnedPlayerIds.length; i++) {
            if (simplifiedPlayers[pinnedPlayerIds[i]]) {
                pinnedPlayerObjects.push(simplifiedPlayers[pinnedPlayerIds[i]]);
            }
        }

        if (pinnedPlayerObjects) {
            // sort players by rank
            pinnedPlayerObjects.sort((a, b) => {
                if (a[1] === null) {
                    return 1;
                }
                if (b[1] === null) {
                    return -1;
                }
                return a[1] - b[1];
            });
            const pinnedPlayersNames = [];
            const pinnedPlayersRanks = [];
            for (const pinnedPlayerObject of pinnedPlayerObjects) {
                pinnedPlayersNames.push(pinnedPlayerObject[0]);
                pinnedPlayersRanks.push(pinnedPlayerObject[1]);
            }

            // add pinned players to embed if the user has any
            if (pinnedPlayerObjects) {
                pinnedPlayerObjects.forEach(
                    (player) => (pinnedDescription += `**${player[1] ?? '----'}** • ${player[0]}\n`)
                );
            }
        }
    }

    // get the top 10 average
    const elo = await updateUserElo(inboundMessage.guild.id, discordUserId);
    const eloDisplay = (elo === null ? 'N/A' : elo);

    const embeds = [];
    // ceiling of owned players count divided by 10, then removed decimals, then converted to int
    const pages = parseInt((Math.ceil(ownedPlayerObjects.length / 10)).toFixed(0));
    for (let i = 0; i < pages; i++) {
        // create the embed message
        const embed = new Discord.MessageEmbed();

        // add the rest of the information
        embed.setTitle(`${discordUser.username}'s cards ${ownedPlayerObjects.length > 10 ? `(Page ${i + 1} of ${pages})` : ``}`);
        embed.setColor('#D9A6BD');
        embed.setAuthor({
            name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
            iconURL: inboundMessage.author.avatarURL(),
            url: inboundMessage.author.avatarURL(),
        });
        embed.setThumbnail(discordUser.avatarURL());
        // add all players to embed
        let embedDescription = '';
        ownedPlayerObjects.slice(i * 10, (i + 1) * 10 - 1).forEach((player) => {
            player[1] && (embedDescription += `**${player[1]}** • ${player[0]}\n`);
        });
        embed.setDescription(`Top 10 Avg: **${eloDisplay}**\n`);
        if (pinnedPlayerObjects?.length > 0) {
            embed.addField(`Pinned (${pinnedPlayerObjects.length})`, pinnedDescription);
            embed.addField(`${`Players ${i * 10 + 1}-${ownedPlayerObjects.length > 10 ? (i + 1) * 10 : ownedPlayerObjects.length}`}`, embedDescription);
        } else {
            embed.addField(`Players`, embedDescription);
        }
        embed.setTimestamp(Date.now());
        embeds.push(embed);
    }

    const outboundMessage = await inboundMessage.channel.send({ embeds: [embeds[0]] });

    // pagination
    // outboundMessage.react('⏩');

    // const reactions = await outboundMessage.awaitReactions({
    //     filter: (reaction, user) => user.id != outboundMessage.author.id && reaction.emoji.name == '⏩',
    //     max: 1,
    //     time: 60000,
    // });

    // let pageCounter = 0;

    // // Constants

    // const backId = 'back';
    // const forwardId = 'forward';
    // const backButton = new MessageButton({
    //     style: 'SECONDARY',
    //     label: 'Back',
    //     emoji: '⬅️',
    //     customId: backId,
    // });
    // const forwardButton = new MessageButton({
    //     style: 'SECONDARY',
    //     label: 'Forward',
    //     emoji: '➡️',
    //     customId: forwardId,
    // });

    // // Put the following code wherever you want to send the embed pages:

    // const { author, channel } = inboundMessage;

    // // Send the embed with the first 10 guilds
    // const canFitOnOnePage = ownedPlayerObjects.length <= 10;
    // // const embedMessage = inboundMessage;
    // // Exit if there is only one page of guilds (no need for all of this)
    // if (canFitOnOnePage) return;

    // // Collect button interactions (when a user clicks a button),
    // // but only when the button as clicked by the original message author
    // const collector = outboundMessage.createMessageComponentCollector({
    //     filter: ({ user }) => user.id === author.id,
    // });

    // let currentIndex = 0;
    // collector.on('collect', async (interaction) => {
    //     // Increase/decrease index
    //     interaction.customId === backId ? (currentIndex -= 10) : (currentIndex += 10);
    //     // Respond to interaction by updating message with new embed
    //     await interaction.update({
    //         embeds: [embeds[0]],
    //         components: [
    //             new MessageActionRow({
    //                 components: [
    //                     // back button if it isn't the start
    //                     ...(currentIndex ? [backButton] : []),
    //                     // forward button if it isn't the end
    //                     ...(currentIndex + 10 < ownedPlayerObjects.length ? [forwardButton] : []),
    //                 ],
    //             }),
    //         ],
    //     });
    // });
    // const reaction = reactions.get('⏩');
    // try {
    //     let reactionUsers;
    //     while (!reactionUsers) {
    //         reactionUsers = await reaction.users.fetch();
    //         for (const [userId, userObject] of reactionUsers) {
    //             outboundMessage.edit({ embeds: [embeds[pageCounter]] });
    //             pageCounter++;
    //         }
    //     }
    // } catch (error) {
    //     outboundMessage.reactions
    //         .removeAll()
    //         .catch((error) => console.error('Failed to clear reactions: DiscordAPIError: Missing Permissions'));
    // }
    // send the message
    //inboundMessage.channel.send({ embeds: embeds });
}
