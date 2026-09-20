# Supplied-resource audit — 2026-09-20

Every supplied resource was reviewed. Using a resource appropriately does not mean bundling an incompatible engine or every asset in a repository.

| User-provided resource | Result / use |
|---|---|
| https://kenney.nl/assets/page:4 | Reviewed catalog; followed to Nature Kit and Castle Kit. Imported selected CC0 GLBs, preserved palette dependencies/licenses. |
| https://blog.axieinfinity.com/p/the-complete-axie-infinity-link-directory | Official ecosystem/resource index reviewed for provenance. Not a 3D model archive. |
| https://skymavis.notion.site/Builder-Resource-Kit-39ec48ae3fdd81449b68d1c361d319a5 | Direct browser retrieval failed; contents not assumed. Followed the independently supplied public repositories instead. |
| https://github.com/rondorkerin/gamestack | Design/workflow reference; not a source of Axie/Chimera GLBs. Existing typed model kept. |
| https://github.com/xt4d/GameBlocks | Browser 3D building-block reference. Did not replace the working Vite/Three simulation or add another engine. |
| https://github.com/jaatster/threejs-axie-mixer3d-public | Pinned official mixer content is bundled and used at runtime for five class-specific player Axies: Beast, Reptile, Bird, Reptile, and Plant. |
| https://github.com/axieinfinity/unity-axie-gtk2d | Official Unity/2D integration reference, not directly importable into this Three.js 3D runtime. No Unity runtime or Spine license assumptions. |
| https://app.axieinfinity.com/lunalog/catalog/ | Catalog reference; client-rendered page did not expose complete metadata to retrieval. No unverified official class/loadout claims added. |
| https://axieinfinity.com/lore | Lunacian tone/environment reference, not an asset download or permission grant. |
| https://github.com/axieinfinity/axie-origins-asset-kit | Public repository verified; inspected recursive tree and LICENSE.md. First-party official Chimera portraits imported. Bodies are Spine .skel/.atlas/.png (some .json), not GLB/FBX. |
| https://github.com/jaatster/axie-3d-assets | Reviewed named mascot GLBs and previews as a provenance/animation reference. The current player roster uses the class-specific official mixer instead. No Chimera GLB/FBX found in the audited assets. |

## Visual-reference interpretation

The supplied images guide the pale ruins, cyan crystals, planted paths, floating-island silhouette, navy HUD, and tactical overlays. The current Kenney scene is stylized low-poly and does **not** match the illustration's material/detail fidelity. The logical grid remains 14×10; there is no permanent physical checkerboard. Camera motion, animated Axies, animated enemy movement, water shimmer and combat feedback make the scene responsive. Terrain is handcrafted/seeded decoration, not a new random tactical map on every launch.

## Missing external input

The user referred to previously discussed 3D Chimera models, but no matching files were found locally or in the linked model repositories. A file/folder location or GLB/FBX upload was requested. Current enemies use clearly disclosed official portrait markers, not fabricated 3D creatures. This requirement remains blocked until those assets are available.
