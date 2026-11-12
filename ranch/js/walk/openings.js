/* Every door and window of the survey: the wall above, the sill, the frame and what closes it. */
import * as THREE from "three";
import { BASE, F, H, S } from "./core.js";
import { addDoor } from "./doors.js";
import { bar } from "./geometry.js";
import { M, mat, texMat } from "./materials.js";
import { texFor } from "./textures.js";
import { collider, wallBox } from "./walls.js";

/* A window in the gap from a to b: glass, a white frame with mullions, and
   bars outside where the photos show them. */
export const BARS = { V4: 1, V7: 1, V8: 1, V9: 1, V20: 1, V21: 1, V22: 1, V23: 1 };

export function windowIn(o, zf, r1, r2) {
  const a = o.a, b = o.b, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  const z0 = zf + o.sill, z1 = zf + o.head, ang = Math.atan2(dy, dx);
  const add = (m) => { if (m) S.static.add(m); return m; };
  if (o.kind === "block") { add(bar(a[0], a[1], b[0], b[1], z0, z1, 0.09, texMat("blocks"))); return; }
  if (o.round) {
    // a porthole: the wall stays whole, with a ring and its glass on both faces
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], h = zf + 1.75;
    [1, -1].forEach((s) => {
      const k = o.t / 2 + 0.012;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), M.trim);
      ring.position.set(c[0] + nx * s * k, h, -(c[1] + ny * s * k));
      ring.rotation.y = ang;
      const pane = new THREE.Mesh(new THREE.CircleGeometry(0.21, 24), mat(0x9fc3dc, { roughness: 0.2, side: THREE.DoubleSide }));
      pane.position.copy(ring.position);
      pane.rotation.y = ang;
      S.static.add(ring, pane);
    });
    return;
  }
  const glass = add(bar(a[0], a[1], b[0], b[1], z0 + 0.03, z1 - 0.03, 0.02, M.glass));
  if (glass) glass.castShadow = false;
  const d = Math.min(o.t, 0.12);
  add(bar(a[0], a[1], b[0], b[1], z0, z0 + 0.05, d, M.trim));
  add(bar(a[0], a[1], b[0], b[1], z1 - 0.05, z1, d, M.trim));
  if (z1 - z0 > 2.25) add(bar(a[0], a[1], b[0], b[1], zf + 2.05, zf + 2.1, d, M.trim));
  const n = Math.max(1, Math.round(len / 0.95));
  for (let i = 0; i <= n; i++) {
    const j = new THREE.Mesh(new THREE.BoxGeometry(0.05, z1 - z0, d), M.trim);
    j.position.set(a[0] + dx * i / n, (z0 + z1) / 2, -(a[1] + dy * i / n));
    j.rotation.y = ang;
    S.static.add(j);
  }
  const out1 = !r1 || r1.kind === "covered", out2 = !r2 || r2.kind === "covered";
  if (BARS[o.id] && o.level === 0 && out1 !== out2) {
    const k = (out1 ? 1 : -1) * (o.t / 2 + 0.03);
    const m = new THREE.MeshStandardMaterial({ map: texFor("bars", len, z1 - z0), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 });
    const g = add(bar(a[0] + nx * k, a[1] + ny * k, b[0] + nx * k, b[1] + ny * k, z0, z1, 0.02, m));
    if (g) g.castShadow = false;
  }
}

/* Every opening of the survey: the wall above it, the wall under a window,
   the block under a door up to the floor, and what closes it. */
export function buildOpenings() {
  H.openings.forEach((o) => {
    const lv = o.level, a = o.a, b = o.b;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], off = o.t / 2 + 0.22;
    const r1 = H.at(mid[0] + nx * off, mid[1] + ny * off, lv), r2 = H.at(mid[0] - nx * off, mid[1] - ny * off, lv);
    // the higher floor of the two sides carries the threshold
    const zf = Math.max(r1 ? r1.z : -9, r2 ? r2.z : -9, lv === 0 ? 0 : F[lv]);
    const ta = H.topAt(a[0], a[1], lv), tb = H.topAt(b[0], b[1], lv);
    if (o.kind === "high") {
      // a high window the survey draws inside the wall: its glass on both faces
      [1, -1].forEach((s) => {
        const k = s * (o.t / 2 + 0.008);
        const g = bar(a[0] + nx * k, a[1] + ny * k, b[0] + nx * k, b[1] + ny * k, zf + o.sill, zf + o.head, 0.012, mat(0x9fc3dc, { roughness: 0.2 }));
        const f = bar(a[0] + nx * k, a[1] + ny * k, b[0] + nx * k, b[1] + ny * k, zf + o.sill - 0.04, zf + o.sill, 0.03, M.trim);
        [g, f].forEach((m) => { if (m) { m.castShadow = false; S.static.add(m); } });
      });
      return;
    }
    const head = zf + (o.round ? o.sill : o.head);
    wallBox(a, b, o.t, head, Math.max(ta, head), Math.max(tb, head));
    if (/window|block/.test(o.kind)) {
      if (o.sill > 0.02) wallBox(a, b, o.t, BASE[lv], zf + o.sill, zf + o.sill);
      windowIn(o, zf, r1, r2);
      collider(a[0], a[1], b[0], b[1], BASE[lv], Math.max(ta, tb), o.t / 2);
      return;
    }
    if (lv === 0 && zf > 0.02) wallBox(a, b, o.t + 0.02, 0, zf, zf, M.sill);
    if (o.kind === "open") return;
    // a casing round the door: dark wood, or white on the glazed ones
    const glazed = /glass/.test(o.leaf || ""), trim = glazed ? M.trim : M.casing, ang = Math.atan2(dy, dx);
    [a, b].forEach((p) => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.07, o.head, o.t + 0.05), trim);
      jamb.position.set(p[0], zf + o.head / 2, -p[1]);
      jamb.rotation.y = ang;
      S.static.add(jamb);
    });
    const top = bar(a[0], a[1], b[0], b[1], zf + o.head, zf + o.head + 0.07, o.t + 0.05, trim);
    if (top) S.static.add(top);
    const s = o.swing || 1, dbl = o.kind === "double" || o.hinge === "ab";
    const hinge = o.hinge === "b" ? [b, a] : [a, b];
    addDoor(hinge[0], hinge[1], zf, dbl && o.leaf === "glass" ? "double-glass" : o.leaf, [nx * s, ny * s], o.head, dbl,
            o.fold ? { deg: o.fold, off: o.t / 2 + 0.03 } : null);
  });
  // the vehicle gate on the building line opens inward
  const g = H.gate;
  addDoor(g.a, g.b, 0, "gate", [-H.OUT[0], -H.OUT[1]], g.h, true);
}
