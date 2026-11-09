/* The 3D view: a model of Norita Ranch to walk through, built from
   js/house.js. Plan coordinates (x east, y north, meters) become three.js
   (x, height, -y), so north is -z.

   Walls come from the room outlines: every room edge is a wall unless a door
   opens it, and edges two rooms share are merged so each wall is drawn once.
   Walking is a small physics loop: walls push you back, floors and stair ramps
   set your height, and you fall if you step off something. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const H = window.HOUSE;
const F = H.FLOOR;
const WALL_H = { 0: 2.7, 1: 2.5, 2: 2.2 };
const WALL_T = 0.15;
const EYE = 1.6, BODY = 1.75, RADIUS = 0.22, STEP = 0.45, GRAVITY = 9.8;
const RES = 0.05;
const CENTER = { x: -18, y: 9 };

const KIND = { bedroom: 0xdbe5f1, bath: 0xc4d7e7, living: 0xf0e0c4, service: 0xe0dbcf, hall: 0xe8e4dc,
               stair: 0xd6cfc2, covered: 0xcfc8bb, balcony: 0xe6e2da, terrace: 0xd8cfbf, roof: 0xbdb7aa };

function t(k) { return window.I18N && window.I18N.listo ? window.I18N.t(k) : ""; }
function plain(s) {
  return String(s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
const $ = (id) => document.getElementById(id);
const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

let S = null;

/* ---------- materials and simple shapes ---------- */

const mats = new Map();
function mat(color, opts) {
  const key = color + "|" + JSON.stringify(opts || {});
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.92, metalness: 0 }, opts || {})));
  }
  return mats.get(key);
}
const GLASS = { transparent: true, opacity: 0.32, roughness: 0.15, metalness: 0.1, depthWrite: false };

