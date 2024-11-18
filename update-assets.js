#!/usr/bin/env node

// @ts-check

const fs = require("fs");
const fsPromises = fs.promises;
const { Readable } = require("stream");
const { finished } = require("stream/promises");

/**
 * @typedef {Object} RawChampionSummaryData
 * @property {number} id
 * @property {string} name
 * @property {string} alias
 * @property {string} squarePortraitPath
 * @property {string[]} roles
 */

/**
 * @typedef {Object} RawChampionData
 * @property {number} id
 * @property {string} name
 * @property {string} alias
 * @property {string} title
 * @property {string} shortBio
 * @property {Object} tacticalInfo
 * @property {number} tacticalInfo.style
 * @property {number} tacticalInfo.difficulty
 * @property {string} tacticalInfo.damageType
 * @property {Object} playstyleInfo
 * @property {number} playstyleInfo.damage
 * @property {number} playstyleInfo.durability
 * @property {number} playstyleInfo.crowdControl
 * @property {number} playstyleInfo.mobility
 * @property {number} playstyleInfo.utility
 * @property {string} squarePortraitPath
 * @property {string} stingerSfxPath
 * @property {string} chooseVoPath
 * @property {string} banVoPath
 * @property {string[]} roles
 * @property {Object[]} skins
 * @property {number} skins.id
 * @property {boolean} skins.isBase
 * @property {string} skins.name
 * @property {string} skins.splashPath
 * @property {string} skins.uncenteredSplashPath
 * @property {string} skins.tilePath
 * @property {string} skins.loadScreenPath
 * @property {string} skins.skinType
 * @property {string} skins.rarity
 * @property {boolean} skins.isLegacy
 * @property {string} skins.splashVideoPath
 * @property {string} skins.collectionSplashVideoPath
 * @property {string} skins.collectionCardHoverVideoPath
 * @property {string} skins.featuresText
 * @property {string} skins.chromaPath
 * @property {string} skins.emblems
 * @property {number} skins.regionRarityId
 * @property {string} skins.rarityGemPath
 * @property {string} skins.skinLines
 * @property {string} skins.description
 */

/**
 * @typedef {Object} ResultChampion
 * @property {number} id
 * @property {string} name
 * @property {string} alias
 * @property {string?} portraitURL
 * @property {string?} skinURL
 * @property {string?} pickSoundURL
 */

const baseUrl = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global"
const scriptPath = __dirname;

function getUrl(path, locale = "default") {
    const match = path.match(/\/lol-game-data\/assets\/(.*)/);
    if (match) {
        path = match[1];
    }
    return `${baseUrl}/${locale}/${path}`;
}

/**
 * @returns {Promise<RawChampionSummaryData[]>}
 */
async function getAllChampions() {
    const url = getUrl("/lol-game-data/assets/v1/champion-summary.json", "zh_cn");
    const res = await fetch(url);
    const data = await res.json();
    return data;
}

/**
 * 
 * @param {string} path 
 * @param {string} locale 
 * @param {string} destFilename 
 * @return {Promise<boolean>}
 */
async function downloadAsset(path, locale = "default", destFilename) {
    const url = getUrl(path, locale).toLowerCase();
    const res = await fetch(url);
    if (res.status < 200 || res.status >= 300) {
        return false;
    }

    const destFilePath = destFilename.split("/").slice(0, -1).join("/");
    try {
        if (destFilePath) {
            await fsPromises.mkdir(destFilePath, { recursive: true });
        }
        if (res.body) {
            // @ts-ignore
            await finished(Readable.fromWeb(res.body).pipe(fs.createWriteStream(destFilename)));
            return true;
        }
    } catch (e) {
        console.error(e);
    }

    return false;
}


/**
 * @param {number} id
 * @return {Promise<ResultChampion>}
 */
async function getChampionResource(id) {
    const url = getUrl(`/lol-game-data/assets/v1/champions/${id}.json`, "zh_cn");
    const res = await fetch(url);
    /** @type {RawChampionData} */
    const data = await res.json();
    let portraitDownloaded, skinDownloaded, pickSoundDownloaded;

    portraitDownloaded = await downloadAsset(data.squarePortraitPath, "default", `${scriptPath}/client/public/assets/portraits/${data.id}.png`);
    if (data.skins.length !== 0)
        skinDownloaded = await downloadAsset(data.skins[0].splashPath, "default", `${scriptPath}/client/public/assets/skins/${data.id}.png`);
    pickSoundDownloaded = await downloadAsset(data.chooseVoPath, "zh_cn", `${scriptPath}/client/public/assets/sounds/${data.id}.ogg`);

    return {
        id: data.id,
        name: data.name,
        alias: data.title,
        portraitURL: pickSoundDownloaded ? `/assets/portraits/${data.id}.png` : null,
        skinURL: skinDownloaded ? `/assets/skins/${data.id}.png` : null,
        pickSoundURL: pickSoundDownloaded ? `/assets/sounds/${data.id}.ogg` : null,
    };
}

async function main() {
    /** @type {RawChampionSummaryData[]} */
    const items = await getAllChampions();

    /** @type {ResultChampion[]} */
    const results = [];

    console.log(`Fetching champion data, total ${items.length}...`);
    let i = 0;
    for (const item of items) {
        const result = await getChampionResource(item.id);
        console.log(`[ ${++i}/${items.length} ]  [${result.id}] ${result.name} (${result.alias}) Fetched.`);
        results.push(result);
    }

    console.log("Writing list to file...");
    await fsPromises.mkdir(`${scriptPath}/client/public/assets`, { recursive: true });
    await fsPromises.writeFile(`${scriptPath}/client/public/assets/champions.json`,
        JSON.stringify(results, null, 2)
    );

    console.log("Done.");
}


main();
