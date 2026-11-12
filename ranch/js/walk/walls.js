/* Walls from the survey's outlines, raised to the heights of its sections, and the colliders that stop you. */
import * as THREE from "three";
import { BASE, H, S, t } from "./core.js";
import { bx, inside, quad } from "./geometry.js";
import { M } from "./materials.js";

/* Clips a polygon to the rectangle [x1, y1, x2, y2]. */
export function clipRect(poly, r) {
  const edges = [[1, 0, -r[0]], [-1, 0, r[2]], [0, 1, -r[1]], [0, -1, r[3]]];
  let out = poly;
  for (const e of edges) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length];
      const da = e[0] * a[0] + e[1] * a[1] + e[2], db = e[0] * b[0] + e[1] * b[1] + e[2];
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const u = da / (da - db); out.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]); }
    }
    if (out.length < 3) return [];
  }
  // drop repeated corners
  return out.filter((p, i) => { const q = out[(i + 1) % out.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5; });
}

export function areaOf(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}

export function meshOf(pos, uv, material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* A flat or sloping face over a plan outline: zf(x, y) is its height. */
export function sloped(poly, zf, material) {
  const pos = [], uv = [];
  THREE.ShapeUtils.triangulateShape(poly.map((q) => new THREE.Vector2(q[0], q[1])), []).forEach((f) => {
    let t = f.map((i) => poly[i]);
    if (areaOf(t) < 0) t = [t[0], t[2], t[1]];      // facing up
    t.forEach((q) => { pos.push(q[0], zf(q[0], q[1]), -q[1]); uv.push(q[0], q[1]); });
  });
  return meshOf(pos, uv, material);
}

/* A solid from `base` up to a top that may slope: poly is its plan outline,
   zf(x, y) the height of its top at each corner. keep(a, b), when given,
   returns the stretches of a side to draw, as [from, to] fractions of it. */
export function prism(poly, base, zf, material, keep) {
  const n = poly.length, pos = [], uv = [], ccw = areaOf(poly) > 0;
  const P = (q, h) => [q[0], h, -q[1]];
  let run = 0;
  for (let i = 0; i < n; i++) {
    const a = ccw ? poly[i] : poly[(i + 1) % n], b = ccw ? poly[(i + 1) % n] : poly[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), za = zf(a[0], a[1]), zb = zf(b[0], b[1]);
    const parts = keep ? keep(a, b) : [[0, 1]];
    parts.forEach((k) => {
      const p = [a[0] + (b[0] - a[0]) * k[0], a[1] + (b[1] - a[1]) * k[0]], q = [a[0] + (b[0] - a[0]) * k[1], a[1] + (b[1] - a[1]) * k[1]];
      const zp = zf(p[0], p[1]), zq = zf(q[0], q[1]), u0 = run + len * k[0], u1 = run + len * k[1];
      pos.push(...P(p, base), ...P(q, base), ...P(q, zq), ...P(p, base), ...P(q, zq), ...P(p, zp));
      uv.push(u0, base, u1, base, u1, zq, u0, base, u1, zq, u0, zp);
    });
    run += len;
  }
  THREE.ShapeUtils.triangulateShape(poly.map((q) => new THREE.Vector2(q[0], q[1])), []).forEach((f) => {
    let t = f.map((i) => poly[i]);
    if (areaOf(t) < 0) t = [t[0], t[2], t[1]];
    t.forEach((q) => { pos.push(...P(q, zf(q[0], q[1]))); uv.push(q[0], q[1]); });
  });
  return meshOf(pos, uv, material);
}

/* A piece of wall from a to b, `t` thick, from z0 up to z1a at a and z1b at b. */
export function wallBox(a, b, t, z0, z1a, z1b, material) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  if (len < 0.01 || Math.max(z1a, z1b) - z0 < 0.01) return null;
  const nx = (-dy / len) * t / 2, ny = (dx / len) * t / 2;
  const poly = [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]];
  const zf = (x, y) => z1a + (z1b - z1a) * Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (len * len)));
  const m = prism(poly, z0, zf, material || M.wall);
  S.static.add(m);
  return m;
}

export function inWall(x, y, level) {
  return S.wallPolys[level].some((w) => x >= w.bb[0] && x <= w.bb[2] && y >= w.bb[1] && y <= w.bb[3] && inside(x, y, w.poly));
}

/* Every wall outline of the survey, cut where the height changes (`tops`)
   and raised to it; its sides are what you bump into. */
export function buildWalls() {
  S.wallPolys = { 0: [], 1: [], 2: [] };
  [0, 1, 2].forEach((lv) => {
    const zones = H.tops.filter((z) => z.level === lv);
    H.wallsOf(lv).forEach((poly) => {
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      const bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      S.wallPolys[lv].push({ poly, bb });
      let top = BASE[lv] + 0.5;
      // Clipping a wall outline that runs round a room to one of the zones
      // can leave a sliver along the zone's edge, across the room. Draw a
      // side only where it is the wall's face: wall on one side of it, room
      // on the other.
      const face = (a, b) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 1e-6) return [];
        const nx = -(b[1] - a[1]) / len * 0.02, ny = (b[0] - a[0]) / len * 0.02, n = Math.max(1, Math.ceil(len / 0.04));
        const out = [];
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
          if (inside(x + nx, y + ny, poly) === inside(x - nx, y - ny, poly)) continue;
          const last = out[out.length - 1];
          if (last && Math.abs(last[1] - i / n) < 1e-9) last[1] = (i + 1) / n; else out.push([i / n, (i + 1) / n]);
        }
        return out;
      };
      zones.forEach((z) => {
        const r = z.rect;
        if (bb[2] < r[0] || bb[0] > r[2] || bb[3] < r[1] || bb[1] > r[3]) return;
        const piece = clipRect(poly, r);
        if (piece.length < 3 || Math.abs(areaOf(piece)) < 1e-4) return;
        const zf = (x) => z.z + (z.g || 0) * (x - r[0]);
        S.static.add(prism(piece, BASE[lv], zf, M.wall, face));
        piece.forEach((p) => { top = Math.max(top, zf(p[0])); });
      });
      // its sides are what you bump into, each as high as the wall is there
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = -(b[1] - a[1]) / len * 0.06, ny = (b[0] - a[0]) / len * 0.06;
        const h = Math.min(top, Math.max(H.topAt(mx, my, lv), H.topAt(mx + nx, my + ny, lv), H.topAt(mx - nx, my - ny, lv)));
        collider(a[0], a[1], b[0], b[1], BASE[lv], h, 0.005);
      }
    });
  });
}

/* Tiles or boards on a room's walls up to `h`: on every side of its outline
   that has a wall behind it (doors and windows don't). */
export function wainscot(r, h, material) {
  const poly = H.polyOf(r), ccw = areaOf(poly) > 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.12) continue;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, nx = ccw ? uy : -uy, ny = ccw ? -ux : ux;   // out of the room
    if (!inWall((a[0] + b[0]) / 2 + nx * 0.05, (a[1] + b[1]) / 2 + ny * 0.05, r.level)) continue;
    const p = [a[0] - nx * 0.012, a[1] - ny * 0.012], q = [b[0] - nx * 0.012, b[1] - ny * 0.012];
    const m = quad([[p[0], p[1], r.z], [q[0], q[1], r.z], [q[0], q[1], r.z + h], [p[0], p[1], r.z + h]], material);
    m.castShadow = false;
    S.static.add(m);
  }
}

export function collider(ax, ay, bx2, by2, base, top, half, door) {
  S.colliders.push({ ax, ay, bx: bx2, by: by2, base, top, half, door: door || null });
}
