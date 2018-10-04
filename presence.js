const render = require('json-templater/string');
const Sqlite = require('better-sqlite3');
const rp = require('request-promise');
const unzip = require('unzip-stream');
const request = require('request');
const config = require('./config');
const path = require('path');
const fs = require('fs');

let parameters = new URLSearchParams(window.location.search);

window.onload = async function () {
  let { membershipId, membershipType } = await searchPlayers(parameters.get('platform'), encodeURIComponent(parameters.get('gtag')));
  let character = await getRecentCharacter(membershipId, membershipType);
  document.getElementById("emblem").src = `https://bungie.net${character.emblemBackgroundPath}`;
  document.getElementById("username").textContent = parameters.get('gtag').split('#')[0];
  document.getElementById("class").textContent = determineClass(character.classType);
  document.getElementById("light").textContent = character.light;
  document.getElementById("level").textContent = `Level ${character.baseCharacterLevel}`;
  let { currentActivityHash, currentActivityModeHash } = await findCurrentActivity(character.characterId, membershipId, membershipType);
  // let filteredActivity = await identifyHash(currentActivityHash);
  // let filteredActivityMode = await identifyHash(currentActivityModeHash);
  // console.log(filteredActivity);
  // console.log(filteredActivityMode);

}

function determineClass(type) {
  switch (type) {
    case 0: return 'Titan';
    case 1: return 'Hunter';
    case 2: return 'Warlock';
    case 3: return 'Unknown'
  }
}

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
// TODO
// Return on download completion using .pipe(unzip.Extract()).on('close', () => {})
// Currently excluded because callbacks suck and I'm lazy
async function loadDb() {
  let manifest = (await get({
    uri: config.endpoints.getManifest.uri
  })).Response;
  let fileName = `./manifests/${path.parse(manifest.mobileWorldContentPaths.en).base}`;
  if (!fs.existsSync(fileName)) {
    request(`https://bungie.net${manifest.mobileWorldContentPaths.en}`)
      .pipe(unzip.Extract({ path: `./manifests` }))
  }
  return fileName;
}

// Gets the definition of a hash using mobile db
async function identifyHash(hash) {
  if (hash === 0) return { hash: 'Not in an activity' };
  const db = new Sqlite(await loadDb());
  return db.prepare(`SELECT * FROM DestinyActivityModeDefinition WHERE id =?`).get(hash | 0).json;
}

// Searches for players using their platform and display name
async function searchPlayers(platform, name) {
  // Get user destinyMemberID
  let res = await get({
    uri: config.endpoints.getUser.uri,
    literals: {
      membershipType: platform,
      displayName: name
    }
  })
  if (!res.Response) return { Error: 'No such player' }
  else return res.Response[0];
}

async function getRecentCharacter(id, type) {
  // Get user character information
  let res = (await get({
    uri: config.endpoints.getCharacters.uri,
    components: config.endpoints.getCharacters.components,
    literals: {
      membershipType: type,
      membershipId: id
    }
  })).Response;

  // Determine what character has been played most recently
  return Object
    .values(res.characters.data)
    .map(char => ({ char, lastPlayed: Number(new Date(char.dateLastPlayed)) }))
    .sort((a, b) => b.lastPlayed - a.lastPlayed)[0]
    .char
}

// Populates the accountDetails object with IDs, Characters, and current activity
async function findCurrentActivity(charId, membershipId, membershipType) {
  // Finds the current activity and activityMode hashes
  // If 0, then no activity is in progress
  return (await get({
    uri: config.endpoints.getActivity.uri,
    components: config.endpoints.getActivity.components,
    literals: {
      membershipType: membershipType,
      membershipId: membershipId,
      characterId: charId
    }
  })).Response.activities.data;
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