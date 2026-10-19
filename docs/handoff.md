# Cashfire 2 v1.1.0 distribution

Publication revision 3 sets fixed SHOWCASE bonus values and film mapping: three loot boxes always return 5× through Warehouse Clear; four always return 1,000× through Full Assault. These bonus values demonstrate presentation and flow. Other bonus films and weighted prize draws are removed. The retained base controls, layout and four independent 20% reels remain unchanged; no retuning, rebalancing or payout optimization is included.

The verified source baseline is Live Wire v42, commit `3fa040ef025b46ae4c887854a2f7181692365890`. The reference reports v43, commit `c86ec80716c2dfc33bca07a96d6fb5e282f5fe81`; source equivalence is unverified. Visible v43 controls and rules were previously inspected. This distribution does not claim to preserve its unavailable source or its original bonus payout model.

Serve `dist/` over HTTPS or localhost. Root `index.html` redirects to `dist/` for GitHub Pages. The source in `dist/` is editable and needs no framework build. The lean source/build archive includes code, art masters and runtime art, controls, local base audio, tests, documentation and the two complete film manifests. It contains no complete native film or footage part bytes.

Both films use the documented same-owner public host and SHA-256 verification before playback. The 22 part identities reconstruct exactly 86,569,259 native bytes. See `media-reuse.md`; `npm run vendor-media` creates a self-contained distribution when the host is accessible. Hosting failure retains Retry and Continue to the fixed award.

The Journey Art Kit is linked from Outcomes. It provides editable presentation, artwork, journey/asset manifests and replacement guidance. Native footage and large audio bytes remain identified by manifests rather than embedded in the compact kit. Artwork is raster with PNG masters; no layered or rigged source is claimed. The two native films are finite and are not newly looped or spliced.

Validation records are `review/automated-tests.json`, `review/test-output.txt`, `review/static-check.json` and `review/browser-checks.json`. Check their version/scope before treating them as evidence. Current v1.1.0 browser checks cover both exact native films and awards, normal completion, Mega pause/resume/skip, return to the playable wallet, ordinary repeat play,390×844 layout, preview isolation and media-error fallback. Historical v1.0.0 observations are kept separately and do not verify the revised model.

Required current checks include exhaustive reel/model enumeration, exact 196.352% expected return, fixed feature returns, stake locking, invalid results without charge, one debit/credit, both feature entries and returns, repeated play, autoplay stop, settings, reduced motion, hidden-tab recovery, native load/abort/retry/pause/skip/collect and both film hashes. Browser checks must separately establish phone/desktop fit and native playback. Audible listening, physical-device performance, complete standard-viewport parity, final published-host verification and v43 source comparison must not be inferred from VM tests.

Defaults are £5,000 demo credits, £1 bet, Sound and Turbo off, finite autoplay 10/25/50/100 and 18 stakes. No bonus buying. Rules label fixed 5× and 1,000× awards as SHOWCASE; footage kills do not control them. Internal technical arithmetic remains documented in mechanics.md, with no certification or real-money integration claimed.

Only intended source, assets and evidence belong in this repository. Exclude credentials, local absolute paths, private service metadata, logs and unrelated project data from publication.
