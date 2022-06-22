import { getServerUserDoc, setClaimResetTime } from '../../db/database';

export async function claim(inboundMessage) {
    const user = await getServerUserDoc(inboundMessage.guild.id, inboundMessage.author.id);
    let resetTime;
    const currentTime = new Date().getTime();
    if (user) {
        // if user exists in the database
        resetTime = user.claimResetTime;
    } else {
        // if user doesn't exist yet
        await setClaimResetTime(inboundMessage.channel.guildId, inboundMessage.author.id, currentTime);
        resetTime = currentTime;
    }
    if (currentTime > resetTime) {
        // if user is past their cooldown
        await setClaimResetTime(inboundMessage.channel.guildId, inboundMessage.author.id, currentTime); // set their reset time to 'now'
        resetTime = currentTime;
    }
    const timeRemaining = resetTime - currentTime;
    console.log(resetTime);
    if (timeRemaining > 0) {
        inboundMessage.channel.send(
            `${inboundMessage.author} You may claim again <t:${resetTime.toString().slice(0, -3)}:R>.`
        );
    } else {
        inboundMessage.channel.send(`${inboundMessage.author} You may claim now.`);
    }
}