function shapeOf(poly) {
  return new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], p[1])));
}
/* A flat polygon lying on the ground (or on a floor) at height y. */
function flat(poly, color, y, opts) {
  const geo = new THREE.ShapeGeometry(shapeOf(poly));
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}
/* A slab whose top sits at `top`. */
function slab(poly, color, top, thick, opts) {
  const geo = new THREE.ExtrudeGeometry(shapeOf(poly), { depth: thick, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.position.y = top - thick;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
/* A box standing between two plan points, from `base` to `top`. */
function bar(ax, ay, bx, by, base, top, thick, material) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  if (len < 0.01 || top - base < 0.01) return null;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, top - base, thick), material);
  m.position.set((ax + bx) / 2, (base + top) / 2, -(ay + by) / 2);
  m.rotation.y = Math.atan2(dy, dx);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function rectPoly(r) { return [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]; }
function inside(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function center(item) {
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

/* ---------- walls ---------- */

/* Every room edge on a grid of 5 cm cells, so two rooms sharing an edge give
   one wall, and doors and glass can cut cells out. */
function computeWalls() {
  const opaque = new Map(), glass = new Map();
  const keyOf = (level, o, c) => level + "|" + o + "|" + c.toFixed(3);
  function cells(map, key, a, b, add) {
    let s = map.get(key);
    if (!s) { if (!add) return; s = new Set(); map.set(key, s); }
    const i0 = Math.round(Math.min(a, b) / RES), i1 = Math.round(Math.max(a, b) / RES);
    for (let i = i0; i < i1; i++) { if (add) s.add(i); else s.delete(i); }
  }
  function edge(level, p, q) {
    if (Math.abs(p[0] - q[0]) < 1e-6) cells(opaque, keyOf(level, "V", p[0]), p[1], q[1], true);
    else if (Math.abs(p[1] - q[1]) < 1e-6) cells(opaque, keyOf(level, "H", p[1]), p[0], q[0], true);
    // the slanted edge on the street is the façade, built apart
  }
  H.rooms.concat(H.spaces.filter((s) => s.enclosed)).forEach((r) => {
    const poly = H.polyOf(r);
    for (let i = 0; i < poly.length; i++) edge(r.level, poly[i], poly[(i + 1) % poly.length]);
  });
  const keyOfDef = (d) => (d.x !== undefined ? keyOf(d.level, "V", d.x) : keyOf(d.level, "H", d.y));
  H.glass.forEach((g) => { cells(opaque, keyOfDef(g), g.from, g.to, false); cells(glass, keyOfDef(g), g.from, g.to, true); });
  H.doors.forEach((d) => { cells(opaque, keyOfDef(d), d.from, d.to, false); cells(glass, keyOfDef(d), d.from, d.to, false); });

  const out = [];
  function emit(map, isGlass) {
    map.forEach((set, key) => {
      const parts = key.split("|"), level = Number(parts[0]), o = parts[1], c = Number(parts[2]);
      const idx = Array.from(set).sort((a, b) => a - b);
      let start = null, prev = null;
      const flush = () => {
        if (start === null) return;
        const a = start * RES, b = (prev + 1) * RES;
        out.push(o === "V" ? { level, ax: c, ay: a, bx: c, by: b, glass: isGlass }
                           : { level, ax: a, ay: c, bx: b, by: c, glass: isGlass });
      };
      idx.forEach((i) => {
        if (start === null) { start = prev = i; } else if (i === prev + 1) prev = i; else { flush(); start = prev = i; }
      });
      flush();
    });
  }
  emit(opaque, false);
  emit(glass, true);
  return out;
}

/* ---------- labels ---------- */

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function makeLabel(text, num) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const g = c.getContext("2d");
  g.font = "600 44px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const pad = 22, pillW = num ? g.measureText(num).width + 34 : 0, gap = num ? 12 : 0;
  const textW = Math.min(g.measureText(text).width, 512 - 2 * pad - pillW - gap - 8);
  const w = pad * 2 + pillW + gap + textW, x0 = (512 - w) / 2;
  g.fillStyle = "rgba(255,255,255,0.9)";
  roundRect(g, x0, 24, w, 80, 40); g.fill();
  g.textBaseline = "middle";
  if (num) {
    g.fillStyle = "#2B2B28";
    roundRect(g, x0 + pad - 8, 36, pillW, 56, 28); g.fill();
    g.fillStyle = "#FFFFFF"; g.textAlign = "center";
    g.fillText(num, x0 + pad - 8 + pillW / 2, 65);
  }
  g.fillStyle = "#1F1F1C"; g.textAlign = "left";
  g.fillText(text, x0 + pad + pillW + gap - (num ? 8 : 0), 65, textW);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // A fixed size on screen, like a pin on a map: readable from afar and never
  // huge when you stand next to it.
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, sizeAttenuation: false }));
  sp.scale.set(0.3, 0.075, 1);
  sp.renderOrder = 10;
  return sp;
}
function buildLabels() {
  const group = S.labels;
  group.children.slice().forEach((sp) => { group.remove(sp); sp.material.map.dispose(); sp.material.dispose(); });
  const put = (text, num, x, y, h) => {
    if (!text) return;
    const sp = makeLabel(text, num);
    sp.position.set(x, h, -y);
    group.add(sp);
  };
  H.rooms.forEach((r) => {
    const c = center(r), h = F[r.level] + (r.level === 0 ? 2.05 : 1.95);
    put(plain(t(r.name)), String(r.n), c[0], c[1], h);
  });
  H.spaces.forEach((s) => {
    if (!s.name || s.kind === "roof" || s.kind === "balcony") return;
    const c = center(s);
    put(plain(t(s.name)).replace(/\s*·.*$/, ""), "", c[0], c[1], F[s.level] + 2.0);
  });
  put(plain(t("space.garden")).replace(/\s*\(.*\)$/, ""), "", -34.5, 15.5, 1.6);
}

/* ---------- the scene ---------- */

