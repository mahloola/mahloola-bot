var Jimp = require('jimp');
var fs = require('fs').promises;
var text2png = require('text2png');
// const { download } = require('../util/downloadImage');
// const { ClientRequest } = require('http');
// const { getEnvironmentData } = require('worker_threads');

async function createPlayerCard(player) {

    // make sure image/cache directory exists
    // eslint-disable-next-line no-empty
    try { await fs.mkdir('image/cache') } catch {}

    // create all text images in parallel using text2png 
    const writePromises = [];
    writePromises.push(fs.writeFile(`image/cache/text2png-${player.apiv2.username}.png`, text2png(`${player.apiv2.username}`, {
        font: '36px Akshar',
        localFontName: 'Akshar',
        localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
        color: 'black',
        textAlign: 'center',
        lineSpacing: 10,
        padding: 20
    })));
    writePromises.push(fs.writeFile(`image/cache/text2png-${player.apiv2.username}-statistics-left.png`, text2png(`Global\nCountry\npp\nPlaycount`, {
        font: '24px Akshar',
        localFontName: 'Akshar',
        localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
        color: 'black',
        textAlign: 'left',
        lineSpacing: 10,
        padding: 20,
    })));
    writePromises.push(fs.writeFile(`image/cache/text2png-${player.apiv2.username}-statistics-right.png`, text2png(`${player.apiv2.statistics.global_rank}\n${player.apiv2.statistics.country_rank}\n${player.apiv2.statistics.pp}\n${player.apiv2.statistics.play_count}`, {
        font: '24px Akshar',
        localFontName: 'Akshar',
        localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
        color: 'black',
        textAlign: 'right',
        lineSpacing: 16,
        padding: 20,
    })));
    await Promise.all(writePromises);

    // base image
    const readPromises = [];
    if (player.apiv2.statistics.global_rank > 7500) {
        readPromises.push(Jimp.read('image/osuCard.png')); // const osuCard
    }
    else if (player.apiv2.statistics.global_rank > 5000) {
        readPromises.push(Jimp.read('image/osuCard-blue.png'));
    }
    else if (player.apiv2.statistics.global_rank > 2500) {
        readPromises.push(Jimp.read('image/osuCard-purple.png'));
    }
    else if (player.apiv2.statistics.global_rank > 1000) {
        readPromises.push(Jimp.read('image/osuCard-red.png'));
    }
    else {
        readPromises.push(Jimp.read('image/osuCard-yellow.png'));
    }
    readPromises.push(Jimp.read(`image/cache/text2png-${player.apiv2.username}.png`));
    readPromises.push(Jimp.read(`image/cache/text2png-${player.apiv2.username}-statistics-left.png`));
    readPromises.push(Jimp.read(`image/cache/text2png-${player.apiv2.username}-statistics-right.png`));
    readPromises.push(Jimp.read(`https://a.ppy.sh/${player.apiv2.id}`));
    readPromises.push(Jimp.read("image/mask.png"));
    readPromises.push(Jimp.read("image/card-mask.png"));
    readPromises.push(Jimp.read("image/osuCard-circle.png"));

    // perform all reads in parallel
    const [
        osuCard,
        textImage,
        textImageStatisticsLeft,
        textImageStatisticsRight,
        avatar,
        mask,
        mask2,
        circle,
    ] = await Promise.all(readPromises);
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
    try {
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
    }
    catch (err) {
        console.log(`Failed to read cover URL for user ${player.apiv2.username}: ${player.apiv2.cover_url}\n`);
    }


    // avatar

    // resize the avatar
    avatar.scaleToFit(256, 256);

    // smooth the edges using a circle mask
    avatar.mask(mask, 0, 0);
    // await Promise.all([avatar, mask]).then((images) => {
    //     var avatar = images[0];
    //     var mask = images[1];
    // });

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
    try {
        await osuCard.writeAsync(`image/cache/osuCard-${player.apiv2.username}.png`);
    }
    catch (err) {
        console.log(err);
    }
}

module.exports = {
    createImage: createPlayerCard
}
