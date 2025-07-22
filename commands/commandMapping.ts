// general
import { help } from './general/help.js';
import { msg } from './general/msg.js';
import { prefix } from './general/prefix.js';
import { profile } from './general/profile.js';
import { stats } from './general/stats.js';
// card-related
import { avg } from './card-related/avg.js';
import { cards } from './card-related/cards.js';
import { claim } from './card-related/claim.js';
import { claimed } from './card-related/claimed.js';
import { lb } from './card-related/lb.js';
import { pin } from './card-related/pin.js';
import { recent } from './card-related/recent.js';
import { roll } from './card-related/roll.js';
import { rolled } from './card-related/rolled.js';
import { rolls } from './card-related/rolls.js';
import { trade } from './card-related/trade.js';
import { unclaim } from './card-related/unclaim.js';
import { unpin } from './card-related/unpin.js';
import { view } from './card-related/view.js';
// premium
import { add } from './premium/add.js';
import { adds } from './premium/adds.js';
import { donate } from './premium/donate.js';
import { perks } from './premium/perks.js';
import { premium } from './premium/premium.js';
// admin
import { givecard } from './admin/givecard.js';
import { givepremium } from './admin/givepremium.js';
import { kick } from './admin/kick.js';
import { populate } from './admin/populate.js';
import { updatestats } from './admin/updatestats.js';

const commandMapping = {
    // GENERAL
    ['help']: help,
    ['commands']: help,
    ['message']: msg,
    ['msg']: msg,
    ['stats']: stats,
    ['s']: stats,
    ['profile']: profile,
    ['p']: profile,
    ['prefix']: prefix,
    // CARD-RELATED
    ['roll']: roll,
    ['r']: roll,
    ['rolls']: rolls,
    ['claim']: claim,
    ['unclaim']: unclaim,
    ['c']: claim,
    ['claims']: claim,
    ['cards']: cards,
    ['recent']: recent,
    ['rs']: recent,
    ['trade']: trade,
    ['avg']: avg,
    ['pin']: pin,
    ['unpin']: unpin,
    ['claimed']: claimed,
    ['rolled']: rolled,
    ['leaderboard']: lb,
    ['lb']: lb,
    ['view']: view,
    ['v']: view,
    // PREMIUM
    ['add']: add,
    ['adds']: adds,
    ['premium']: premium,
    ['donate']: donate,
    ['perks']: perks,
    // ADMIN
    ['kick']: kick, // kick mahloola bot from a server (serverId)
    ['populate']: populate, // populate the 'users' db collection with users from every server
    ['givepremium']: givepremium,
    ['gp']: givepremium, // give somebody a month of premium (discordId)
    ['givecard']: givecard,
    ['gc']: givecard, // give a card to somebody (userId, (optional: serverId), osu username)
    ['updatestats']: updatestats,
    ['update']: updatestats,
};

export default commandMapping;