function buildScene() {
  const scene = S.scene;

  // Ground around the lot, the lot itself, the sidewalk and the street.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), mat(0xa7b08c));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(CENTER.x, -0.01, -CENTER.y);
  ground.receiveShadow = true;
  scene.add(ground);
  scene.add(flat(H.lot, 0x86ad5c, 0.004));
  const e = [0.9840, 0.1779];
  const band = (o1, o2) => [[-40, o1], [-40, o2], [70, o2], [70, o1]]
    .map((q) => [H.streetX(q[0]) + q[1] * e[0], q[0] + q[1] * e[1]]);
  scene.add(flat(band(0, 2.5), 0xcfcac0, 0.012));
  scene.add(flat(band(2.5, 10.5), 0x5d5f61, 0.008));
  scene.add(flat(band(10.5, 13), 0xcfcac0, 0.012));
  [[2.5, 0.05], [10.5, -0.05]].forEach((c) => {
    const p = band(c[0], c[0] + c[1] * 3);
    scene.add(flat(p, 0xe8e4da, 0.016));
  });

  // Garden: gravel, pavers, the wheel tracks, the tree, statue and bench.
  const G = H.garden;
  scene.add(flat(rectPoly(G.gravel), 0xcdc4ae, 0.02));
  scene.add(flat(rectPoly(G.pavers), 0xb9a98e, 0.02));
  G.tracks.forEach((c) => {
    const curve = new THREE.CubicBezierCurve(...c.map((p) => new THREE.Vector2(p[0], p[1])));
    const ptsAlong = curve.getPoints(28);
    for (let i = 0; i < ptsAlong.length - 1; i++) {
      const a = ptsAlong[i], b = ptsAlong[i + 1];
      const m = bar(a.x, a.y, b.x, b.y, 0.0, 0.035, 0.45, mat(0xd8d0c0));
      if (m) { m.castShadow = false; scene.add(m); }
    }
  });
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 3.0, 10), mat(0x6b4f36));
  trunk.position.y = 1.5;
  tree.add(trunk);
  [[0, 3.6, 0, 2.4], [1.2, 3.2, 0.6, 1.8], [-1.1, 3.3, -0.5, 1.9], [0.3, 4.4, -0.8, 1.6]].forEach((s) => {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(s[3], 1), mat(0x4f7a3a, { flatShading: true }));
    crown.position.set(s[0], s[1], s[2]);
    tree.add(crown);
  });
  tree.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  tree.position.set(G.tree.c[0], 0, -G.tree.c[1]);
  scene.add(tree);
  const white = mat(0xf2efe8);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), white);
  ped.position.set(G.statue[0], 0.55, -G.statue[1]);
  const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.75, 10), white);
  fig.position.set(G.statue[0], 1.48, -G.statue[1]);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), white);
  head.position.set(G.statue[0], 1.95, -G.statue[1]);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.45), white);
  bench.position.set(G.bench[0], 0.23, -G.bench[1]);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.72, 16), white);
  table.position.set(G.bench[0] + 1.3, 0.36, -G.bench[1] + 0.2);
  [ped, fig, head, bench, table].forEach((m) => { m.castShadow = true; scene.add(m); });

  // Floors of every room and space, by kind.
  H.rooms.concat(H.spaces).forEach((r) => {
    if (r.id === "stairwell" || r.id === "steelstair") return;
    const y = r.level === 0 ? 0.025 : F[r.level] + 0.004;
    scene.add(flat(H.polyOf(r), KIND[r.kind] || 0xdddddd, y));
  });

  // Slabs: the apartment floor over the drive, and the roof over the guest wing.
  H.rooms.concat(H.spaces).forEach((r) => {
    if (r.level !== 1 || r.id === "stairwell") return;
    scene.add(slab(H.polyOf(r), 0xe9e5dc, F[1], 0.2));
  });
  scene.add(slab(rectPoly([-27.4, -0.95, -13.1, 3.4]), 0xd9d3c7, F[2], 0.18));
  scene.add(slab(rectPoly([-28.4, -0.95, -27.4, 0.0]), 0x8f8a80, F[2], 0.08));

  // Walls inside and around the rooms.
  const wallMat = mat(0xf3f0e9), glassMat = mat(0xbcd6ea, GLASS);
  computeWalls().forEach((w) => {
    const base = F[w.level], top = base + WALL_H[w.level];
    const m = bar(w.ax, w.ay, w.bx, w.by, base, top, w.glass ? 0.05 : WALL_T, w.glass ? glassMat : wallMat);
    if (!m) return;
    if (w.glass) { m.castShadow = false; m.renderOrder = 2; }
    scene.add(m);
    S.colliders.push({ ax: w.ax, ay: w.ay, bx: w.bx, by: w.by, base, top, half: WALL_T / 2 });
    if (w.glass) {
      // white mullions every meter or so
      const len = Math.hypot(w.bx - w.ax, w.by - w.ay), n = Math.max(1, Math.round(len / 1.1));
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = w.ax + (w.bx - w.ax) * u, y = w.ay + (w.by - w.ay) * u;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, top - base, 0.07), mat(0xfafafa));
        post.position.set(x, (base + top) / 2, -y);
        scene.add(post);
      }
    }
  });
  // The stair to the apartment runs inside its own walls.
  S.colliders.push({ ax: -7.4, ay: 14.8, bx: -2.6, by: 14.8, base: 0, top: WALL_H[0], half: WALL_T / 2 });
  scene.add(bar(-7.4, 14.8, -2.6, 14.8, 0, WALL_H[0], WALL_T, wallMat));

  // The façade on the building line, with its doors and windows.
  [0, 1].forEach((lv) => {
    const f = H.facade[lv], base = F[lv], top = base + WALL_H[lv];
    const open = [];
    f.doors.forEach((r) => open.push({ a: r[0], b: r[1], type: "door" }));
    f.windows.forEach((r) => open.push({ a: r[0], b: r[1], type: "window" }));
    open.sort((p, q) => p.a - q.a);
    const pieces = [];
    let y = f.from;
    open.forEach((o) => {
      if (o.a > y) pieces.push({ a: y, b: o.a, type: "solid" });
      pieces.push(o);
      y = o.b;
    });
    if (f.to > y) pieces.push({ a: y, b: f.to, type: "solid" });
    pieces.forEach((p) => {
      const ax = H.streetX(p.a), bx = H.streetX(p.b);
      const add = (b0, b1, m) => { const w = bar(ax, p.a, bx, p.b, b0, b1, m === glassMat ? 0.05 : WALL_T, m); if (w) scene.add(w); };
      if (p.type === "solid") add(base, top, wallMat);
      else if (p.type === "door") add(base + 2.1, top, wallMat);
      else { add(base, base + 0.9, wallMat); add(base + 0.9, base + 2.1, glassMat); add(base + 2.1, top, wallMat); }
      if (p.type !== "door") S.colliders.push({ ax, ay: p.a, bx, by: p.b, base, top, half: WALL_T / 2 });
    });
  });
  // The pier between the gate and the neighbour.
  scene.add(bar(H.streetX(19.35), 19.35, H.lot[1][0], H.lot[1][1], 0, 2.7, 0.3, wallMat));
  S.colliders.push({ ax: H.streetX(19.35), ay: 19.35, bx: H.lot[1][0], by: H.lot[1][1], base: 0, top: 2.7, half: 0.15 });

  // Boundary walls: low along the drive, garden height elsewhere.
  const L = H.lot, fence = mat(0xd6cfc1);
  const sNorth = (-16.2 - L[1][0]) / (L[2][0] - L[1][0]);
  const q = [-16.2, L[1][1] + sNorth * (L[2][1] - L[1][1])];
  const runs = [[L[1], q, 1.2], [q, L[2], 1.8], [L[2], L[3], 1.8], [L[3], L[4], 1.8],
                [L[4], L[5], 1.8], [L[5], L[6], 1.8], [L[6], L[0], 1.8]];
  runs.forEach((r) => {
    const m = bar(r[0][0], r[0][1], r[1][0], r[1][1], 0, r[2], 0.2, fence);
    if (m) scene.add(m);
    S.colliders.push({ ax: r[0][0], ay: r[0][1], bx: r[1][0], by: r[1][1], base: 0, top: r[2], half: 0.1 });
  });
  // Columns along the drive, under the apartment.
  [-4.4, -7.8, -11.2, -14.6, -16.05].forEach((x) => {
    const yb = L[1][1] + ((x - L[1][0]) / (L[2][0] - L[1][0])) * (L[2][1] - L[1][1]) - 0.2;
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.25, F[1] - 0.2, 0.25), wallMat);
    col.position.set(x, (F[1] - 0.2) / 2, -yb);
    col.castShadow = true;
    scene.add(col);
  });

  // Railings on the balconies and around the roof terrace.
  const rail = mat(0xeeeeec), deco = mat(0x8a4b2a);
  H.railings.forEach((r) => {
    const a = r.a || (r.x !== undefined ? [r.x, r.from] : [r.from, r.y]);
    const b = r.b || (r.x !== undefined ? [r.x, r.to] : [r.to, r.y]);
    const base = F[r.level], top = base + 1.0;
    const m = bar(a[0], a[1], b[0], b[1], base, top, r.glass ? 0.03 : 0.06, r.glass ? glassMat : r.deco ? deco : rail);
    if (m) scene.add(m);
    S.colliders.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], base, top, half: 0.05 });
  });

  // Stairs: solid steps up to the apartment, open steel ones to the roof.
  const ramp = H.ramps[0], steps = 16, run = (ramp.from - ramp.to) / steps;
  for (let i = 0; i < steps; i++) {
    const x2 = ramp.from - i * run, x1 = x2 - run, h = ((i + 1) / steps) * ramp.h2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(run, h, ramp.across[1] - ramp.across[0]), mat(0xcfc7b8));
    m.position.set((x1 + x2) / 2, h / 2, -(ramp.across[0] + ramp.across[1]) / 2);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }
  const sr = H.ramps[1], sSteps = 14, sRun = (sr.from - sr.to) / sSteps, steel = mat(0x4b4b4b, { roughness: 0.6, metalness: 0.4 });
  for (let i = 0; i < sSteps; i++) {
    const y = sr.from - (i + 0.5) * sRun, h = ((i + 1) / sSteps) * sr.h2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(sr.across[1] - sr.across[0], 0.04, sRun * 0.9), steel);
    m.position.set((sr.across[0] + sr.across[1]) / 2, h, -y);
    m.castShadow = true;
    scene.add(m);
  }
  sr.across.forEach((x) => {
    const len = Math.hypot(sr.from - sr.to, sr.h2);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, len), steel);
    s.position.set(x, sr.h2 / 2, -(sr.from + sr.to) / 2);
    s.rotation.x = -Math.atan2(sr.h2, sr.from - sr.to);
    scene.add(s);
  });

  // The grill: brick block with a chimney. The carport and galería posts.
  const brick = mat(0xa0583a);
  const grill = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.7), brick);
  grill.position.set(-30.0, 0.8, 0.55);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.9, 0.5), brick);
  chimney.position.set(-30.0, 2.55, 0.6);
  [grill, chimney].forEach((m) => { m.castShadow = true; scene.add(m); });
  S.colliders.push({ ax: -30.75, ay: -0.55, bx: -29.25, by: -0.55, base: 0, top: 1.6, half: 0.35 });
  const posts = [[-37.8, 7.4], [-35.5, 7.4], [-33.2, 7.4], [-33.2, 0.3],
                 [-27.3, 5.2], [-24.6, 5.2], [-21.9, 5.2], [-19.5, 5.2], [-32.7, 2.7]];
  posts.forEach((p) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.12), mat(0xf4f4f2));
    m.position.set(p[0], 1.25, -p[1]);
    m.castShadow = true;
    scene.add(m);
  });

  // Roofs, which the walk shows and the overview hides by default.
  const roofs = S.roofs, metal = mat(0x7e95a8, { roughness: 0.55, metalness: 0.3 });
  H.roofs.forEach((r) => {
    if (r.vault) {
      const rr = r.rect, w = rr[2] - rr[0], len = rr[3] - rr[1];
      const geo = new THREE.CylinderGeometry(w / 2, w / 2, len, 28, 1, true, Math.PI / 2, Math.PI);
      geo.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(geo, mat(0xf5f5f0, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
      m.scale.y = 0.35;
      m.position.set((rr[0] + rr[2]) / 2, r.h, -(rr[1] + rr[3]) / 2);
      roofs.add(m);
      return;
    }
    roofs.add(slab(H.polyOf(r), r.id === "main" ? 0x8ea3b4 : 0xb8bcbf, r.h + 0.12, 0.12, { roughness: 0.6, metalness: 0.25 }));
  });
  const apt = [[-16.2, 13.6], [H.streetX(13.6), 13.6], [H.streetX(19.4), 19.4], [-16.2, 19.4]];
  roofs.add(slab(apt, 0x9a8f80, F[1] + WALL_H[1] + 0.15, 0.15));
  roofs.add(slab(rectPoly([-27.4, 0.0, -24.0, 3.4]), 0x9a8f80, F[2] + WALL_H[2] + 0.12, 0.12));
  // White ceilings under the roofs, seen only from inside.
  const ceiling = { side: THREE.BackSide };
  roofs.add(flat(H.polyOf(H.roofs[0]), 0xf6f4ee, H.roofs[0].h - 0.005, ceiling));
  roofs.add(flat(apt, 0xf6f4ee, F[1] + WALL_H[1] - 0.005, ceiling));
  roofs.add(flat(rectPoly([-27.4, 0.0, -24.0, 3.4]), 0xf6f4ee, F[2] + WALL_H[2] - 0.005, ceiling));
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.0, 16), metal);
  tank.position.set(-25.7, F[2] + WALL_H[2] + 0.65, -1.7);
  tank.castShadow = true;
  roofs.add(tank);
  roofs.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(roofs);

  // Where you can stand above the ground: the apartment and the roof terrace.
  H.rooms.concat(H.spaces).forEach((r) => {
    if (r.level === 0 || r.id === "stairwell" || r.kind === "roof") return;
    S.surfaces.push({ poly: H.polyOf(r), h: F[r.level], level: r.level });
  });

  scene.add(S.labels);
  buildLabels();
}

