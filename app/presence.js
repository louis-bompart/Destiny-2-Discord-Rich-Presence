const Sqlite = require('better-sqlite3');
const { remote } = require('electron');
let SZIP = require('node-stream-zip');
const request = require('request');
const path = require('path');
const fs = require('fs');
const apiKey = localStorage.getItem('apiKey');
let downloadPromise = null;

// Generic request promise function
async function get(data) {
  const url = new URL(`https://www.bungie.net/Platform/${data.uri}`);
  // Normalize components as an array.
  if (data.components) {
    data.components = Array.isArray(data.components) ? data.components : [data.components]
    url.searchParams.set('components', data.components.join(','))
  }

  const response = await fetch(url, {
    headers: { 'X-API-Key': apiKey }
  }).catch(e => {
    console.error(e);
  });
  return response.json();
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

  console.debug(`manifestRep:${JSON.stringify(manifest)}`);
  let userDataPath = remote.app.getPath('userData');
  console.debug(`userDataPath:${userDataPath}`);
  let fileName = path.parse(manifest.mobileWorldContentPaths.en).base.split('.')[0];
  console.debug(`userDataPath:${fileName}`);
  let zipped = path.join(userDataPath, 'manifests', 'zipped', `${fileName}.zip`);
  console.debug(`manifestRep:${JSON.stringify(zipped)}`);
  let extracted = path.join(userDataPath, 'manifests', 'extracted', `${fileName}.content`);
  console.debug(`manifestRep:${JSON.stringify(extracted)}`);

  try {
    fs.accessSync(path.parse(zipped).dir, fs.constants.F_OK);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    fs.mkdirSync(path.parse(zipped).dir, { recursive: true })
  }

  try {
    fs.accessSync(path.parse(extracted).dir, fs.constants.F_OK);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    fs.mkdirSync(path.parse(extracted).dir, { recursive: true })
  }

  try {
    fs.accessSync(extracted, fs.constants.R_OK)
    return Promise.resolve(extracted)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  // Storing the promise allow to debounce the calls
  if (!downloadPromise) {
    downloadPromise = new Promise((resolve, reject) => {
      console.log('Manifest Not Found.\nDownloading Now')
      request(options)
        .pipe(fs.createWriteStream(zipped)
          .on('close', function () {
            let zip = new SZIP({
              file: zipped,
              storeEntries: true
            });
            zip.on('ready', function () {
              zip.extract(`${fileName}.content`, extracted, function (err) {
                if (err) console.log(err);
                let membershipId = localStorage.getItem('membershipId');
                let membershipType = localStorage.getItem('membershipType');
                pullNewData(membershipId, membershipType);
                zip.close(() => {
                  downloadPromise = null;
                  resolve(extracted);
                })

              });

            });

          }));
    });
  }
  return downloadPromise
}
// Gets the definition of a hash using mobile db
async function identifyHash(hash, table) {
  const dbPath = await loadDb();
  const db = new Sqlite(dbPath);
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
