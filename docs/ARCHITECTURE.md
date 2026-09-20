# Architecture

The deterministic game model is authoritative. Picking and UI produce commands; `applyCommand` validates and clones state; renderers consume the result. Grid positions, AP, HP, cover, LOS, cooldowns, visibility, phase, and outcomes never live only in meshes or DOM nodes.

## Lifecycle

- `App` owns screen and match state.
- `BattleRenderer` owns one scene/canvas, camera input, presentation objects, and disposal.
- `AxieAvatarFactory` actively tries the pinned Mixer for Kibo, then uses the approved animated-GLB safety path. The `?glbOnly` query is a diagnostic fallback.
- Chimeras are original procedural meshes until approved final models exist.
- The minimap reads the same visibility map as the battlefield; unknown/explored enemy positions are omitted.

The build is fully static. Local genes avoid a server and prevent client-secret exposure. Future Axie-ID resolution must use a server-side proxy with origin and response-size controls.
