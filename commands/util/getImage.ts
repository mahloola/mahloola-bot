import { AttachmentBuilder } from 'discord.js';

export const getImage = (username) => {
    let file;
    while (!file) {
        file = new AttachmentBuilder(`https://mahloola-bot.com/mahloola-bot-cards/osuCard-${username}.png`);
    }
    return file;
};
