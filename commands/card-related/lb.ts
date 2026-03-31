import Discord from 'discord.js';
import { getServersRef } from '../../db/database.js';

type LeaderboardMap = Record<string, number>; // userId -> elo

export async function lb(
    interaction: Discord.Interaction,
    serverPrefix: string,
    db: any,
    databaseStatistics: any,
    client: Discord.Client
): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply(); // ✅ fine

    const timestamp1 = new Date().getTime();

    const serverId = interaction.guildId!;
    const serversRef = getServersRef();

    // fetch leaderboard directly
    const serverDoc = await serversRef.doc(serverId).get();
    const data = serverDoc.data() as { leaderboard?: LeaderboardMap } | undefined;

    const leaderboard: LeaderboardMap = data?.leaderboard || {};

    // convert map -> array
    const usersArray = Object.entries(leaderboard).map(([userId, elo]) => ({
        userId,
        elo,
    }));

    // sort (highest elo first)
    const sortedUsers = usersArray
        .filter((user): user is { userId: string; elo: number } => user.elo != null)
        .sort((a, b) => b.elo - a.elo);

    // take top 10
    const topUsers = sortedUsers.slice(0, 10);

    // fetch only top users (much faster)
    const usersWithNames = await Promise.all(
        topUsers.map(async (player) => {
            try {
                const discordUser = await client.users.fetch(player.userId);
                return {
                    ...player,
                    username: discordUser.username,
                };
            } catch {
                return {
                    ...player,
                    username: 'Unknown',
                };
            }
        })
    );

    // build embed
    const embed = new Discord.EmbedBuilder()
        .setTitle(`${interaction.guild?.name} Leaderboard`)
        .setColor('#D9A6BD')
        .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL(),
        })
        .setThumbnail(interaction.guild?.iconURL() || null)
        .setFooter({
            text: `own 10+ cards to show up here`,
            iconURL: `http://cdn.onlinewebfonts.com/svg/img_204525.png`,
        })
        .setTimestamp();

    let embedDescription = `\`\`\`#    | User\n`;
    embedDescription += `----------------\n`;

    usersWithNames.forEach((player, index) => {
        embedDescription += `${(index + 1).toString().padEnd(4)} | ${player.username} (${player.elo})\n`;
    });

    embedDescription += `\`\`\``;

    embed.setDescription(embedDescription);

    const timestamp2 = new Date().getTime();
    console.log(
        `${interaction.user.username} used ;leaderboard in ${interaction.guild?.name}. (${timestamp2 - timestamp1} ms)`
    );

    await interaction.editReply({ embeds: [embed] });
}
