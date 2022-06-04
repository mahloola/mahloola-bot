import { startBrowser } from './browser';
import { initializeDatabase, setPlayer } from '../db/database';
import scraperController from './pageController';

initializeDatabase();

// start the browser and create a browser instance
const browserInstance = startBrowser();

// pass the browser instance to the scraper controller
scraperController(browserInstance);
