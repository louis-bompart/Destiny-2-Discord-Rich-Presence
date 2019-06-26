`use strict`;

const finalPresence = {};
let parameters = new URLSearchParams(window.location.search);

window.onload = async function () {
  const { membershipId, membershipType } = await searchPlayers(parameters.get('platform'), encodeURIComponent(parameters.get('gtag')));
  // Remove localStorage usage and instead use queries?
  localStorage.setItem('membershipId', membershipId);
  localStorage.setItem('membershipType', membershipType);
  if (membershipId === -1) {
    document.getElementsByName('no-such-player')[0].classList.remove('hidden');
    return;
  } else {
    pullNewData(membershipId, membershipType);
  }
}

if (document.readyState === 'complete') window.onload();

// Pull data from Bungie API
// Also update the playercard
async function pullNewData(membershipId, membershipType) {
  const character = await getRecentCharacter(membershipId, membershipType);

  // Update playercard with new data
  updatePlayercard(parameters.get('gtag'), character);

  const { currentActivityHash } = await findCurrentActivity(character.characterId, membershipId, membershipType);
  // If Player is offline
  if (currentActivityHash == 0) {
    document.getElementById('activity').textContent = finalPresence.activity = 'Offline';
    document.getElementById('location').textContent = finalPresence.location = 'Rich Presence Disabled';
    finalPresence.offline = true;
  } else {
    // Set playtime
    // Only update if no time is stored already
    if (finalPresence.time == null) {
      let startDate = subtractMinutes(character.minutesPlayedThisSession);
      let uptime = getRuntime(startDate, new Date());
      updateTime(uptime);
      finalPresence.time = startDate;
    }
    // Define hashes from db
    const filteredActivity = JSON.parse(await identifyHash(currentActivityHash, 'Activity'));
    const filteredDestination = JSON.parse(await identifyHash(filteredActivity.destinationHash, 'Destination'));
    const filteredActivityType = JSON.parse(await identifyHash(filteredActivity.activityTypeHash, 'ActivityType'));

    if (filteredActivityType.displayProperties.name === 'Orbit') {
      document.getElementById('activity').textContent = finalPresence.activity = 'In Orbit'
    } else if (filteredDestination.displayProperties.name === '') {
      document.getElementById('activity').textContent = finalPresence.activity = 'In Menus'
    } else {
      if (filteredActivityType.displayProperties.description.length > 128) {
        finalPresence.altText = filteredActivityType.displayProperties.description.substring(0, 125) + '...';
      } else {
        finalPresence.altText = filteredActivityType.displayProperties.description;
      }
      document.getElementById('activity').textContent = finalPresence.activity = filteredActivityType.displayProperties.name;
      document.getElementById('location').textContent = finalPresence.location = filteredDestination.displayProperties.name;
    }
  }
}

// Update example time played by 1s every... 1s
function updateTime(uptime) {
  setInterval(() => {
    uptime = iterate(uptime);
    document.getElementById('time').textContent = `${uptime} elapsed`;
  }, 1e3);
}

// Updates playercard from api
function updatePlayercard(username, character) {
  document.getElementById('emblem').src = `https://bungie.net${character.emblemBackgroundPath}`;
  document.getElementById('username').textContent = titleCase(username.charAt(0).toUpperCase() + username.slice(1).split('#')[0]);
  document.getElementById('class').textContent = determineClass(character.classType);
  document.getElementById('light').textContent = character.light;
  document.getElementById('level').textContent = `Level ${character.baseCharacterLevel}`;
}

// Transforms a string to title case
function titleCase(str) {
  let regex = /^.| ./gm;
  function replacer(match) { return match.toUpperCase(); }
  return str.toLowerCase().replace(regex, replacer);
}

// Returns the difference between two dates
// Output example: 14:31:01
function getRuntime(start, now) {
  let msDiff = now - start;
  let hh = pad(Math.floor(msDiff / 36e5));
  let mm = pad(Math.floor((msDiff / 6e4) % 60));
  let ss = pad(Math.floor((msDiff / 1e3) % 60));
  return `${hh}:${mm}:${ss}`;
}

// Pads numbers at the beginning with a single 0 if less than 10
function pad(int) {
  if (int < 10) {
    return `0${int}`;
  } else {
    return int;
  }
}

// Iterates an uptime counter in the form of hh:mm:ss by one second
function iterate(string) {
  if (string === '') return;
  let nums = string.split(':').map(Number);
  nums[2]++;
  if (nums[2] >= 60) {
    nums[2] = 0;
    nums[1]++;
  }
  if (nums[1] >= 60) {
    nums[1] = 0;
    nums[0]++;
  }
  return `${pad(nums[0])}:${pad(nums[1])}:${pad(nums[2])}`;
}

// Find date by subctracting an amount of minutes from the current date
function subtractMinutes(minutes) {
  ms = 60000 * minutes;
  return new Date(new Date().valueOf() - ms);
}

// Finds class type from class ID
function determineClass(type) {
  switch (type) {
    case 0: return 'Titan';
    case 1: return 'Hunter';
    case 2: return 'Warlock';
    default: return 'Error, wrong class type'
  }
}
