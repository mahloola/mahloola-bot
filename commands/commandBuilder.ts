import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { discordClientId, discordClientIdTest, token, tokenDevelopment } from '../auth.json';

const commands = [
	new SlashCommandBuilder().setName('roll').setDescription('Roll for an osu! player card'),
	new SlashCommandBuilder().setName('rolls').setDescription('Check your available rolls'),
	new SlashCommandBuilder().setName('claim').setDescription('Check when your next claim is available'),
	new SlashCommandBuilder().setName('unclaim').setDescription('Remove somebody from your card deck').addStringOption(option => option.setName('username').setDescription('username of the player to remove')),
	new SlashCommandBuilder().setName('trade').setDescription('Create a trade offer with someone').addUserOption(option => option.setName('user').setDescription('the user you would like to trade with').setRequired(true)).addStringOption(option => option.setName('cards').setDescription('the card(s) you wish to give (comma separated)').setRequired(true)).addStringOption(option => option.setName('cards2').setDescription('the card(s) you wish to receive (comma-separated) (optional)')),
	new SlashCommandBuilder().setName('cards').setDescription('Display all of your owned cards').addUserOption(option => option.setName('user').setDescription('whose cards you would like to see')),
	new SlashCommandBuilder().setName('recent').setDescription('Display your 5 most recently claimed cards'),
	new SlashCommandBuilder().setName('pin').setDescription('Pin cards to the top of your cards page').addStringOption(option => option.setName('username').setDescription('username of the player to pin')),
	new SlashCommandBuilder().setName('unpin').setDescription('Remove pins from your cards page').addStringOption(option => option.setName('username').setDescription('username of the player to unpin')),
	new SlashCommandBuilder().setName('view').setDescription('View a player card').addStringOption(option => option.setName('username').setDescription('username of the player to view')),
	new SlashCommandBuilder().setName('claimed').setDescription('Display the times a user has been claimed').addStringOption(option => option.setName('username').setDescription('username of the player to check')),
	new SlashCommandBuilder().setName('avg').setDescription('Display the average rank in your top 10 cards'),
	new SlashCommandBuilder().setName('leaderboard').setDescription('Display server leaderboard based on top 10 card rankings'),
	new SlashCommandBuilder().setName('help').setDescription('Display all commands'),
	new SlashCommandBuilder().setName('prefix').setDescription('Change the bot prefix (must be an administrator)'),
	new SlashCommandBuilder().setName('stats').setDescription('Display global bot stats'),
	new SlashCommandBuilder().setName('profile').setDescription('Display your mahloola BOT stats across all servers'),
	new SlashCommandBuilder().setName('message').setDescription('Send a direct message to mahloola about the bot').addStringOption(option => option.setName('message').setDescription('the message to send')),
	new SlashCommandBuilder().setName('donate').setDescription('Support the bot through Paypal; premium costs $3'),
	new SlashCommandBuilder().setName('perks').setDescription('Display the list of donation perks'),
	new SlashCommandBuilder().setName('premium').setDescription('Check your current premium status'),
	new SlashCommandBuilder().setName('add').setDescription('Add a new player to the database (out of top 10k/inactive)').addStringOption(option => option.setName('username').setDescription('username of the player to add')),
]
	.map(command => command.toJSON());

	// change token to tokenDevelopment for test bot
const rest = new REST({ version: '9' }).setToken(tokenDevelopment);

// change discordClientId to discordClientIdTest for test bot
rest.put(Routes.applicationCommands(discordClientIdTest), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
