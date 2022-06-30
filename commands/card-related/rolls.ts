import { getServerUserDoc, setRollResetTime, setRolls } from '../../db/database';

export async function rolls(inboundMessage) {
    let user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
    let currentRolls;
    let resetTimestamp;
    if (user) {
        currentRolls = user.rolls;
        resetTimestamp = user.rollResetTime;
    } else {
        await setRolls(inboundMessage.channel.guildId, inboundMessage.author.id, 10);
        await setRollResetTime(inboundMessage.channel.guildId, inboundMessage.author.id);
        currentRolls = 10;
        resetTimestamp = new Date().getTime();
        user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
    }

    const resetTime = new Date(resetTimestamp).getTime();
    const currentTime = new Date().getTime();
    if (currentTime > resetTime) {
        await setRolls(inboundMessage.guild.id, inboundMessage.author.id, 10);
        currentRolls = 10;
    }
    const timeRemaining = resetTime - currentTime;
    if (currentRolls === 1) {
        inboundMessage.channel.send(
            `You have 1 final roll remaining. Your roll restock time is <t:${resetTime.toString().slice(0, -3)}:T>.`
        );
    } else if (currentRolls === 10 || resetTime === null) {
        inboundMessage.channel.send(`You have 10 rolls remaining.`);
    } else if (currentRolls > 0 && resetTime != null) {
        inboundMessage.channel.send(
            `You have ${currentRolls} rolls remaining. Your roll restock time is <t:${resetTime
                .toString()
                .slice(0, -3)}:T>.`
        );
    } else {
        inboundMessage.channel.send(
            `${inboundMessage.author} You've run out of rolls. Your roll restock time is <t:${resetTime
                .toString()
                .slice(0, -3)}:T>.`
        );
    }
}
