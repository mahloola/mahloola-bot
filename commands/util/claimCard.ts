import { setClaimResetTime, setOwnedPlayer, setPlayerClaimCounter, setUserClaimCounter } from '../../db/database.js';

async function claimCard(interaction, claimingUser, player, discordUser, claimingUserDoc, currentTime) {
    await setOwnedPlayer(interaction.guild.id, claimingUser.id, player.apiv2.id);

    // Update counters
    if (player.claimCounter === undefined) {
        await setPlayerClaimCounter(player, 1);
    } else {
        await setPlayerClaimCounter(player, player.claimCounter + 1);
    }

    if (discordUser.claimCounter === undefined) {
        await setUserClaimCounter(discordUser.discord, 1);
    } else {
        await setUserClaimCounter(discordUser.discord, discordUser.claimCounter + 1);
    }

    // Reply to the interaction
    if (!claimingUserDoc?.ownedPlayers) {
        await interaction.editReply(
            `**${player.apiv2.username}** has been claimed by **${claimingUser}**! You may claim **9** more cards with no cooldown.`
        );
    } else if (claimingUserDoc.ownedPlayers.length >= 9) {
        await setClaimResetTime(interaction.guild.id, claimingUser.id, currentTime + 3600000);
        await interaction.editReply(`**${player.apiv2.username}** has been claimed by **${claimingUser}**!`);
    } else {
        await interaction.editReply(
            `**${player.apiv2.username}** has been claimed by **${claimingUser}**! You may claim **${
                9 - claimingUserDoc.ownedPlayers.length
            }** more cards with no cooldown.`
        );
    }
}

export default claimCard;
