import Discord, { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import auth from '../../auth.json' assert { type: 'json' };
import { attemptRoll, getDiscordUser, getServerUserDoc, setDiscordUser, updateUserElo } from '../../db/database.js';
import { NonDmChannel } from '../../types';
import checkOwnedFlag from '../util/checkOwnedFlag.js';
import claimCard from '../util/claimCard.js';
import getRandomPlayer from '../util/getRandomPlayer.js';
import logClaim from '../util/logFunctions/logClaim.js';
import updateDiscordUser from '../util/updateDiscordUser.js';
import updateRollStatistics from '../util/updateRollStatistics.js';
const { adminDiscordId, imageDirectory } = auth;

const claimButton = new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Success);
const rerollButton = new ButtonBuilder().setCustomId('reroll').setLabel('Reroll').setStyle(ButtonStyle.Secondary);
const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton, rerollButton);

export async function roll(
    interaction: Discord.CommandInteraction<Discord.CacheType>,
    db: FirebaseFirestore.Firestore
) {
    await interaction.deferReply({ ephemeral: false }); // gives you 15 min to respond

    const timestamp = new Date();
    const currentTime = timestamp.getTime();
    const user = await getServerUserDoc(interaction?.guild?.id, interaction.user.id);
    const discordUserInDatabase = await getDiscordUser(interaction.user.id);
    const discordUser = interaction.user.toJSON();
    await updateDiscordUser(discordUserInDatabase, discordUser, interaction);

    // Handle initial roll attempt
    let currentUser = user;
    const rollSuccess = await attemptRoll(interaction?.guild?.id, interaction.user.id, discordUserInDatabase);

    if (!rollSuccess) {
        const resetTime = currentUser?.rollResetTime;
        await interaction.editReply(
            `${interaction.member} You've run out of rolls. Your roll restock time is <t:${resetTime
                .toString()
                .slice(0, -3)}:T>.`
        );
        return;
    }

    // Get fresh user data after roll attempt
    currentUser = await getServerUserDoc(interaction?.guild?.id, interaction.user.id);
    let player = await getRandomPlayer(db);

    const getRollText = (rolls?: number) => {
        if (rolls === undefined) return '*No roll data*';
        return `*${rolls} roll${rolls === 1 ? '' : 's'} remaining*`;
    };

    const outboundMessage = (await interaction.editReply({
        content: getRollText(currentUser?.rolls),
        files: [new AttachmentBuilder(`${imageDirectory}/osuCard-${player.apiv2.username}.png`)],
        components: [row],
    })) as Discord.Message;

    const rollTimeTaken = Date.now() - currentTime;
    console.log(
        `${timestamp.toLocaleTimeString().slice(0, 5)} | ${(interaction.channel as NonDmChannel).guild.name}: ${
            interaction.user.username
        } rolled ${player.apiv2.username} (${rollTimeTaken}ms).`
    );

    updateRollStatistics(discordUserInDatabase, player);

    try {
        const collector = outboundMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000,
        });

        let isClaimed = false; // Track if card has been claimed

        collector.on('collect', async (reactInteraction) => {
            if (isClaimed) {
                await reactInteraction.reply({
                    content: 'This card has already been claimed.',
                    ephemeral: true,
                });
                return;
            }

            if (reactInteraction.customId === 'reroll') {
                if (reactInteraction.user.id !== interaction.user?.id) {
                    await reactInteraction.reply({
                        content: 'Only the roller can reroll.',
                        ephemeral: true,
                    });
                    return;
                }

                // Prevent reroll if card has been claimed
                if (isClaimed) {
                    await reactInteraction.reply({
                        content: 'Cannot reroll a claimed card.',
                        ephemeral: true,
                    });
                    return;
                }

                // Attempt a new roll using the same roll logic
                const rerollSuccess = await attemptRoll(
                    interaction?.guild?.id,
                    interaction.user.id,
                    discordUserInDatabase
                );

                if (!rerollSuccess) {
                    // User has no rolls left
                    const freshUser = await getServerUserDoc(interaction?.guild?.id, interaction.user.id);
                    const resetTime = freshUser?.rollResetTime;
                    await reactInteraction.reply({
                        content: `You've run out of rolls. Your roll restock time is <t:${resetTime
                            .toString()
                            .slice(0, -3)}:T>.`,
                        ephemeral: true,
                    });
                    return;
                }

                // Get fresh user data and new random player
                const updatedUser = await getServerUserDoc(interaction?.guild?.id, interaction.user.id);
                const newPlayer = await getRandomPlayer(db);

                // Update the message with new card and updated roll count
                await reactInteraction.update({
                    content: getRollText(updatedUser?.rolls),
                    files: [new AttachmentBuilder(`${imageDirectory}/osuCard-${newPlayer.apiv2.username}.png`)],
                    components: [row],
                });

                // Update local references
                player = newPlayer;
                currentUser = updatedUser;

                return;
            }

            // Claim logic
            if (reactInteraction.customId === 'claim') {
                // Prevent duplicate claims
                if (isClaimed) {
                    await reactInteraction.reply({
                        content: 'This card has already been claimed.',
                        ephemeral: true,
                    });
                    return;
                }

                await reactInteraction.deferReply();

                // Get the latest user data for the claiming user
                const claimingUserDoc = await getServerUserDoc(outboundMessage?.guild?.id, reactInteraction.user.id);

                const neverUsed = claimingUserDoc == null;
                const claimResetTime = claimingUserDoc?.claimResetTime ?? 0;

                if (currentTime > claimResetTime || neverUsed || reactInteraction.user.id === adminDiscordId) {
                    const ownedFlag = checkOwnedFlag(claimingUserDoc, player);

                    if (ownedFlag) {
                        await reactInteraction.editReply(
                            `${reactInteraction.user} You already own **${player.apiv2.username}**.`
                        );
                    } else {
                        const claimingUser = reactInteraction.user;
                        let discordUserForClaim = await getDiscordUser(claimingUser.id);

                        if (discordUserForClaim === null) {
                            await setDiscordUser(reactInteraction.user.toJSON());
                            discordUserForClaim = await getDiscordUser(claimingUser.id);
                        }

                        logClaim(timestamp, reactInteraction, claimingUser, player);
                        updateUserElo(reactInteraction?.guild?.id, reactInteraction.user.id);

                        await claimCard(
                            reactInteraction,
                            claimingUser,
                            player,
                            discordUserForClaim,
                            claimingUserDoc,
                            currentTime
                        );

                        isClaimed = true; // Mark as claimed to prevent further interactions

                        // // Optionally disable buttons after claiming
                        // const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        //     claimButton.setDisabled(true),
                        //     rerollButton.setDisabled(true)
                        // );
                        // await outboundMessage.edit({ components: [disabledRow] }).catch(console.error);
                    }
                } else {
                    await reactInteraction.editReply(
                        `${reactInteraction.user} You may claim again <t:${claimResetTime.toString().slice(0, -3)}:R>.`
                    );
                }
            }
        });

        collector.on('end', async () => {
            // Disable buttons when collector times out
            if (!isClaimed) {
                const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    claimButton.setDisabled(true),
                    rerollButton.setDisabled(true)
                );
                await outboundMessage.edit({ components: [disabledRow] }).catch(console.error);
            }
        });
    } catch (error) {
        console.error('Error in roll function:', error);
        try {
            await outboundMessage
                .edit({
                    content: 'An error occurred. Please try again.',
                    components: [],
                })
                .catch(console.error);
        } catch (editError) {
            console.error('Failed to edit error message:', editError);
        }
    }
}
