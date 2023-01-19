import { updateUserElo } from '../../db/database';

export async function avg(interaction) {
    const elo = await updateUserElo(interaction.channel.guildId, interaction.user.id);
    if (elo == null) {
        interaction.reply('You are unranked; you need to own at least 10 players.');
    } else {
        interaction.reply(`${interaction.user} Your top 10 average is **${elo.toString()}**.`);
    }
}
