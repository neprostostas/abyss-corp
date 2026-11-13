import * as T from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { SVGLoader } from './vendor/SVGLoader.js';

export { T };
export const TAU = Math.PI * 2;
export const palette = {
  cream: '#f8e7b5',
  gold: '#efad22',
  edge: '#bd741b',
  teal: '#244c5b',
  dark: '#173843',
  cyan: '#24a8c1',
  glass: '#27b7ce',
  silver: '#a5bac2',
  coral: '#e99375',
  pearl: '#d6bcea',
  white: '#fff7de',
  blue: '#4082d5',
  purple: '#8d82ed',
};
export const mats = Object.fromEntries(
  Object.entries(palette).map(([name, color]) => [
    name,
    new T.MeshStandardMaterial({
      name,
      color,
      roughness: name === 'glass' ? 0.19 : name === 'silver' ? 0.4 : 0.43,
      metalness: ['gold', 'edge', 'silver'].includes(name) ? 0.28 : 0.04,
      ...(name === 'glass' ? { emissive: color, emissiveIntensity: 0.13 } : {}),
    }),
  ]),
);
export function material(color) {
  return new T.MeshStandardMaterial({ color, roughness: 0.36, metalness: 0.1 });
}
let serial = 0;
export function group(parent, name = 'part', pos = [0, 0, 0]) {
  const g = new T.Group();
  g.name = `${parent?.name || 'asset'}_${name}_${serial++}`;
  g.position.set(...pos);
  parent?.add(g);
  return g;
}
export function mesh(
  parent,
  geo,
  mat = 'cream',
  pos = [0, 0, 0],
  rot = [0, 0, 0],
) {
  const m = new T.Mesh(geo, typeof mat === 'string' ? mats[mat] : mat);
  m.name = `${parent.name}_mesh_${serial++}`;
  m.position.set(...pos);
  m.rotation.set(...rot);
  parent.add(m);
  return m;
}
export function box(p, w, h, d, mat = 'cream', pos = [0, 0, 0], r = 0.08) {
  return mesh(
    p,
    new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)),
    mat,
    pos,
  );
}
export function ball(p, r, mat = 'cream', pos = [0, 0, 0], scale = [1, 1, 1]) {
  const o = mesh(p, new T.SphereGeometry(r, 24, 16), mat, pos);
  o.scale.set(...scale);
  return o;
}
export function cyl(
  p,
  r,
  h,
  mat = 'cream',
  pos = [0, 0, 0],
  rTop = r,
  segments = 48,
) {
  return mesh(p, new T.CylinderGeometry(rTop, r, h, segments, 1), mat, pos);
}
export function disc(p, r, d, mat = 'gold', pos = [0, 0, 0]) {
  const o = cyl(p, r, d, mat, pos);
  o.rotation.x = Math.PI / 2;
  return o;
}
export function ring(p, r, t, mat = 'gold', pos = [0, 0, 0], arc = TAU) {
  return mesh(p, new T.TorusGeometry(r, t, 10, 64, arc), mat, pos);
}
export function tube(p, pts, r, mat = 'teal') {
  const curve = new T.CatmullRomCurve3(pts.map((v) => new T.Vector3(...v)));
  return mesh(
    p,
    new T.TubeGeometry(curve, Math.max(8, pts.length * 6), r, 8, false),
    mat,
  );
}
export function polygon(points) {
  const s = new T.Shape();
  s.moveTo(...points[0]);
  for (const p of points.slice(1)) s.lineTo(...p);
  s.closePath();
  return s;
}
export function extrude(
  p,
  shape,
  depth = 0.2,
  mat = 'gold',
  pos = [0, 0, 0],
  bevel = 0.05,
) {
  return mesh(
    p,
    new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSegments: 3,
      steps: 1,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 24,
    }),
    mat,
    pos,
  );
}
export function symbol(
  p,
  points,
  mat = 'gold',
  depth = 0.24,
  pos = [0, 0, 0],
  bevel = 0.06,
) {
  return extrude(p, polygon(points), depth, mat, pos, bevel);
}
export function arcShape(r, inner, start, end) {
  const s = new T.Shape();
  s.absarc(0, 0, r, start, end, false);
  s.absarc(0, 0, inner, end, start, true);
  s.closePath();
  return s;
}
export function starShape(r = 0.95, inner = 0.49, n = 5) {
  return polygon(
    Array.from({ length: n * 2 }, (_, i) => {
      const a = Math.PI / 2 + (i * Math.PI) / n;
      return [
        Math.cos(a) * (i % 2 ? inner : r),
        Math.sin(a) * (i % 2 ? inner : r),
      ];
    }),
  );
}
export const arrowPoints = [
  [-0.9, -0.18],
  [0.25, -0.18],
  [0.25, -0.52],
  [0.95, 0],
  [0.25, 0.52],
  [0.25, 0.18],
  [-0.9, 0.18],
];
export const checkPoints = [
  [-0.85, 0.03],
  [-0.58, 0.29],
  [-0.17, -0.13],
  [0.68, 0.72],
  [0.94, 0.46],
  [-0.17, -0.65],
];
export function check(p, size = 1, pos = [0, 0, 0], mat = 'cyan') {
  const g = group(p, 'check', pos);
  symbol(g, checkPoints, 'gold', 0.13, [0, 0, 0], 0.055);
  const a = symbol(g, checkPoints, mat, 0.12, [0, 0, 0.12], 0.03);
  a.scale.set(0.89, 0.89, 1);
  g.scale.setScalar(size);
  return g;
}
export function crate(p, pos = [0, 0, 0], size = 0.7) {
  const g = group(p, 'crate', pos);
  box(g, size, size, size, 'cream');
  for (const x of [-1, 1])
    box(
      g,
      0.105,
      size + 0.03,
      size + 0.03,
      'gold',
      [x * size * 0.3, 0, 0],
      0.025,
    );
  box(g, size + 0.04, 0.11, size + 0.04, 'gold', [0, 0, 0], 0.025);
  box(
    g,
    0.3 * size,
    0.16 * size,
    0.05,
    'teal',
    [0, 0.12 * size, size * 0.52],
    0.015,
  );
  return g;
}
export function port(p, r = 0.37, pos = [0, 0, 0], rim = 'gold') {
  const g = group(p, 'port', pos);
  disc(g, r + 0.09, 0.16, 'teal');
  ring(g, r + 0.025, 0.07, rim, [0, 0, 0.09]);
  ball(g, r, 'glass', [0, 0, 0.11], [1, 1, 0.35]);
  return g;
}
export function svgShapes(svgText) {
  return new SVGLoader()
    .parse(svgText)
    .paths.flatMap((p) => SVGLoader.createShapes(p));
}
export function svgRelief(p, shapes, mat = 'cream', scale = 0.075, z = 0) {
  const g = group(p, 'emblem', [0, 0, z]);
  for (const shape of shapes)
    mesh(
      g,
      new T.ExtrudeGeometry(shape, {
        depth: 0.9,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.15,
        bevelThickness: 0.15,
        steps: 1,
        curveSegments: 8,
      }),
      mat,
    );
  g.scale.set(scale, -scale, scale);
  g.position.x = -12 * scale;
  g.position.y = 12 * scale;
  return g;
}
// Bake geometry transforms, not browser-only effects: these clips survive GLB export.
export function bake(root, nodes, duration, animate) {
  const state = nodes.map((n) => ({
    n,
    p: n.position.clone(),
    q: n.quaternion.clone(),
    s: n.scale.clone(),
  }));
  const samples = Math.ceil(duration * 24),
    times = [],
    values = state.map(() => ({ p: [], q: [], s: [] }));
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    times.push(u * duration);
    for (const v of state) {
      v.n.position.copy(v.p);
      v.n.quaternion.copy(v.q);
      v.n.scale.copy(v.s);
    }
    animate(u, u * duration);
    state.forEach((v, k) => {
      values[k].p.push(...v.n.position);
      values[k].q.push(...v.n.quaternion);
      values[k].s.push(...v.n.scale);
    });
  }
  const tracks = [];
  state.forEach((v, k) => {
    for (const [key, prop, step, Type] of [
      ['p', 'position', 3, T.VectorKeyframeTrack],
      ['q', 'quaternion', 4, T.QuaternionKeyframeTrack],
      ['s', 'scale', 3, T.VectorKeyframeTrack],
    ]) {
      const a = values[k][key];
      if (a.some((v, i) => Math.abs(v - a[i % step]) > 1e-5))
        tracks.push(new Type(`${v.n.name}.${prop}`, times, a));
    }
    v.n.position.copy(v.p);
    v.n.quaternion.copy(v.q);
    v.n.scale.copy(v.s);
  });
  if (!tracks.length) throw Error(`No animation for ${root.name}`);
  const clip = new T.AnimationClip(`${root.name}_action`, duration, tracks);
  root.animations = [clip];
  return clip;
}
export function pulse(u, start = 0, end = 1) {
  if (u < start || u > end) return 0;
  return Math.sin(((u - start) / (end - start)) * Math.PI) ** 2;
}
export function ease(x) {
  return x * x * (3 - 2 * x);
}
