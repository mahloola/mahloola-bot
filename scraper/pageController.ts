import pageScraper from './pageScraper';
export default async function scrapeAll(browserInstance){
    let browser;
    try{
        browser = await browserInstance;
        await pageScraper.scraper(browser);

    }
    catch(err){
        console.trace();
        console.log("Could not resolve the browser instance => ", err);
    }
}
