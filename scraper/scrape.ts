const browserObject = require('./browser');
const { initializeDatabase, setPlayer } = require('../db/database');
const scraperController = require('./pageController');

initializeDatabase();

// start the browser and create a browser instance
let browserInstance = browserObject.startBrowser();

// pass the browser instance to the scraper controller
scraperController(browserInstance);