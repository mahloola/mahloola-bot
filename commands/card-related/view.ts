import { AttachmentBuilder } from 'discord.js';
import auth from '../../config/auth.js';
import { getPlayerByUsername, setPlayer } from '../../db/database.js';
import { createPlayerCard } from '../../image/jimp.js';
import { getUser, requestClientCredentialsToken } from '../../scraper/api.js';
import { trimPlayerDocument } from '../util/trimPlayerDocument.js';
const { imageDirectory } = auth;

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
                    const trimmedPlayer = trimPlayerDocument(osuPlayer);
                    await setPlayer(trimmedPlayer);
                    const file = new AttachmentBuilder(`${imageDirectory}/cache/osuCard-${player.apiv2.username}.png`);
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
