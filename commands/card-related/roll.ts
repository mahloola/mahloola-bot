import Discord, { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { DiscordUser, GlobalUser } from '../../types';
import { attemptRoll, getDiscordUser, getServerUserDoc, setDiscordUser, updateUserElo } from '../../db/database';
import { imageDirectory } from '../../auth.json';
import claimCard from '../util/claimCard';
import checkOwnedFlag from '../util/checkOwnedFlag';
import updateRollStatistics from '../util/updateRollStatistics';
import updateDiscordUser from '../util/updateDiscordUser';
import logClaim from '../util/logFunctions/logClaim';
import logRoll from '../util/logFunctions/logRoll';
import getRandomPlayer from '../util/getRandomPlayer';
import { sleep } from '../util/sleep';

export async function roll(
    interaction: Discord.CommandInteraction<Discord.CacheType>,
    db: FirebaseFirestore.Firestore
) {
    const timestamp = new Date();
    const currentTime = timestamp.getTime();
    const user = await getServerUserDoc(interaction.guild.id, interaction.user.id);
    const discordUserInDatabase = await getDiscordUser(interaction.user.id);
    let discordUser = interaction.user.toJSON();
    await updateDiscordUser(discordUserInDatabase, discordUser, interaction);
    // exit if user does not have enough rolls
    const rollSuccess = await attemptRoll(interaction.guild.id, interaction.user.id, discordUserInDatabase);
    if (!rollSuccess) {
        const resetTime = user.rollResetTime;
        await interaction.reply(
            `${interaction.member} You've run out of rolls. Your roll restock time is <t:${resetTime
                .toString()
                .slice(0, -3)}:T>.`
        );
        return;
    }
    const player = await getRandomPlayer(db);
    let file;
    while (!file) {
        file = new AttachmentBuilder(`${imageDirectory}/cache/osuCard-${player.apiv2.username}.png`);
    }
    logRoll(timestamp, interaction, player);

    const confirm = new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Success);
    const row: any = new ActionRowBuilder() // Set the type of the component
        .addComponents(confirm);

    const outboundMessage = (await interaction.reply({
        files: [file],
        fetchReply: true,
        ephemeral: false,
        components: [row],
    })) as Discord.Message;

    updateRollStatistics(discordUserInDatabase, player);

    try {
        const collector = outboundMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000,
        });
        let claimingUser: Discord.User;
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== outboundMessage.member.id) {
                const claimingUserDoc = await getServerUserDoc(outboundMessage.guild.id, interaction.user.id);
                const neverUsed = claimingUserDoc == null;
                const claimResetTime = claimingUserDoc?.claimResetTime ?? 0;
                if (currentTime > claimResetTime || neverUsed) {
                    const ownedFlag = checkOwnedFlag(claimingUserDoc, player);
                    if (ownedFlag) {
                        outboundMessage.channel.send(
                            `${interaction.user} You already own **${player.apiv2.username}**.`
                        );
                    } else {
                        sleep(1000); // bandage race solution fix: sleep for 1 second to allow the database to update
                        claimingUser = interaction.user;
                        discordUser = await getDiscordUser(claimingUser.id);
                        if (discordUser === null) {
                            // if the user claiming has never used the bot before, create a global user profile
                            await setDiscordUser(interaction.user.toJSON());
                            discordUser = await getDiscordUser(claimingUser.id);
                        }
                        logClaim(timestamp, interaction, claimingUser, player);
                        updateUserElo(interaction.guild.id, interaction.user.id);
                        await claimCard(interaction, claimingUser, player, discordUser, claimingUserDoc, currentTime);
                        outboundMessage.edit({ components: [] });
                    }
                } else {
                    interaction.reply(
                        `${interaction.user} You may claim again <t:${claimResetTime.toString().slice(0, -3)}:R>.`
                    );
                }
            }
        });
    } catch (error) {
        outboundMessage.reactions
            .removeAll()
            .catch((error) => console.error('Failed to clear reactions: DiscordAPIError: Missing Permissions'));
    }
}
