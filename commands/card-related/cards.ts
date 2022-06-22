import Discord, { Intents } from 'discord.js';
import { getOwnedPlayers, getPinnedPlayers, getPlayer, updateUserEloByPlayers } from '../../db/database';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

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
    const playerIds = await getOwnedPlayers(inboundMessage.guild.id, discordUserId, 10);

    // check if user owns anybody first
    if (!playerIds) {
        discordUserId == inboundMessage.author.id
            ? inboundMessage.channel.send("You don't own any players.")
            : inboundMessage.channel.send(`${discordUser.username} doesn't own any players.`);
        return;
    }
    // get full list of players
    const ownedPlayersNames = [];
    const ownedPlayersRanks = [];

    const ownedPlayerPromises = [];
    for (const id of playerIds) {
        ownedPlayerPromises.push(getPlayer(id));
    }
    const ownedP = [];
    let ownedPlayerPromiseResults = Promise.allSettled(ownedPlayerPromises).then((players) => {
        players.forEach((player) => {
            if (player.status == 'fulfilled') {
                ownedP.push(player.value);
            }
        });
    });
    const playeurs = [];
    ownedP.forEach((player) => {
        if (player) {
            playeurs.push(player);
        }
    });
    const ownedPlayers = [];
    for (const id of playerIds) {
        const player = await getPlayer(id);
        if (player !== null) {
            if (player.apiv2.statistics.global_rank !== null) {
                ownedPlayers.push(player);
            }
        }
    }
    // sort players by rank
    ownedPlayers.sort((a, b) => {
        return a.apiv2.statistics.global_rank - b.apiv2.statistics.global_rank;
    });

    // store names and ranks into arrays for easier use
    for (let i = 0; i < ownedPlayers.length; i++) {
        ownedPlayersNames.push(ownedPlayers[i].apiv2.username);
        ownedPlayersRanks.push(ownedPlayers[i].apiv2.statistics.global_rank);
    }

    // get pinned players
    const pinnedPlayerIds = await getPinnedPlayers(inboundMessage.guild.id, discordUserId, 10);

    const pinnedPlayerPromises = [];

    if (pinnedPlayerIds) {
        for (const id of pinnedPlayerIds) {
            pinnedPlayerPromises.push(getPlayer(id));
        }
    }
    const pinnedPlayers = await Promise.all(pinnedPlayerPromises);

    // get the top 10 average
    const elo = await updateUserEloByPlayers(inboundMessage.guild.id, discordUserId, ownedPlayers);
    const eloDisplay = elo == null ? 'N/A' : elo;

    // create embed body
    let pinnedDescription = '';

    // sort pinned players
    pinnedPlayers.sort((a, b) => {
        return a.apiv2.statistics.global_rank - b.apiv2.statistics.global_rank;
    });

    // add pinned players to embed if the user has any
    if (pinnedPlayers) {
        pinnedPlayers.forEach(
            (player) => (pinnedDescription += `**${player.apiv2.statistics.global_rank}** • ${player.apiv2.username}\n`)
        );
    }

    // add all players to embed
    let embedDescription = '';
    ownedPlayers.slice(0, 10).forEach((player) => {
        embedDescription += `**${player.apiv2.statistics.global_rank}** • ${player.apiv2.username}\n`;
    });

    // create the embed message
    const embed = new Discord.MessageEmbed();

    // add the rest of the information
    embed.setTitle(`${discordUser.username}'s cards`);
    embed.setColor('#D9A6BD');
    embed.setAuthor({
        name: `${inboundMessage.author.username}#${inboundMessage.author.discriminator}`,
        iconURL: inboundMessage.author.avatarURL(),
        url: inboundMessage.author.avatarURL(),
    });
    embed.setThumbnail(discordUser.avatarURL());
    embed.setDescription(`Top 10 Avg: **${eloDisplay}**\n`);
    if (pinnedPlayerIds?.length > 0) {
        embed.addField(`Pinned (${pinnedPlayerIds.length})`, pinnedDescription);
        embed.addField(`Top`, embedDescription);
    } else {
        embed.addField(`Players`, embedDescription);
    }
    embed.setTimestamp(Date.now());

    // send the message
    inboundMessage.channel.send({ embeds: [embed] });
}
