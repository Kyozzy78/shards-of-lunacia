# Technical design

`input → validated command → pure-ish cloned GameState → domain event list → Three.js + DOM presentation`

- `src/game`: coordinates, pathfinding, LOS, visibility, data, legal commands, phases, AI.
- `src/rendering`: Three.js arena, picking, camera, procedural Chimeras, indicators.
- `src/integrations/axie`: avatar contract, Mixer 3D active path, official GLB fallback, animation aliases, disposal.
- `src/app.ts`: screen coordinator, HUD view, tutorial, minimap, settings, input binding.

State uses serializable values except `Set`/`Map` collections that are explicitly cloned. The renderer never determines legal movement or damage. Mixer content is copied at setup rather than bundled into Git, preserving its integrity manifest and rights boundary.
