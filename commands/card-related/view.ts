import { AttachmentBuilder } from 'discord.js';
import auth from '../../auth.json' assert { type: 'json' };
import { getPlayerByUsername, setPlayer } from '../../db/database.js';
import { createPlayerCard } from '../../image/jimp.js';
import { getUser, requestClientCredentialsToken } from '../../scraper/api.js';
import { Player } from '../../types.js';
import { trimPlayerDocument } from '../util/trimPlayerDocument.js';
const { imageDirectory } = auth;

export async function view(interaction, serverPrefix, name) {
    if (!name) {
        interaction.reply(`${interaction.user} Please enter an osu! player name.`);
        return;
    }
    if (name.includes('@everyone') || name.includes('@here')) {
        interaction.reply(`${interaction.author} mahloola knows your tricks`);
        return;
    }
    const player: Player = await getPlayerByUsername(name);
    if (!player) {
        interaction.reply(`${interaction.user} Player "${name}" was not found.`);
        return;
    }

    try {
        // send image if it exists
        await interaction.reply({
            files: [new AttachmentBuilder(`${imageDirectory}/osuCard-${player.apiv2.username}.png`)],
        });

        // update the player and the image
        const apiToken = await requestClientCredentialsToken();
        const osuPlayer = await getUser(apiToken, player.apiv2.id);
        const trimmedPlayer = trimPlayerDocument(osuPlayer);
        await setPlayer(trimmedPlayer);
        await createPlayerCard(trimmedPlayer, player.claimCounter ?? 0);
    } catch (error) {
        console.error(`Failed to send image for ${player.apiv2.username}.`);
    }
}
