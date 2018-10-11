const Sqlite = require('better-sqlite3');
const { remote } = require('electron');
const rp = require('request-promise');
let SZIP = require('node-stream-zip');
const request = require('request');
const path = require('path');
const fs = require('fs');
const apiKey = localStorage.getItem('apiKey');


// Generic request promise function
async function get(data) {
  return await rp({
    uri: 'https://www.bungie.net/Platform' + data.uri,
    headers: { 'X-API-Key': apiKey },
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
    uri: '/Destiny2/Manifest'
  })).Response;
  let options = {
    url: `https://bungie.net${manifest.mobileWorldContentPaths.en}`,
    port: 443,
    method: 'GET',
    encoding: null,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    }
  }
  let userDataPath = remote.app.getPath('userData');
  let fileName = path.parse(manifest.mobileWorldContentPaths.en).base.split('.')[0];
  let zipped = `${userDataPath}/manifests/zipped/${fileName}.zip`;
  let extracted = `${userDataPath}/manifests/extracted/${fileName}.content`;

  if (!fs.existsSync(`${userDataPath}/manifests`)) {
    fs.mkdirSync(`${userDataPath}/manifests/`);
    fs.mkdirSync(`${userDataPath}/manifests/extracted`);
    fs.mkdirSync(`${userDataPath}/manifests/zipped`);
  }
  if (!fs.existsSync(extracted)) {
    let outStream = fs.createWriteStream(zipped);
    console.log('Manifest Not Found.\nDownloading Now')
    request(options)
      .pipe(outStream)
      .on('finish', function () {
        let zip = new SZIP({
          file: zipped,
          storeEntries: true
        });
        zip.on('ready', function () {
          zip.extract(`${fileName}.content`, extracted, function (err) {
            if (err) console.log(err);
          });
        });
        zip.on('extract', function () {
          let membershipId = localStorage.getItem('membershipId');
          let membershipType = localStorage.getItem('membershipType');
          pullNewData(membershipId, membershipType);
        });
      });
  }
  return extracted;
}

// Gets the definition of a hash using mobile db
async function identifyHash(hash, table) {
  let path = await loadDb();
  const db = new Sqlite(path);
  return db.prepare(`SELECT * FROM Destiny${table}Definition WHERE id =?`).get(hash | 0).json;
}

// Searches for players using their platform and display name
async function searchPlayers(platform, name) {
  // Get user destinyMemberID
  let res = await get({
    uri: `/Destiny2/SearchDestinyPlayer/${platform}/${name}/`
  })
  if (res.Response.length === 0) return { membershipId: -1, membershipType: -1 }
  else return res.Response[0];
}

async function getRecentCharacter(id, type) {
  // Get user character information
  let res = (await get({
    uri: `/Destiny2/${type}/Profile/${id}/`,
    components: 200
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
    uri: `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${charId}/`,
    components: 204
  })).Response.activities.data;
}
