# Cashfire 2 v1.0.0 distribution

The verified source baseline is Live Wire v42, commit `3fa040ef025b46ae4c887854a2f7181692365890`. The published reference reports v43, commit `c86ec80716c2dfc33bca07a96d6fb5e282f5fe81`; source equivalence to that revision is unverified. The published v43 controls and visible rules were inspected.

Serve `dist/` over HTTPS or localhost. The repository-root `index.html` redirects to `dist/` for GitHub Pages compatibility. The source in that folder is editable and requires no framework build. Publication revision 2 updates documentation and packaging without changing gameplay.

The lean source/build archive contains editable code, generated art masters and runtime assets, controls, local audio, the smaller native film, film manifests, tests and documentation. It omits large `.bin` footage parts supplied through the documented media dependency. Four films use the same-owner public host with SHA-256 verification before playback; see `media-reuse.md`. `npm run vendor-media` creates a self-contained version on a host with access to that URL.

The Journey Art Kit is linked from Outcomes. It contains editable presentation source, artwork, journey and asset manifests, and art replacement guidance. Large video and audio bytes are excluded from the compact kit and are identified by complete manifests. Artwork is raster with PNG masters; layered or rigged source is not included. Films are finite and are not newly looped or spliced. A future design that derives every prize from visible kills needs new footage or a redesigned mathematical model.

Validation is recorded in `review/automated-tests.json`, `review/test-output.txt`, `review/static-check.json` and `review/browser-checks.json`. Exact model enumeration covers 625 independent reel draws and 16 symbol layouts. VM regressions cover stake locking, rejected draws without charge, one debit/credit, both features, repeated play, autoplay stop, settings, reduced motion and hidden-tab recovery. Native-bonus tests cover loading, abort, retry, pause, skip, collect and all five film hashes. These checks do not certify real-money integration or physical-device performance.

Browser validation covered desktop and phone geometry, a natural base spin, accepted normal and Mega test triggers, preview controls and remote native-film playback. Screens were visually inspected; exported screenshot files are not included. Audible listening, physical-device performance, all six rendered viewport references and production-host validation remain unrun. See the detailed browser record for exact scope.

Defaults are £5,000 demo credits, £1 bet, Sound and Turbo off, finite autoplay 10/25/50/100, and 18 stakes. Bonus buying is absent. The theoretical local demo model is 97.152%, without certification. Player-facing bonus labels show maxima; accepted awards are separate from footage kills.
