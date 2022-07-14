import { MessageAttachment } from 'discord.js';
import { getPlayerByUsername } from '../../db/database';
import { createPlayerCard } from '../../image/jimp';
import { imageDirectory } from '../../auth.json';
export async function view(inboundMessage, serverPrefix) {
    if (inboundMessage.content.length > 5 + serverPrefix.length) {
        const username = inboundMessage.content.substring(5 + serverPrefix.length);
        if (username.includes('@everyone') || username.includes('@here')) {
            inboundMessage.channel.send(`${inboundMessage.author} mahloola knows your tricks`);
            return;
        } else {
            const player = await getPlayerByUsername(username);
            if (player) {
                // update their card
                await createPlayerCard(player.apiv2, player.claimCounter);
                // send the image
                const file = new MessageAttachment(`${imageDirectory}/cache/osuCard-${player.apiv2.username}.png`);
                await inboundMessage.channel.send({ files: [file] });
            } else {
                inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found.`);
            }
        }
    } else {
        inboundMessage.channel.send('Please enter a username.');
    }
}

