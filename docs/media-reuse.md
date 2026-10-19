# Native-media dependency and reproducibility

The distribution uses exactly two bonus films: `call-of-booty-extraction-five.mp4` for three boxes and `call-of-booty-extraction-max.mp4` for four. Both load from `https://johnofgordon7.github.io/paid-to-raid/dist/`, the same owner's existing Cashfire reference recorded at commit `63a6f594f66c353b06d792c7aebbc670784b8e68`.

`combat-media-catalog.js` pins full native bytes and SHA-256 identities. Each received manifest must match its pinned film, then every part and the assembled MP4 must verify before playback. No film is transcoded or looped. The films total 86,569,259 bytes across 22 parts, each at most 4 MiB. No direct complete MP4 remains in the current distribution.

The lean handoff excludes all `.bin` part bytes and complete videos, while retaining both complete manifests and editable source. A complete local working copy may retain the same verified 22 parts for reconstruction checks; those parts are ignored and omitted from publication archives.

For a self-contained distribution, run `npm run vendor-media` where the public dependency is accessible. It fetches missing/mismatched parts, verifies every part and complete film, and switches the media base to the local distribution. Alternatively supply the two matching extraction directories under `dist/assets/video-parts/` and set `mediaBaseUrl` in `dist/combat-media-location.js` to `new URL('./', import.meta.url).href`. Run `npm run check` and native asset tests, then serve `dist/`.

Native-byte tests identify omitted local parts explicitly; model and bonus lifecycle tests can run without them. There are no media-service credentials or paid API calls at runtime. HTTPS or localhost is required for browser integrity verification.

Three loot boxes lock 5× and the extraction-five film; four lock 1,000× and extraction-max. Loading failure, corrupt media or host deletion cannot authorise a different prize or film. Retry retains the same selection; Continue reveals the full fixed award. Footage kills remain visual progress rather than monetary authority.
