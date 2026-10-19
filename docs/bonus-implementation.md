# Cashfire 2 shooting spree

`dist/bonus.js` retains `LiveWireBonus.profile/pick/open/draw/bind/active`. The wallet remains in the accepted-round settlement path. The bonus module does not debit, refund or credit money; its guarded collection callback runs once when Return to reels is pressed.

## Unchanged internal showcase mapping

Three loot boxes map to 5× total stake return and only `call-of-booty-extraction-five.mp4` (Warehouse Clear). Four map to 1,000× and only `call-of-booty-extraction-max.mp4` (Full Assault). The four independent 20% reels, base returns and internal arithmetic remain unchanged. No retuning, balancing, weighted prize sampling or film rotation is introduced.

These values demonstrate presentation and flow. Technical arithmetic gives 196.352% for the unchanged default model; this is not a player-facing target or certification.

## Entry and reveal order

The inspected Live Wire v42 implementation cleared its final prize fields on opening and populated them at collection. Cashfire 2 retains that order for shooting footage without copying the source's incompatible prize-range wording.

Entry shows the Normal/Mega mode, accepted stake and discreet PROTOTYPE marker. The advance locked-total ledger, fixed-prize subtitle and early result fields are absent. The final multiplier and amount are cleared on every opening and stay blank through loading, playback, pause and media failure.

Film completion, explicit Skip or recovery Continue enters reveal. Only then are `bonusFinalPrize` and `bonusFinalAmount` populated with the actual result. Review fixtures follow the same order. Return to reels settles the already accepted internal result once; revealing or counting an amount cannot debit or credit.

Accepted money remains independent of visual suspense. Footage kills are progress, not a kill paytable. Retry cannot redraw money or select a different film. No new cuts, montage, cutout enemies or looping are introduced; the original maximum clip includes its existing editorial insert.

## Native transport and lifecycle

The two selected films reconstruct from the explicit same-owner host using 22 parts of at most 4 MiB, totalling 86,569,259 native bytes. The lean archive retains complete manifests but no complete film or part bytes. Each manifest, part and complete reconstruction must match SHA-256 pins before a Blob is played. HTTPS or localhost is required. See `media-reuse.md` for vendoring.

Both films are 1280×720 H.264 at 24 fps with original AAC, contained without cropping. The native media clock owns progress and the 30-second endpoint. Loading shows progress and holds time. Failed, corrupt, incomplete or timed-out media offers Retry or Continue to the result. Skip aborts pending work and ignores late responses; old object URLs are revoked.

Manual pause, hidden tabs and autoplay gesture rejection hold the same accepted result for manual Resume. Loading completed while hidden stays held. The recoverable timeout is 60 seconds. The module adds no independent animation loop.

The shared `bonus-markup.html` dialog is used in play and isolated review. Preview fixtures can request paused/media-failure states but cannot override the mode's film or result. Controls use the production handlers.

## Audio ownership and validation

Bonus phases can signal the host to transition or duck atmosphere/FX without announcing a win early. A final-result cue follows reveal. Audio loading, mute, pause or failure cannot change collection or settlement. Existing base cues and native film audio retain their recorded provenance; this document does not establish new generated-audio delivery.

Current results belong in `docs/review/` with exact version/scope. Earlier v1.1.0 checks do not verify the new entry/reveal order. Required cases include no advance result/AT disclosure, no stale final text on reopen, both fixed mappings, completion/Skip/Continue reveal, exactly-once collection, late-result cleanup, Retry, pause/background/resume, mute, duration and native integrity. VM checks do not prove visual playback, audible synchronization or physical-device performance.

## Direct prototype previews

Three-/four-box guide buttons and the Info preview controls call the same guarded free-preview entry. It takes the selected stake and the profile's single fixed example multiplier without consuming a result draw or prize RNG. The busy lock is synchronous, disables entry controls during the whole feature and releases on the once-only return callback. Preview final copy labels the example return and states that no demo credits were used or awarded; it never claims net profit or collection. Natural triggers retain their accepted stake and exactly-once settlement. Entry audio is requested after the bonus phase becomes active; shipped sound assets remain unchanged.