/* ---------- walking ---------- */

function floorAt(x, y, feet) {
  let best = 0;
  S.surfaces.forEach((s) => { if (s.h <= feet + STEP && s.h > best && inside(x, y, s.poly)) best = s.h; });
  H.ramps.forEach((r) => {
    const along = r.axis === "x" ? x : y, across = r.axis === "x" ? y : x;
    if (across < r.across[0] || across > r.across[1]) return;
    if (along < Math.min(r.from, r.to) || along > Math.max(r.from, r.to)) return;
    const h = r.h1 + ((r.h2 - r.h1) * (along - r.from)) / (r.to - r.from);
    if (h <= feet + STEP && h > best) best = h;
  });
  return best;
}
function collide(p, feet) {
  for (let pass = 0; pass < 3; pass++) {
    S.colliders.forEach((w) => {
      if (w.top <= feet + 0.05 || w.base >= feet + BODY) return;
      const dx = w.bx - w.ax, dy = w.by - w.ay, l2 = dx * dx + dy * dy || 1e-9;
      let u = ((p.x - w.ax) * dx + (p.y - w.ay) * dy) / l2;
      u = Math.max(0, Math.min(1, u));
      const cx = w.ax + u * dx, cy = w.ay + u * dy;
      let ex = p.x - cx, ey = p.y - cy;
      const d = Math.hypot(ex, ey), min = RADIUS + w.half;
      if (d >= min) return;
      if (d < 1e-6) { const n = Math.hypot(dy, dx) || 1; ex = -dy / n; ey = dx / n; } else { ex /= d; ey /= d; }
      p.x = cx + ex * min;
      p.y = cy + ey * min;
    });
  }
}
function levelOf(p) {
  if (p.feet < 1.4) return 0;
  return S.surfaces.some((s) => s.level === 2 && inside(p.x, p.y, s.poly)) ? 2 : 1;
}
function step(dt) {
  const p = S.player, k = S.keys;
  let f = (k.forward ? 1 : 0) - (k.back ? 1 : 0) + S.joy.f;
  let s = (k.right ? 1 : 0) - (k.left ? 1 : 0) + S.joy.s;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const speed = k.run ? 3.4 : 1.7;
  const fx = -Math.sin(p.yaw), fy = Math.cos(p.yaw), rx = Math.cos(p.yaw), ry = Math.sin(p.yaw);
  const q = { x: p.x + (fx * f + rx * s) * speed * dt, y: p.y + (fy * f + ry * s) * speed * dt };
  q.x = Math.max(-70, Math.min(40, q.x));
  q.y = Math.max(-40, Math.min(60, q.y));
  collide(q, p.feet);
  p.x = q.x; p.y = q.y;
  const ground = floorAt(p.x, p.y, p.feet);
  if (p.vz === 0 && p.feet - ground <= STEP) p.feet = ground;
  else {
    p.vz -= GRAVITY * dt;
    p.feet += p.vz * dt;
    if (p.feet <= ground) { p.feet = ground; p.vz = 0; }
  }
  S.camera.position.set(p.x, p.feet + EYE, -p.y);
  S.camera.rotation.set(p.pitch, p.yaw, 0, "YXZ");
}

