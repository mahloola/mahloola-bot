import { deletePinnedPlayer, getPlayerByUsername, getServerUserDoc } from '../../db/database';

export async function unpin(interaction, serverPrefix, name) {
    if (name) {
        if (name.includes('@everyone') || name.includes('@here')) {
            interaction.reply(`${interaction.user} mahloola knows your tricks`);
            return;
        } else {
            const player = await getPlayerByUsername(name);
            if (player) {
                const user = await getServerUserDoc(interaction.channel.guildId, interaction.user.id);
                const validFlag = user?.ownedPlayers?.includes(player.apiv2.id);
                if (validFlag) {
                    await deletePinnedPlayer(
                        interaction.channel.guildId,
                        interaction.user.id,
                        player.apiv2.id
                    ).catch((err) => console.error(err));
                    interaction.reply(`${interaction.user} unpinned ${name} successfully.`);
                } else {
                    interaction.reply(
                        `${interaction.user} You do not own the player "${name}".`
                    );
                }
            } else {
                interaction.reply(`${interaction.user} Player "${name}" was not found.`);
            }
        }
    } else {
        interaction.reply(
            `${interaction.user} Please enter the username of the player you want to unpin.`
        );
    }
}
