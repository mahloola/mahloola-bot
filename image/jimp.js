var Jimp = require('jimp');
const { download } = require('../util/downloadImage');

async function createPlayerCard(player) {

    // base image
    const osuCard = await Jimp.read('image/osuCard.png');

    // username
    let font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    osuCard.print(font, 200, 280, { text: player.apiv2.username, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, 0, 0);
    // rank
    font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    osuCard.print(font, 200, 330, { text: `#${player.apiv2.statistics.global_rank}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, 0, 0);

    // cover
    console.log('cover url: ' + player.apiv2.cover_url)
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

    console.log("Writing image...");
    osuCard.write(`image/cache/osuCard-${player.apiv2.username}.png`);
    console.log("Image saved!");
}

module.exports = {
    createImage: createPlayerCard
}