/* ---------- the little map ---------- */

function drawMinimap() {
  const c = S.mini;
  if (!c || c.offsetParent === null) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(c.clientWidth * dpr), Hh = Math.round(c.clientHeight * dpr);
  if (c.width !== W || c.height !== Hh) { c.width = W; c.height = Hh; }
  const g = c.getContext("2d");
  const x0 = -41.2, x1 = 3.4, y0 = -2.2, y1 = 20.6;
  const k = Math.min(W / (x1 - x0), Hh / (y1 - y0));
  const ox = (W - k * (x1 - x0)) / 2, oy = (Hh - k * (y1 - y0)) / 2;
  const mx = (x) => ox + (x - x0) * k, my = (y) => Hh - oy - (y - y0) * k;
  const path = (poly) => { g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(mx(p[0]), my(p[1])) : g.moveTo(mx(p[0]), my(p[1])))); g.closePath(); };
  g.clearRect(0, 0, W, Hh);
  g.fillStyle = "rgba(247,246,242,0.94)";
  g.fillRect(0, 0, W, Hh);
  path(H.lot); g.fillStyle = "#DDEBD2"; g.fill();
  g.lineWidth = dpr; g.strokeStyle = "#6B6A65"; g.stroke();
  const lv = S.mode === "walk" ? levelOf(S.player) : 0;
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  H.rooms.concat(H.spaces).forEach((r) => {
    const here = lv === 0 ? r.level === 0 : r.level > 0;
    if (!here) return;
    path(H.polyOf(r));
    g.fillStyle = hex(KIND[r.kind] || 0xdddddd); g.fill();
    g.strokeStyle = "#2B2B28"; g.lineWidth = dpr * 0.8; g.stroke();
  });
  if (S.mode !== "walk") return;
  const p = S.player, px = mx(p.x), py = my(p.y);
  const a = Math.atan2(Math.cos(p.yaw), -Math.sin(p.yaw)); // heading in plan coords
  g.fillStyle = "rgba(194,65,12,0.25)";
  g.beginPath(); g.moveTo(px, py);
  g.arc(px, py, 26 * dpr, -a - 0.6, -a + 0.6); g.closePath(); g.fill();
  g.fillStyle = "#C2410C";
  g.beginPath(); g.arc(px, py, 4 * dpr, 0, Math.PI * 2); g.fill();
}

