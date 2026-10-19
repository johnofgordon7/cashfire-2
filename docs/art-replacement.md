# Art replacement guide

Mechanical reels, geometry, lighting, motion and controls remain editable in `dist/`. Shared shell files and original vectors belong to the IG baseline. Replace artwork without changing geometry or payout code.

- `assets/art/cashfire-2/loot-box.webp`: transparent reel/collector symbol; retain centered pivot, alpha padding and small-size silhouette. PNG master is alongside it.
- `assets/art/1.0.0/cross.webp`: inherited non-paying X.
- `assets/art/cashfire-2/cashfire-2-logo.webp`: sequel wordmark, with PNG master and provenance.
- `assets/art/cashfire-2/depot.webp`: original Cashfire depot environment.
- `bonus.css` and `bonus-markup.html`: normal/Mega presentation. Keep distinct treatment and the explicit fixed 5×/1,000× returns.
- `combat-media-catalog.js`, the two extraction part manifests and `docs/asset-manifest.json`: native film identities. New footage requires provenance, dimensions, endpoint/kill timing and hashes.

Three-box play uses only extraction-five; four-box play uses only extraction-max. An art replacement cannot change those mappings or derive a prize from kills. Use `docs/journey-manifest.json` and Outcomes to inspect states.

Keep the whole video frame on phones. Footage kills are visual progress separate from payout authority. Do not introduce a monetary kill ladder, cutout enemies or repeating montage inserts.
