import Discord, { GatewayIntentBits } from 'discord.js';
import { avg } from './commands/card-related/avg.js';
import { cards } from './commands/card-related/cards.js';
import { claim } from './commands/card-related/claim.js';
import { claimed } from './commands/card-related/claimed.js';
import { lb } from './commands/card-related/lb.js';
import { pin } from './commands/card-related/pin.js';
import { recent } from './commands/card-related/recent.js';
import { roll } from './commands/card-related/roll.js';
import { rolled } from './commands/card-related/rolled.js';
import { rolls } from './commands/card-related/rolls.js';
import { trade } from './commands/card-related/trade.js';
import { unclaim } from './commands/card-related/unclaim.js';
import { unpin } from './commands/card-related/unpin.js';
import { view } from './commands/card-related/view.js';
import commandMapping from './commands/commandMapping.js';
import { help } from './commands/general/help.js';
import { msg } from './commands/general/msg.js';
import { prefix } from './commands/general/prefix.js';
import { profile } from './commands/general/profile.js';
import { stats } from './commands/general/stats.js';
import { add } from './commands/premium/add.js';
import { donate } from './commands/premium/donate.js';
import { perks } from './commands/premium/perks.js';
import { premium } from './commands/premium/premium.js';
import auth from './config/auth.js';
import { getDatabaseStatistics, getServerDoc, initializeDatabase } from './db/database.js';
const client = new Discord.Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
let serverPrefix;
const { defaultPrefix, token, tokenDevelopment, workflow } = auth;
client.on('ready', async function () {
    const db: FirebaseFirestore.Firestore = initializeDatabase();
    const databaseStatistics = await getDatabaseStatistics();
    const statisticsVersion = workflow === 'development' ? 'Testing' : 'Current';
    console.log(
        `\n${statisticsVersion} Statistics\n------------------\nRolls   | ${databaseStatistics.rolls}\nServers | ${databaseStatistics.servers}\nUsers   | ${databaseStatistics.users}\nPlayers | ${databaseStatistics.players}`
    );

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;
        console.log(commandName);
        try {
            // await commandName(interaction, serverPrefix, db, databaseStatistics, client);
            if (commandName === 'roll') {
                await roll(interaction, db);
            } else if (commandName === 'rolls') {
                await rolls(interaction);
            } else if (commandName === 'claim') {
                await claim(interaction);
            } else if (commandName === 'unclaim') {
                await unclaim(interaction, serverPrefix, interaction.options.get('username').value);
            } else if (commandName === 'trade') {
                await trade(
                    interaction,
                    interaction.options.getUser('user'),
                    interaction.options.get('your-cards').value,
                    interaction.options.get('their-cards')?.value
                );
            } else if (commandName === 'cards') {
                await cards(interaction, serverPrefix, interaction.options.getUser('user'));
            } else if (commandName === 'recent') {
                await recent(interaction, serverPrefix, db, databaseStatistics, client);
            } else if (commandName === 'pin') {
                await pin(interaction, serverPrefix, interaction.options.get('username').value);
            } else if (commandName === 'unpin') {
                await unpin(interaction, serverPrefix, interaction.options.get('username').value);
            } else if (commandName === 'view') {
                await view(interaction, serverPrefix, interaction.options.get('username').value);
            } else if (commandName === 'claimed') {
                await claimed(interaction, serverPrefix, interaction.options.get('username').value);
            } else if (commandName === 'rolled') {
                await rolled(interaction, serverPrefix, interaction.options.get('username').value);
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
                await msg(
                    interaction,
                    serverPrefix,
                    db,
                    databaseStatistics,
                    client,
                    interaction.options.get('message').value
                );
            } else if (commandName === 'donate') {
                await donate(interaction);
            } else if (commandName === 'perks') {
                await perks(interaction);
            } else if (commandName === 'premium') {
                await premium(interaction, serverPrefix);
            } else if (commandName === 'add') {
                await add(interaction, serverPrefix, interaction.options.get('username').value);
            }
        } catch (err) {
            console.error(
                `${commandName} command failed by ${interaction.user.username}: ${err.stack}\n${console.error()}`
            );
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
                console.error(err);
            }
        }
    });
});
// token-development if testing, 'token' on live bot
client.login(workflow == 'production' ? token : tokenDevelopment);
