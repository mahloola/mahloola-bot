import { getDiscordUser, getPlayerByUsername, setAddCounter, setPlayer } from '../../db/database.js';
import { getUser, requestClientCredentialsToken } from '../../scraper/api.js';
import { NonDmChannel } from '../../types.js';
import { isPremium } from '../util/isPremium.js';

export async function add(interaction, serverPrefix, user) {
    const discordUser = await getDiscordUser(interaction.user.id);
    // check if user is an administrator
    if (isPremium(discordUser)) {
        // check if user entered a parameter
        if (user) {
            if (user.includes('@everyone') || user.includes('@here')) {
                interaction.reply(`${interaction.user} mahloola knows your tricks`);
                return;
            } else {
                if (!discordUser.addCounter || discordUser.addCounter == null || discordUser.addCounter == undefined) {
                    setAddCounter(discordUser, 3);
                }
                if (discordUser.addCounter <= 0 && discordUser.addResetTime > new Date().getTime()) {
                    interaction.reply(
                        `${interaction.user} You've run out of user additions. Your 3 adds will restock on <t:${(
                            discordUser.addResetTime / 1000
                        ).toFixed(0)}:F>.`
                    );
                    return;
                }
                const apiToken = await requestClientCredentialsToken();
                const player = await getUser(apiToken, user); // OSU API PLAYER
                const osuPlayer = await getPlayerByUsername(player.username); // PLAYER FROM MY DATABASE (separate data call to check if they already exist)
                if (player) {
                    if (osuPlayer) {
                        interaction.reply(
                            `${interaction.user} ${osuPlayer.apiv2.username} already exists in the database.`
                        );
                        return;
                    } else {
                        await setPlayer(player);
                        const timestamp = new Date();
                        console.log(
                            `${timestamp.toLocaleTimeString().slice(0, 5)} | ${
                                (interaction.channel as NonDmChannel).guild.name
                            }: ${interaction.user.username} added ${player.username} to the database successfully.`
                        );
                        await setAddCounter(discordUser, discordUser.addCounter - 1);
                        interaction.reply(
                            `${interaction.user} ${player.username} was successfully added to the database.`
                        );
                    }
                } else {
                    interaction.reply(`${interaction.user} User ${user} was not found.`);
                }
            }
        } else {
            interaction.reply(`${interaction.user} Please enter an osu! User ID.`);
        }
    } else {
        interaction.reply(`${interaction.user} You need to be premium to use this command.`);
    }
}
