var Jimp = require('jimp');
var fs = require('fs');
var text2png = require('text2png');
const { download } = require('../util/downloadImage');
const { ClientRequest } = require('http');
const { getEnvironmentData } = require('worker_threads');

async function createPlayerCard(player) {

    // base image
    let osuCard = await Jimp.read('image/osuCard.png');

    // if (player.apiv2.statistics.global_rank > 7500) {
    //     osuCard = await Jimp.read('image/osuCard.png');
    // }
    // else if (player.apiv2.statistics.global_rank > 5000) {
    //     osuCard = await Jimp.read('image/osuCard-blue.png');
    // }
    // else if (player.apiv2.statistics.global_rank > 2500) {
    //     osuCard = await Jimp.read('image/osuCard-purple.png');
    // }
    // else if (player.apiv2.statistics.global_rank > 1000) {
    //     osuCard = await Jimp.read('image/osuCard-red.png');
    // }
    // else {
    //     osuCard = await Jimp.read('image/osuCard-yellow.png');
    // }

    // create text images using text2png 
    fs.writeFileSync(`image/cache/text2png-${player.apiv2.username}.png`, text2png(`${player.apiv2.username}`, {
        font: '36px Akshar',
        localFontName: 'Akshar',
        localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
        color: 'black',
        textAlign: 'center',
        lineSpacing: 10,
        padding: 20
    }));
    fs.writeFileSync(`image/cache/text2png-${player.apiv2.username}-statistics-left.png`, text2png(`Global\nCountry\npp\nPlaycount`, {
        font: '24px Akshar',
        localFontName: 'Akshar',
        localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
        color: 'black',
        textAlign: 'left',
        lineSpacing: 10,
        padding: 20,
    }));
    fs.writeFileSync(`image/cache/text2png-${player.apiv2.username}-statistics-right.png`, text2png(`${player.apiv2.statistics.global_rank}\n${player.apiv2.statistics.country_rank}\n${player.apiv2.statistics.pp}\n${player.apiv2.statistics.play_count}`, {
        font: '24px Akshar',
        localFontName: 'Akshar',
        localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
        color: 'black',
        textAlign: 'right',
        lineSpacing: 16,
        padding: 20,
    }));

    // read text images
    const textImage = await Jimp.read(`image/cache/text2png-${player.apiv2.username}.png`);
    const textImageStatisticsLeft = await Jimp.read(`image/cache/text2png-${player.apiv2.username}-statistics-left.png`);
    const textImageStatisticsRight = await Jimp.read(`image/cache/text2png-${player.apiv2.username}-statistics-right.png`);

    // overlay text images onto the card
    osuCard.composite(
        textImage, // src
        (400 - textImage.getWidth()) / 2, // x
        285, // y
        {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
    );
    osuCard.composite(
        textImageStatisticsLeft, // src
        (200 - textImageStatisticsLeft.getWidth()) / 2, // x
        325, // y
        {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
    );
    osuCard.composite(
        textImageStatisticsRight, // src
        (600 - textImageStatisticsRight.getWidth()) / 2, // x
        325, // y
        {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
    );

    // cover
    const cover = await Jimp.read(player.apiv2.cover_url)
    const aspectRatio = cover.bitmap.width / cover.bitmap.height
    if (aspectRatio < (400 / 220)) {
        // scale so that width = 400
        const scaleFactor = 400 / cover.bitmap.width
        cover.scale(scaleFactor);
        cover.blur(5);
        // overlay the cover
        osuCard.composite(cover, 0, 220 - cover.bitmap.height, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
        })
    } else {
        // scale so that height = 220
        const scaleFactor = 220 / cover.bitmap.height
        cover.scale(scaleFactor);
        cover.blur(5);
        // overlay the cover
        osuCard.composite(cover, 0, 0, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
        })
    }

    // avatar
    const avatar = await Jimp.read(`https://a.ppy.sh/${player.apiv2.id}`)

    // resize the avatar
    avatar.scaleToFit(256, 256);

    // smooth the edges using a circle mask
    const mask = await Jimp.read("image/mask.png");
    avatar.mask(mask, 0, 0);
    // await Promise.all([avatar, mask]).then((images) => {
    //     var avatar = images[0];
    //     var mask = images[1];
    // });

    const mask2 = await Jimp.read("image/card-mask.png");
    osuCard.mask(mask2, 0, 0);

    avatar.scaleToFit(200, 200);

    // overlay the avatar
    osuCard.composite(avatar, (400 - avatar.getWidth()) / 2, 78, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacityDest: 1,
        opacitySource: 1,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    });

    //img.mask(mask, 0, 0).write(`image/cache/osuCard-${user.username}.png`);

    // circle border
    const circle = await Jimp.read("image/osuCard-circle.png")
    osuCard.composite(
        circle, // src
        (400 - circle.getWidth()) / 2, // x
        0, // y
        {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }
    );

    // write image
    console.log("Writing image...");
    osuCard.write(`image/cache/osuCard-${player.apiv2.username}.png`);
    console.log("Image saved!");
}

module.exports = {
    createImage: createPlayerCard
}
