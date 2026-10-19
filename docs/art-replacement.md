# Art replacement guide

The inherited mechanical reels, geometry, lighting, motion and controller stay editable in `dist/`. Shared shell files and original vectors belong to the IG baseline. Replace game artwork without changing that geometry or touching payout code.

- `assets/art/cashfire-2/loot-box.webp` is the transparent reel/collector symbol; retain its centered pivot, generous alpha padding and readable silhouette. A PNG master is alongside it.
- `assets/art/1.0.0/cross.webp` is the inherited non-paying X symbol.
- `assets/art/cashfire-2/cashfire-2-logo.webp` is the new sequel wordmark, with PNG master and generation provenance.
- `assets/art/cashfire-2/depot.webp` is the original Cashfire depot environment.
- `bonus.css` and `bonus-markup.html` own normal/Mega bonus presentation. The gold Mega treatment and separate 1,000× maximum must remain clear.
- `combat-media-catalog.js`, `assets/video-parts/**/manifest.json` and `docs/asset-manifest.json` identify native films. New clips need source provenance, dimensions, endpoint/kill timing and hashes. Existing locked awards and settlement cannot derive from an art replacement.

Use `docs/journey-manifest.json` and Outcomes to inspect states. Kills in the five films are visual progress, separate from monetary authority. Do not add a kill ladder implying that the film determines the accepted reel award. Preserve the whole source video framing on phones; avoid cutout enemies or repeating montage inserts.
