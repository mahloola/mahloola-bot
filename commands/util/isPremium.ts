export const isPremium = function (discordUser) {
    if (!discordUser) return;
    if (discordUser.premium > new Date().getTime()) {
        return true;
    } else {
        return false;
    }
};
