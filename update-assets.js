#!/usr/bin/env node

// @ts-check

const fs = require("fs");
const fsPromises = fs.promises;
const { Readable } = require("stream");
const { finished } = require("stream/promises");
const { parseArgs } = require("util");

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

/**
 * @typedef {Object} RawItemData
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {boolean} active
 * @property {boolean} inStore
 * @property {number[]} from
 * @property {number[]} to
 * @property {string[]} categories
 * @property {number} maxStacks
 * @property {string} requiredChampion
 * @property {string} requiredAlly
 * @property {string} requiredBuffCurrencyName
 * @property {number} requiredBuffCurrencyCost
 * @property {number} specialRecipe
 * @property {boolean} isEnchantment
 * @property {number} price
 * @property {number} priceTotal
 * @property {boolean} displayInItemSets
 * @property {string} iconPath
 */


/**
 * @typedef {Object} ResultItem
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {string} iconURL
 */


/**
 * @typedef {Object} RawSummonerSpellData
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {number} summonerLevel
 * @property {number} cooldown
 * @property {string[]} gameModes
 * @property {string} iconPath
 */

/**
 * @typedef {Object} ResultSummonerSpell
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {number} summonerLevel
 * @property {string} iconURL
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
    let res = await fetch(url);
    
    if (res.status === 404 && locale !== "default") {
        console.warn(`404 Not Found: ${url}, trying default locale...`);
        res = await fetch(getUrl(path, "default").toLowerCase());
    };

    if (res.status < 200 || res.status >= 300) {
        console.error(`Failed to fetch ${url}, status: ${res.status}`);
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

    portraitDownloaded = await downloadAsset(data.squarePortraitPath, "default", `${scriptPath}/client/renderer/public/assets/portraits/${data.id}.png`);
    if (data.skins.length !== 0)
        skinDownloaded = await downloadAsset(data.skins[0].splashPath, "default", `${scriptPath}/client/renderer/public/assets/skins/${data.id}.png`);
    pickSoundDownloaded = await downloadAsset(data.chooseVoPath, "zh_cn", `${scriptPath}/client/renderer/public/assets/sounds/${data.id}.ogg`);

    return {
        id: data.id,
        name: data.name,
        alias: data.title,
        portraitURL: portraitDownloaded ? `/assets/portraits/${data.id}.png` : null,
        skinURL: skinDownloaded ? `/assets/skins/${data.id}.png` : null,
        pickSoundURL: pickSoundDownloaded ? `/assets/sounds/${data.id}.ogg` : null,
    };
}

/**
 * Update all champions
 * @returns {Promise<void>}
 * @param {number} jobs
 */
async function updateAllChampions(jobs) {
    /** @type {RawChampionSummaryData[]} */
    const items = await getAllChampions();

    /** @type {ResultChampion[]} */
    const results = Array(items.length);

    console.log(`Fetching champion data, total ${items.length}...`);
    let progess = 0;
    for (let i = 0; i < items.length; i += jobs) {
        await Promise.all(Array.from({ length: jobs }, async (_, j) => {
            const idx = i + j;
            if (idx >= items.length) return;
            const item = items[idx];
            const result = await getChampionResource(item.id);
            console.log(`[ ${++progess}/${items.length} ]  [${result.id}] ${result.name} (${result.alias}) Fetched.`);
            results[idx] = result;
        }));
    }

    console.log("Writing list to file...");
    await fsPromises.mkdir(`${scriptPath}/client/renderer/public/assets`, { recursive: true });
    await fsPromises.writeFile(`${scriptPath}/client/renderer/public/assets/champions.json`,
        JSON.stringify(results, null, 2)
    );

    console.log("Done.");
}

/**
 * Get all items list
 * @returns {Promise<RawItemData[]>}
 */
async function getAllItems() {
    const url = getUrl("/lol-game-data/assets/v1/items.json", "zh_cn");
    const res = await fetch(url);
    const data = await res.json();
    return data;
}

/**
 * Update all items
 * @param {number} jobs
 * @returns {Promise<void>}
 */
async function updateAllItems(jobs) {
    /** @type {RawItemData[]} */
    const items = await getAllItems();

    /** @type {ResultItem[]} */
    const results = Array(items.length);

    console.log(`Fetching item data, total ${items.length}...`);
    let progress = 0;
    for (let i = 0; i < items.length; i += jobs) {
        await Promise.all(Array.from({ length: jobs }, async (_, j) => {
            const idx = i + j;
            if (idx >= items.length) return;
            const item = items[idx];
            const result = await downloadAsset(item.iconPath, "default", `${scriptPath}/client/renderer/public/assets/items/${item.id}.png`);
            results[idx] = {
                id: item.id,
                name: item.name,
                description: item.description,
                iconURL: result ? `/assets/items/${item.id}.png` : ""
            };
            console.log(`[ ${++progress}/${items.length} ]  [${item.id}] ${item.name} Fetched.`);
        }));
    }

    console.log("Writing list to file...");
    await fsPromises.mkdir(`${scriptPath}/client/renderer/public/assets`, { recursive: true });
    await fsPromises.writeFile(`${scriptPath}/client/renderer/public/assets/items.json`,
        JSON.stringify(results, null, 2)
    );
    console.log("Done.");
}

async function getAllSummonerSpells() {
    const url = getUrl("/lol-game-data/assets/v1/summoner-spells.json", "zh_cn");
    const res = await fetch(url);
    const data = await res.json();
    return data;
}

async function updateAllSummonerSpells() {
    /** @type {RawSummonerSpellData[]} */
    const items = await getAllSummonerSpells();

    /** @type {ResultSummonerSpell[]} */
    const results = Array(items.length);

    console.log(`Fetching summoner spell data, total ${items.length}...`);
    let progress = 0;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const result = await downloadAsset(item.iconPath, "default", `${scriptPath}/client/renderer/public/assets/summoner-spells/${item.id}.png`);
        results[i] = {
            id: item.id,
            name: item.name,
            description: item.description,
            summonerLevel: item.summonerLevel,
            iconURL: result ? `/assets/summoner-spells/${item.id}.png` : ""
        };
        console.log(`[ ${++progress}/${items.length} ]  [${item.id}] ${item.name} Fetched.`);
    }

    console.log("Writing list to file...");
    await fsPromises.mkdir(`${scriptPath}/client/renderer/public/assets`, { recursive: true });
    await fsPromises.writeFile(`${scriptPath}/client/renderer/public/assets/summoner-spells.json`,
        JSON.stringify(results, null, 2)
    );
    console.log("Done.");
}

async function main() {
    const args = parseArgs({
        args: process.argv.slice(2),
        options: {
            "no-champions": {
                type: "boolean",
                default: false
            },
            "no-items": {
                type: "boolean",
            },
            "no-summoner-spells": {
                type: "boolean",
            },
            "jobs": {
                type: "string",
                default: "10"
            }
        }
    });

    let jobs = 10;
    try {
        jobs = parseInt(args.values["jobs"]);
    } catch (e) {
        console.error(e);
    }

    if (!args.values["no-champions"]) {
        console.log("Updating champions...");
        await updateAllChampions(jobs);
    }
    if (!args.values["no-items"]) {
        console.log("Updating items...");
        await updateAllItems(jobs);
    }
    if (!args.values["no-summoner-spells"]) {
        console.log("Updating summoner spells...");
        await updateAllSummonerSpells();
    }
}


main();
