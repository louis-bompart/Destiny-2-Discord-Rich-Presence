'use strict';

const DiscordRPC = require('discord-rpc');
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

const clientId = '489959127448027136';

async function setActivity() {
  if (!rpc || finalPresence.offline) { return; }

  rpc.setActivity({
    details: finalPresence.activity,
    state: finalPresence.location,
    startTimestamp: finalPresence.time,
    largeImageKey: 'destiny_logo',
    largeImageText: finalPresence.altText,
    instance: false,
  });
}

rpc.on('ready', () => {
  let membershipId = localStorage.getItem('membershipId');
  let membershipType = localStorage.getItem('membershipType');

  setInterval(() => {
    console.log('Updated presence')
    pullNewData(membershipId, membershipType);
    setActivity();
  }, 15e3);
});

rpc.login({ clientId }).catch(console.error);
