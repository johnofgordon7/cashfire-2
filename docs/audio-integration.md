# Audio integration

The existing Sound switch controls both the game mix and native film audio. Audio contexts, sample loading and playback start only after a user sound gesture. Loading or playback failure never controls a spin, its accepted stake or settlement.

`audio-pack.js` supplies optional per-event URLs through `CashfireAudioPack.paths`. Empty paths retain the bundled baseline cues. Logical events are music, motor, reel-stop, four loot-hit tiers, collection, Normal entry, Mega entry, final positive win and interface feedback. An optional transition cue is supported. Shared URLs fetch and decode once; decoded samples are reused across rounds.

Music, gameplay effects, feature-entry and interface feedback have separate buses. Loading, playback, pause and error phases suppress the base music and cancel stale gameplay sounds. A Normal or Mega entry uses one mode cue; they do not stack. Native film sound owns playback. Final reveal permits the confirmed win accent and a reduced music bed; Return restores the base mix. Mute, hidden tabs and late-loading audio retain the same phase policy.

The current distribution uses the existing baseline audio files and original native AAC. Additional game-only audio can be inspected with the development server's optional audio-review directory without placing those files in the static distribution. Media bytes are excluded from the downloadable Art Kit. Source-code access does not itself grant standalone sample redistribution rights.

Automated audio checks cover gesture gating, overrides, shared decoding, voice limits, missing assets, stale cues, mute, background/resume and film-phase mixing. They cannot establish timbre, seamless musical phrasing, audible balance or device performance. Current evidence distinguishes these checks from listening and browser validation.
