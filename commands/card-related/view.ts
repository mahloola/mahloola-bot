import { MessageAttachment } from 'discord.js';
import { getPlayerByUsername } from '../../db/database';
import { createPlayerCard } from '../../image/jimp';
import { imageDirectory } from '../../auth.json';
export async function view(interaction, serverPrefix, name) {
    if (name.includes('@everyone') || name.includes('@here')) {
        interaction.reply(`${interaction.author} mahloola knows your tricks`);
        return;
    } else {      
        const player = await getPlayerByUsername(name);
        if (player) {
            // update their card
            await createPlayerCard(player.apiv2, player.claimCounter);
            // send the image
            const file = new MessageAttachment(`${imageDirectory}/cache/osuCard-${player.apiv2.username}.png`);
            await interaction.reply({ files: [file] });
        } else {
            interaction.reply(`${interaction.user} Player "${name}" was not found.`);
        }
    }
    
    // const username = inboundMessage.content.substring(
    //     (inboundMessage.content.includes('view') ? 5 : 2) + serverPrefix.length
    // );
    // if (inboundMessage.content.length > 2 + serverPrefix.length) {
    //      else {
    //         const player = await getPlayerByUsername(username);
    //         if (player) {
    //             // update their card
    //             await createPlayerCard(player.apiv2, player.claimCounter);
    //             // send the image
    //             const file = new MessageAttachment(`${imageDirectory}/cache/osuCard-${player.apiv2.username}.png`);
    //             await inboundMessage.channel.send({ files: [file] });
    //         } else {
    //             inboundMessage.channel.send(`${inboundMessage.author} Player "${username}" was not found.`);
    //         }
    //     }
    // } else {
    //     inboundMessage.channel.send('Please enter a username.');
    // }
}
