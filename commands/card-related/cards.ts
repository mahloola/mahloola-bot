const paginationEmbed = import('discordjs-button-pagination');
import { MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import Discord, { Intents } from 'discord.js';
import { getServerUserDoc, updateUserEloByPlayers } from '../../db/database';
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
    const playerIds = player.ownedPlayers ?? null;
    // check if user owns anybody first
    if (!playerIds) {
        discordUserId == inboundMessage.author.id
            ? inboundMessage.channel.send("You don't own any players.")
            : inboundMessage.channel.send(`${discordUser.username} doesn't own any players.`);
        return;
    }
    // get full list of players

    const ownedPlayers = [];
    for (const id of playerIds) {
        if (simplifiedPlayers[id]) {
            if (simplifiedPlayers[id][1]) {
                ownedPlayers.push(simplifiedPlayers[id]);
            }
        }
    }
    // sort players by rank
    ownedPlayers.sort((a, b) => {
        return a[1] - b[1];
    });

    const ownedPlayersNames = [],
        ownedPlayersRanks = [];
    for (const id of playerIds) {
        ownedPlayersNames.push(ownedPlayers[0]);
        ownedPlayersRanks.push(ownedPlayers[1]);
    }

    const pinnedPlayerIds = player.pinnedPlayers ?? null;
    const pinnedPlayers = [];
    for (const id of pinnedPlayerIds) {
        if (simplifiedPlayers[id]) {
            pinnedPlayers.push(simplifiedPlayers[id]);
        }
    }
    // sort players by rank
    pinnedPlayers.sort((a, b) => {
        return a[1] - b[1];
    });
    const pinnedPlayersNames = [],
        pinnedPlayersRanks = [];
    for (const id of pinnedPlayerIds) {
        pinnedPlayersNames.push(pinnedPlayers[0]);
        pinnedPlayersRanks.push(pinnedPlayers[1]);
    }

    // get the top 10 average
    const elo = player.elo ?? null;
    const eloDisplay = elo == null ? 'N/A' : elo;

    // create embed body
    let pinnedDescription = '';

    // add pinned players to embed if the user has any
    if (pinnedPlayers) {
        pinnedPlayers.forEach((player) => player[1] && (pinnedDescription += `**${player[1]}** • ${player[0]}\n`));
    }

    const embeds = [];
    for (let i = 0; i < ownedPlayers.length / 10 - 1; i++) {
        // create the embed message
        const embed = new Discord.MessageEmbed();

        // add the rest of the information
        embed.setTitle(`${discordUser.username}'s cards ${ownedPlayers.length > 9 && `(Page ${i + 1})`}`);
        embed.setColor('#D9A6BD');
        embed.setAuthor({
            name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
            iconURL: inboundMessage.author.avatarURL(),
            url: inboundMessage.author.avatarURL(),
        });
        embed.setThumbnail(discordUser.avatarURL());
        // add all players to embed
        let embedDescription = '';
        console.log(`${i * 10} ${(i + 1) * 10 - 1}`);
        ownedPlayers.slice(i * 10, (i + 1) * 10).forEach((player) => {
            player[1] && (embedDescription += `**${player[1]}** • ${player[0]}\n`);
        });
        embed.setDescription(`Top 10 Avg: **${eloDisplay}**\n`);
        if (pinnedPlayerIds?.length > 0) {
            embed.addField(`Pinned (${pinnedPlayerIds.length})`, pinnedDescription);
            embed.addField(`${`Players ${i * 10 + 1}-${(i + 1) * 10}`}`, embedDescription);
        } else {
            embed.addField(`Players`, embedDescription);
        }
        embed.setTimestamp(Date.now());
        embeds.push(embed);
    }

    const outboundMessage = await inboundMessage.channel.send({ embeds: [embeds[0]] });
    // outboundMessage.react('⏩');

    // const reactions = await outboundMessage.awaitReactions({
    //     filter: (reaction, user) => user.id != outboundMessage.author.id && reaction.emoji.name == '⏩',
    //     max: 1,
    //     time: 60000,
    // });

    // let pageCounter = 0;

    // Constants

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
    // const guilds = [...client.guilds.cache.values()];

    // /**
    //  * Creates an embed with guilds starting from an index.
    //  * @param {number} start The index to start from.
    //  * @returns {Promise<MessageEmbed>}
    //  */
    // const generateEmbed = async (start) => {
    //     const current = guilds.slice(start, start + 10);

    //     // You can of course customise this embed however you want
    //     return new MessageEmbed({
    //         title: `Showing guilds ${start + 1}-${start + ownedPlayers.length} out of ${ownedPlayers.length}`,
    //         fields: await Promise.all(
    //             ownedPlayers.map(async (player) => ({
    //                 name: 'asdfdsa',
    //                 value: `**ID:**`,
    //             }))
    //         ),
    //     });
    // };

    // // Send the embed with the first 10 guilds
    // const canFitOnOnePage = guilds.length <= 10;
    // const embedMessage = await channel.send({
    //     embeds: [await generateEmbed(0)],
    //     components: canFitOnOnePage ? [] : [new MessageActionRow({ components: [forwardButton] })],
    // });
    // // Exit if there is only one page of guilds (no need for all of this)
    // if (canFitOnOnePage) return;

    // // Collect button interactions (when a user clicks a button),
    // // but only when the button as clicked by the original message author
    // const collector = embedMessage.createMessageComponentCollector({
    //     filter: ({ user }) => user.id === author.id,
    // });

    // let currentIndex = 0;
    // collector.on('collect', async (interaction) => {
    //     // Increase/decrease index
    //     interaction.customId === backId ? (currentIndex -= 10) : (currentIndex += 10);
    //     // Respond to interaction by updating message with new embed
    //     await interaction.update({
    //         embeds: [await generateEmbed(currentIndex)],
    //         components: [
    //             new MessageActionRow({
    //                 components: [
    //                     // back button if it isn't the start
    //                     ...(currentIndex ? [backButton] : []),
    //                     // forward button if it isn't the end
    //                     ...(currentIndex + 10 < guilds.length ? [forwardButton] : []),
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
    //             console.log('adsffdsa');
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
    //inboundMessage.channel.send({ embeds: pagination });
}
