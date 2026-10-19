'use strict';
// Game-only event recordings; no account or service access is used by players.
// Paths share decoded data when multiple gameplay events use the same take.
globalThis.CashfireAudioPack = Object.freeze({
  paths:Object.freeze({
    music:'assets/audio/cashfire-2/music.mp3',
    motor:'assets/audio/cashfire-2/spin.mp3',
    'reel-stop':'assets/audio/cashfire-2/reel-stop.mp3',
    'bolt-1':'assets/audio/cashfire-2/loot-hit.mp3',
    'bolt-2':'assets/audio/cashfire-2/loot-hit.mp3',
    'bolt-3':'assets/audio/cashfire-2/loot-hit.mp3',
    'bolt-4':'assets/audio/cashfire-2/loot-hit.mp3',
    collect:'assets/audio/cashfire-2/loot-hit.mp3',
    bonus:'assets/audio/cashfire-2/bonus.mp3',
    mega:'assets/audio/cashfire-2/mega.mp3',
    transition:'assets/audio/cashfire-2/transition.mp3',
    win:'assets/audio/cashfire-2/win.mp3'
  }),
  mix:Object.freeze({music:.72,gains:Object.freeze({
    motor:.38,'reel-stop':.9,
    'bolt-1':.68,'bolt-2':.78,'bolt-3':.88,'bolt-4':.98,
    collect:0,bonus:.68,mega:.65,transition:.85,win:.70,ui:.08
  })}),
  loops:Object.freeze({
    music:Object.freeze({start:0,end:31.9}),
    motor:Object.freeze({start:0,end:2.24})
  })
});
