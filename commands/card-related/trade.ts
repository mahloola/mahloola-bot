import { getServerUserDoc } from '../../db/database';

export async function trade(inboundMessage) {
    const user = inboundMessage.author;
    const serverId = inboundMessage.guild.id;
    inboundMessage.channel.send(`${user}, who would you like to trade with?`);
    const userResponse = await inboundMessage.channel.awaitMessages({
        filter: (sender) => {
            return sender.author.id == user.id;
        },
        max: 1,
        time: 30000,
        errors: ['time'],
    });

    inboundMessage.channel.send("lol this command doesn't work yet");
    //inboundMessage.channel.send(await getServerUser(serverId, user.id).ownedPlayers[0]);
    const user2 = await getServerUserDoc(serverId, user.id).catch((err) =>
        console.error(`Couldn't retrieve user ${user.id}: ${err}`)
    );
    //inboundMessage.channel.send(`${user}, who would you like to trade with?`);
    //let user2 = await getServerUsers(serverId).where(userResponse.first().content, '==', getServerUserDoc(serverId, user.id).apiv2.username);
}
