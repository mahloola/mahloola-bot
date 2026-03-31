import Discord, { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import auth from '../../auth.json' assert { type: 'json' };
import { attemptRoll, getDiscordUser, getServerUserDoc, setDiscordUser, updateUserElo } from '../../db/database.js';
import { NonDmChannel } from '../../types';
import checkOwnedFlag from '../util/checkOwnedFlag.js';
import claimCard from '../util/claimCard.js';
import getRandomPlayer from '../util/getRandomPlayer.js';
import logClaim from '../util/logFunctions/logClaim.js';
import { sleep } from '../util/sleep.js';
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
    const isAdmin = interaction.user?.id == adminDiscordId;
    const timestamp = new Date();
    const currentTime = timestamp.getTime();
    const user = await getServerUserDoc(interaction?.guild?.id, interaction.user.id);
    const timestamp2 = new Date().getTime();
    const discordUserInDatabase = await getDiscordUser(interaction.user.id);
    const timestamp3 = new Date().getTime();
    const discordUser = interaction.user.toJSON();
    await updateDiscordUser(discordUserInDatabase, discordUser, interaction);
    const timestamp4 = new Date().getTime();

    // THIS ONE TAKES FOREVER
    // the others take an increasing amount of time the more you roll
    const rollSuccess = await attemptRoll(interaction?.guild?.id, interaction.user.id, discordUserInDatabase);
    const timestamp5 = new Date().getTime();
    if (!rollSuccess && !isAdmin) {
        const resetTime = user.rollResetTime;
        await interaction.reply(
            `${interaction.member} You've run out of rolls. Your roll restock time is <t:${resetTime
                .toString()
                .slice(0, -3)}:T>.`
        );
        return;
    }
    let player = await getRandomPlayer(db);
    const timestamp6 = new Date().getTime();

    const confirm = new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Success);
    // console.log('2 - 1:', timestamp2 - currentTime);
    // console.log('3 - 2:', timestamp3 - timestamp2);
    // console.log('4 - 3:', timestamp4 - timestamp3);
    // console.log('5 - 4:', timestamp5 - timestamp4);
    // console.log('6 - 5:', timestamp6 - timestamp5);

    const timestamp7 = new Date().getTime();

    const getRollText = (rolls?: number) => {
        if (rolls === undefined) return '*No roll data*';
        return `*${rolls} roll${rolls === 1 ? '' : 's'} remaining*`;
    };

    const outboundMessage = (await interaction.reply({
        content: getRollText(user?.rolls),
        files: [new AttachmentBuilder(`${imageDirectory}/osuCard-${player.apiv2.username}.png`)],
        fetchReply: true,
        ephemeral: false,
        components: [row],
    })) as Discord.Message;

    const timestamp8 = new Date().getTime();

    const rollTimeTaken = timestamp8 - currentTime;
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

        collector.on('collect', async (reactInteraction) => {
            if (reactInteraction.customId === 'reroll') {
                if (reactInteraction.user.id !== interaction.user?.id) {
                    await reactInteraction.reply({
                        content: 'Only the roller can reroll.',
                        ephemeral: true,
                    });
                    return;
                }
                const remainingRolls = user?.rolls;

                player = await getRandomPlayer(db);

                if (user?.rolls !== undefined) {
                    user.rolls -= 1;
                }

                // update message with new image
                await reactInteraction.update({
                    content: getRollText(user?.rolls),
                    files: [new AttachmentBuilder(`${imageDirectory}/osuCard-${player.apiv2.username}.png`)],
                    components: [row],
                });

                return;
            }

            // 👇 existing claim logic
            if (reactInteraction.customId === 'claim') {
                if (reactInteraction.user.id !== outboundMessage?.member?.id) {
                    const claimingUserDoc = await getServerUserDoc(
                        outboundMessage?.guild?.id,
                        reactInteraction.user.id
                    );

                    const neverUsed = claimingUserDoc == null;
                    const claimResetTime = claimingUserDoc?.claimResetTime ?? 0;

                    if (!isAdmin && (currentTime > claimResetTime || neverUsed)) {
                        const ownedFlag = checkOwnedFlag(claimingUserDoc, player);

                        if (ownedFlag) {
                            outboundMessage.channel.send(
                                `${reactInteraction.user} You already own **${player.apiv2.username}**.`
                            );
                        } else {
                            await sleep(1000);

                            const claimingUser = reactInteraction.user;
                            let discordUser = await getDiscordUser(claimingUser.id);

                            if (discordUser === null) {
                                await setDiscordUser(reactInteraction.user.toJSON());
                                discordUser = await getDiscordUser(claimingUser.id);
                            }

                            logClaim(timestamp, reactInteraction, claimingUser, player);
                            updateUserElo(reactInteraction?.guild?.id, reactInteraction.user.id);

                            await claimCard(
                                reactInteraction,
                                claimingUser,
                                player,
                                discordUser,
                                claimingUserDoc,
                                currentTime
                            );
                        }
                    } else {
                        reactInteraction.reply(
                            `${reactInteraction.user} You may claim again <t:${claimResetTime.toString().slice(0, -3)}:R>.`
                        );
                    }
                }
            }
        });
    } catch (error) {
        outboundMessage.reactions
            .removeAll()
            .catch((error) => console.error('Failed to clear reactions: DiscordAPIError: Missing Permissions'));
    }
}
