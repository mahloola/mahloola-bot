import {
    getDatabaseStatistics,
    setDatabaseStatistics,
    setPlayerRollCounter,
    setUserRollCounter,
} from '../../db/database.js';
import { GlobalUser, Player } from '../../types.js';

const updateRollStatistics = async (discordUser: GlobalUser, player: Player) => {
    // update statistics
    const statistics = await getDatabaseStatistics();
    statistics.rolls++;
    setDatabaseStatistics(statistics);
    setUserRollCounter(
        discordUser?.discord ?? discordUser,
        discordUser?.rollCounter ? discordUser?.rollCounter + 1 : 1
    );
    // set the player claimed counter to 1 if they've never been claimed, or increment it if they've been claimed before
    player.claimCounter === undefined
        ? await setPlayerRollCounter(player, 1)
        : await setPlayerRollCounter(player, player.rollCounter + 1);
};
export default updateRollStatistics;
