var Jimp = require('jimp');
const { download } = require('../util/downloadImage');

async function createImage(player) {

    // base image
    const img = await Jimp.read('image/osuCard.png');

    // username
    let font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    img.print(font, 200, 280, { text: player.apiv2.username, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, 0, 0);
    // rank
    font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    img.print(font, 200, 330, { text: `#${player.apiv2.statistics.global_rank}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, 0, 0);

    // cover
    await Jimp.read(player.apiv2.cover_url)
        .then(async (cover) => {

            // resize the cover
            cover.scaleToFit(800, 800);
            // cover.crop(0, 400);
            // cover.blur();
            // overlay the cover
            img.composite(cover, 0, 0, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1,
            }, 0, 0);
        })
        .catch(() => 0);

    // avatar
    await Jimp.read(`https://a.ppy.sh/${player.apiv2.id}`)
        .then(async (avatar) => {

            // resize the avatar
            if (avatar.getWidth() != 256) {
                avatar.scaleToFit(256, 256);
            }
            else {
                avatar.scaleToFit(256, 256);
            }

            // smooth the edges using a circle mask
            var mask = Jimp.read("image/mask.png");
            await Promise.all([avatar, mask]).then((images) => {
                var avatar = images[0];
                var mask = images[1];
                avatar.mask(mask, 0, 0);
            });

            avatar.scaleToFit(200, 200);

            // overlay the avatar
            img.composite(avatar, (400 - avatar.getWidth()) / 2, 78, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            }, 0, 0);

            //img.mask(mask, 0, 0).write(`image/cache/osuCard-${user.username}.png`);
        })
        .catch(() => 0);


    // circle border
    await Jimp.read("image/osuCard-circle.png")
        .then((circle) => {
            img.composite(circle, (400 - circle.getWidth()) / 2, 0, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            }, 0, 0);
        })
        .catch(() => 0);

    console.log("Writing image...");
    img.write(`image/cache/osuCard-${player.apiv2.username}.png`);
    console.log("Image saved!");
}

module.exports = {
    createImage
}
