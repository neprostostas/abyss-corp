import * as T from 'three';
import { createExperience } from './experience.js';
let keys = new Set(),
  state = null,
  stateReceivedAt = 0,
  last = 0,
  selected = null;
const groups = await fetch('./groups.json').then((r) => r.json());
function initialize() {
  const { scene, camera, controls, renderer } = window.abyss;
  const assets = {},
    original = new Map();
  for (const [id, names] of Object.entries(groups)) {
    const group = new T.Group();
    group.name = `interactive-${id}`;
    scene.add(group);
    for (const name of names) {
      const object = scene.getObjectByName(
        T.PropertyBinding.sanitizeNodeName(name),
      );
      if (object) {
        group.attach(object);
        object.traverse((child) => {
          child.userData.asset = id;
        });
      }
    }
    assets[id] = group;
    original.set(id, group.position.clone());
  }
  for (const group of Object.values(assets)) {
    const box = new T.Box3().setFromObject(group);
    const pivot = box.getCenter(new T.Vector3());
    pivot.y = box.min.y;
    for (const child of group.children) child.position.sub(pivot);
    group.position.copy(pivot);
  }
  const assetBounds = new Map(
    Object.values(assets).map((group) => {
      group.updateMatrixWorld(true);
      return [
        group,
        new T.Box3()
          .setFromObject(group)
          .applyMatrix4(group.matrixWorld.clone().invert()),
      ];
    }),
  );
  const bounds = new T.Box3(),
    center = new T.Vector3();
  function worldBounds(group) {
    group.updateWorldMatrix(true, false);
    return bounds.copy(assetBounds.get(group)).applyMatrix4(group.matrixWorld);
  }
  const sub = assets.transport;
  const experience = createExperience({ scene, assets, sun: window.abyss.sun });
  const home = sub.position.clone();
  const rotor = new T.Group();
  const hub = sub.children.find((o) => o.name === 'Propeller_hub');
  if (hub) {
    rotor.position.copy(hub.position);
    sub.add(rotor);
    sub.updateMatrixWorld(true);
    for (const blade of [...sub.children].filter((o) =>
      o.name.startsWith('Propeller_blade'),
    ))
      rotor.attach(blade);
  }
  const rotorAxis = new T.Vector3(0.966, 0, 0.259).normalize();
  const bubbleGeometry = new T.BufferGeometry();
  const count = 90,
    positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -2.15 + Math.sin(i * 17) * 0.35;
    positions[i * 3 + 1] = (i % 17) * 0.13;
    positions[i * 3 + 2] = -1.25 + Math.cos(i * 9) * 0.25;
  }
  bubbleGeometry.setAttribute('position', new T.BufferAttribute(positions, 3));
  const bubbles = new T.Points(
    bubbleGeometry,
    new T.PointsMaterial({
      color: '#a4eee6',
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  scene.add(bubbles);
  const ring = new T.Mesh(
    new T.RingGeometry(0.7, 0.74, 64),
    new T.MeshBasicMaterial({
      color: '#ffe09a',
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  const guideRing = ring.clone();
  guideRing.material = ring.material.clone();
  scene.add(guideRing);
  let guideTarget = null,
    lastGuideAnchor = 0;
  const ray = new T.Raycaster();
  let down;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    down = [e.clientX, e.clientY];
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 7)
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = ray
      .intersectObjects(Object.values(assets), true)
      .find((h) => h.object.userData.asset);
    if (!hit)
      parent.postMessage(
        { source: 'abyss-3d', type: 'deselect' },
        location.origin,
      );
    if (hit)
      parent.postMessage(
        { source: 'abyss-3d', type: 'select', id: hit.object.userData.asset },
        location.origin,
      );
  });
  function select(id) {
    if (id !== selected) experience.react(id);
    if (id !== selected) previousAnchor = null;
    selected = id;
    ring.visible = !!assets[id];
    if (id) {
      const box = worldBounds(assets[id]);
      box.getCenter(center);
      ring.position.set(center.x, box.min.y + 0.025, center.z);
      ring.scale.setScalar(id === 'transport' ? 1.4 : 1);
    }
  }
  const handle = (e) => {
    if (
      e.origin !== location.origin ||
      e.source !== parent ||
      e.data?.source !== 'abyss-game'
    )
      return;
    const d = e.data;
    if (d.type === 'guide') guideTarget = assets[d.id] ? d.id : null;
    if (d.type === 'ping')
      parent.postMessage(
        { source: 'abyss-3d', type: 'ready' },
        location.origin,
      );
    if (d.type === 'state') {
      if (
        state?.game.phase !== d.game.phase ||
        state?.game.phaseElapsedMs !== d.game.phaseElapsedMs ||
        state?.started !== d.started
      )
        stateReceivedAt = performance.now();
      state = d;
      experience.update(d);
    }
    if (d.type === 'keys') keys = new Set(d.keys);
    if (d.type === 'home') document.querySelector('#reset').click();
    if (d.type === 'select' && d.id !== selected) select(d.id);
    if (d.type === 'focus') window.focus();
  };
  window.addEventListener('message', handle);
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (
      [
        'w',
        'a',
        's',
        'd',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        'q',
        'e',
        'r',
        '+',
        '=',
        '-',
      ].includes(k)
    ) {
      e.preventDefault();
      keys.add(k);
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) keys.clear();
  });
  // Small, genuine 3D fish provide motion outside the production route.
  const school = new T.Group();
  scene.add(school);
  for (let i = 0; i < 5; i++) {
    const fish = new T.Group();
    const material = new T.MeshStandardMaterial({
      color: i % 2 ? '#7fc8b5' : '#e7bd68',
      roughness: 0.7,
    });
    const body = new T.Mesh(new T.SphereGeometry(0.11, 12, 8), material);
    body.scale.set(1.8, 0.7, 0.55);
    fish.add(body);
    const tail = new T.Mesh(new T.ConeGeometry(0.1, 0.15, 3), material);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.22;
    fish.add(tail);
    fish.position.set(-i * 0.38, Math.sin(i) * 0.18, (i % 2) * 0.3);
    school.add(fish);
  }
  let lastHover = 0;
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.buttons || performance.now() - lastHover < 80) return;
    lastHover = performance.now();
    const rect = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    renderer.domElement.style.cursor = ray.intersectObjects(
      Object.values(assets),
      true,
    ).length
      ? 'pointer'
      : 'grab';
  });
  let lastAnchor = 0,
    previousAnchor = null;
  const right = new T.Vector3(),
    forward = new T.Vector3(),
    move = new T.Vector3();
  const nextTarget = new T.Vector3(),
    delta = new T.Vector3(),
    up = new T.Vector3(0, 1, 0);
  window.prototypeFrame = (t) => {
    const dt = Math.min((t - last) / 1000, 0.05);
    school.position.set(
      Math.sin(t * 0.00009) * 6,
      -1.2 + Math.sin(t * 0.00025) * 0.25,
      -4 + Math.cos(t * 0.00009) * 2,
    );
    school.rotation.y = -t * 0.00009;
    school.children.forEach((fish, i) => {
      fish.rotation.y = Math.sin(t * 0.004 + i) * 0.1;
    });
    last = t;
    right.setFromMatrixColumn(camera.matrix, 0);
    right.y = 0;
    right.normalize();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    move.set(0, 0, 0);
    if (keys.has('w') || keys.has('arrowup')) move.add(forward);
    if (keys.has('s') || keys.has('arrowdown')) move.sub(forward);
    if (keys.has('a') || keys.has('arrowleft')) move.sub(right);
    if (keys.has('d') || keys.has('arrowright')) move.add(right);
    if (move.lengthSq()) {
      move.normalize().multiplyScalar(dt * 4);
      if (nextTarget.copy(controls.target).add(move).lengthSq() < 256) {
        camera.position.add(move);
        controls.target.add(move);
      }
    }
    if (keys.has('q') || keys.has('e')) {
      delta.copy(camera.position).sub(controls.target);
      delta.applyAxisAngle(up, dt * (keys.has('q') ? 1 : -1));
      camera.position.copy(controls.target).add(delta);
    }
    if (keys.has('+') || keys.has('='))
      camera.zoom = Math.min(3, camera.zoom + dt);
    if (keys.has('-')) camera.zoom = Math.max(0.55, camera.zoom - dt);
    if (keys.has('+') || keys.has('=') || keys.has('-'))
      camera.updateProjectionMatrix();
    if (keys.has('r')) {
      document.querySelector('#reset').click();
      keys.delete('r');
    }
    if (state?.started) {
      const g = state.game;
      // Game snapshots arrive at 10 Hz. Interpolate visual travel between them;
      // the simulation remains authoritative and a delayed snapshot cannot overshoot.
      const fraction = Math.min(
        1,
        (g.phaseElapsedMs + Math.min(200, Math.max(0, t - stateReceivedAt))) /
          state.phaseDuration,
      );
      const trip =
        g.phase === 'delivering'
          ? fraction
          : g.phase === 'returning'
            ? 1 - fraction
            : 0;
      sub.position.set(
        home.x + trip * 2,
        home.y + Math.sin(t * 0.0015) * 0.045,
        home.z - trip * 1.1,
      );
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] = (positions[i * 3 + 1] + dt * 0.16) % 2.2;
      }
      bubbleGeometry.attributes.position.needsUpdate = true;
      rotor.rotateOnAxis(rotorAxis, dt * (g.phase === 'mining' ? 0.7 : 5));
    }
    if (selected === 'transport') select(selected);
    controls.update();
    experience.frame(t);
    guideRing.visible = !!guideTarget;
    if (guideTarget) {
      const box = worldBounds(assets[guideTarget]);
      box.getCenter(center);
      guideRing.position.set(center.x, box.min.y + 0.035, center.z);
      guideRing.scale.setScalar(
        (guideTarget === 'transport' ? 1.5 : 1.15) + Math.sin(t * 0.003) * 0.06,
      );
      if (t - lastGuideAnchor > 100) {
        lastGuideAnchor = t;
        center.y = box.max.y;
        center.project(camera);
        parent.postMessage(
          {
            source: 'abyss-3d',
            type: 'guide-anchor',
            x: (center.x + 1) / 2,
            y: (1 - center.y) / 2,
            visible:
              Math.abs(center.x) < 0.9 &&
              Math.abs(center.y) < 0.9 &&
              Math.abs(center.z) < 1,
          },
          location.origin,
        );
      }
    }
    if (selected && assets[selected] && t - lastAnchor > 100) {
      lastAnchor = t;
      const point = worldBounds(assets[selected])
        .getCenter(center)
        .project(camera);
      const anchor = {
        source: 'abyss-3d',
        type: 'anchor',
        x: (point.x + 1) / 2,
        y: (1 - point.y) / 2,
        visible:
          point.z > -1 &&
          point.z < 1 &&
          Math.abs(point.x) < 1.2 &&
          Math.abs(point.y) < 1.2,
      };
      if (
        !previousAnchor ||
        anchor.visible !== previousAnchor.visible ||
        Math.abs(anchor.x - previousAnchor.x) * innerWidth > 0.5 ||
        Math.abs(anchor.y - previousAnchor.y) * innerHeight > 0.5
      ) {
        parent.postMessage(anchor, location.origin);
        previousAnchor = anchor;
      }
    }
  };
  parent.postMessage({ source: 'abyss-3d', type: 'ready' }, location.origin);
}
if (window.abyss?.loaded) initialize();
else window.addEventListener('abyss-ready', initialize, { once: true });
