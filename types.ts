import Discord from 'discord.js';

export interface DatabaseStatistics {
    rolls?: number;
    servers?: number;
    users?: number;
    players?: number;
}

export interface Player {
    apiv2: OsuUser;
    claimCounter?: number;
    rollCounter?: number;
}

export interface DiscordUser {
    avatar?: string;
    avatarURL?: string;
    bot?: boolean;
    createdTimestamp?: number;
    defaultAvatarURL?: string;
    discriminator?: string;
    displayAvatarURL?: string;
    flags?: number;
    id?: string;
    system?: boolean;
    tag?: string;
    username?: string;
    addResetTime?: number;
    addCounter?: number;
}
export interface Server {
    ownedPlayers?: number[];
    serverName?: string;
    prefix?: string;
}

export interface ServerUser {
    ownedPlayers?: number[];
    pinnedPlayers?: number[];
    claimResetTime?: number;
    rollResetTime?: number;
    rolls?: number;
    elo?: number;
    discord?: DiscordUser;
}

export interface Leaderboard {
    players?: Record<string, number>;
}

export interface OsuUser {
    id: number;
    // groups: any[];
    is_restricted: boolean;
    scores_best_count: number;
    title: null;
    is_deleted: boolean;
    avatar_url: string;
    // badges: any[];
    profile_order: string[];
    pm_friends_only: boolean;
    is_online: boolean;
    guest_beatmapset_count: number;
    join_date: Date;
    cover: Cover;
    has_supported: boolean;
    twitter: string;
    max_blocks: number;
    is_supporter: boolean;
    pending_beatmapset_count: number;
    cover_url: string;
    mapping_follower_count: number;
    ranked_beatmapset_count: number;
    playstyle: string[];
    scores_first_count: number;
    favourite_beatmapset_count: number;
    ranked_and_approved_beatmapset_count: number;
    discord: string;
    // previous_usernames: any[];
    graveyard_beatmapset_count: number;
    replays_watched_counts: Count[];
    statistics: Statistics;
    last_visit: Date;
    country: Country;
    country_code: string;
    user_achievements: UserAchievement[];
    interests: string;
    page: Page;
    location: string;
    profile_colour: null;
    occupation: string;
    follower_count: number;
    max_friends: number;
    unranked_beatmapset_count: number;
    support_level: number;
    rankHistory: RankHistory;
    // account_history: any[];
    playmode: string;
    monthly_playcounts: Count[];
    kudosu: Kudosu;
    title_url: null;
    is_bot: boolean;
    post_count: number;
    comments_count: number;
    default_group: string;
    beatmap_playcounts_count: number;
    scores_pinned_count: number;
    website: string;
    username: string;
    active_tournament_banner: null;
    is_active: boolean;
    scores_recent_count: number;
    loved_beatmapset_count: number;
    rank_history: RankHistory;
}

export interface Country {
    name: string;
    code: string;
}

export interface Cover {
    url: string;
    id: null;
    custom_url: string;
}

export interface Kudosu {
    total: number;
    available: number;
}

export interface Count {
    start_date: Date;
    count: number;
}

export interface Page {
    html: string;
    raw: string;
}

export interface RankHistory {
    data: number[];
    mode: string;
}

export interface Statistics {
    country_rank: number;
    level: Level;
    grade_counts: GradeCounts;
    maximum_combo: number;
    play_time: number;
    hit_accuracy: number;
    pp: number;
    total_score: number;
    global_rank: number;
    is_ranked: boolean;
    replays_watched_by_others: number;
    play_count: number;
    total_hits: number;
    ranked_score: number;
    rank: Rank;
}

export interface GradeCounts {
    ssh: number;
    sh: number;
    s: number;
    a: number;
    ss: number;
}

export interface Level {
    current: number;
    progress: number;
}

export interface Rank {
    country: number;
}

export interface UserAchievement {
    achieved_at: Date;
    achievement_id: number;
}

export type NonDmChannel = Discord.NewsChannel | Discord.TextChannel | Discord.ThreadChannel;
