# Local immersive 3D prototype

Run `npx vite --config prototype-3d/vite.config.ts` from repository root.
Open http://127.0.0.1:5174/prototype-3d/index.html

app.tsx owns a dedicated 3D interface and uses the existing GameSession, domain, upgrade offers, production configuration, hints, unlock rules and validated version-8 save format. It no longer mounts the 2D GameScreen. Production theme/fonts/icons and detailed service panel contents are reused; their placement and world interaction are redesigned. See DESIGN.md for implemented rules and remaining migration work.

WorldScene.tsx bridges state, ray-cast model selection and projected world-space anchors through a same-origin/source-checked postMessage channel. Scene scripts are served separately from prototype-3d/public. The production build includes both entries. The v10 GLB is bundled under /prototype-3d-scene/scene.glb.

Saves stay under abyss-corp.prototype3d.*; production 2D guest and cloud saves are not accessed. Account synchronization and live leaderboard support remain pending. Published separately at /prototype-3d/index.html; account synchronization remains pending.

Controls: drag to orbit; two fingers to pan/zoom; WASD/arrows to move camera; Q/E rotate; +/- zoom; R reset. Touch arrows appear on coarse-pointer devices. The submarine follows the production route rather than free piloting.

Checks: prototype TypeScript, 21 targeted gameplay/save-isolation tests, browser model selection, anchored equipment card, service drawer visibility and switching. Physical phone performance remains unverified.

Generated raster icons (2026-10-29): the prototype supplies an icon context for UI, brand, machine portraits, resources and provider badges. The 2D entry also uses the generated raster pack. All 48 approved icons have transparent 64/128/256 px WebP derivatives; `srcset` selects a size for the display. Rebuild with `python3 prototype-3d/optimize-icons.py` (Pillow required). The source PNGs remain in the review gallery. Originals total 41,132,932 bytes; the complete 64 px set is 108,584 bytes, 128 px is 224,628 bytes, and 256 px is 495,354 bytes. Only used images are requested.

Scene optimization preserves geometry, 2048 px shadows, full rendering resolution, 4× scene MSAA and the existing volumetric water shader. Shared material/program variants and static geometry batches remove 196 mesh submissions from the scene. Interactive equipment remains separate. Camera updates happen once per frame; bounds are cached, hover raycasts are throttled, unchanged anchor messages are skipped, and hidden tabs stop rendering. Submarine travel interpolates the 100 ms simulation snapshots, without changing gameplay timing. The GLB is preloaded alongside scripts. Removed the unused hidden reference-image request and limited Vite dependency scanning to each app's entry, excluding reference galleries.

Verification: root and prototype typechecks; lint on changed shared UI modules; 21 gameplay/save tests and 3 icon asset/isolation tests (`node --import tsx --test prototype-3d/icons.test.tsx`). Desktop and 390×844 browser checks: no missing icons, working research/missions drawers and direct model selection. A 120-frame movement sample contained 116 distinct submarine positions over 2,188 ms at a 1162×889 CSS viewport / DPR 2. This is a local smoke measurement, not a controlled before/after FPS benchmark. Physical-device GPU performance still needs testing. Review sources, earlier scenes and generated GLBs are deliberately retained: they are not requested by this prototype and deleting them would not speed up rendering.
