import * as T from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
const $ = (s) => document.querySelector(s);
if (new URLSearchParams(location.search).has('sheet'))
  document.body.classList.add('sheet');
const renderer = new T.WebGLRenderer({
  canvas: $('#gallery-canvas'),
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setClearColor(0, 0);
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.autoClear = false;
const pmrem = new T.PMREMGenerator(renderer),
  room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04).texture;
room.dispose();
pmrem.dispose();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches,
  showReferences = true,
  filter = 'Усі',
  query = '',
  items = [],
  hero,
  detail = null,
  detailRenderer,
  controls,
  selected = 0,
  entries = [];
const viewer = $('#viewer'),
  loader = new GLTFLoader(),
  views = [];
let loaded = 0,
  failed = 0,
  last = performance.now();
const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = shadowCanvas.height = 128;
const ctx = shadowCanvas.getContext('2d'),
  grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
grad.addColorStop(0, 'rgba(2,20,28,.32)');
grad.addColorStop(0.6, 'rgba(2,20,28,.12)');
grad.addColorStop(1, 'rgba(2,20,28,0)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, 128, 128);
const shadowTexture = new T.CanvasTexture(shadowCanvas);
function setupScene(root, meta, element) {
  const scene = new T.Scene();
  scene.environment = environment;
  scene.environmentIntensity = 0.48;
  scene.add(new T.HemisphereLight('#eaf8ed', '#31516a', 0.72));
  const key = new T.DirectionalLight('#fff0cc', 2.7);
  key.position.set(-3, 6, 7);
  scene.add(key);
  const fill = new T.DirectionalLight('#9edfe7', 0.8);
  fill.position.set(4, 2, -3);
  scene.add(fill);
  scene.add(root);
  const shadow = new T.Mesh(
    new T.PlaneGeometry(3.2, 3.2),
    new T.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = meta.animatedBounds.min[1] - 0.1;
  scene.add(shadow);
  const camera = new T.OrthographicCamera(-2, 2, 2, -2, 0.1, 40);
  const target = new T.Vector3()
    .addVectors(
      new T.Vector3(...meta.animatedBounds.min),
      new T.Vector3(...meta.animatedBounds.max),
    )
    .multiplyScalar(0.5);
  camera.position.copy(target).add(new T.Vector3(2.6, 1.9, 6));
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const mixer = new T.AnimationMixer(root),
    action = mixer.clipAction(root.animations[0]);
  action.play();
  return {
    scene,
    camera,
    mixer,
    action,
    meta,
    element,
    root,
    target,
    playing: true,
  };
}
function frameCamera(view, width, height, reset = false) {
  const { camera, meta, target } = view,
    aspect = width / height;
  if (reset) {
    camera.position.copy(target).add(new T.Vector3(2.6, 1.9, 6));
    camera.lookAt(target);
    camera.zoom = 1;
    camera.updateMatrixWorld();
  }
  const points = [];
  const { min, max } = meta.animatedBounds;
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]])
        points.push(
          new T.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse),
        );
  const extentX = Math.max(...points.map((p) => Math.abs(p.x))),
    extentY = Math.max(...points.map((p) => Math.abs(p.y)));
  const h = Math.max(extentY, extentX / aspect) * 1.13;
  camera.left = -h * aspect;
  camera.right = h * aspect;
  camera.top = h;
  camera.bottom = -h;
  camera.updateProjectionMatrix();
}
function card(meta) {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.id = meta.id;
  el.innerHTML = `<span class="card-number">${String(meta.index).padStart(2, '0')}</span><span class="card-open">↗</span><button class="open-model" aria-label="Роздивитися ${meta.label}"><div class="stage"></div><div class="card-meta"><span class="card-name">${meta.label}</span><span class="card-id">${meta.id}</span></div></button><div class="mini-ref"><img src="${meta.reference}" alt="" loading="lazy"/></div>`;
  el.querySelector('button').addEventListener('click', () =>
    openViewer(meta.index - 1),
  );
  $('#grid').append(el);
  return el;
}
function filterItems() {
  let count = 0;
  for (const item of items) {
    const { meta, card } = item;
    const visible =
      (filter === 'Усі' || meta.family === filter) &&
      (!query ||
        `${meta.label} ${meta.id}`.toLocaleLowerCase().includes(query));
    card.hidden = !visible;
    if (visible) count++;
  }
  $('#count').textContent = count;
  $('#empty').hidden = count > 0;
}
function syncPlayback() {
  $('#pause-all').textContent = paused ? '▶ Відновити рух' : 'Ⅱ Зупинити рух';
  $('#pause-all').setAttribute('aria-pressed', String(paused));
}
$('#pause-all').onclick = () => {
  paused = !paused;
  syncPlayback();
};
syncPlayback();
reduced.addEventListener('change', (e) => {
  paused = e.matches;
  syncPlayback();
});
$('#reference-toggle').onclick = () => {
  showReferences = !showReferences;
  document.body.classList.toggle('hide-references', !showReferences);
  $('#reference-toggle').setAttribute('aria-pressed', String(showReferences));
};
$('#search').oninput = (e) => {
  query = e.target.value.trim().toLocaleLowerCase();
  filterItems();
};
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  if (detail) resizeDetail();
}
addEventListener('resize', resize);
resize();
function renderView(view, rect, delta) {
  if (
    rect.bottom < 0 ||
    rect.top > innerHeight ||
    rect.width === 0 ||
    rect.height === 0
  )
    return;
  if (!paused) view.mixer.update(delta);
  frameCamera(view, rect.width, rect.height);
  const y = innerHeight - rect.bottom;
  renderer.setViewport(rect.left, y, rect.width, rect.height);
  renderer.setScissor(rect.left, y, rect.width, rect.height);
  renderer.clear(true, true);
  renderer.render(view.scene, view.camera);
}
function render(now) {
  requestAnimationFrame(render);
  const delta = Math.min((now - last) / 1000, 0.06);
  last = now;
  if (document.hidden) return;
  if (!viewer.open) {
    renderer.setScissorTest(false);
    renderer.clear(true, true);
    renderer.setScissorTest(true);
    if (hero) renderView(hero, hero.element.getBoundingClientRect(), delta);
    for (const item of items)
      if (item.view && !item.card.hidden)
        renderView(item.view, item.view.element.getBoundingClientRect(), delta);
  } else if (detail && detailRenderer) {
    if (detail.playing) detail.mixer.update(delta * Number($('#speed').value));
    controls.update();
    detailRenderer.render(detail.scene, detail.camera);
    const t = detail.action.time;
    $('#timeline').value = t / detail.meta.duration;
    $('#time-value').value =
      `${t.toFixed(1)} / ${detail.meta.duration.toFixed(1)} с`;
  }
}
requestAnimationFrame(render);
function resizeDetail(reset = false) {
  if (!detail) return;
  const r = $('#detail-stage').getBoundingClientRect();
  detailRenderer.setSize(r.width, r.height, false);
  frameCamera(detail, r.width, r.height, reset);
  if (reset) {
    controls.target.copy(detail.target);
    controls.update();
    controls.saveState();
  }
}
function makeDetailRenderer() {
  if (detailRenderer) return;
  detailRenderer = new T.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  detailRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  detailRenderer.setClearColor(0, 0);
  detailRenderer.toneMapping = T.ACESFilmicToneMapping;
  detailRenderer.toneMappingExposure = 0.95;
  $('#detail-stage').append(detailRenderer.domElement);
}
async function openViewer(index) {
  const item = items[index];
  if (!item?.gltf) return;
  selected = index;
  detail?.mixer.stopAllAction();
  controls?.dispose();
  const root = item.gltf.scene.clone(true);
  root.animations = item.gltf.animations;
  detail = setupScene(root, item.meta, $('#detail-stage'));
  detail.playing = !reduced.matches;
  $('#detail-title').textContent = item.meta.label;
  $('#detail-id').textContent = item.meta.id;
  $('#detail-motion').textContent = item.meta.motion;
  $('#detail-index').textContent =
    `${String(item.meta.index).padStart(2, '0')} / 48 — ${item.meta.family}`;
  $('#detail-reference').src = item.meta.reference;
  $('#detail-reference').alt = `Референс: ${item.meta.label}`;
  $('#download-model').href = item.meta.model;
  $('#download-model').download = `abyss-${item.meta.id}.glb`;
  $('#model-stats').textContent =
    `${item.meta.meshes} деталей · ${item.meta.triangles.toLocaleString('uk')} трикутників · ${(item.meta.bytes / 1024).toFixed(0)} КБ · ${item.meta.duration.toFixed(1)} с`;
  $('#speed').value = 1;
  $('#speed-value').value = '1×';
  syncDetailPlay();
  makeDetailRenderer();
  if (!viewer.open) viewer.showModal();
  document.body.classList.add('modal-open');
  controls = new OrbitControls(detail.camera, detailRenderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minZoom = 0.6;
  controls.maxZoom = 3.5;
  controls.target.copy(detail.target);
  resizeDetail(true);
  $('#close-viewer').focus();
  history.replaceState(null, '', `#${item.meta.id}`);
}
function syncDetailPlay() {
  const b = $('#detail-play');
  b.textContent = detail?.playing ? 'Ⅱ Пауза' : '▶ Відтворити';
  b.setAttribute('aria-pressed', String(!detail?.playing));
}
$('#close-viewer').onclick = () => viewer.close();
viewer.addEventListener('click', (e) => {
  if (e.target === viewer) {
    const r = viewer.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      viewer.close();
  }
});
viewer.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  controls?.dispose();
  detail?.mixer.stopAllAction();
  detail = null;
  history.replaceState(null, '', location.pathname);
  items[selected]?.card.querySelector('button').focus();
});
$('#detail-play').onclick = () => {
  if (detail) {
    detail.playing = !detail.playing;
    syncDetailPlay();
  }
};
$('#restart').onclick = () => {
  detail?.mixer.setTime(0);
};
$('#reset-camera').onclick = () => resizeDetail(true);
$('#speed').oninput = (e) =>
  ($('#speed-value').value = `${Number(e.target.value)}×`);
