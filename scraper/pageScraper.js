require('dotenv').config();
const { getUser } = require('./api');
const { setPlayer } = require('../db/database');
const { sleep } = require('../util/sleep');
const { requestClientCredentialsToken } = require('./api');

let apiToken;

const scraperObject = {
    async scraper(browser) {
        let page = await browser.newPage();
        for (let i = 75; i < 201; i++) {
            await page.goto(`https://osu.ppy.sh/rankings/osu/performance?page=${i}`);
            await page.waitForSelector('tr');
            console.log("Waiting for selector...");

            // get new token
            apiToken = await requestClientCredentialsToken();

            // get 50 user IDs
            const userIds = await page.$$eval('td > div', async (divs) => {
                const userURLs = divs.map(el => el.querySelector('a + a').href);
                const userIds = userURLs.map(url => url.replace('https://osu.ppy.sh/users/', '').replace('/osu', ''));
                return userIds;
            });

            // convert 50 user IDs into user objects
            // WARNING: rate-limit these calls to <60 calls per minute
            for (const userId of userIds) {
                const player = await getUser(apiToken, userId);
                console.log(`Scraping ${player.username}...`);
                setPlayer(player);
            }
            // after 50 calls, wait for 1 minute
            console.log("Waiting 1 minute...");
            await sleep(60 * 1000);
        }
    }
}

module.exports = scraperObject;