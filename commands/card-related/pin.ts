import { getDiscordUser, getPlayerByUsername, getServerUserDoc, setPinnedPlayer } from '../../db/database';
import simplifiedPlayers from '../../db/simplifiedPlayers.json';
import { isPremium } from '../util/isPremium';

export async function pin(interaction, serverPrefix, name) {
    if (name) {
        if (name.includes('@everyone') || name.includes('@here')) {
            interaction.reply(`${interaction.user} mahloola knows your tricks`);
            return;
        } else {
            const player = await getPlayerByUsername(name);
            const discordUser = await getDiscordUser(interaction.user.id);
            if (player) {
                const user = await getServerUserDoc(interaction.channel.guildId, interaction.user.id);
                let validUsers = 0;
                for (let i = 0; i < user?.pinnedPlayers?.length; i++) {
                    if (simplifiedPlayers[user?.pinnedPlayers[i]]) {
                        if (simplifiedPlayers[user?.pinnedPlayers[i]][1] !== null) {
                            validUsers++;
                        }
                    }
                }
                if (validUsers > (isPremium(discordUser) ? 14 : 9)) {
                    interaction.reply(`${interaction.user} You cannot pin more than 10 players.`);
                    return;
                }
                const validFlag = user?.ownedPlayers?.includes(player.apiv2.id);
                if (validFlag) {
                    await setPinnedPlayer(
                        interaction.channel.guildId,
                        interaction.user.id,
                        player.apiv2.id
                    ).catch((err) => console.error(err));
                    interaction.reply(
                        `${interaction.user} pinned ${player.apiv2.username} successfully.`
                    );
                } else {
                    interaction.channel.send(
                        `${interaction.user} You do not own the player "${name}".`
                    );
                }
            } else {
                interaction.reply(`${interaction.user} Player "${name}" was not found.`);
            }
        }
    } else {
        interaction.reply(
            `${interaction.user} Please enter the username of the player you want to pin.`
        );
    }
}