$('#timeline').oninput = (e) => {
  if (detail) {
    detail.playing = false;
    syncDetailPlay();
    detail.mixer.setTime(Number(e.target.value) * detail.meta.duration);
  }
};
$('#prev').onclick = () => openViewer((selected + 47) % 48);
$('#next').onclick = () => openViewer((selected + 1) % 48);
viewer.addEventListener('keydown', (e) => {
  if (e.target.matches('input')) return;
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    openViewer((selected + 1) % 48);
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    openViewer((selected + 47) % 48);
  }
});
// Read-only diagnostics for local visual QA.
window.abyssModelLab = {
  get status() {
    return {
      loaded,
      failed,
      total: entries.length,
      paused,
      selected: detail?.meta.id || null,
    };
  },
  async inspectAll() {
    return items
      .filter((x) => x.gltf)
      .map((x) => ({
        id: x.meta.id,
        animations: x.gltf.animations.length,
        tracks: x.gltf.animations[0].tracks.length,
        meshes: x.meta.meshes,
      }));
  },
};
try {
  const response = await fetch('./catalog.json');
  if (!response.ok) throw Error('Колекцію моделей не знайдено');
  entries = await response.json();
  for (const name of [
    'Усі',
    'Техніка',
    'Інтерфейс',
    'Керування',
    'Ресурси',
    'Вхід',
  ]) {
    const b = document.createElement('button');
    b.textContent = name;
    b.setAttribute('aria-pressed', String(name === filter));
    b.onclick = () => {
      filter = name;
      for (const btn of $('#filters').children)
        btn.setAttribute('aria-pressed', String(btn === b));
      filterItems();
    };
    $('#filters').append(b);
  }
  items = entries.map((meta) => ({ meta, card: card(meta) }));
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        try {
          let gltf;
          try {
            gltf = await loader.loadAsync(item.meta.model);
          } catch {
            gltf = await loader.loadAsync(`${item.meta.model}?retry=1`);
          }
          gltf.scene.animations = gltf.animations;
          item.gltf = gltf;
          item.view = setupScene(
            gltf.scene,
            item.meta,
            item.card.querySelector('.stage'),
          );
          views.push(item.view);
          loaded++;
          if (item.meta.id === 'transport') {
            const root = gltf.scene.clone(true);
            root.animations = gltf.animations;
            hero = setupScene(root, item.meta, $('#hero-stage'));
          }
          document.body.classList.add('ready');
          $('#loading').textContent = `Готово ${loaded} / 48 моделей…`;
        } catch (e) {
          failed++;
          item.card.querySelector('.card-id').textContent =
            'Не вдалося завантажити';
          console.error(e);
        }
      }
    }),
  );
  $('#loading').hidden = failed === 0;
  if (failed)
    $('#loading').textContent =
      `Не завантажено ${failed} моделей. Онови сторінку.`;
  document.body.dataset.loaded = String(loaded);
  const hash = location.hash.slice(1);
  if (hash) {
    const index = entries.findIndex((x) => x.id === hash);
    if (index >= 0) openViewer(index);
  }
} catch (e) {
  $('#fatal').hidden = false;
  $('#fatal').textContent = `Не вдалося відкрити 3D-колекцію: ${e.message}`;
  console.error(e);
}
