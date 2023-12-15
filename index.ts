import Discord, { Intents } from 'discord.js';
import { defaultPrefix, adminDiscordId, token, tokenDevelopment, workflow } from './auth.json';
import { roll } from './commands/card-related/roll';
import { rolls } from './commands/card-related/rolls';
import { claim } from './commands/card-related/claim';
import { unclaim } from './commands/card-related/unclaim';
import { give } from './commands/card-related/give';
import { trade } from './commands/card-related/trade';
import { cards } from './commands/card-related/cards';
import { recent } from './commands/card-related/recent';
import { pin } from './commands/card-related/pin';
import { unpin } from './commands/card-related/unpin';
import { view } from './commands/card-related/view';
import { claimed } from './commands/card-related/claimed';
import { rolled } from './commands/card-related/rolled';
import { avg } from './commands/card-related/avg';
import { lb } from './commands/card-related/lb';
import { help } from './commands/general/help';
import { prefix } from './commands/general/prefix';
import { stats } from './commands/general/stats';
import { profile } from './commands/general/profile';
import { msg } from './commands/general/msg';
import { donate } from './commands/premium/donate';
import { perks } from './commands/premium/perks';
import { premium } from './commands/premium/premium';
import { add } from './commands/premium/add';

import commandMapping from './commands/commandMapping';
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
    
    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        
        const { commandName } = interaction;
        try {
         // await commandName(interaction, serverPrefix, db, databaseStatistics, client);
            if (commandName === 'roll') {
                await roll(interaction, serverPrefix, db, databaseStatistics, client);       
            } else if (commandName === 'rolls') {
                await rolls(interaction);
            } else if (commandName === 'claim') {
                await claim(interaction);
            } else if (commandName === 'unclaim') {
                await unclaim(interaction, serverPrefix, interaction.options.getString('username'));
            } else if (commandName === 'trade') {
                await trade(interaction, interaction.options.getUser('user'), interaction.options.getString('cards'), interaction.options.getString('cards2'));
            } else if (commandName === 'cards') {
                await cards(interaction, serverPrefix, interaction.options.getUser('user'));
            } else if (commandName === 'recent') {
                await recent(interaction, serverPrefix, db, databaseStatistics, client);
            } else if (commandName === 'pin') {
                await pin(interaction, serverPrefix, interaction.options.getString('username'));
            } else if (commandName === 'unpin') {
                await unpin(interaction, serverPrefix, interaction.options.getString('username'));
            } else if (commandName === 'view') {
                await view(interaction, serverPrefix, interaction.options.getString('username'));
            } else if (commandName === 'claimed') {
                await claimed(interaction, serverPrefix, interaction.options.getString('username'));
            } else if (commandName === 'rolled') {
                await rolled(interaction, serverPrefix, interaction.options.getString('username'));
            } else if (commandName === 'avg') {
                await avg(interaction);
            } else if (commandName === 'leaderboard') {
                await lb(interaction, serverPrefix, db, databaseStatistics, client);
            } else if (commandName === 'help') {
                await help(interaction);
            } else if (commandName === 'prefix') {
                await prefix(interaction, serverPrefix, db, databaseStatistics);
            } else if (commandName === 'stats') {
                await stats(interaction);
            } else if (commandName === 'profile') {
                await profile(interaction);
            } else if (commandName === 'message') {
                await msg(interaction, serverPrefix, db, databaseStatistics, client, interaction.options.getString('message'));
            } else if (commandName === 'donate') {
                await donate(interaction);
            } else if (commandName === 'perks') {
                await perks(interaction);
            } else if (commandName === 'premium') {
                await premium(interaction, serverPrefix);
            } else if (commandName === 'add') {
                await add(interaction, serverPrefix, interaction.options.getString('username'));
            }
        } catch (err) {
            console.log(`${commandName} command failed by ${interaction.user.username}: ${err} ${err.trace}`);
        }
        
    });

    client.on('messageCreate', async (inboundMessage) => {     
        const serverDoc = await getServerDoc(inboundMessage.guild.id);
        if (serverDoc) {
            if (serverDoc.prefix === undefined) {
                serverPrefix = defaultPrefix;
            } else {
                serverPrefix = serverDoc.prefix;
            }
            serverPrefix = serverDoc.prefix === undefined ? defaultPrefix : serverDoc.prefix;
        } else {
            serverPrefix = workflow == 'production' ? defaultPrefix : '-';
        }
        // if the message either doesn't start with the prefix or was sent by a bot, exit early
        if (!inboundMessage.content.startsWith(serverPrefix) || inboundMessage.author.bot) return;

        const args = inboundMessage.content.slice(serverPrefix.length).trim().split(/ +/);
        const commandText = args.shift().toLowerCase(); // make lowercase work too

        
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
