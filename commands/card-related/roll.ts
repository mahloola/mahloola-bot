import Discord, { CommandInteraction, Intents, Message } from 'discord.js';
import { MessageAttachment } from 'discord.js';
import {
    attemptRoll,
    getDatabaseStatistics,
    getDiscordUser,
    getPlayerByUsername,
    getServerUserDoc,
    setClaimResetTime,
    setDatabaseStatistics,
    setDiscordUser,
    setOwnedPlayer,
    setPlayerClaimCounter,
    setPlayerRollCounter,
    setUserClaimCounter,
    setUserRollCounter,
    updateUserElo,
} from '../../db/database';
import { NonDmChannel, Player } from '../../types';
import { adminDiscordId, imageDirectory } from '../../auth.json';

export async function roll(
    interaction: Discord.CommandInteraction<Discord.CacheType>,
    serverPrefix,
    db: FirebaseFirestore.Firestore,
    databaseStatistics,
    client: Discord.Client<boolean>
) {
    let player: Player;
    const timestamp = new Date();
    const currentTime = timestamp.getTime();
    const user = await getServerUserDoc(interaction.guild.id, interaction.user.id);
    let discordUser;
    if ((await getDiscordUser(interaction.user.id)) == null) {
        discordUser = interaction.user.toJSON();
        await setDiscordUser(discordUser);
    } else {
        discordUser = await getDiscordUser(interaction.user.id);
    }
    // exit if user does not have enough rolls
    const rollSuccess = await attemptRoll(interaction.guild.id, interaction.user.id, discordUser);
    const isAdmin = interaction.user.id === adminDiscordId;
    if (!rollSuccess) {
        // && !isAdmin
        const resetTime = user.rollResetTime;
        await interaction.reply(
            `${interaction.member} You've run out of rolls. Your roll restock time is <t:${resetTime
                .toString()
                .slice(0, -3)}:T>.`
        );
        return;
    }
    let file;
    while (!file) {
        // get a random player (rank 1 - 10,000)
        while (!player) {
            const querySnapshot = await db
                .collection('players')
                .where('rollIndex', '>', Math.floor(Math.random() * 9_223_372_036_854))
                .limit(1)
                .get();
            player = querySnapshot.size > 0 ? (querySnapshot.docs[0].data() as any) : null;
        }
        file = new MessageAttachment(`${imageDirectory}/cache/osuCard-${player.apiv2.username}.png`);
    }
    console.log(
        `${timestamp.toLocaleTimeString().slice(0, 5)} | ${(interaction.channel as NonDmChannel).guild.name}: ${
            interaction.user.username
        } rolled ${player.apiv2.username}.`
    );
    const outboundMessage = (await interaction.reply({
        files: [file],
        fetchReply: true,
        ephemeral: false,
    })) as Discord.Message;
    
    // update statistics
    const statistics = await getDatabaseStatistics();
    statistics.rolls++;
    setDatabaseStatistics(statistics);
    setUserRollCounter(discordUser.discord ?? discordUser, discordUser.rollCounter ? discordUser.rollCounter + 1 : 1);
    // set the player claimed counter to 1 if they've never been claimed, or increment it if they've been claimed before
    player.claimCounter === undefined
        ? await setPlayerRollCounter(player, 1)
        : await setPlayerRollCounter(player, player.rollCounter + 1);
    await outboundMessage.react('👍');
    const reactions = await outboundMessage.awaitReactions({
        filter: (reaction, user) => user.id != outboundMessage.member.id && reaction.emoji.name == '👍',
        max: 1,
        time: 60000,
    });
    const reaction = reactions.get('👍');
    try {
        const reactionUsers = await reaction.users.fetch();
        let claimingUser: Discord.User;
        for (const [userId, userObject] of reactionUsers) {
            if (userId !== outboundMessage.member.id) {
                const claimingUserDoc = await getServerUserDoc(outboundMessage.guild.id, userId);
                const claimResetTime = claimingUserDoc.claimResetTime ?? 0;
                if (currentTime > claimResetTime) {
                    let ownedFlag = false;
                    if (claimingUserDoc.ownedPlayers?.includes(player.apiv2.id)) {
                        outboundMessage.channel.send(`${userObject} You already own **${player.apiv2.username}**.`);
                        ownedFlag = true;
                    }
                    if (!ownedFlag) {
                        claimingUser = userObject;
                        discordUser = await getDiscordUser(claimingUser.id);
                        if (!discordUser) {
                            const discordUserObject = interaction.member;
                            discordUser = discordUserObject;
                            // discordUser = discordUserObject.toJSON();
                            await setDiscordUser(discordUser);
                        }
                        await setOwnedPlayer(outboundMessage.guild.id, claimingUser.id, player.apiv2.id).then(
                            async () => {
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
                                    await setClaimResetTime(
                                        outboundMessage.guild.id,
                                        claimingUser.id,
                                        currentTime + 3600000
                                    );
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
                            }
                        );
                        await updateUserElo(interaction.guild.id, interaction.user.id);
                        console.log(
                            `${timestamp.toLocaleTimeString().slice(0, 5)} | ${
                                (interaction.channel as NonDmChannel).guild.name
                            }: ${claimingUser.username} claimed ${player.apiv2.username}.`
                        );
                    }
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
