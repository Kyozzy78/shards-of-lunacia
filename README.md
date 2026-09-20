# Shards of Lunacia

**Your Axies. Your Strategy.** A browser-based, single-player 3D tactical encounter built for Axie Vibeathon 2026 Round 1.

## Play locally

Requirements: Node `20.19+` or `22.12+`, npm, desktop Chrome/Chromium with WebGL2.

```bash
npm install
npm run test:content
npm run dev
```

Open `http://127.0.0.1:5173`. In this Windows workspace you can also double-click `Play-Shards.cmd`, which uses the included compatible Node toolchain. Keep its terminal open while playing.

`npm install` copies the official 3D mixer content required by the runtime. The default five-Axie squad is built as Beast, Reptile, Bird, Reptile, and Plant. The campaign screen renders live animated 3D previews of those same Axies; attacks briefly push the camera toward the acting Axie and its target.

## Commands

```bash
npm run dev        # development server
npm run check      # strict TypeScript, ESLint, deterministic tests
npm run build      # static production bundle in dist/
npm run preview    # serve the production bundle
```

## Controls

- Left click an Axie, portrait, highlighted tile, ability, or legal target.
- Right click or `Escape` cancels targeting.
- `WASD` pans; mouse wheel zooms; `Q`/`E` rotates.
- `1`–`5` selects a squad member; `Space` centers it; `Enter` opens the in-game end-turn confirmation; `H` or `?` opens help.

Everything required to finish the match is available through mouse UI. See [How to Play](docs/HOW_TO_PLAY.md).

## Architecture

Validated commands update a deterministic TypeScript model. Three.js presents state; DOM HUD, minimap, tutorial, settings, and in-game confirmations send commands but do not own combat rules. The default character adapter uses the official 3D mixer. `LunacianEnvironment` loads and instances scenery; `AudioManager` handles supplied local music and action cues. See [rebuild report](docs/RELEASE_REPORT.md).

## Assets

Official Axie files have limited Vibeathon use rights and are not a general-purpose open pack. The Mixer runtime is pinned to commit `812f0ee47066661f3b3d84a346d6a82f4758e1c0`; mascot GLBs are pinned to `4eec7d9ccb1d0c962afc110e7be35d44e3d6356b`. See [Asset Manifest](docs/ASSET_MANIFEST.md).

Selected CC0 models from [Kenney](https://kenney.nl/assets) are now bundled and used. See [all supplied resources and remaining gaps](docs/RESOURCE_AUDIT.md). Enemies temporarily use official Chimera portrait markers; the requested 3D Chimera files have not been located. This is not yet the illustrated reference's final fidelity.

The user-supplied MP3s are integrated locally but intentionally excluded from Git so their redistribution rights remain under the owner's control. Audio starts after interaction; Settings controls music and SFX. The checked-in combat/guard sounds come from the official Origins builder kit and remain subject to its Axie Vibeathon/approved-program terms.

## Production and Vercel

```bash
npm run check
npm run build
npm run preview
npx vercel --prod
```

`vercel.json` provides the static SPA fallback. No API key, account, wallet, or backend is required. Never expose a Sky Mavis key in `VITE_*`; ID lookup belongs on a server. The Round 1 build uses local genes.
