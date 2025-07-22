import { getDiscordUser, getServerUserDoc, setRollResetTime, setRolls } from '../../db/database.js';
import { isPremium } from '../util/isPremium.js';

export async function rolls(interaction) {
    let user = await getServerUserDoc(interaction.guild.id, interaction.user.id);
    const discordUser = await getDiscordUser(interaction.user.id);
    let currentRolls, resetTimestamp;
    const maxRolls = isPremium(discordUser) ? 12 : 10;
    if (user) {
        currentRolls = user.rolls;
        resetTimestamp = user.rollResetTime;
    } else {
        currentRolls = maxRolls;
        await setRolls(interaction.channel.guildId, interaction.user.id, maxRolls);
        await setRollResetTime(interaction.channel.guildId, interaction.user.id);
        resetTimestamp = new Date().getTime();
        user = await getServerUserDoc(interaction.guild.id, interaction.user.id);
    }

    const resetTime = new Date(resetTimestamp).getTime();
    const currentTime = new Date().getTime();
    if (currentTime > resetTime) {
        await setRolls(interaction.guild.id, interaction.user.id, maxRolls);
        currentRolls = maxRolls;
    }
    const timeRemaining = resetTime - currentTime;
    if (currentRolls === 1) {
        interaction.reply(
            `You have 1 final roll remaining. Your roll restock time is <t:${resetTime.toString().slice(0, -3)}:T>.`
        );
    } else if (currentRolls === maxRolls || resetTime === null) {
        interaction.reply(`You have ${maxRolls} rolls remaining.`);
    } else if (currentRolls > 0 && resetTime != null) {
        interaction.reply(
            `You have ${currentRolls} rolls remaining. Your roll restock time is <t:${resetTime
                .toString()
                .slice(0, -3)}:T>.`
        );
    } else {
        interaction.reply(
            `${interaction.user} You've run out of rolls. Your roll restock time is <t:${resetTime
                .toString()
                .slice(0, -3)}:T>.`
        );
    }
}
