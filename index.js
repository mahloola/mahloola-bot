require('dotenv').config();
const key = process.env.API_KEY;
const fetch = require("node-fetch");

fetch(`http://osu.ppy.sh/api/get_user?u=8759374&k=${key}`)
    .then(res => res.json())
    .then(data => console.log(data));