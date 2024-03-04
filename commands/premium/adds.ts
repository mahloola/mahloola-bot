import { getDiscordUser, setAddCounter } from '../../db/database';
import { adminDiscordId, defaultPrefix } from '../../auth.json';
import { isPremium } from '../util/isPremium';

export async function adds(interaction, serverPrefix, db, databaseStatistics, client) {
    const discordUser = await getDiscordUser(interaction.user.id);
    if (isPremium(discordUser)) {
        if (
            !discordUser.addCounter ||
            discordUser.addCounter == null ||
            discordUser.addCounter == undefined
        ) {
            await setAddCounter(discordUser, 3);
        }
        if (discordUser.addCounter === 3) {
            interaction.reply(`${interaction.user} You have 3 user additions remaining.`);
        }
        if (discordUser.addCounter <= 0 && discordUser.addResetTime > new Date().getTime()) {
            interaction.reply(
                `${interaction.user} You've run out of user additions. Your 3 adds will restock on <t:${(
                    discordUser.addResetTime / 1000
                ).toFixed(0)}:F>.`
            );
        }
        if (discordUser.addCounter <= 0 && discordUser.addResetTime < new Date().getTime()) {
            await setAddCounter(discordUser, 3);
            interaction.reply(`${interaction.user} You have 3 user additions remaining.`);
        }
        if (
            discordUser.addCounter > 0 &&
            discordUser.addCounter < 3 &&
            discordUser.addResetTime > new Date().getTime()
        ) {
            interaction.reply(
                `${interaction.user} You have ${discordUser.addCounter} user ${
                    discordUser.addCounter === 1 ? 'addition' : 'additions'
                } remaining. Your adds will restock on <t:${(discordUser.addResetTime / 1000).toFixed(0)}:F>.`
            );
        }
    } else {
        interaction.reply(`${interaction.user} You must be premium to use this command.`);
    }
}
