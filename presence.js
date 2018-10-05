const render = require('json-templater/string');
const Sqlite = require('better-sqlite3');
const rp = require('request-promise');
const unzip = require('unzip-stream');
const request = require('request');
const config = require('./config');
const path = require('path');
const fs = require('fs');

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
async function identifyHash(hash, table) {
  const db = new Sqlite(await loadDb());
  return db.prepare(`SELECT * FROM Destiny${table}Definition WHERE id =?`).get(hash | 0).json;
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
  if (res.Response.length === 0) return { membershipId: -1, membershipType: -1 }
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
