import { updateUserElo } from '../../db/database';

export async function avg(inboundMessage) {
    const elo = await updateUserElo(inboundMessage.channel.guildId, inboundMessage.author.id);
    if (elo == null) {
        inboundMessage.channel.send('You are unranked; you need to own at least 10 players.');
    } else {
        inboundMessage.channel.send(`${inboundMessage.author} Your top 10 average is **${elo.toString()}**.`);
    }
}
