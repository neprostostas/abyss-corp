# Shallows v10 — separate visual-development scene

Authoritative reference: ../style-reference.png. This remains a 3D approximation, not a claim of an exact reproduction. No game code, deployment, push or integration is part of this iteration.

Open http://127.0.0.1:5173/visual-development/og-style/3d/shallows-level-01-v10/viewer.html

From repository root, start a local server if needed:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

The viewer is self-contained. Three.js 0.180.0 and its helpers are in vendor/, with their MIT license. No CDN connection is required.

## Proportions and layout

- Island terrain is 25% wider in X and 35% deeper in Y than v9. Broad, irregular cliff columns replace the rounded small boulders. Sand is a gently undulating mesh, not a flat polygon.
- Warehouse is 43% wider, 38% deeper and 12% taller than v9. It is the broadest building, with a curved overhanging roof and a real doorway around the strapped crate.
- Refinery stays tallest. Its outlet remains visibly connected, with an approximately 0.89-unit horizontal gap before the warehouse's foundation.
- Drill is 8% broader and 4% taller, with its feet aligned to the sand and concentric seams around its conical bit.
- Submarine is larger and floats below the deck, forward of the island. The propeller shaft, open annular duct, six radial blades, two lamps and three fins are real geometry.
- dimensions.json records evaluated world bounds, including modifiers. Island bounds include its plants; refinery bounds include the pipe.

## Materials, lighting and verification

- Standard PBR fallback values are exported to GLB. Unsupported Blender procedural node connections are temporarily disconnected during export and restored for the saved Blender scene and offline render. This avoids white emissive sand/seabed.
- Browser uses an orthographic camera, a warm top light, softer shadow intensity, subdued blue environment rocks, and a stylized coated turquoise-glass shader.
- Browser water uses 32 depth-limited world-space ray integration steps, chromatic extinction, and approximate overhead illumination fields. It does not include volumetric shadow-map occlusion or physically refracted caustics.
- Browser caustics are animated surface shading. Blender uses separate procedural caustic illumination and a participating water volume. These two renderers are not pixel-identical.
- Compare button displays the original reference while retaining the interactive 3D scene. Save Frame exports the actual WebGL canvas with the water pass.
- Browser loading, shader compilation, auto-rotation and camera reset were visually checked. Six GLB containers and measured asset bounds were checked. No game tests were needed for isolated visual files.

## Rebuild

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python visual-development/og-style/3d/generate_shallows_v10.py
```

This writes the editable .blend, assembly scene.glb, five centered asset GLBs, dimensions.json, full scene preview.png and submarine-detail.png. Set ABYSS_DRAFT=1 for 65% resolution and fewer render samples.

Remaining art-direction differences include the cliff's facet arrangement, leaf silhouettes, painted surface variation, exact glass highlights and the reference's soft underwater light. The generated additional reference views are interpretative and were not treated as geometry truth.
