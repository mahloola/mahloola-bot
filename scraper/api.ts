import axios from 'axios';
import auth from '../config/auth.js';
import { OsuPlayer } from '../types.js';
const { osuApiKey } = auth;
export const requestClientCredentialsToken = async () => {
    const response = await axios.post('https://osu.ppy.sh/oauth/token', {
        client_id: osuApiKey.client_id,
        client_secret: osuApiKey.client_secret,
        grant_type: 'client_credentials',
        scope: 'public',
    });

    const token = response.data.access_token;
    return token;
};

export async function getUser(token, userId): Promise<OsuPlayer> {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    };
    try {
        const response = await axios.get(`https://osu.ppy.sh/api/v2/users/${userId}/osu`, config);
        return response.data;
    } catch (err) {
        console.log(err);
    }
}

export const getRanking = async (token) => {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    };
    try {
        const response = await axios.get(`https://osu.ppy.sh/api/v2/rankings/osu/performance`, config);
        return response.data;
    } catch (err) {
        console.log(err);
    }
};
