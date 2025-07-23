import { PlayerApiv2 } from '../../types';

export function trimPlayerDocument(player) {
    // designed to work with osu apiv2 format as of Jul 22, 2025
    const trimmedUser: PlayerApiv2 = {
        id: player.id,
        username: player.username,
        cover_url: player.cover_url,
        global_rank: player.statistics?.global_rank ?? null,
        country_rank: player.statistics?.country_rank ?? null,
        pp: player.statistics?.pp,
        country_code: player.country?.code,
        title: player.title ?? null,
        follower_count: player.follower_count,
    };
    return trimmedUser;
}
