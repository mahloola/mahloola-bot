import Discord from 'discord.js';
import { setPrefix } from '../../db/database';

export async function prefix(inboundMessage, db, statistics, serverPrefix) {
    const newPrefix = inboundMessage.member.permissionsIn(inboundMessage.channel).has('ADMINISTRATOR')
        ? inboundMessage.content.substring(7 + serverPrefix.length).trim()
        : null;
    if (newPrefix) {
        await setPrefix(inboundMessage.guild.id, newPrefix);
        inboundMessage.channel.send(
            `${inboundMessage.author} The mahloola BOT server prefix for ${inboundMessage.guild.name} has been set to \`${newPrefix}\`.`
        );
    } else {
        inboundMessage.channel.send(`${inboundMessage.author} You must be an administrator to change the prefix.`);
    }
}
