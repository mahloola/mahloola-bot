import Discord from 'discord.js';
import { DiscordUser } from '../../types.js';

export function mapToDiscordUser(user: Discord.User): DiscordUser {
    return {
        // Required
        id: user.id,

        // Basic info
        username: user.username,
        discriminator: user.discriminator,
        tag: user.tag,

        // Avatars
        avatar: user.avatar ?? undefined,
        avatarURL: user.avatarURL() ?? undefined,
        displayAvatarURL: user.displayAvatarURL(),
        defaultAvatarURL: user.defaultAvatarURL,

        // Flags
        bot: user.bot ?? false,
        system: user.system ?? false,
        flags: user.flags?.bitfield ?? undefined,

        // Metadata
        createdTimestamp: user.createdTimestamp,

        // Your custom fields (leave undefined so DB can manage them)
        addResetTime: undefined,
        addCounter: undefined,
    };
}
