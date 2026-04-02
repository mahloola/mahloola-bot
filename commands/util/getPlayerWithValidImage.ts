import fs from 'fs/promises';
import getRandomPlayer from './getRandomPlayer.js';

async function getPlayerWithValidImage(db, imageDirectory, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        const player = await getRandomPlayer(db);
        const imagePath = `${imageDirectory}/osuCard-${player.apiv2.username}.png`;

        try {
            await fs.access(imagePath); // checks if file exists
            return { player, imagePath };
        } catch {
            console.warn(`Image not found for ${player.apiv2.username}, rerolling...`);
        }
    }

    throw new Error('Failed to find a player with a valid image');
}
export default getPlayerWithValidImage;
