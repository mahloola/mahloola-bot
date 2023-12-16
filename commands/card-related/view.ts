import { MessageAttachment } from 'discord.js';
import { getPlayerByUsername, setPlayer } from '../../db/database';
import { getUser } from '../../scraper/api';
import { createPlayerCard } from '../../image/jimp';
import { imageDirectory } from '../../auth.json';
import { requestClientCredentialsToken } from '../../scraper/api';

export async function view(interaction, serverPrefix, name) {
    const apiToken = await requestClientCredentialsToken();
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
                    // update their card
                    const osuPlayer = await getUser(apiToken, player.apiv2.id);
                    await setPlayer(osuPlayer);
                    const file = new MessageAttachment(`${imageDirectory}/cache/osuCard-${player.apiv2.username}.png`);
                    await interaction.reply({ files: [file] });
                } catch (error) {
                    console.error(`Failed to send image for ${player.apiv2.username}.`);
                }
            } else {
                interaction.reply(`${interaction.user} Player "${name}" was not found.`);
            }
        }
    } else {
        interaction.reply(`${interaction.user} Please enter an osu! player name.`);
    }
}
