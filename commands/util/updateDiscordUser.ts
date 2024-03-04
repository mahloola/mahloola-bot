import { getDiscordUser, setDiscordUser } from "../../db/database";
import { GlobalUser } from "../../types";

const updateDiscordUser = async (discordUserInDatabase, discordUser: GlobalUser, interaction) => {
    // if user doesn't exist, or user's discord name/pfp doesn't match their current in the database
    if (
        !discordUserInDatabase ||
        discordUserInDatabase?.discord?.username != discordUser?.discord?.username ||
        discordUserInDatabase?.discord?.avatarURL != discordUser?.discord?.avatarURL
    ) {
        await setDiscordUser(interaction.user.toJSON()); // update their discord profile
        // DANGER: MAKE SURE TO TEST THIS TO NOT OVERWRITE THEIR STATS
    }
}

export default updateDiscordUser