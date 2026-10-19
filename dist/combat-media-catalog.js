// Byte-exact winning native films. SHA-256 pins are checked before playback.
export default {
  "version": 1,
  "partSizeBytes": 4194304,
  "videos": {
    "./assets/call-of-booty-extraction-five.mp4": {
      "type": "chunks",
      "manifest": "./assets/video-parts/extraction-five/manifest.json",
      "bytes": 42997236,
      "sha256": "e3739bbd91ff09a42ae6549b82f17a2ced9da39bc82ed991ae854b9612d12f6f"
    },
    "./assets/call-of-booty-extraction-max.mp4": {
      "type": "chunks",
      "manifest": "./assets/video-parts/extraction-max/manifest.json",
      "bytes": 43572023,
      "sha256": "f8557534dd9e22b6e1654527e0ea9d6699f6c44db8a67a6f5d635db7f3a7403e"
    }
  }
};
