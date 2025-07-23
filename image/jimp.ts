import * as fs from 'fs';
import Jimp from 'jimp';
import text2png from 'text2png';
import auth from '../config/auth.js';
import { PlayerApiv2 } from '../types.js';
const { imageDirectory } = auth;

export async function createPlayerCard(player: PlayerApiv2, claimCount: number) {
    let userTitle = false; // enable this flag if the user has a title
    // make sure image/cache directory exists
    // eslint-disable-next-line no-empty
    try {
        await fs.promises.mkdir('image/cache');
        // eslint-disable-next-line no-empty
    } catch {}

    // create all text images in parallel using text2png
    const rank = player.global_rank;
    const writePromises = [];
    writePromises.push(
        fs.promises.writeFile(
            `${imageDirectory}/cache/text2png-${player.username}.png`,
            text2png(`${player.username}`, {
                font: '36px Akshar',
                localFontName: 'Akshar',
                localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
                color: rank ? (rank >= 50 ? '#383838' : '#eeeeee') : '#383838',
                textAlign: 'center',
                lineSpacing: 10,
                padding: 20,
            })
        )
    );
    writePromises.push(
        fs.promises.writeFile(
            `${imageDirectory}/cache/text2png-${player.username}-statistics-left.png`,
            text2png(`Global\nCountry\npp\nFollowers\nClaims`, {
                font: '24px Akshar',
                localFontName: 'Akshar',
                localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
                color: rank ? (rank >= 50 ? '#4f4f4f' : '#afafaf') : '#4f4f4f',
                textAlign: 'left',
                lineSpacing: 10,
                padding: 20,
            })
        )
    );
    writePromises.push(
        fs.promises.writeFile(
            `${imageDirectory}/cache/text2png-${player.username}-statistics-right.png`,
            text2png(
                `${player.global_rank ? player.global_rank : '-'}\n${
                    player.country_rank ? player.country_rank : '-'
                }\n${player.pp ? player.pp : '-'}\n${player.follower_count}\n${claimCount ? claimCount : 0}`,
                {
                    font: '24px Akshar',
                    localFontName: 'Akshar',
                    localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
                    color: rank ? (rank >= 50 ? '#4f4f4f' : '#afafaf') : '#4f4f4f',
                    textAlign: 'right',
                    lineSpacing: 16,
                    padding: 20,
                }
            )
        )
    );
    if (player.title !== null) {
        userTitle = true;
        writePromises.push(
            fs.promises.writeFile(
                `${imageDirectory}/cache/text2png-${player.username}-title.png`,
                text2png(`${player.title}`, {
                    font: '24px Akshar',
                    localFontName: 'Akshar',
                    localFontPath: 'fonts/Akshar-VariableFont_wght.ttf',
                    color: rank ? (rank >= 50 ? '#414141' : '#cfcfcf') : '#414141',
                    textAlign: 'center',
                    lineSpacing: 16,
                    padding: 20,
                })
            )
        );
    }

    await Promise.all(writePromises);

    // base image
    const readPromises = [];

    const followers = player.follower_count;
    const baseImageFile = rank
        ? rank < 50
            ? 'image/osuCard-master.png'
            : rank < 300
            ? 'image/osuCard-legendary.png'
            : rank < 1000
            ? 'image/osuCard-rare.png'
            : rank < 5000
            ? 'image/osuCard-uncommon.png'
            : 'image/osuCard-common.png'
        : followers > 5000
        ? 'image/osuCard-master.png'
        : followers > 2500
        ? 'image/osuCard-legendary.png'
        : followers > 1250
        ? 'image/osuCard-rare.png'
        : followers > 500
        ? 'image/osuCard-uncommon.png'
        : 'image/osuCard-common.png';
    readPromises.push(Jimp.read(baseImageFile));

    readPromises.push(Jimp.read(`${imageDirectory}/cache/text2png-${player.username}.png`));
    readPromises.push(Jimp.read(`${imageDirectory}/cache/text2png-${player.username}-statistics-left.png`));
    readPromises.push(Jimp.read(`${imageDirectory}/cache/text2png-${player.username}-statistics-right.png`));
    readPromises.push(Jimp.read(`https://a.ppy.sh/${player.id}`));
    readPromises.push(
        Jimp.read(
            `https://raw.githubusercontent.com/ppy/osu-resources/master/osu.Game.Resources/Textures/Flags/${player.country_code}.png`
        )
    );
    readPromises.push(Jimp.read('image/mask.png'));
    readPromises.push(Jimp.read('image/card-mask.png'));
    readPromises.push(Jimp.read('image/osuCard-circle.png'));

    // perform all reads in parallel
    const [
        osuCard,
        textImageUsername,
        textImageStatisticsLeft,
        textImageStatisticsRight,
        avatar,
        flag,
        mask,
        cardMask,
        circle,
    ] = await Promise.all(readPromises);
    const textImageTitle = userTitle
        ? await Jimp.read(`${imageDirectory}/cache/text2png-${player.username}-title.png`)
        : null;

    // overlay text images onto the card
    osuCard.composite(
        textImageUsername, // src
        (400 - textImageUsername.getWidth()) / 2, // x
        296, // y
        {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        }
    );
    const statisticsHeight = userTitle ? 368 : 348;
    // left statistics
    osuCard.composite(
        textImageStatisticsLeft, // src
        (280 - textImageStatisticsLeft.getWidth()) / 2, // x
        statisticsHeight, // y (push up statistics if the user doesn't have a title)
        {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        }
    );

    // right statistics
    osuCard.composite(
        textImageStatisticsRight, // src
        (520 - textImageStatisticsRight.getWidth()) / 2, // x
        statisticsHeight, // y
        {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        }
    );

    // user title if it exists
    if (userTitle) {
        osuCard.composite(
            textImageTitle, // src
            (400 - textImageTitle.getWidth()) / 2, // x
            330, // y
            {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
            }
        );
    }

    // cover
    try {
        const cover = await Jimp.read(player.cover_url);
        const aspectRatio = cover.bitmap.width / cover.bitmap.height;
        if (aspectRatio < 400 / 220) {
            // scale so that width = 400
            const scaleFactor = 400 / cover.bitmap.width;
            cover.scale(scaleFactor);
            cover.blur(5);
            // overlay the cover
            osuCard.composite(cover, 0, 220 - cover.bitmap.height, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1,
            });
        } else {
            // scale so that height = 220
            const scaleFactor = 220 / cover.bitmap.height;
            cover.scale(scaleFactor);
            cover.blur(5);
            // overlay the cover
            osuCard.composite(cover, 0, 0, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacityDest: 1,
                opacitySource: 1,
            });
        }
    } catch (err) {
        console.error(`Failed to read cover URL for user ${player.username}.`);
    }

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
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        }
    );

    // avatar
    // resize the avatar
    avatar.scaleToFit(256, 256);
    // smooth the edges using a circle mask // TODO: handle cases with width less than 200 and very tall aspect ratio
    avatar.mask(mask);
    // fit the avatar
    avatar.scaleToFit(200, 200);

    // overlay the avatar
    osuCard.composite(avatar, (400 - avatar.getWidth()) / 2, 78, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacityDest: 1,
        opacitySource: 1,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    });

    flag.resize(42, 29);
    // overlay the flag
    osuCard.composite(
        flag, // src
        (400 - flag.getWidth()) / 2, // x
        263, // y
        {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 1,
            opacitySource: 1,
            alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        }
    );

    osuCard.mask(cardMask, 0, 0);

    // write image
    try {
        await osuCard.writeAsync(`${imageDirectory}/cache/osuCard-${player.username}.png`);
    } catch (err) {
        console.trace();
        console.error(err);
    }
}
