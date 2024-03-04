import { NonDmChannel } from "../../../types";

const logRoll = async(timestamp, interaction, player) => {
    console.log(
        `${timestamp.toLocaleTimeString().slice(0, 5)} | ${(interaction.channel as NonDmChannel).guild.name}: ${
            interaction.user.username
        } rolled ${player.apiv2.username}.`
    );
}

export default logRoll;