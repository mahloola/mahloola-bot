import { setDiscordUser } from '../../db/database.js';
import { DiscordUser, GlobalUser } from '../../types.js';
import { mapToDiscordUser } from './mapToDiscordUser.js';

const updateDiscordUser = async (
    discordUserInDatabase: GlobalUser | null,
    discordUser: DiscordUser,
    interaction: any
) => {
    // if user doesn't exist, or user's discord name/pfp doesn't match their current in the database
    if (
        !discordUserInDatabase ||
        discordUserInDatabase?.discord?.username != discordUser?.username ||
        discordUserInDatabase?.discord?.avatarURL != discordUser?.avatar
    ) {
        await setDiscordUser(mapToDiscordUser(interaction?.user)); // update their discord profile
        // DANGER: MAKE SURE TO TEST THIS TO NOT OVERWRITE THEIR STATS
    }
};

export default updateDiscordUser;
