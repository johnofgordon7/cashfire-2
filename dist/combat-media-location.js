// Same-owner native-media dependency. All chunk/film bytes are pinned by SHA-256
// in combat-media-catalog.js and verified by combat-media.js before playback.
// To make this distribution self-contained, vendor the matching video-parts/
// directory into assets/ and change this to new URL('./', import.meta.url).href.
export const mediaBaseUrl = 'https://johnofgordon7.github.io/paid-to-raid/dist/';
export const sourceRevision = '63a6f594f66c353b06d792c7aebbc670784b8e68';
