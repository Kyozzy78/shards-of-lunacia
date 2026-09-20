# Asset manifest

Re-audited 2026-09-20 for the requested visual rebuild. This supersedes the earlier report that Origins was private or that no music was present.

| Asset | Source / owner / version | Permission and distribution | Local use |
|---|---|---|---|
| Kibo, Xia, Bing GLBs and previews | [Axie 3D assets](https://github.com/jaatster/axie-3d-assets), Sky Mavis/jaatster, commit `4eec7d9ccb1d0c962afc110e7be35d44e3d6356b` | Limited Vibeathon/approved-program use, not an open asset pack; retain source notices; do not distribute standalone | `public/assets/characters/`, `public/assets/portraits/`; exact named models, normalized scale, animation adapter; default squad |
| Mixer 3D | [Mixer repository](https://github.com/jaatster/threejs-axie-mixer3d-public), commit `812f0ee47066661f3b3d84a346d6a82f4758e1c0` | Limited event/approved use; sealed pack is bundled only for this project | Default runtime roster: class-specific Beast, Reptile, Bird, Reptile, and Plant Axies assembled from official mixer descriptors |
| Nature Kit | [Kenney Nature Kit](https://kenney.nl/assets/nature-kit), Kenney, v1.0 | CC0, attribution optional, public project redistribution permitted | Trees, grass, flowers, bushes, rocks, log GLBs under `public/assets/environment/`; materials adjusted from metallic to dielectric, scale/color adjustments, runtime instancing |
| Castle Kit | [Kenney Castle Kit](https://kenney.nl/assets/castle-kit), Kenney, v2.0 | CC0, attribution optional, public project redistribution permitted | Ruined walls, pillars, arches, banner, palette texture; CC0 licenses included beside assets |
| Chimera portraits / reference atlases | [Official Origins asset kit](https://github.com/axieinfinity/axie-origins-asset-kit), Sky Mavis, commit `069a59b772e54633d04a3d9d12ecde73b3e4be5d` | Organizer-owned Vibeathon resource; not open source; selected first-party PNGs only; LICENSE.md retained; no Spine runtime or third-party Toon FX imported | `public/assets/chimeras/`; Treant→Brute, Gray Wolf→Hunter, Aquatic Slime→Spitter. Portrait sprites are explicitly TEMPORARY, not 3D models. Atlases retained for reference, not assembled into invented bodies |
| Lobby and battle MP3s | User's `music/` folder | User requested local integration. No download/rip from YouTube. Public redistribution clearance still needs confirmation; do not treat filenames as proof of license | Copied as `public/assets/audio/lobby.mp3` and `battle.mp3`; local playback, crossfades, saved volumes, visibility pause |
| Lobby vista | Previously generated project image | Project-generated background, no invented character models used | `public/assets/art/lunacia-lobby.png` |
| Terrain, crystals, path overlays, combat lines | Project Three.js code | Project code | `LunacianEnvironment.ts`, `BattleRenderer.ts`; code-native surface texture and island geometry |

The exact imported Kenney license texts are `LICENSE-Nature.txt` and `LICENSE-Castle.txt`. Do not use Kenney's logo or imply endorsement.

See [resource audit](RESOURCE_AUDIT.md) for every supplied URL and its actual role. Missing 3D Chimera files remain a genuine external input, not a completed requirement.
