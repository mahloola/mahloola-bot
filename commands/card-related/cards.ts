// eslint-disable-next-line @typescript-eslint/no-var-requires
import { pagination, ButtonTypes, ButtonStyles } from '@devraelfreeze/discordjs-pagination';
import { ButtonBuilder, ButtonStyle, EmbedBuilder, User } from 'discord.js';
import Discord from 'discord.js';
import { getServerUserDoc, updateUserElo, updateUserEloByPlayers, setDiscordUser } from '../../db/database';
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
            const embed = new EmbedBuilder();
    
            // add the rest of the information
            embed.setTitle(
                `${discordUser.username}'s cards ${ownedPlayerObjects.length > 10 ? `(Page ${i + 1} of ${pages})` : ``}`
            );
            embed.setColor('#D9A6BD');
            embed.setAuthor({
                name: `${discordUser.username}`,
                iconURL: discordUser.avatarURL(),
                url: discordUser.avatarURL(),
            });
            embed.setThumbnail(discordUser.avatarURL());
            // add all players to embed
            let embedDescription = ' ';
            ownedPlayerObjects.slice(i * 10, (i + 1) * 10).forEach((player) => {
                player[1] && (embedDescription += `**${player[1]}** • ${player[0]}\n`);
            });
            embed.setDescription(`Top 10 Avg: **${eloDisplay}**\n`);
            if (pinnedPlayerObjects?.length > 0) {
                embed.addFields({name: `Pinned (${pinnedPlayerObjects.length})`, value: pinnedDescription});
                embed.addFields({name:
                    `${`Players ${i * 10 + 1}-${
                        ownedPlayerObjects.length < 10 || ownedPlayerObjects.length < (i + 1) * 10
                            ? ownedPlayerObjects.length
                            : (i + 1) * 10
                    }`}`, value:
                    embedDescription.replaceAll('_', '\\_')} // MessageEmbed field values must be non-empty strings.
                );
            } else {
                embed.addFields({name: `Players`, value: embedDescription});
            }
            embed.setTimestamp(Date.now());
            embeds.push(embed);
        }
    }
    
    // if (ownedPlayerObjects.length <= 10) return; // end it here if the user doesn't have multiple pages

    // pagination
    const buttons =  [
        {
          type: ButtonTypes.previous,
          label: 'Previous Page',
          style: ButtonStyles.Primary
        },
        {
          type: ButtonTypes.next,
          label: 'Next Page',
          style: ButtonStyles.Success
        }
      ]
    await pagination({embeds: embeds, author: discordUser, interaction: interaction, buttons: buttons, time: 120000});
}
