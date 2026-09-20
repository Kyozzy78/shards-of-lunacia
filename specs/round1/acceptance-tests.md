# Acceptance tests

| ID | Requirements | Test | Type | Status |
|---|---|---|---|---|
| AT-001 | GAME-002 | Select Kibo, click reachable cell, observe motion and AP 3→2. | browser | implemented |
| AT-002 | GAME-001, GAME-004 | Complete three deterministic encounters through both phase types with no stuck action. | automated | verified |
| AT-003 | GAME-003 | Blocked and occupied cells never appear in paths; range and LOS reject illegal targets. | automated | implemented |
| AT-004 | TACT-001 | Enemy disappears from world/minimap when explored but not currently visible. | automated/manual | implemented |
| AT-005 | AXIE-001, AXIE-002 | Kibo loads by Mixer where content exists; official GLB fallback loads/animates all three. | browser | verified (1280×720 smoke) |
| AT-006 | UI-001, UI-002 | Mouse-only player can start, act, finish, retry, and return to menu. | browser | partially verified; complete-match manual pass remains |
| AT-007 | ACCESS-001 | Help, settings, reduced motion, and confirmation preference persist. | browser | implemented |
| AT-008 | PERF-001, SUBMIT-001 | `npm run check`, `npm run build`, and production preview succeed. | automated/browser | verified |
