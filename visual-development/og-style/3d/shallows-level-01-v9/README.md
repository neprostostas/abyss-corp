# Shallows v9 — visual study, not integrated into the game

Open `viewer.html` through the repository's local HTTP server. All Three.js 0.180.0 dependencies are vendored; the viewer does not require a CDN connection. MIT license is in vendor/.

From repository root:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Viewer: http://127.0.0.1:5173/visual-development/og-style/3d/shallows-level-01-v9/viewer.html

Rebuild editable Blender scene, assembly GLB, five asset GLBs and two offline renders:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python visual-development/og-style/3d/generate_shallows_v9.py
```

## Changes verified during development

- Applied bevel/weighted-normal modifiers in GLB export. Earlier browser exports lost the soft edges.
- Deeper, irregular island and separate cliff boulder columns.
- Closed, tapered plant branches and branching coral clusters.
- Annular propeller duct with thickness and an open center; connected shaft retained.
- Connected refinery outlet retained.
- Three.js viewer with orbit controls, shadows, a top key light, environment reflections, depth-limited water integration, particles and animated world-position caustic shading.
- Blender offline render has a participating water volume. It is intentionally excluded from GLB.

## Remaining differences from the original reference

This is still an approximation. Rock topology, plant silhouettes, painted surface detail, building proportions and the submarine's fin/window proportions need further art direction. Browser water uses 32 integration steps along world-space camera rays, terminated by the rendered depth buffer, with wavelength-dependent extinction and an approximate overhead scattering field. It does not sample shadow maps for volumetric occlusion. Caustics are procedural surface shading rather than refracted light. Blender procedural sand/seabed shaders do not survive glTF; the viewer supplies a separate seabed material. Five asset exports are centered on their own XY origins, not the assembly origin. No game integration, publication or push was performed.
