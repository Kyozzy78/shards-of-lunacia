# Test plan

## Automated

`npm run check` runs strict TypeScript, ESLint, and Vitest. Coverage targets conversion/keying, occupancy, paths, reachability, AP overspend, phase refresh, range, target legality, LOS, cover, damage/defeat, cooldowns, visibility, deterministic AI, and encounter outcomes. `npm run build` verifies the production bundle.

## Browser matrix

Test Chrome/Chromium at 1280×720 and 1920×1080, high and reduced-motion settings, first/cached load, mouse-only, shortcuts, rapid selection, end-turn confirmation, blockers/corners, hide/reveal/hide, victory/defeat, three retries, background/restore, mute, and missing optional Mixer/audio content. Inspect console and network in the built preview.

P0 release requires no progression blocker, no hidden-enemy minimap leak, and no major console error. Warnings caused by a deliberately absent Mixer pack are accepted only when GLB fallback succeeds.
