/* Small geometry helpers: shapes, slabs, bars, primitives, and the merge that turns thousands of meshes into a few dozen. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DEG, F, H, K, KZ, S } from "./core.js";

export function shapeOf(poly) { return new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], p[1]))); }

/* A flat polygon lying on the ground (or on a floor) at height y. */
export function flat(poly, material, y) {
  const geo = new THREE.ShapeGeometry(shapeOf(poly));
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

/* A slab whose top sits at `top`. */
export function slab(poly, material, top, thick) {
  const geo = new THREE.ExtrudeGeometry(shapeOf(poly), { depth: thick, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.position.y = top - thick;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* A box standing between two plan points, from `base` to `top`. */
export function bar(ax, ay, bx, by, base, top, thick, material) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  if (len < 0.01 || top - base < 0.01) return null;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, top - base, thick), material);
  m.position.set((ax + bx) / 2, (base + top) / 2, -(ay + by) / 2);
  m.rotation.y = Math.atan2(dy, dx);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function rectPoly(r) { return [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]; }

export function inside(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

export function center(item) {
  const poly = H.polyOf(item);
  let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
  poly.forEach((p) => { x1 = Math.min(x1, p[0]); x2 = Math.max(x2, p[0]); y1 = Math.min(y1, p[1]); y2 = Math.max(y2, p[1]); });
  if (item.street) x2 = H.streetX((y1 + y2) / 2);
  if (item.lab) {
    const l = item.lab;
    return [l[2] === "s" ? l[0] + 1.1 : l[2] === "e" ? l[0] - 1.1 : l[0], l[1]];
  }
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

export function byId(id) { return H.rooms.concat(H.spaces).filter((i) => H.idOf(i) === String(id))[0]; }

/* Pieces built in their own frame: x across, y up, front toward -z. */
export function bx(g, w, h, d, x, y, z, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function cy(g, rt, rb, h, x, y, z, material, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function ball(g, r, x, y, z, material, detail) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail === undefined ? 1 : detail), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

/* Puts a piece at plan point (x, y) on `level`, turned rot degrees. The
   model is stretched when drawn; a piece is shrunk by as much here, so it
   keeps its true size. */
export function place(piece, x, y, level, rot) {
  piece.position.set(x, zAt(x, y, level || 0), -y);
  piece.rotation.y = (rot || 0) * DEG;
  piece.scale.set(1 / K, 1 / KZ, 1 / K);
  S.static.add(piece);
  return piece;
}

/* Merges every mesh under `group` into one mesh per material. */
export function merge(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    Object.keys(g.attributes).forEach((n) => { if (n !== "position" && n !== "normal" && n !== "uv") g.deleteAttribute(n); });
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, geos: [], cast: false });
    const b = buckets.get(key);
    b.geos.push(g);
    b.cast = b.cast || o.castShadow;
  });
  const out = new THREE.Group();
  buckets.forEach((b) => {
    const merged = mergeGeometries(b.geos, false);
    if (!merged) return;
    const m = new THREE.Mesh(merged, b.material);
    m.castShadow = b.cast && !b.material.transparent;
    m.receiveShadow = true;
    if (b.material.transparent) m.renderOrder = 2;
    out.add(m);
  });
  return out;
}

/* The floor's height under a point on a level. */
export function zAt(x, y, level) {
  const r = H.at(x, y, level);
  return r ? r.z : F[level];
}

/* A beam between two points [x, y, height], w wide and h deep. */
export function beam3(A, B, w, h, material) {
  const a = new THREE.Vector3(A[0], A[2], -A[1]), b = new THREE.Vector3(B[0], B[2], -B[1]);
  const dir = b.clone().sub(a), len = dir.length();
  if (len < 0.01) return null;
  dir.normalize();
  const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(side, dir);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, w), material);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, up, side));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.castShadow = true;
  S.static.add(m);
  return m;
}

/* A quad between four 3D points [x, y(plan), h], textured in meters. */
export function quad(p, material, uScale) {
  const v = (q) => [q[0], q[2], -q[1]];
  const a = v(p[0]), b = v(p[1]), c = v(p[2]), d = v(p[3]);
  const pos = [...a, ...b, ...c, ...a, ...c, ...d];
  const len = (m, n) => Math.hypot(m[0] - n[0], m[1] - n[1], m[2] - n[2]);
  const U = len(p[0].map(Number), p[1].map(Number)) * (uScale || 1), V = len(p[1], p[2]);
  const uv = [0, 0, U, 0, U, V, 0, 0, U, V, 0, V];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function triangle(p, material) {
  const v = (q) => [q[0], q[2], -q[1]];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([...v(p[0]), ...v(p[1]), ...v(p[2])], 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  return m;
}

/* A ring or an arc of tube, standing in the piece's x-y plane. */
export function hoop(g, R, r, arc, x, y, z, material) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, 6, 18, arc), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

/* A shape turned on a lathe: profile is [[radius, height], ...]. */
export function lathe(g, profile, x, y, z, material, seg) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg || 14), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/* Random numbers that come out the same on every visit, so a flower bed
   doesn't move between two looks. */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
}
