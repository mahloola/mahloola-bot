import { deletePinnedPlayer, getPlayerByUsername, getServerUserDoc } from '../../db/database';

export async function unpin(inboundMessage, serverPrefix) {
    const username = inboundMessage.content.substring(6 + serverPrefix.length);
    if (username) {
        if (username.includes('@everyone') || username.includes('@here')) {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        } else {
            const player = await getPlayerByUsername(username);
            if (player) {
                const user = await getServerUserDoc(inboundMessage.channel.guildId, inboundMessage.author.id);
                const validFlag = user?.ownedPlayers?.includes(player.apiv2.id);
                if (validFlag) {
                    await deletePinnedPlayer(
                        inboundMessage.channel.guildId,
                        inboundMessage.author.id,
                        player.apiv2.id
                    ).catch((err) => console.error(err));
                    inboundMessage.channel.send(`${inboundMessage.author} unpinned ${username} successfully.`);
                } else {
                    inboundMessage.channel.send(
                        `${inboundMessage.author} You do not own a player with the username "${username}".`
                    );
                }
            } else {
                inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found.`);
            }
        }
    } else {
        inboundMessage.channel.send(
            `${inboundMessage.author} Please enter the username of the player you want to unpin.`
        );
    }
}
