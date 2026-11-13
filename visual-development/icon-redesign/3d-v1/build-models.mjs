import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { GLTFExporter } from './vendor/GLTFExporter.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { T } from './geometry.js';
import { catalog, prepare, createAsset } from './models.js';
const base = new URL('./', import.meta.url);
globalThis.DOMParser = new JSDOM('').window.DOMParser;
// GLTFExporter only needs binary Blob reading: assets contain no raster textures.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = b;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;
      this.onloadend?.();
    });
  }
};
await prepare((url) => readFile(new URL(url, base), 'utf8'));
await mkdir(new URL('models/', base), { recursive: true });
const output = [],
  errors = [];
const exporter = new GLTFExporter();
for (const entry of catalog) {
  try {
    const { root, clip } = createAsset(entry.id);
    const data = await exporter.parseAsync(root, {
      binary: true,
      animations: [clip],
      onlyVisible: true,
    });
    const path = new URL(entry.model, base);
    await writeFile(path, Buffer.from(data));
    // Round-trip every file through the same standard glTF loader used by the gallery.
    const gltf = await new GLTFLoader().parseAsync(data, '');
    let meshes = 0,
      triangles = 0;
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        triangles +=
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
      }
    });
    if (gltf.animations.length !== 1)
      throw Error('Expected one embedded action');
    const mixer = new T.AnimationMixer(gltf.scene);
    mixer.clipAction(gltf.animations[0]).play();
    const initial = new Map();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => initial.set(o.uuid, o.matrixWorld.toArray()));
    let changed = false;
    const maxBounds = new T.Box3();
    for (let i = 0; i <= 32; i++) {
      mixer.setTime((clip.duration * i) / 32);
      gltf.scene.updateMatrixWorld(true);
      maxBounds.union(new T.Box3().setFromObject(gltf.scene));
      gltf.scene.traverse((o) => {
        const m = o.matrixWorld.toArray();
        if (m.some((v, j) => !Number.isFinite(v)))
          throw Error('Non-finite transform');
        if (m.some((v, j) => Math.abs(v - initial.get(o.uuid)[j]) > 1e-5))
          changed = true;
      });
    }
    if (!changed) throw Error('Exported animation does not move geometry');
    const a = gltf.animations[0];
    mixer.setTime(0);
    gltf.scene.updateMatrixWorld(true);
    const first = [];
    gltf.scene.traverse((o) => first.push(...o.matrixWorld.toArray()));
    // Inspect final keyframe before LoopRepeat wraps.
    mixer.stopAllAction();
    const action = mixer.clipAction(a);
    action.setLoop(T.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.setTime(a.duration);
    gltf.scene.updateMatrixWorld(true);
    const last = [];
    gltf.scene.traverse((o) => last.push(...o.matrixWorld.toArray()));
    const loopError = Math.max(...first.map((v, i) => Math.abs(v - last[i])));
    const info = {
      ...entry,
      duration: clip.duration,
      tracks: a.tracks.length,
      meshes,
      triangles: Math.round(triangles),
      bytes: data.byteLength,
      animatedBounds: {
        min: maxBounds.min.toArray(),
        max: maxBounds.max.toArray(),
      },
      loopError,
    };
    if (loopError > 0.001)
      errors.push({ id: entry.id, issue: 'Loop seam', loopError });
    output.push(info);
    console.log(
      `${String(entry.index).padStart(2, '0')} ${entry.id}: ${meshes} meshes, ${a.tracks.length} tracks, ${Math.round(data.byteLength / 1024)} KB`,
    );
  } catch (e) {
    errors.push({ id: entry.id, issue: e.message });
    console.error(entry.id, e);
  }
}
await writeFile(
  new URL('catalog.json', base),
  JSON.stringify(output, null, 2) + '\n',
);
await writeFile(
  new URL('qa.json', base),
  JSON.stringify(
    {
      generated: output.length,
      expected: 48,
      roundTripLoaded: output.length,
      animated: output.length,
      errors,
    },
    null,
    2,
  ) + '\n',
);
if (errors.length) {
  console.error(errors);
  process.exitCode = 1;
} else console.log('PASS: 48 animated GLBs exported and round-trip verified.');
