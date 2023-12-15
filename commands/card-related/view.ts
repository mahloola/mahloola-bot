import { MessageAttachment } from 'discord.js';
import { getPlayerByUsername, setPlayer } from '../../db/database';
import { getUser } from '../../scraper/api';
import { createPlayerCard } from '../../image/jimp';
import { imageDirectory, osuApiKey } from '../../auth.json';
export async function view(interaction, serverPrefix, name) {
    if (name) {
        if (name.includes('@everyone') || name.includes('@here')) {
            interaction.reply(`${interaction.author} mahloola knows your tricks`);
            return;
        } else {
            const player = await getPlayerByUsername(name);
            if (player) {
                await createPlayerCard(player.apiv2, player.claimCounter);
                // send the image
                try {
                    const file = new MessageAttachment(`${imageDirectory}/cache/osuCard-${player.apiv2.username}.png`);
                    await interaction.reply({ files: [file] });
                } catch (error) {
                    console.error(`Failed to send image for ${player.apiv2.username}.`);
                }
                // update their card
                const osuPlayer = await getUser(osuApiKey, player.apiv2.id);
                setPlayer(osuPlayer);
            } else {
                interaction.reply(`${interaction.user} Player "${name}" was not found.`);
            }
        }
    } else {
        interaction.reply(`${interaction.user} Please enter an osu! player name.`);
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
