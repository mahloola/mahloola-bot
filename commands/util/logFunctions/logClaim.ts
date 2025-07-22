import { NonDmChannel } from '../../../types.js';

const logClaim = (timestamp, interaction, claimingUser, player) => {
    console.log(
        `${timestamp.toLocaleTimeString().slice(0, 5)} | ${(interaction.channel as NonDmChannel).guild.name}: ${
            claimingUser.username
        } claimed ${player.apiv2.username}.`
    );
};

export default logClaim;
