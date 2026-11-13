import * as T from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

// Reusable geometry and materials keep the extra feedback inexpensive.
export function createExperience({ scene, assets, sun }) {
  const gold = new T.MeshStandardMaterial({
    color: '#eeb747',
    roughness: 0.45,
  });
  const teal = new T.MeshStandardMaterial({ color: '#176573', roughness: 0.6 });
  const crystal = new T.MeshStandardMaterial({
    color: '#58e5dd',
    emissive: '#137b84',
    emissiveIntensity: 0.3,
    roughness: 0.3,
  });
  const box = new T.BoxGeometry(1, 1, 1),
    gem = new T.OctahedronGeometry(0.18);
  const additions = {},
    pulses = new Map();
  let previous = null,
    depth = 'shallows';
  function mesh(parent, geometry, material, position, scale) {
    const m = new T.Mesh(geometry, material);
    m.position.set(...position);
    m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  for (const [id, asset] of Object.entries(assets)) {
    const bounds = new T.Box3().setFromObject(asset);
    const width = bounds.max.x - bounds.min.x,
      height = bounds.max.y - bounds.min.y;
    const group = new T.Group();
    asset.add(group);
    additions[id] = [];
    for (let tier = 0; tier < 4; tier++) {
      const part = new T.Group();
      group.add(part);
      part.visible = false;
      if (id === 'storage') {
        mesh(
          part,
          box,
          gold,
          [((tier % 2) - 0.5) * 0.65, 0.25 + Math.floor(tier / 2) * 0.5, 0.8],
          [0.5, 0.45, 0.5],
        );
        mesh(
          part,
          box,
          teal,
          [((tier % 2) - 0.5) * 0.65, 0.25 + Math.floor(tier / 2) * 0.5, 0.8],
          [0.1, 0.48, 0.53],
        );
      } else if (id === 'mining') {
        mesh(
          part,
          box,
          teal,
          [(tier - 1.5) * 0.25, height + 0.08, 0],
          [0.14, 0.18, 0.65],
        );
      } else if (id === 'transport') {
        mesh(
          part,
          new T.CylinderGeometry(0.12, 0.12, 0.5, 12),
          gold,
          [(tier - 1.5) * 0.3, height * 0.55, 0.7],
          [1, 1, 1],
        );
      } else {
        mesh(
          part,
          new T.TorusGeometry(width * 0.34, 0.045, 6, 24),
          gold,
          [0, height * (0.25 + tier * 0.17), 0],
          [1, 1, 1],
        ).rotation.x = Math.PI / 2;
      }
      additions[id].push(part);
    }
  }
  const cargo = new T.Group();
  assets.transport.add(cargo);
  for (let i = 0; i < 3; i++)
    mesh(cargo, gem, crystal, [(i - 1) * 0.25, 0.9, 0.2], [1, 1, 1]);
  const stock = new T.Group();
  assets.storage.add(stock);
  for (let i = 0; i < 6; i++)
    mesh(
      stock,
      box,
      gold,
      [((i % 3) - 1) * 0.3, 0.12 + Math.floor(i / 3) * 0.25, 1],
      [0.23, 0.22, 0.25],
    );
  const trench = new T.Group();
  scene.add(trench);
  trench.visible = false;
  const rock = new T.MeshStandardMaterial({
    color: '#173445',
    roughness: 0.95,
  });
  const rockGeo = new T.DodecahedronGeometry(1, 0);
  for (let side of [-1, 1])
    for (let i = 0; i < 9; i++) {
      mesh(
        trench,
        rockGeo,
        rock,
        [side * (6.5 + Math.sin(i) * 0.4), -1.8 + (i % 3) * 0.5, -7 + i * 1.3],
        [1.1, 2 + (i % 3) * 0.8, 1],
      );
      mesh(
        trench,
        gem,
        gold,
        [side * 5.8, -0.3 + (i % 3) * 0.3, -7 + i * 1.3],
        [1.4, 2, 1.4],
      );
    }
  // The trench never moves: retain every vertex, submit just two material batches.
  for (const material of [rock, gold]) {
    const parts = trench.children.filter((part) => part.material === material);
    const geometries = parts.map((part) => {
      part.updateMatrix();
      return part.geometry.clone().applyMatrix4(part.matrix);
    });
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((item) => item.dispose());
    if (geometry) {
      parts.forEach((part) => trench.remove(part));
      const batch = new T.Mesh(geometry, material);
      batch.castShadow = batch.receiveShadow = true;
      batch.updateMatrix();
      batch.matrixAutoUpdate = false;
      trench.add(batch);
    }
  }
  const burst = new T.Group();
  scene.add(burst);
  burst.visible = false;
  for (let i = 0; i < 12; i++)
    mesh(burst, gem, gold, [0, 0, 0], [0.35, 0.35, 0.35]);
  let burstTime = 0;
  for (const [id, asset] of Object.entries(assets))
    asset.traverse((object) => {
      object.userData.asset = id;
    });
  function react(id) {
    if (assets[id]) pulses.set(id, performance.now());
  }
  function update(next) {
    const switched = next.depth !== depth;
    if (switched) {
      pulses.clear();
      burst.visible = false;
      Object.values(assets).forEach((asset) => asset.scale.setScalar(1));
    }
    depth = next.depth;
    trench.visible = depth === 'golden-trench';
    if (!previous || switched) {
      sun.color.set(trench.visible ? '#b7d9ff' : '#fff0d0');
      sun.intensity = trench.visible ? 2.2 : 3.2;
      scene.environmentIntensity = trench.visible ? 0.25 : 0.38;
      crystal.color.set(trench.visible ? '#efbf54' : '#58e5dd');
    }
    for (const [id, parts] of Object.entries(additions))
      parts.forEach((p, i) => (p.visible = next.game.levels[id] > i + 1));
    stock.children.forEach(
      (p, i) =>
        (p.visible = i < Math.ceil((next.game.refined / next.capacity) * 6)),
    );
    cargo.visible = next.game.phase === 'delivering';
    if (previous && !switched) {
      for (const id of Object.keys(assets))
        if (next.game.levels[id] > previous.game.levels[id]) react(id);
      if (next.game.refined > previous.game.refined) react('processing');
      if (
        next.game.refined < previous.game.refined &&
        next.game.credits > previous.game.credits
      ) {
        react('storage');
        burstTime = performance.now();
        burst.visible = true;
        assets.storage.getWorldPosition(burst.position);
        burst.position.y += 1.5;
      }
    }
    previous = next;
  }
  function frame(t) {
    for (const [id, start] of pulses) {
      const age = (t - start) / 650;
      if (age >= 1) {
        assets[id].scale.setScalar(1);
        pulses.delete(id);
        continue;
      }
      const s = Math.sin(age * Math.PI) * 0.07;
      assets[id].scale.set(1 + s * 0.4, 1 + s, 1 + s * 0.4);
    }
    if (burst.visible) {
      const age = (t - burstTime) / 900;
      burst.visible = age < 1;
      burst.children.forEach((p, i) => {
        const a = (i / 12) * Math.PI * 2;
        p.position.set(
          Math.cos(a) * age,
          age * 1.4 - age * age,
          Math.sin(a) * age,
        );
        p.scale.setScalar(0.35 * (1 - age));
      });
    }
  }
  return { update, frame, react };
}
