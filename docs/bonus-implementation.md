# Cashfire 2 shooting spree

`dist/bonus.js` retains the global `LiveWireBonus` interface: `profile`, `pick`, `open`, `draw`, `bind` and `active`. The wallet stays in the existing accepted-round settlement path; the bonus module never debits, refunds or credits money. A guarded `onCollect(acceptedMultiplier)` runs once when Return to reels is pressed.

## Fixed showcase award and film contract

- Three loot boxes: Shooting Spree, exactly 5× total stake return, only `call-of-booty-extraction-five.mp4` (Warehouse Clear).
- Four loot boxes: Mega Shooting Spree, exactly 1,000× total stake return, only `call-of-booty-extraction-max.mp4` (Full Assault).

The fixed bonus values demonstrate SHOWCASE presentation and flow; they are not a balancing target. Base probabilities are unchanged and no probability retuning or payout optimization is performed. No weighted prize support, random prize ticket or film rotation remains. Compatibility helpers return the trigger's fixed prize. Internal arithmetic for the unchanged four independent 20% reels gives 196.352% with the showcase values; this is technical model data, not certification or a player-facing RTP promise.

The accepted total locks before presentation. Footage kills are labelled visual progress and never recalculate the bonus. Skip, pause, retry and media failure retain the same multiplier. Each mode has its own title, treatment and fixed award. No new edits, cuts, cutout enemies, montage or loop are introduced. The original maximum clip contains an editorial insert already present in the supplied source.

## Native media transport

The shipping catalog contains only the two selected films. Both reconstruct from SHA-256-verified remote parts at the explicit same-owner media host. There are 22 parts, each at most 4 MiB, with 86,569,259 bytes across the two native MP4s. The lean source/build archive retains complete manifests but includes neither film nor part bytes. The two films are 1280×720 H.264 at 24 fps with native AAC combat audio.

`combat-media-catalog.js` pins full native identities. Each manifest, part and complete reconstruction must verify before the loader creates a video Blob. HTTPS or localhost is required for integrity verification. `docs/media-reuse.md` explains vendoring for a self-contained host. Removed sprint and ambush films are not selectable features.

The native media clock drives footage kills and the 30-second endpoint for each selected clip. Audio follows the existing reel sound control. The full frame is contained so phone layouts do not crop the action.

## Lifecycle and recovery

Loading shows byte progress and holds the native clock. Failed, corrupt, incomplete or timed-out media offers Retry of the same film or Continue to the accepted fixed award. Skip aborts pending work and ignores late results; old object URLs are revoked. Retry cannot reroll film or money.

Manual pause, hidden tabs and autoplay gesture rejection hold the same accepted result, with manual Resume. A hidden tab encountered during loading holds completed media until Resume. The 60-second loading timeout remains recoverable. Native playback events and the host draw callback own progress; the module adds no independent animation loop.

The canonical `bonus-markup.html` dialog is shared by normal play and isolated review. Preview-only fixtures can request paused or media-failure states while retaining the trigger's fixed prize and film. Fixtures are rejected outside preview mode and cannot select an alternate film or alter the prize. Pause, Resume, Continue and Return use the production handlers.

## Verification boundary

Current test results belong in `docs/review/` with the exact build version. Historical v1.0.0 checks cover the prior model and film catalog; they are not evidence of the changed fixed model. Required current cases include both fixed awards, exclusive film mappings, no extra outcome draw, exactly-once collection, skip/late-result cleanup, failure/retry/continue, pause/background/resume, gesture rejection, mute sync, valid duration, native hashes and upload limits. A simulated DOM/native video test does not prove visual playback, audible synchronization or physical mobile performance.
