# Visual rebuild report — 2026-09-20

This replaces the earlier overly broad release-candidate claim. The user rejected that visual build; the entire Round 1 acceptance checklist is **not** declared complete.

## Implemented revision

- Continuous textured ground, irregular floating cliff silhouette, planted stone crossing, distant islands and water shimmer.
- Selected Kenney Nature/Castle models replace placeholder cover cubes and add arches, pillars, trees, rocks, flowers and grasses. Fixed external palette dependency and metallic foliage export settings. Repeated scenery is instanced.
- The default squad is built by the official 3D mixer with class-specific Beast, Reptile, Bird, Reptile, and Plant descriptors; idle, movement, and attack playback are retained with no generic-player fallback.
- Movement overlays only when relevant, hover path/endpoint and target information, damage text, shot traces, visible camera rotation/cancel controls.
- Movement locks commands until completion; enemy movement is animated; shortest paths use FIFO BFS; hidden enemy objects are excluded from picking.
- User-provided lobby/battle MP3s, crossfades, gesture unlock, volume preferences, hidden-tab pause/resume, synthesized action cues.
- Asset loading overlay with errors, retry canvas recreation correction, resource disposal, offline/system fonts (no runtime font CDN).

## Verification

- Strict TypeScript, ESLint and deterministic simulation tests are run with `npm run check`.
- Production bundle is generated with `npm run build`.
- Real Chrome/WebGL smoke: exact official GLB sources, path movement/AP 3→2, rapid-click command locking, player→enemy→player phase, help modal, battle music playback state, saved mute, 1280×720 and 1920×1080 captures; no console errors or failed assets in the passing run.
- Review screenshots: `artifacts/battle-1280x720.png`, `artifacts/path-preview-1280x720.png`, `artifacts/battle-1920x1080.png`.

## Not finished / not claimed

- **3D Chimeras:** missing intended GLB/FBX files. Official Origins portraits are disclosed temporary markers. No invented bodies substituted.
- **Reference fidelity:** richer than the rejected checkerboard, but still stylized low-poly, not the illustrated target's detailed art quality.
- **Rules:** cover still stored by cell rather than fully directional edges; fog dims terrain rather than fully hiding all decorative geometry; minimap viewport rectangle remains approximate.
- **Validation:** 60 FPS on representative hardware, subjective music levels, three complete human playthroughs, and repeated result-screen GPU leak measurements are not established by the smoke test.
- **Release:** public URL and music redistribution clearance remain external. The sealed Mixer pack makes the static output large; bundle-size warning remains. No public deployment performed.
