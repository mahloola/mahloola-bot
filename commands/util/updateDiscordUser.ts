import { getDiscordUser, setDiscordUser } from "../../db/database";
import { GlobalUser } from "../../types";

const updateDiscordUser = async (discordUserInDatabase, discordUser, interaction) => {
    // if user doesn't exist, or user's discord name/pfp doesn't match their current in the database
    if (
        !discordUserInDatabase ||
        discordUserInDatabase?.discord?.username != discordUser?.username ||
        discordUserInDatabase?.discord?.avatarURL != discordUser?.avatar
    ) {
        await setDiscordUser(interaction.user.toJSON()); // update their discord profile
        // DANGER: MAKE SURE TO TEST THIS TO NOT OVERWRITE THEIR STATS
    }
}

export default updateDiscordUser