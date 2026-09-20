# Submission draft

## Shards of Lunacia — Your Axies. Your Strategy.

Command Kibo, Xia, and Bing across a shattered floating ruin in a focused 3D turn-based battle. Read the grid, exploit cover and sight lines, pierce the fog, and combine three distinct Axie roles to repel a Brute, Hunter, and Spitter.

**Platform:** desktop Chrome/Chromium, keyboard + mouse or mouse-only. **Access:** public static URL; no account, wallet, extension, backend, or region-specific setup. **Length:** approximately 5–10 minutes.

Controls are listed in `docs/HOW_TO_PLAY.md` and in-game. Public playable URL, repository URL, and demo-video URL are placeholders until deployment.

### Axie Core

The build uses approved animated Kibo, Xia, and Bing assets, actively integrates the pinned Three.js Mixer 3D alpha, and translates Axie identity into defender, striker, and ranged-scout decisions. Local genes prove a configurable future path; Round 2 expands to owned-Axie squad building without making a wallet a Round 1 gate.

### 60–90 second demo shot list

- 0:00 title, tagline, immediate Play, no-wallet note
- 0:08 three role cards and signatures
- 0:18 select Kibo, movement highlights, click destination, AP 3→2
- 0:30 Bing attacks through a long lane; cover/LOS tip
- 0:42 enemy phase: Brute advances, Hunter flanks, Spitter fires
- 0:55 Xia signature plus Kibo guard
- 1:08 fog/minimap agreement and camera rotate
- 1:18 final hit, result stats, Retry/Menu

Thumbnail: 16:9, title-safe center, readable Axie squad silhouettes against cyan crystals and pale ruins. Do not use unapproved marks.

### Known limitations

Procedural original Chimera meshes replace final approved models; music is intentionally silent pending cleared tracks; Mixer content must be copied during setup because redistribution as a standalone pack is forbidden.

### AI tools used

OpenAI Codex assisted engineering, specifications, testing, and documentation. OpenAI ImageGen produced the original environment-only lobby background under human-directed constraints. No generated asset imitates or replaces an official Axie character.

### Final verification

- [ ] Public HTTPS URL
- [ ] `npm run check`
- [ ] `npm run build`
- [ ] Built preview at 1280×720 and 1920×1080
- [ ] Mouse-only victory and defeat
- [ ] Three clean retries
- [ ] Console/network audit
- [ ] Mixer integrity verification
