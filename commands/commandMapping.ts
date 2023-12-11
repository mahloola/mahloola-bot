// general
import { help } from './general/help';
import { msg } from './general/msg';
import { profile } from './general/profile';
import { prefix } from './general/prefix';
import { stats } from './general/stats';
// card-related
import { avg } from './card-related/avg';
import { cards } from './card-related/cards';
import { claim } from './card-related/claim';
import { unclaim } from './card-related/unclaim';
import { claimed } from './card-related/claimed';
import { recent } from './card-related/recent';
import { lb } from './card-related/lb';
import { pin } from './card-related/pin';
import { unpin } from './card-related/unpin';
import { trade } from './card-related/trade';
import { view } from './card-related/view';
import { roll } from './card-related/roll';
import { rolled } from './card-related/rolled';
import { rolls } from './card-related/rolls';
// premium
import { add } from './premium/add';
import { adds } from './premium/adds';
import { donate } from './premium/donate';
import { perks } from './premium/perks';
import { premium } from './premium/premium';
// admin
import { givecard } from './admin/givecard';
import { givepremium } from './admin/givepremium';
import { kick } from './admin/kick';
import { updatestats } from './admin/updatestats';
import { populate } from './admin/populate';

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