/* ---------- controls, HUD and loop ---------- */

function hud() {
  const lv = levelOf(S.player);
  const level = $("level");
  if (level) {
    if (S.mode !== "walk") level.textContent = "";
    else if (lv === 0) level.textContent = t("walk.level.ground");
    else if (lv === 1) level.textContent = t("walk.level.upper");
    else level.textContent = t("walk.level.roof");
  }
  const hint = $("hint");
  if (hint) hint.textContent = S.mode === "orbit" ? t("walk.hint.orbit") : touch ? t("walk.hint.touch") : t("walk.hint.desktop");
  const btn = $("start-btn");
  if (btn) btn.textContent = touch ? t("walk.start.touch") : t("walk.start");
  const startBox = $("start");
  if (startBox) startBox.hidden = S.mode !== "walk" || S.active;
  const joy = $("joy");
  if (joy) joy.hidden = !(touch && S.mode === "walk" && S.active);
  S.lastLevel = lv;
}

function setToggle(id, on) {
  const b = $(id);
  if (!b) return;
  b.classList.toggle("on", on);
  b.setAttribute("aria-pressed", on ? "true" : "false");
}

function setMode(mode) {
  S.mode = mode;
  $("mode-walk").classList.toggle("on", mode === "walk");
  $("mode-orbit").classList.toggle("on", mode === "orbit");
  $("mode-walk").setAttribute("aria-pressed", mode === "walk" ? "true" : "false");
  $("mode-orbit").setAttribute("aria-pressed", mode === "orbit" ? "true" : "false");
  if (mode === "orbit") {
    if (document.pointerLockElement) document.exitPointerLock();
    S.active = false;
    if (!S.orbit) {
      S.orbit = new OrbitControls(S.camera, S.canvas);
      S.orbit.enableDamping = true;
      S.orbit.maxPolarAngle = 1.45;
      S.orbit.minDistance = 4;
      S.orbit.maxDistance = 110;
    }
    S.orbit.enabled = true;
    S.camera.position.set(CENTER.x + 4, 22, -CENTER.y + 22);
    S.orbit.target.set(CENTER.x - 1, 0, -CENTER.y);
    S.orbit.update();
    S.roofs.visible = false;
  } else {
    if (S.orbit) S.orbit.enabled = false;
    S.roofs.visible = true;
    step(0);
  }
  setToggle("toggle-roofs", S.roofs.visible);
  hud();
}

