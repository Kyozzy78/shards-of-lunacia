# Traceability

| Requirement | Design module | Implementation | Test | Status |
|---|---|---|---|---|
| GAME-001/002 | command model | `src/game/engine.ts`, `src/app.ts` | AT-001/002 | implemented |
| GAME-003 | grid authority | `src/game/grid.ts` | AT-003, unit suite | implemented |
| GAME-004 | scored deterministic AI | `chooseEnemyAction` | AI legality unit tests | implemented |
| AXIE-001/002 | avatar boundary | `src/integrations/axie/*` | AT-005 | implemented |
| UI-001/002 | screen coordinator | `src/app.ts`, `src/styles/main.css` | AT-006 | implemented |
| TACT-001/002 | visibility/minimap | `recalculateVisibility`, `drawMinimap` | AT-004 | implemented |
| ACCESS-001 | input/settings | `src/app.ts`, CSS reduced-motion query | AT-007 | implemented |
| PERF-001 | presentation lifecycle | `BattleRenderer.ts` | AT-008 | verified |
| SUBMIT-001 | release files | README, docs, Vercel config | AT-008 | verified locally; deployment external |
| AUDIO-001 | local user-supplied music | `src/audio/AudioManager.ts`, App settings | browser playback-state/mute smoke | verified locally; public rights pending |
| ART-002 | continuous planted terrain / imported scenery | `LunacianEnvironment.ts`, `BattleRenderer.ts` | browser screenshots / asset request audit | implemented |
| ART-003 | actual Chimera 3D content | temporary official portrait adapter | resource-tree audit | blocked: missing intended 3D files |
