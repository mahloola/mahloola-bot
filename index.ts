import Discord, { Intents } from 'discord.js';
import { defaultPrefix, adminDiscordId, token, tokenDevelopment, workflow } from './auth.json';

// general
import { help } from './commands/general/help';
import { msg } from './commands/general/msg';
import { mystats } from './commands/general/mystats';
import { prefix } from './commands/general/prefix';
import { stats } from './commands/general/stats';
// card-related
import { avg } from './commands/card-related/avg';
import { cards } from './commands/card-related/cards';
import { claim } from './commands/card-related/claim';
import { claimed } from './commands/card-related/claimed';
import { lb } from './commands/card-related/lb';
import { pin } from './commands/card-related/pin';
import { unpin } from './commands/card-related/unpin';
import { trade } from './commands/card-related/trade';
import { view } from './commands/card-related/view';
import { roll } from './commands/card-related/roll';
import { rolled } from './commands/card-related/rolled';
import { rolls } from './commands/card-related/rolls';
// premium
import { add } from './commands/premium/add';
import { donate } from './commands/premium/donate';
import { perks } from './commands/premium/perks';
import { premium } from './commands/premium/premium';
// admin
import { givecard } from './commands/admin/givecard';
import { givepremium } from './commands/admin/givepremium';
import { kick } from './commands/admin/kick';
import { updatestats } from './commands/admin/updatestats';
import { populate } from './commands/admin/populate';

import { initializeDatabase, getDatabaseStatistics, getServerDoc } from './db/database';
const client = new Discord.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});
let serverPrefix;

client.on('ready', async function () {
    const db = initializeDatabase();
    db.settings({ ignoreUndefinedProperties: true });
    const databaseStatistics = await getDatabaseStatistics();
    const statisticsVersion = workflow === 'development' ? 'Testing' : 'Current';
    console.log(
        `\n${statisticsVersion} Statistics\n------------------\nRolls   | ${databaseStatistics.rolls}\nServers | ${databaseStatistics.servers}\nUsers   | ${databaseStatistics.users}\nPlayers | ${databaseStatistics.players}`
    );

    client.on('messageCreate', async (inboundMessage) => {
        const serverDoc = await getServerDoc(inboundMessage.guild?.id);
        if (serverDoc) {
            if (serverDoc.prefix === undefined) {
                serverPrefix = defaultPrefix;
            } else {
                serverPrefix = serverDoc.prefix;
            }
            serverPrefix = serverDoc.prefix === undefined ? defaultPrefix : serverDoc.prefix;
        } else {
            serverPrefix = defaultPrefix;
        }
        // if the message either doesn't start with the prefix or was sent by a bot, exit early
        if (!inboundMessage.content.startsWith(serverPrefix) || inboundMessage.author.bot) return;

        const args = inboundMessage.content.slice(serverPrefix.length).trim().split(/ +/);
        const commandText = args.shift()?.toLowerCase() ?? ''; // make lowercase work too

        const commandMapping = {
            // GENERAL
            ['help']: help,
            ['commands']: help,
            ['message']: msg,
            ['msg']: msg,
            ['stats']: mystats,
            ['s']: mystats,
            ['statsglobal']: stats,
            ['sg']: stats,
            ['prefix']: prefix,
            // CARD-RELATED
            ['roll']: roll,
            ['r']: roll,
            ['rolls']: rolls,
            ['claim']: claim,
            ['c']: claim,
            ['claims']: claim,
            ['cards']: cards,
            ['trade']: trade,
            ['avg']: avg,
            ['pin']: pin,
            ['p']: pin,
            ['unpin']: unpin,
            ['up']: unpin,
            ['claimed']: claimed,
            ['cmd']: claimed,
            ['rolled']: rolled,
            ['rd']: rolled,
            ['leaderboard']: lb,
            ['lb']: lb,
            ['view']: view,
            ['v']: view,
            // PREMIUM
            ['add']: add,
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
        const command = commandMapping[commandText];
        if (command) {
            try {
                await command(inboundMessage, serverPrefix, db, databaseStatistics, client);
            } catch (err) {
                console.trace();
                console.log(err);
            }
        }
    });
});
// token-development if testing, 'token' on live bot
client.login(workflow == 'production' ? token : tokenDevelopment);
