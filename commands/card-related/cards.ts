// eslint-disable-next-line @typescript-eslint/no-var-requires
import paginationEmbed from 'discordjs-button-pagination';
import {MessageButton, User } from 'discord.js';
import Discord, { Intents } from 'discord.js';
import { getServerUserDoc, updateUserElo, updateUserEloByPlayers, setDiscordUser } from '../../db/database';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});
import simplifiedPlayers from '../../db/simplifiedPlayers.json';

export async function cards(interaction, serverPrefix, user: User) {
    let discordUserId;
    let discordUser;
    if (!user) {
        discordUserId = interaction.user.id;
        discordUser = interaction.user;
    } else {
        discordUserId = user.id;
        discordUser = user;
    }

    const player = await getServerUserDoc(interaction.guild.id, discordUserId);

    // get owned player ids from user document
    const playerIds = player?.ownedPlayers ?? null;

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
        discordUserId == interaction.user.id
            ? interaction.reply("You don't own any players.")
            : interaction.reply(`${discordUser.username} doesn't own any players.`);
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

    // get pinned player ids from user document
    const pinnedPlayerIds = player.pinnedPlayers ?? null;
    const pinnedPlayerObjects = [];

    // create embed body
    let pinnedDescription = '';

    if (pinnedPlayerIds?.length) {
        // check for valid pinned players, store them in pinnedPlayerObjects
        for (let i = 0; i < pinnedPlayerIds.length; i++) {
            if (simplifiedPlayers[pinnedPlayerIds[i]]) {
                pinnedPlayerObjects.push(simplifiedPlayers[pinnedPlayerIds[i]]);
            }
        }

        if (pinnedPlayerObjects?.length) {
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

            // add pinned players to embed if the user has any
            pinnedPlayerObjects.forEach(
                (player) => (pinnedDescription += `**${player[1] ?? '----'}** • ${player[0]}\n`)
            );
        }
    }

    // get the top 10 average
    const elo = await updateUserElo(interaction.guild.id, discordUserId);
    const eloDisplay = elo === null ? 'N/A' : elo;

    const embeds = [];
    // ceiling of owned players count divided by 10, then removed decimals, then converted to int
    const pages = parseInt(Math.ceil(ownedPlayerObjects.length / 10).toFixed(0));
    if (ownedPlayerObjects.length > 0) {
        for (let i = 0; i < pages; i++) {
            // create the embed message
            const embed = new Discord.MessageEmbed();
    
            // add the rest of the information
            embed.setTitle(
                `${discordUser.username}'s cards ${ownedPlayerObjects.length > 10 ? `(Page ${i + 1} of ${pages})` : ``}`
            );
            embed.setColor('#D9A6BD');
            embed.setAuthor({
                name: `${interaction.user.username}`,
                iconURL: interaction.user.avatarURL(),
                url: interaction.user.avatarURL(),
            });
            embed.setThumbnail(discordUser.avatarURL());
            // add all players to embed
            let embedDescription = ' ';
            ownedPlayerObjects.slice(i * 10, (i + 1) * 10).forEach((player) => {
                player[1] && (embedDescription += `**${player[1]}** • ${player[0]}\n`);
            });
            embed.setDescription(`Top 10 Avg: **${eloDisplay}**\n`);
            if (pinnedPlayerObjects?.length > 0) {
                embed.addField(`Pinned (${pinnedPlayerObjects.length})`, pinnedDescription);
                embed.addField(
                    `${`Players ${i * 10 + 1}-${
                        ownedPlayerObjects.length < 10 || ownedPlayerObjects.length < (i + 1) * 10
                            ? ownedPlayerObjects.length
                            : (i + 1) * 10
                    }`}`,
                    embedDescription.replaceAll('_', '\\_') // MessageEmbed field values must be non-empty strings.
                );
            } else {
                embed.addField(`Players`, embedDescription);
            }
            embed.setTimestamp(Date.now());
            embeds.push(embed);
        }
    }
    
    // if (ownedPlayerObjects.length <= 10) return; // end it here if the user doesn't have multiple pages

    // pagination
    const button1 = new MessageButton().setCustomId('previousbtn').setLabel('Previous').setStyle('DANGER');
    const button2 = new MessageButton().setCustomId('nextbtn').setLabel('Next').setStyle('SUCCESS');
    const buttonList = [button1, button2];
    await interaction.reply(`${await paginationEmbed(interaction, embeds, buttonList, 120000)} _ _`);
}
