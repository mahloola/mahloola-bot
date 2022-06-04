import dotenv from 'dotenv';
import { setPlayer } from '../db/database';
import { sleep } from '../util/sleep';
import { getUser } from './api';
import { requestClientCredentialsToken } from './api';

dotenv.config();

export default {
    async scraper(browser) {
        const page = await browser.newPage();
        for (let i = 1; i < 201; i++) {
            await page.goto(`https://osu.ppy.sh/rankings/osu/performance?page=${i}`);
            await page.waitForSelector('tr');
            console.log('Waiting for selector...');

            // get new token
            // TODO: stop requesting a new token on every page and just do it once in the beginning
            const apiToken = await requestClientCredentialsToken();

            // get 50 user IDs
            const userIds = await page.$$eval('td > div', async (divs) => {
                const userURLs = divs.map((el) => el.querySelector('a + a').href);
                const userIds = userURLs.map((url) => url.replace('https://osu.ppy.sh/users/', '').replace('/osu', ''));
                return userIds;
            });

            // convert 50 user IDs into user objects
            // WARNING: rate-limit these calls to <60 calls per minute
            for (const userId of userIds) {
                let player;
                try {
                    player = await getUser(apiToken, userId);
                    console.log(`Scraping ${player.username}...`);
                    setPlayer(player);
                } catch (err) {
                    console.log(`Failed to scraper user ${userId}: ${err}`);
                }
            }
            // after 50 calls, wait for 1 minute
            console.log('Waiting 1 minute...');
            await sleep(60 * 1000);
        }
    },
};
