# Cashfire 2 artwork provenance

The loot-box symbol and sequel wordmark are generated raster artwork dated 2026-10-18. Transparent PNG masters and WebP runtime derivatives are included. Dimensions, alpha extents, file sizes and SHA-256 identities are recorded in `dist/assets/art/cashfire-2/asset-manifest.json`.

## Loot-box reel symbol

Files: `loot-box.png` and `loot-box.webp` in `dist/assets/art/cashfire-2/`.

Design brief: a compact scratched olive-drab military supply chest in a three-quarter front view, with rugged bevelled metal corners, a prominent warm brass latch and a narrowly opened lid emitting orange light. The silhouette must read at small reel sizes. Materials use olive green, antique brass and restrained orange highlights, with a transparent background and no text or scenery.

## Cashfire 2 logo

Files: `cashfire-2-logo.png` and `cashfire-2-logo.webp` in the same directory.

Visual reference: the original Cashfire raster wordmark in the Cashfire source. The sequel asset is a new generated rendering in that visual direction, rather than byte-identical original lettering. Its design combines distressed cream/steel CASH, orange FIRE, dark extruded outlines, the muzzle-flash silhouette and a matching metallic numeral 2.

## Validation

The generated artwork was visually inspected, including the chest at a 72px display size. Runtime conversion changes format and dimensions while preserving transparency. No layered vector or rigged master is represented by these raster files.

## Tactical staging environment v2

Generated on 2026-10-19 with built-in OpenAI imagegen as a new opaque composition. The base environment is an empty tactical staging interior, distinct from the supplied exterior combat-film footage. Warm amber side worklamps and olive/brass equipment cases support the existing symbol and wordmark family; cool steel-blue backplanes and a quiet central wall/floor preserve space for the four front-on reels.

Files in `dist/assets/art/cashfire-2/`:

- `source-art/staging-depot-v2.png`: native RGB raster master, 1672 × 941, 2,444,733 bytes; SHA-256 `3911112b19eab4eeac2612dc30b515c9a9f8c1a82d3ad7d8dc8217cb0c2ac3ec`.
- `staging-depot-v2.webp`: runtime format derivative at the same dimensions, 332,286 bytes; SHA-256 `055ad64dfac61b78463add77dce4a60d66cc4c449fe589b636f4ba072b43a748`.

The CSS background belongs to the existing `.game-region`; the header, footer, controller and reel geometry retain their established layout. Desktop uses a centered cover crop. Narrow portrait uses a 34% horizontal crop to retain an amber staging edge. The image already contains a low-contrast center, so the CSS uses a light tonal overlay rather than obscuring the environment. No parallax, motion layer or lighting animation is added.

Final generation prompt:

> Use case: stylized-concept. Asset type: premium cinematic game environment BACKGROUND PLATE ONLY for Cashfire 2, a military tactical supply-depot game. Create a completely new wide 16:9 landscape image, ideally 2048x1152, of an empty tactical weapons-depot staging INTERIOR, with deep architectural perspective, never an outdoor shipping yard or a first-person shooter video frame. Eye-level, level front-facing architectural camera looking into a spacious industrial armory loading hall. The far LEFT and RIGHT edges hold rugged olive-drab equipment cases, dark steel storage racks and recessed work stations, with modest brass corner hardware to echo a premium olive-and-brass loot box. Warm amber practical work lamps mounted on the side columns illuminate these side staging areas and produce restrained copper edge reflections on metal. Receding bays and ceiling trusses lead into cool desaturated blue-grey backplanes. Thin atmospheric depth, physically grounded masonry, brushed metal, weathered concrete and heavy engineering; premium polished AAA game environment art, detailed but disciplined. Visual hierarchy: the CENTER 60% is a broad uncluttered shadowed low-contrast recess with dark muted back wall and a simple matte concrete floor, deliberately quiet because FOUR LARGE FRONT-ON MECHANICAL REELS will be composited over this center later. Keep visual interest and small highlights in the outer edges and upper side structure, not bright spots behind the reels. The central lower area must remain calm and dark enough for the existing game. Sophisticated olive, charcoal and steel-blue palette, warm amber practicals; realistic motivated lighting, rich material separation and strong depth, neither flat nor washed out. Constraints: scene only, no game machine, no reels, no UI, no HUD, no borders, no logos, NO TEXT OR SIGNAGE of any kind, no readable markings, no numerals, no people, no soldiers, no hands, no human silhouettes, no foreground aiming weapon, no rifles pointing at the viewer or aimed into the scene. No exterior containers, no cranes, no rain-wet dock, no reused shooting-spree composition. Fill the entire canvas as usable background artwork; opaque background.

The generated master and runtime derivative were pixel-inspected for composition, materials, empty center and absence of people, signage or a foreground aiming weapon. Browser comparison and physical-device checks remain separate validation. This is a flattened raster environment, not layered scene or 3D source.
