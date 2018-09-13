const Sqlite = require('better-sqlite3');
const render = require('json-templater/string');
const rp = require('request-promise');
const unzip = require('unzip-stream');
const request = require('request');
const config = require('./config');
const dev = require('./dev');

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
async function loadDb() {
  let manifest = (await get({
    uri: config.endpoints.getManifest.uri
  })).Response;
  request(`https://bungie.net${manifest.mobileWorldContentPaths.en}`)
    .pipe(unzip.Extract({ path: `./manifests` }));
  return `./manifests/${manifest.mobileWorldContentPaths.en.substring(manifest.mobileWorldContentPaths.en.lastIndexOf('/') + 1)}`;
}

// Gets the definition of a hash using mobile db
async function identifyHash(activity) {
  if (activity.currentActivityHash === 0) return { activity: 'Not in an activity' };
  const db = new Sqlite(await loadDb());
  return db.prepare(`SELECT * FROM DestinyActivityDefinition WHERE id =?`).get(activity.currentActivityHash).json;
}

// Populates the accountDetails object with IDs, Characters, and current activity
async function populateCreds() {
  // Get user destinyMemberID
  // TODO
  // Remove dev creds and add prompt
  let accountDetails = {};
  accountDetails = Object.assign(accountDetails, (await get({
    uri: config.endpoints.getUser.uri,
    literals: {
      membershipType: dev.membershipType,
      displayName: dev.displayName
    }
  })).Response[0]);

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

populateCreds();


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