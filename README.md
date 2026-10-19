# Cashfire 2

Cashfire 2 v1.1.0 is a separate browser-ready prototype built from the verified Live Wire four-reel game. X remains the non-paying symbol and a loot box replaces the lightning artwork. In SHOWCASE mode, three loot boxes display a fixed **5×** award with the original Warehouse Clear extraction film; four display **1,000×** with the original Full Assault film. These bonus values demonstrate presentation and flow. No other bonus film is selected.

Run `npm run dev`, then open `http://127.0.0.1:4175/`. There are no package dependencies or build step. Serve `dist/` over HTTPS or localhost. Opening HTML directly cannot verify the chunked films. `npm run check` validates the static tree and media metadata; `npm test` runs the retained and new regressions. Checks requiring omitted local footage parts identify that limitation.

Only `dist/` is the playable static root. Its source files are editable originals, not a minified framework build. The rest of the repository contains tests, tooling and documentation. Root `index.html` redirects to `dist/` for GitHub Pages compatibility.

Both selected native films load from the same owner's public host, `https://johnofgordon7.github.io/paid-to-raid/dist/`. Every fetched part and assembled film must match pinned SHA-256 identities before playback. This dependency is explicit in `dist/combat-media-location.js`. The lean source/build archive contains the two manifests but no complete film or part bytes. Retry and Continue to award preserve the fixed award when footage is unavailable. See `docs/media-reuse.md` for a self-contained distribution.

The game starts with £5,000 demo credits and a £1 stake. Sound and Turbo are off. Stakes, finite autoplay, information, rules, refill, Labs and the original centered controls are retained. There are no bonus purchases. Refresh starts a fresh local session. No real money, server wallet, certified maths or backend recovery is implemented.

The base keeps four independent 20% reels and 0×, 0.2× and 1× returns for zero, one and two boxes. The fixed bonus values are showcase behavior; no probability retuning, balancing or payout optimization is part of this version. Internal arithmetic and the existing Labs remain available for technical inspection in the demo.

`dist/outcomes.html` opens an isolated review browser. Its fixtures never touch the playable wallet or outcome generator. Bonus pause, skip, retry and return use the same presentation as normal play.

See `docs/mechanics.md` for the current model, `docs/provenance.json` for the v42/v43 source-verification boundary, and `docs/handoff.md` for packaging and verification scope. Native films remain byte-exact. Footage kills are visual progress; they cannot reroll or alter the accepted fixed award.
