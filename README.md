# Cashfire 2

Cashfire 2 v1.5.0 is a separate browser-ready prototype built from the verified Live Wire four-reel game. X remains non-paying and a loot box replaces the lightning artwork. Three boxes start Shooting Spree with Warehouse Clear; four start Mega Shooting Spree with Full Assault. A synchronized kill meter shows the original footage ladder and stake-scaled return progress beside the native film. The final win is revealed after extraction. A discreet PROTOTYPE marker identifies the demo.

Bonus entry shows the mode, stake and a zeroed kill/return meter, with loading/playback controls. It does not announce a fixed or locked prize, show a large advance win or advertise an invented prize range. The actual final return appears when the film completes, or after explicit Skip or recovery Continue, then Return to reels collects it once.

Run `npm run dev`, then open `http://127.0.0.1:4175/`. There are no package dependencies or build step. Serve `dist/` over HTTPS or localhost. Opening HTML directly cannot verify chunked films. `npm run check` validates static resources and media metadata; `npm test` runs the regressions. Native-byte checks identify omitted local footage explicitly.

Only `dist/` is the playable static root. Its files are editable source. Tests, tooling and documentation live outside it. Root `index.html` redirects to `dist/` for GitHub Pages.

Both films use the same owner's public host, `https://johnofgordon7.github.io/paid-to-raid/dist/`, and pinned SHA-256 verification of every part and complete reconstruction. The lean archive contains both manifests but no complete film or part bytes. Media failure supports Retry or Continue to the final result. See `docs/media-reuse.md` for a self-contained distribution.

Defaults are Â£5,000 demo credits and a Â£1 stake, with Sound and Turbo off. The original stake controls, finite autoplay, rules, refill, Labs and centered action remain. There are no bonus purchases. Refresh starts a fresh local session. No real-money wallet or backend recovery is implemented.

The base still uses four independent 20% reels and 0Ã—, 0.2Ã— and 1Ã— returns for zero, one and two boxes. Underlying showcase bonus values, probabilities and arithmetic are unchanged in this presentation update; no retuning, balancing or payout optimization is included. Technical details remain in `docs/mechanics.md` and Labs.

`dist/outcomes.html` provides independent review fixtures with the same film-before-result order and production presentation. They cannot change the playable wallet, stake or outcome generator.

See `docs/provenance.json` for the v42/v43 source-verification boundary and `docs/handoff.md` for packaging and validation scope. Native films remain byte-exact. Footage kills drive the presentation ladder; the accepted fixed result remains the payout authority. The last kill holds the previous tier until extraction. Skip reveals the selected result without inventing unseen kills.

The 3- and 4-loot-box indicators are prototype preview buttons for Shooting Spree and Mega Spree. They show an example using the selected stake, with no demo-credit charge or award. Repeated activation is blocked until Return to reels; spins and other accepted-round controls remain locked during a preview. Normal Play and its probabilities are unchanged. The selected L2 Supply Crate is shared by reels, collector and rules; the current live background is retained. The soundtrack now uses the selected music and seven effects documented in `docs/audio-integration.md` and `docs/audio-notice.md`.

Sound starts off. Enabling it unlocks the music, SFX and native-film audio through the existing combined Sound switch. The selected runtime audio is for this personal nonmonetized prototype; source access does not grant standalone reuse or sample-pack rights. The Art Kit contains mapping and notices without audio bytes.
