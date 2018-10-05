`use strict`;

const finalPresence = {};
let parameters = new URLSearchParams(window.location.search);

window.onload = async function () {
  pullNewData();
}

async function pullNewData() {
  const { membershipId, membershipType } = await searchPlayers(parameters.get('platform'), encodeURIComponent(parameters.get('gtag')));
  if (membershipId === -1) {
    document.getElementsByName('no-such-player')[0].classList.remove('hidden');    
    return;
  }
  const character = await getRecentCharacter(membershipId, membershipType);

  document.getElementById('emblem').src = `https://bungie.net${character.emblemBackgroundPath}`;
  document.getElementById('username').textContent = parameters.get('gtag').split('#')[0];
  document.getElementById('class').textContent = determineClass(character.classType);
  document.getElementById('light').textContent = character.light;
  document.getElementById('level').textContent = `Level ${character.baseCharacterLevel}`;

  const { currentActivityHash } = await findCurrentActivity(character.characterId, membershipId, membershipType);
  if (currentActivityHash == 0) {
    document.getElementById('activity').textContent = finalPresence.activity = 'Offline';
    document.getElementById('location').textContent = finalPresence.location = ':)';
  } else {
    document.getElementById('time').textContent = getHrMin(character.minutesPlayedThisSession); 
    finalPresence.time = subtractMinutes(character.minutesPlayedThisSession);
    const filteredActivity = JSON.parse(await identifyHash(currentActivityHash, 'Activity'));
    const filteredDestination = JSON.parse(await identifyHash(filteredActivity.destinationHash, 'Destination'));
    const filteredActivityType = JSON.parse(await identifyHash(filteredActivity.activityTypeHash, 'ActivityType'));
    if (filteredActivityType.displayProperties.name === 'Orbit') {
      document.getElementById('activity').textContent = finalPresence.activity = 'In Orbit'
    } else if (filteredDestination.displayProperties.name === '') {
      document.getElementById('activity').textContent = finalPresence.activity = 'In Menus'
    } else {
      if(filteredActivityType.displayProperties.description.length > 128) {
        finalPresence.altText = filteredActivityType.displayProperties.description.substring(0,125)+'...';
      } else {
        finalPresence.altText = filteredActivityType.displayProperties.description;
      }
      document.getElementById('activity').textContent = finalPresence.activity = filteredActivityType.displayProperties.name;
      document.getElementById('location').textContent = finalPresence.location = filteredDestination.displayProperties.name;
    }
  }
}

function getHrMin(minutes) {
  let m = minutes % 60;
  let h = (minutes - m) / 60;
  if(m<10) m = '0'+m.toString();
  if(h<10) h = '0'+h.toString();
  return `${h}:${m}`;
}

function subtractMinutes(minutes) {
  ms = 60000 * minutes;
  return new Date(new Date().valueOf() - ms);
}

function determineClass(type) {
  switch (type) {
    case 0: return 'Titan';
    case 1: return 'Hunter';
    case 2: return 'Warlock';
    case 3: return 'Unknown'
  }
}