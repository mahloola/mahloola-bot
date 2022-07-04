import { getPlayerByUsername, getServerUserDoc, setPinnedPlayer } from '../../db/database';
import simplifiedPlayers from '../../db/simplifiedPlayers.json';

export async function pin(inboundMessage, serverPrefix) {
    const username = inboundMessage.content.substring(4 + serverPrefix.length);
    if (username) {
        if (username.includes('@everyone') || username.includes('@here')) {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        } else {
            const player = await getPlayerByUsername(username);
            if (player) {
                const user = await getServerUserDoc(inboundMessage.channel.guildId, inboundMessage.author.id);
                let validUsers = 0;
                for (let i = 0; i < user?.pinnedPlayers?.length; i++) {
                    if (simplifiedPlayers[user?.pinnedPlayers[i]]) {
                        if (simplifiedPlayers[user?.pinnedPlayers[i]][1] !== null) {
                            validUsers++;
                        }
                    }
                }
                if (validUsers > 9) {
                    inboundMessage.channel.send(`${inboundMessage.author} You cannot pin more than 10 players.`);
                    return;
                }
                const validFlag = user?.ownedPlayers?.includes(player.apiv2.id);
                if (validFlag) {
                    await setPinnedPlayer(
                        inboundMessage.channel.guildId,
                        inboundMessage.author.id,
                        player.apiv2.id
                    ).catch((err) => console.error(err));
                    inboundMessage.channel.send(
                        `${inboundMessage.author} pinned ${player.apiv2.username} successfully.`
                    );
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
            `${inboundMessage.author} Please enter the username of the player you want to pin.`
        );
    }
}
