const render = require('json-templater/string');
const Sqlite = require('better-sqlite3');
const rp = require('request-promise');
const unzip = require('unzip-stream');
const request = require('request');
const config = require('./config');
const path = require('path');
const dev = require('./dev');
const fs = require('fs');
let accountDetails = {};

// let accountDetails, db = {};

// Flow
// Startup
// 1. Get account type
// 2. Get account membershipID
// 3. Get most recently played character
// 4. Get most recently played char's current activity
// 5. Check hashes to get activity details
//
// On refresh
// 3, 4, 5

// Generic request function
async function get(data) {
  return await rp({
    uri: config.baseURL + render(data.uri, data.literals),
    headers: { 'X-API-Key': config.apiKey },
    qs: { components: data.components },
    json: true
  });
}

// Gets the manifest
// Downloads and unzips the latest mobile content
// Creates a new db after closing the old db
// TODO
// Fix pipe 'close' event
async function loadDb() {
  let manifest = (await get({
    uri: config.endpoints.getManifest.uri
  })).Response;
  let fileName = `./manifests/${path.parse(manifest.mobileWorldContentPaths.en).base}`;
  if (!fs.existsSync(fileName)) {
    console.log(true)
    request(`https://bungie.net${manifest.mobileWorldContentPaths.en}`)
      .pipe(unzip.Extract({ path: `./manifests` })).on('close', () => {
        return fileName;
      });
  } else {
    return fileName;
  }
}

// Gets the definition of a hash using mobile db
async function identifyHash(activity) {
  if (activity.currentActivityHash === 0) return { activity: 'Not in an activity' };
  const db = new Sqlite(await loadDb());
  return db.prepare(`SELECT * FROM DestinyActivityDefinition WHERE id =?`).get(activity.currentActivityHash | 0).json;
}

// Searches for players using their platform and display name
async function searchPlayers() {
  // Get user destinyMemberID
  accountDetails = Object.assign(accountDetails, (await get({
    uri: config.endpoints.getUser.uri,
    literals: {
      membershipType: dev.membershipType,
      displayName: dev.displayName
    }
  })).Response[0]);
}

async function getCurrentCharacter() {
  // // Get user character information
  accountDetails = Object.assign(accountDetails, (await get({
    uri: config.endpoints.getCharacters.uri,
    components: config.endpoints.getCharacters.components,
    literals: {
      membershipType: accountDetails.membershipType,
      membershipId: accountDetails.membershipId
    }
  })).Response);

  // // Determine what character has been played most recently
  accountDetails.characterId = Object
    .values(accountDetails.characters.data)
    .map(char => ({ char, lastPlayed: Number(new Date(char.dateLastPlayed)) }))
    .sort((a, b) => b.lastPlayed - a.lastPlayed)[0]
    .char
    .characterId
}

// Populates the accountDetails object with IDs, Characters, and current activity
async function findCurrentActivity() {
  // // Finds the current activity and activityMode hashes
  // // If 0, then no activity is in progress
  let { currentActivityHash, currentActivityModeHash } = (await get({
    uri: config.endpoints.getActivity.uri,
    components: config.endpoints.getActivity.components,
    literals: {
      membershipType: accountDetails.membershipType,
      membershipId: accountDetails.membershipId,
      characterId: accountDetails.characterId
    }
  })).Response.activities.data;
  console.log(await identifyHash({ currentActivityHash, currentActivityModeHash }));
}


// const getCurrentActivity = async (membershipType, displayName) => await rp({
//   uri: `${config.endpoints.base}/Destiny2/${membershipType}/Profile/${destinyMembershipID}/Character/${characterID}`,
//   headers: { 'X-API-Key': config.apiKey },
//   qs: { 'components': 204 },
//   json: true
// });

// IIFE
// (
//   async () => {
//     console.log((await getUser('16149593')).Response);
//   }
// )();