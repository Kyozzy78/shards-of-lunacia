# Round 1 requirements

Status vocabulary: `not-started`, `in-progress`, `blocked`, `implemented`, `verified`.

| ID | Requirement | Priority | Status |
|---|---|---:|---|
| GAME-001 | A complete deterministic 3-v-3 encounter supports move, attack, signature, guard, enemy phase, victory, defeat, and retry. | P0 | implemented |
| GAME-002 | Moving a selected Axie to a legal highlighted cell costs exactly 1 of 3 AP. | P0 | implemented |
| GAME-003 | Grid rules own occupancy, blockers, pathfinding, range, LOS, and edge-inspired half/full cover. | P0 | implemented |
| GAME-004 | AI always chooses a legal attack, legal move, or explicit pass without deadlock. | P0 | implemented |
| AXIE-001 | Kibo, Xia, and Bing use approved 3D assets with distinct tactical roles and one signature each. | P0 | implemented |
| AXIE-002 | Exact named GLBs are default per revised user direction; retain opt-in gene-built Mixer Guest with GLB fallback. | P0 | implemented |
| UI-001 | Lobby, squad intro, HUD, contextual tutorial, help, settings, results, retry, and menu flow are mouse accessible. | P0 | implemented |
| UI-002 | HUD displays phase, objective, selected unit, HP, AP, cooldown, legal action mode, and end turn. | P0 | implemented |
| TACT-001 | Visibility has unknown/explored/visible states and hidden enemies do not appear on the minimap. | P0 | implemented |
| TACT-002 | Minimap shows explored terrain, friendlies, visible enemies, viewport, and supports recentering. | P1 | implemented |
| ACCESS-001 | State uses labels, shape and color; offers volumes, reduced motion, help, and end-turn confirmation settings. | P0 | implemented |
| PERF-001 | Rendering caps DPR, clamps delta, uses a single canvas, and disposes owned resources. | P0 | implemented |
| SUBMIT-001 | Static production build, Vercel config, README, manifest, submission copy, and demo shot list exist. | P0 | implemented |
| AUDIO-001 | Integrate the user's local lobby/battle MP3s with gesture unlock, crossfades, saved volumes and hidden-tab pause; confirm rights before public redistribution. | P0 | verified locally |
| ART-002 | Replace permanent checkerboard and placeholder blocks with a continuous Lunacian landscape dressed with the supplied asset resources. | P0 | implemented |
| ART-003 | Use the user's intended actual 3D Chimera models, not invented replacement bodies. | P0 | blocked — GLB/FBX files missing; disclosed official portrait interim |