function bindControls() {
  const canvas = S.canvas, keys = S.keys;
  const map = { KeyW: "forward", ArrowUp: "forward", KeyS: "back", ArrowDown: "back",
                KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
                ShiftLeft: "run", ShiftRight: "run" };
  const live = () => S.running && S.mode === "walk" && (S.active || document.pointerLockElement === canvas);
  document.addEventListener("keydown", (e) => {
    if (!live() || !map[e.code]) return;
    keys[map[e.code]] = true;
    if (e.code.indexOf("Arrow") === 0) e.preventDefault();
  });
  document.addEventListener("keyup", (e) => { if (map[e.code]) keys[map[e.code]] = false; });
  window.addEventListener("blur", () => { Object.keys(keys).forEach((k) => { keys[k] = false; }); });

  // Desktop: click to capture the mouse; if the browser refuses, drag to look.
  $("start-btn").addEventListener("click", () => {
    if (touch) { S.active = true; hud(); return; }
    if (canvas.requestPointerLock) canvas.requestPointerLock(); else { S.active = true; hud(); }
  });
  document.addEventListener("pointerlockchange", () => {
    S.active = document.pointerLockElement === canvas;
    if (!S.active) Object.keys(keys).forEach((k) => { keys[k] = false; });
    hud();
  });
  document.addEventListener("pointerlockerror", () => { S.active = true; S.dragLook = true; hud(); });
  document.addEventListener("mousemove", (e) => {
    if (S.mode !== "walk" || document.pointerLockElement !== canvas) return;
    look(e.movementX, e.movementY, 0.0022);
  });
  let drag = null;
  canvas.addEventListener("mousedown", (e) => { if (S.mode === "walk" && S.dragLook) drag = [e.clientX, e.clientY]; });
  window.addEventListener("mouseup", () => { drag = null; });
  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    look(e.clientX - drag[0], e.clientY - drag[1], 0.004);
    drag = [e.clientX, e.clientY];
  });

  // Touch: the left thumb moves, a drag anywhere else looks around.
  const joy = $("joy"), knob = joy.querySelector(".knob");
  let joyId = null, lookId = null, last = null;
  joy.addEventListener("touchstart", (e) => {
    e.preventDefault();
    joyId = e.changedTouches[0].identifier;
    joyMove(e.changedTouches[0]);
  }, { passive: false });
  function joyMove(tch) {
    const r = joy.getBoundingClientRect(), R = r.width / 2;
    let dx = (tch.clientX - (r.left + R)) / R, dy = (tch.clientY - (r.top + R)) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    S.joy.s = dx; S.joy.f = -dy;
    knob.style.transform = "translate(" + (dx * R * 0.6) + "px," + (dy * R * 0.6) + "px)";
  }
  canvas.addEventListener("touchstart", (e) => {
    if (S.mode !== "walk") return;
    const tch = e.changedTouches[0];
    lookId = tch.identifier; last = [tch.clientX, tch.clientY];
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    Array.prototype.forEach.call(e.changedTouches, (tch) => {
      if (tch.identifier === joyId) joyMove(tch);
      else if (tch.identifier === lookId && last) {
        look(tch.clientX - last[0], tch.clientY - last[1], 0.005);
        last = [tch.clientX, tch.clientY];
      }
    });
    if (joyId !== null || lookId !== null) { if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  const end = (e) => {
    Array.prototype.forEach.call(e.changedTouches, (tch) => {
      if (tch.identifier === joyId) { joyId = null; S.joy.f = 0; S.joy.s = 0; knob.style.transform = ""; }
      if (tch.identifier === lookId) { lookId = null; last = null; }
    });
  };
  window.addEventListener("touchend", end);
  window.addEventListener("touchcancel", end);

  // Buttons.
  $("mode-walk").addEventListener("click", () => setMode("walk"));
  $("mode-orbit").addEventListener("click", () => setMode("orbit"));
  $("toggle-roofs").addEventListener("click", () => { S.roofs.visible = !S.roofs.visible; setToggle("toggle-roofs", S.roofs.visible); });
  $("toggle-labels").addEventListener("click", () => { S.labels.visible = !S.labels.visible; setToggle("toggle-labels", S.labels.visible); });
  $("toggle-full").addEventListener("click", () => {
    const stage = $("stage");
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) stage.requestFullscreen();
  });
  document.addEventListener("fullscreenchange", () => setToggle("toggle-full", !!document.fullscreenElement));
  document.addEventListener("idioma", () => { buildLabels(); hud(); });
}

function look(dx, dy, k) {
  const p = S.player;
  p.yaw -= dx * k;
  p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - dy * k));
}

