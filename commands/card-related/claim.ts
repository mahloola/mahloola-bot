import { getServerUserDoc, setClaimResetTime } from '../../db/database.js';

export async function claim(interaction) {
    const user = await getServerUserDoc(interaction.guild.id, interaction.user.id);
    let resetTime;
    const currentTime = new Date().getTime();
    if (user) {
        // if user exists in the database
        resetTime = user.claimResetTime;
    } else {
        // if user doesn't exist yet
        await setClaimResetTime(interaction.channel.guildId, interaction.user.id, currentTime);
        resetTime = currentTime;
    }
    if (currentTime > resetTime) {
        // if user is past their cooldown
        await setClaimResetTime(interaction.channel.guildId, interaction.user.id, currentTime); // set their reset time to 'now'
        resetTime = currentTime;
    }
    const timeRemaining = resetTime - currentTime;
    if (timeRemaining > 0) {
        interaction.reply(`${interaction.user} You may claim again <t:${resetTime.toString().slice(0, -3)}:R>.`);
    } else {
        interaction.reply(`${interaction.user} You may claim now.`);
    }
}
