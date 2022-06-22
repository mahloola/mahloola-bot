import Discord, { Intents } from 'discord.js';
import { MessageAttachment } from 'discord.js';
import {
    attemptRoll,
    getDatabaseStatistics,
    getDiscordUser,
    getServerUserDoc,
    setClaimResetTime,
    setDatabaseStatistics,
    setDiscordUser,
    setOwnedPlayer,
    setPlayerClaimCounter,
    setPlayerRollCounter,
    setUserClaimCounter,
    setUserRollCounter,
} from '../../db/database';
import { NonDmChannel, Player } from '../../types';
import { adminDiscordId } from '../../auth.json';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

export async function roll(inboundMessage, serverPrefix, db, databaseStatistics) {
    let player: Player;
    const timestamp = new Date();
    const currentTime = timestamp.getTime();

    const user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
    let discordUser;
    if ((await getDiscordUser(inboundMessage.author.id)) == null) {
        discordUser = (await client.users.fetch(inboundMessage.author.id)).toJSON();
        await setDiscordUser(discordUser);
    } else {
        discordUser = await getDiscordUser(inboundMessage.author.id);
    }
    // exit if user does not have enough rolls
    const rollSuccess = await attemptRoll(inboundMessage.guild.id, inboundMessage.author.id);
    const isAdmin = inboundMessage.author.id === adminDiscordId;
    if (!rollSuccess) {
        // && !isAdmin
        const resetTime = user.rollResetTime;
        inboundMessage.channel.send(
            `${inboundMessage.author} You've run out of rolls. Your rolls will restock <t:${resetTime
                .toString()
                .slice(0, -3)}:R>.`
        );
        return;
    }

    // get a random player (rank 1 - 10,000)
    while (!player) {
        const querySnapshot = await db
            .collection('players')
            .where('rollIndex', '>', Math.floor(Math.random() * 9_223_372_036_854))
            .limit(1)
            .get();
        player = querySnapshot.size > 0 ? querySnapshot.docs[0].data() : null;
    }
    console.log(
        `${timestamp.toLocaleTimeString().slice(0, 5)} | ${(inboundMessage.channel as NonDmChannel).guild.name}: ${
            inboundMessage.author.username
        } rolled ${player.apiv2.username}.`
    );

    // update statistics
    const statistics = await getDatabaseStatistics();
    statistics.rolls++;
    setDatabaseStatistics(statistics);
    setUserRollCounter(discordUser.discord ?? discordUser, discordUser.rollCounter ? discordUser.rollCounter + 1 : 1);
    // set the player claimed counter to 1 if they've never been claimed, or increment it if they've been claimed before
    player.claimCounter === undefined
        ? await setPlayerRollCounter(player, 1)
        : await setPlayerRollCounter(player, player.rollCounter + 1);

    const file = new MessageAttachment(`E:/osuMudae/image/cache/osuCard-${player.apiv2.username}.png`);
    const outboundMessage = await inboundMessage.channel.send({ files: [file] });
    outboundMessage.react('👍');

    const reactions = await outboundMessage.awaitReactions({
        filter: (reaction, user) => user.id != outboundMessage.author.id && reaction.emoji.name == '👍',
        max: 1,
        time: 60000,
    });

    const reaction = reactions.get('👍');
    try {
        const reactionUsers = await reaction.users.fetch();
        let claimingUser: Discord.User;
        for (const [userId, userObject] of reactionUsers) {
            if (userId !== outboundMessage.author.id) {
                const claimingUserDoc = await getServerUserDoc(outboundMessage.guild.id, userId);
                const claimResetTime = claimingUserDoc.claimResetTime ? claimingUserDoc.claimResetTime : 0;
                if (currentTime > claimResetTime) {
                    claimingUser = userObject;
                    discordUser = await getDiscordUser(claimingUser.id);
                    if (!discordUser) {
                        const discordUserObject = await client.users.fetch(inboundMessage.author.id);
                        discordUser = discordUserObject.toJSON();
                        await setDiscordUser(discordUser);
                    }
                    await setOwnedPlayer(outboundMessage.guild.id, claimingUser.id, player.apiv2.id).then(async () => {
                        player.claimCounter === undefined
                            ? await setPlayerClaimCounter(player, 1)
                            : await setPlayerClaimCounter(player, player.claimCounter + 1);
                        discordUser.claimCounter === undefined
                            ? await setUserClaimCounter(discordUser.discord, 1)
                            : await setUserClaimCounter(discordUser.discord, discordUser.claimCounter + 1);

                        if (claimingUserDoc.ownedPlayers === undefined) {
                            outboundMessage.channel.send(
                                `**${player.apiv2.username}** has been claimed by **${claimingUser.username}**! You may claim **9** more cards with no cooldown.`
                            );
                        } else if (claimingUserDoc.ownedPlayers.length >= 9) {
                            await setClaimResetTime(outboundMessage.guild.id, claimingUser.id, currentTime + 3600000);
                            outboundMessage.channel.send(
                                `**${player.apiv2.username}** has been claimed by **${claimingUser.username}**!`
                            );
                        } else {
                            outboundMessage.channel.send(
                                `**${player.apiv2.username}** has been claimed by **${
                                    claimingUser.username
                                }**! You may claim **${
                                    9 - claimingUserDoc.ownedPlayers.length
                                }** more cards with no cooldown.`
                            );
                        }
                    });
                    console.log(
                        `${timestamp.toLocaleTimeString().slice(0, 5)} | ${
                            (inboundMessage.channel as NonDmChannel).guild.name
                        }: ${claimingUser.username} claimed ${player.apiv2.username}.`
                    );
                } else {
                    outboundMessage.channel.send(
                        `${userObject} You may claim again <t:${claimResetTime.toString().slice(0, -3)}:R>.`
                    );
                }
            }
        }
    } catch (error) {
        outboundMessage.reactions
            .removeAll()
            .catch((error) => console.error('Failed to clear reactions: DiscordAPIError: Missing Permissions'));
    }
}