function resize() {
  const stage = $("stage");
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  S.renderer.setSize(w, h, false);
  S.camera.aspect = w / h;
  S.camera.updateProjectionMatrix();
}

function loop(now) {
  if (!S.running) return;
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - (S.last || now)) / 1000);
  S.last = now;
  if (S.mode === "walk") step(dt); else if (S.orbit) S.orbit.update();
  if (S.mode === "walk" && levelOf(S.player) !== S.lastLevel) hud();
  S.renderer.render(S.scene, S.camera);
  S.frame = (S.frame || 0) + 1;
  if (S.frame % 3 === 0) drawMinimap();
}

/* ---------- public ---------- */

export function start() {
  if (S) { resume(); return; }
  const canvas = $("walk-canvas");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    const m = $("walk-msg");
    m.hidden = false;
    m.textContent = t("walk.nowebgl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfe3f3);
  scene.fog = new THREE.Fog(0xcfe3f3, 70, 170);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);

  // three.js lights are physical now: these numbers are about π times the
  // old ones.
  scene.add(new THREE.HemisphereLight(0xf4f7fb, 0x8a9474, 2.7));
  // Rooms under a roof only get this and the sky light: enough to see them.
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  // The sun is in the north here; a morning sun from the north-east lights
  // the street front you arrive at.
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.4);
  sun.position.set(CENTER.x + 16, 34, -CENTER.y - 24);
  sun.target.position.set(CENTER.x, 0, -CENTER.y);
  sun.castShadow = true;
  sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 100 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  S = {
    canvas, renderer, scene, camera,
    roofs: new THREE.Group(), labels: new THREE.Group(),
    colliders: [], surfaces: [],
    player: { x: H.start.x, y: H.start.y, feet: 0, vz: 0, yaw: H.start.yaw, pitch: -0.05 },
    keys: {}, joy: { f: 0, s: 0 },
    mode: "walk", active: false, running: true, mini: $("minimap")
  };
  buildScene();
  bindControls();
  new ResizeObserver(resize).observe($("stage"));
  resize();
  setMode("walk");
  setToggle("toggle-labels", true);
  requestAnimationFrame(loop);
}

export function pause() {
  if (!S) return;
  S.running = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

export function resume() {
  if (!S || S.running) return;
  S.running = true;
  S.last = 0;
  resize();
  hud();
  requestAnimationFrame(loop);
}
