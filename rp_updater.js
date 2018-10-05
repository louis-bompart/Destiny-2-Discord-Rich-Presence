'use strict';

const DiscordRPC = require('discord-rpc');


const clientId = '489959127448027136';

// only needed for discord allowing spectate, join, ask to join
// I can't access api endpoints for those
// sooo, this won't be used until I can (or never)
// DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });

async function setActivity() {
  if (!rpc) {
    return;
  }

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
  setActivity();

  // activity can only be set every 15 seconds
  setInterval(() => {
    console.log('Updated presence')
    pullNewData();
    setActivity();
  }, 15e3);
});

rpc.login({ clientId }).catch(console.error);
