var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./example.sqlite');
const render = require('json-templater/string');
const rp = require('request-promise');
const config = require('./config');
const dev = require('./dev');
var accountDetails = {};
var manifest;

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

async function get(data) {
  return await rp({
    uri: config.baseURL + render(data.uri, data.literals),
    headers: { 'X-API-Key': config.apiKey },
    qs: { components: data.components },
    json: true
  });
}

async function populateCreds() {
  // Get user destinyMemberID
  accountDetails = Object.assign(accountDetails, (await get({
    uri: config.endpoints.getUser.uri,
    literals: {
      membershipType: dev.membershipType,
      displayName: dev.displayName
    }
  })).Response[0]);

  // Get user character information
  accountDetails = Object.assign(accountDetails, (await get({
    uri: config.endpoints.getCharacters.uri,
    components: config.endpoints.getCharacters.components,
    literals: {
      membershipType: accountDetails.membershipType,
      membershipId: accountDetails.membershipId
    }
  })).Response);

  // Determine what character has been played most recently
  accountDetails.characterId = Object
    .values(accountDetails.characters.data)
    .map(char => ({ char, lastPlayed: Number(new Date(char.dateLastPlayed)) }))
    .sort((a, b) => b.lastPlayed - a.lastPlayed)[0]
    .char
    .characterId

  // Finds the current activity
  // If 0, then no activity is in progress
  accountDetails = Object.assign(accountDetails, (await get({
    uri: config.endpoints.getActivity.uri,
    components: config.endpoints.getActivity.components,
    literals: {
      membershipType: accountDetails.membershipType,
      membershipId: accountDetails.membershipId,
      characterId: accountDetails.characterId
    }
  })).Response.activities.data);
  console.log(accountDetails.currentActivityHash)
}

async function getManifest() {
  manifest = (await get({
    uri: config.endpoints.getManifest.uri
  })).Response;
}

let hash = 1290744998;
db.each(`SELECT json FROM DestinyActivityDefinition WHERE id IS ${hash | 0}`, function (err, json) {
  console.log(JSON.stringify(json));
});


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