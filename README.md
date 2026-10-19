# Cashfire 2

A separate browser-ready prototype built from the original Live Wire four-reel game. X and loot boxes replace the X and lightning artwork. Three boxes trigger the Shooting Spree; four trigger Mega Shooting Spree. Both show original native combat footage while preserving the reel game's accepted reward.

Run `npm run dev`, then open `http://127.0.0.1:4175/`. There are no package dependencies or build step. Serve `dist/` over HTTPS or localhost. Opening an HTML file directly cannot verify the chunked films. `npm run check` validates the complete static tree and footage hashes; `npm test` runs the meaningful retained and new regressions.

Only `dist/` is the playable static root. The source files in that folder are editable originals, not a minified framework build. The rest of this repository contains tests, tooling and documentation. `index.html` at the repository root redirects to `dist/` for GitHub Pages compatibility. Do not deploy an original Live Wire hosting configuration.

Four films reuse the same owner's public native-media host at `https://johnofgordon7.github.io/paid-to-raid/dist/`; every fetched part and assembled film must match its pinned SHA-256 before playback. The smaller fifth MP4 is local. This dependency is explicit in `dist/combat-media-location.js`. If that host is unavailable, Retry and Continue to award preserve the accepted prize. The local working source also has all byte-exact parts; the lean handoff intentionally omits redundant part bytes. See `docs/media-reuse.md` for a self-contained build.

The game starts with £5,000 demo credits and a £1 stake. Sound and Turbo are off. Stakes, finite autoplay, information, rules, refill, Labs and the original centered controls are retained. There are no bonus purchases. Refresh starts a fresh local session. No real money, server wallet, certified maths or backend recovery is implemented.

`dist/outcomes.html` opens an isolated review browser. Its fixtures never touch the playable wallet or outcome generator. Bonus pause, skip, retry and return use the same presentation as normal play.

See `docs/mechanics.md` for the exact inherited model and `docs/provenance.json` for the original-source verification limit. `docs/handoff.md` records packaging and actual tests. Runtime media is byte-exact; videos are split only for browser upload transport. The five finite films are presentation, so footage kills do not authorise the reel reward. Additional footage is needed for a future design in which every exact monetary prize must correspond to a unique kill-to-cash film.
