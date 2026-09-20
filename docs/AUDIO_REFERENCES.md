# Audio integration — 2026-09-20

The user added two local MP3s and explicitly requested their use:

- `music/AXIE infinity Music OST  Axie Infinity Philippines  Axie Theme Song.mp3` → `public/assets/audio/lobby.mp3`
- `music/Axie Infinity - Arena Theme Song.mp3` → `public/assets/audio/battle.mp3`

No YouTube download, rip, or transcode was performed. These are user-provided local copies. Confirm permission for public deployment/redistribution; filenames alone do not establish rights.

`src/audio/AudioManager.ts` starts audio after a real pointer/key gesture, loops the appropriate track, crossfades lobby/battle/result states, saves music/SFX volumes via App settings, pauses when hidden, resumes when visible, and handles missing/rejected playback without stopping the game. Results use quieter lobby music. Short project-authored oscillator cues provide select/move/attack/guard feedback. Existing saved mute preferences are respected; fresh profiles default to 35% music.

Browser smoke verifies battle playback starts without an audio error and the mute preference persists. This is a playback-state check, not subjective listening QA. Public music clearance is still external.
