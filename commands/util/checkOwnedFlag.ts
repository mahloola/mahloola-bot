const checkOwnedFlag = (claimingUserDoc, player) => {
    return claimingUserDoc?.ownedPlayers?.includes(player.apiv2.id);
}

export default checkOwnedFlag;