/* Placing furniture from the data, its footprints (solid to walk into) and the baths. */
import * as THREE from "three";
import { DEG, H, S } from "./core.js";
import { bar, bx, byId, cy, place, zAt } from "./geometry.js";
import { M, mat } from "./materials.js";
import { BUILD } from "./pieces.js";
import { collider } from "./walls.js";

/* Footprints [width, depth] of the pieces you can't walk through. */
export const BLOCK = {
  bed: (p) => [(p.w || 0.9) + 0.06, 2.0], daybed: () => [1.95, 0.9], sofa: (p) => [p.w || 1.9, 0.85],
  armchair: () => [0.82, 0.85], dining: (p) => {
    const w = p.w || 1.0, d = p.d || w, n = p.chairs === undefined ? 4 : p.chairs;
    return [w + (n >= 2 ? 1.0 : 0), d + (n >= 4 ? 1.0 : n === 3 ? 0.5 : 0)];
  }, counter: (p) => [p.w || 2, 0.6],
  wardrobe: (p) => [p.w || 1.2, 0.56], closet: (p) => [p.w || 1.2, 0.5], desk: (p) => [(p.w || 1.6) + 0.06, 0.64],
  shelf: (p) => [p.w || 1.5, p.d || 0.4], fridge: () => [0.68, 0.68], sideboard: (p) => [p.w || 1.4, 0.45],
  car: () => [1.8, 4.3], washer: () => [0.6, 0.6], tub: () => [0.55, 0.5], tv: () => [1.0, 0.42],
  coffee: (p) => [p.w || 1.0, p.d || 0.55], console: () => [1.0, 0.36],
  nightstand: (p) => [p.w || 0.42, 0.38], side: () => [0.45, 0.45], lamp: () => [0.36, 0.36],
  bench: () => [1.5, 0.5], plant: () => [0.45, 0.45], bush: () => [0.9, 0.9],
  cafe: () => [1.6, 0.7]
};

export function blockPiece(type, p, x, y, level, rot) {
  if (!BLOCK[type]) return;
  const fp = BLOCK[type](p);
  solid(x, y, fp[0], fp[1], rot, level);
}

/* A solid box w by d (d toward the piece's front) at (x, y), turned rot. */
export function solid(x, y, w, d, rot, level) {
  const hw = w / 2, hd = d / 2, a = (rot || 0) * DEG;
  const c = Math.cos(a), s = Math.sin(a);
  // local (lx, ly) with ly toward the front; front is plan +y before turning
  const pt = (lx, ly) => [x + lx * c - ly * s, y + lx * s + ly * c];
  const q = [pt(-hw, -hd), pt(hw, -hd), pt(hw, hd), pt(-hw, hd)];
  const base = zAt(x, y, level || 0);
  for (let i = 0; i < 4; i++) collider(q[i][0], q[i][1], q[(i + 1) % 4][0], q[(i + 1) % 4][1], base, base + 0.85, 0.02);
  S.blocks.push({ poly: q, base });
}

/* A bath furnished from its outline: shower in a far corner, toilet on the
   far wall, basin beside the door. */
export const CURTAINS = [0x3f6fb5, 0x6fae6b, 0xd99ab0, 0x7fb3c9, 0xc9b26f, 0x9a8fc9, 0x6bb5a0];

export function bath(item, door, i) {
  const r = item.rect, x1 = r[0], y1 = r[1], x2 = r[2], y2 = r[3], lv = item.level, base = item.z;
  const toilet = () => {
    const g = new THREE.Group();
    cy(g, 0.17, 0.2, 0.38, 0, 0.19, -0.05, M.white, 16);
    cy(g, 0.2, 0.18, 0.06, 0, 0.41, -0.07, M.white, 16);
    bx(g, 0.38, 0.36, 0.17, 0, 0.6, 0.2, M.white);
    return g;
  };
  // the basin's back sits on the wall face, its mirror just in front of it
  const basin = () => {
    const g = new THREE.Group();
    cy(g, 0.06, 0.09, 0.78, 0, 0.39, 0.05, M.white, 12);
    bx(g, 0.5, 0.14, 0.4, 0, 0.84, 0.0, M.white);
    bx(g, 0.45, 0.6, 0.02, 0, 1.5, 0.18, M.mirror);
    return g;
  };
  const SH = 0.8;
  let shower, toi, bas;
  if (door === "s") { shower = [x1, y2 - SH]; toi = [x2 - 0.35, y2 - 0.38, 180]; bas = [x1 + 0.26, y1 + 0.6, 270]; }
  else if (door === "n") { shower = [x1, y1]; toi = [x2 - 0.35, y1 + 0.38, 0]; bas = [x1 + 0.26, y2 - 0.6, 270]; }
  else if (door === "w") { shower = [x2 - SH, y2 - SH]; toi = [x2 - 0.38, y1 + 0.35, 90]; bas = [x1 + 0.6, y1 + 0.25, 0]; }
  else { shower = [x1, y2 - SH]; toi = [x1 + 0.38, y1 + 0.35, 270]; bas = [x2 - 0.6, y1 + 0.25, 0]; }
  place(toilet(), toi[0], toi[1], lv, toi[2]);
  place(basin(), bas[0], bas[1], lv, bas[2]);
  // the toilet is solid; a pedestal basin is small enough to stand at
  solid(toi[0], toi[1], 0.38, 0.55, toi[2], lv);
  const sx = shower[0], sy = shower[1];
  const tray = new THREE.Mesh(new THREE.BoxGeometry(SH, 0.05, SH), M.white);
  tray.position.set(sx + SH / 2, base + 0.03, -(sy + SH / 2));
  S.static.add(tray);
  const curtain = mat(CURTAINS[i % CURTAINS.length]);
  // the curtain runs along the two sides that face the room
  const inX = Math.abs(sx - x1) < 0.01 ? sx + SH : sx;
  const inY = Math.abs(sy - y1) < 0.01 ? sy + SH : sy;
  const c1 = bar(inX, sy, inX, sy + SH, base + 0.15, base + 2.0, 0.015, curtain);
  const c2 = bar(sx, inY, sx + SH, inY, base + 0.15, base + 2.0, 0.015, curtain);
  [c1, c2].forEach((c) => { if (c) S.static.add(c); });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), M.steel);
  head.position.set(sx + SH / 2, base + 2.05, -(sy + SH / 2));
  S.static.add(head);
}

export function buildFurniture() {
  let bathIndex = 0;
  H.furniture.forEach((p) => {
    if (p.type === "bath") {
      const item = byId(p.room);
      if (item) bath({ rect: p.rect, level: p.level, z: item.z }, p.door, bathIndex++);
      return;
    }
    if (p.type === "curtain") {
      const z = zAt(p.a[0] - 0.3, (p.a[1] + p.b[1]) / 2, p.level);
      const m = bar(p.a[0], p.a[1], p.b[0], p.b[1], z + 0.05, z + p.h, 0.05, mat(p.color, { roughness: 1 }));
      if (m) S.static.add(m);
      return;
    }
    const make = BUILD[p.type];
    if (!make) return;
    place(make(p), p.at[0], p.at[1], p.level, p.rot);
    blockPiece(p.type, p, p.at[0], p.at[1], p.level, p.rot);
  });
}
