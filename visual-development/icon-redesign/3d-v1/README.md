# Abyss Corp — animated 3D icon collection v1

48 original 3D mesh assets corresponding to the 48 approved raster proposals in `../v1/`. This is a separate local review collection. Production icons, the 2D game, the immersive prototype, saves and database bindings have not been replaced or changed.

## View

Serve the repository root with `python3 -m http.server 5173 --bind 127.0.0.1`, or use the existing prototype Vite server on 5174.

- Gallery: <http://127.0.0.1:5173/visual-development/icon-redesign/3d-v1/index.html>
- Overview mode: `index.html?sheet` (intended for a 1920 × 1540 view)
- Direct model link: `index.html#mining`, or any catalog ID

The page loads the actual exported GLBs, not the procedural builders. One shared WebGL canvas renders only visible gallery cells; the inspector uses a second canvas. There is no 48-context limit problem. Pause all motion, filter/search, hide/show reference thumbnails, inspect any model, orbit/zoom, pause/restart/scrub its action, adjust speed and download it. Escape closes the viewer; left/right switch models. Reduced-motion preferences pause animations initially. Touch orbit/zoom is provided by OrbitControls.

## Assets

`models/<id>.glb` contains real volume, geometry on all sides, PBR materials and one embedded, looping glTF transform animation. There are no PNG planes pretending to be models. Each icon has a deliberately distinct motion; the description and duration are in `catalog.json`. Mechanisms have actual separate moving nodes (drill, propeller, shutter, shackle, lens, hinge, crank, plates, bars, tiles, etc.).

These are editable procedural model studies, not automatic photogrammetry or exact reconstructions of the generated pictures. Silhouettes, cream/gold/teal/turquoise materials and details are adapted from those pictures. Provider shapes derive from the existing source SVGs where appropriate, while retaining recognizable colors and simple relief construction. `geometry.js` and `models.js` are the editable modeling source. No runtime network service, generated-image API or external CDN is needed.

The GLBs are self-contained and can be imported into Blender, Three.js or another glTF-compatible editor. Animation is baked at 24 samples/second using position, quaternion and scale channels. Glass uses opaque stylized lenses or a restrained alpha pane; no physically simulated water/glass, simulation rig or skeletal rig is implied. Lighting and contact shadows belong to the preview, not the exported asset.

`abyss-icons-3d-v1.zip` contains all 48 GLBs, catalog and this readme.

## Rebuild and verify

Requires the existing repository Node dependencies (`jsdom`). Three.js 0.180.0 is vendored locally with its MIT license; no production dependency or lockfile was changed.

From the repository root:

```sh
node --experimental-loader ./visual-development/icon-redesign/3d-v1/three-loader.mjs visual-development/icon-redesign/3d-v1/build-models.mjs
```

The builder exports every asset, loads the binary again with GLTFLoader, checks for exactly one action, samples animated world transforms and bounds, rejects non-finite values and checks the loop seam. It writes `catalog.json` with bounds/statistics and `qa.json` with results. A failure exits nonzero. Browser QA additionally checks the actual rendered collection, inspector, filtering, playback, downloads and responsive layout.

Gallery-only edits do not require rebuilding models. After model changes, rerun the builder and refresh the gallery. The ZIP is a convenience snapshot and must be refreshed after rebuilding.
