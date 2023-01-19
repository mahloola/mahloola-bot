import Discord from 'discord.js';
import { setPrefix } from '../../db/database';

export async function prefix(interaction, serverPrefix, db, statistics) {
    const newPrefix = interaction.member.permissionsIn(interaction.channel).has('ADMINISTRATOR')
        ? interaction.content.substring(7 + serverPrefix.length).trim()
        : null;
    if (newPrefix) {
        await setPrefix(interaction.guild.id, newPrefix);
        interaction.reply(
            `${interaction.user} The mahloola BOT server prefix for ${interaction.guild.name} has been set to \`${newPrefix}\`.`
        );
    } else {
        interaction.reply(`${interaction.user} You must be an administrator to change the prefix.`);
    }
}
