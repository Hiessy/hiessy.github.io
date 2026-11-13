/* Placing furniture from the data, its footprints (solid to walk into) and the baths. */
import { DEG, H, K, KZ, S } from "./core.js";
import { bath } from "./bathroom.js";
import { DECOR, curtain } from "./decor.js";
import { byId, inside, place, zAt } from "./geometry.js";
import { finishLights, lampGroup } from "./lights.js";
import { BUILD } from "./pieces.js";
import { PLANTS, ROWS } from "./plants.js";
import { collider, inWall } from "./walls.js";

/* Every piece by its type: furniture, what hangs on the walls, the garden's plants. */
export const PIECES = Object.assign({}, BUILD, DECOR, PLANTS);

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
  nightstand: (p) => [p.w || 0.42, 0.38], side: (p) => [p.w || 0.45, p.w || 0.45], lamp: () => [0.36, 0.36],
  bench: () => [1.5, 0.5], plant: () => [0.45, 0.45], bush: () => [0.9, 0.9],
  cafe: () => [1.6, 0.7], seat: () => [0.5, 0.5], hutch: (p) => [p.w || 0.8, 0.42],
  shrub: (p) => [0.7 * (p.size || 1), 0.7 * (p.size || 1)], boxwood: (p) => [0.6 * (p.size || 1), 0.6 * (p.size || 1)],
  urn: (p) => [0.4 * (p.size || 1), 0.4 * (p.size || 1)], ivypost: () => [0.5, 0.5]
};

/* Footprints are true sizes; the plan they are laid on is the survey's, K
   times smaller than the model is shown, so they shrink by K on it. */
export function blockPiece(type, p, x, y, level, rot) {
  if (!BLOCK[type]) return;
  const fp = BLOCK[type](p);
  solid(x, y, fp[0] / K, fp[1] / K, rot, level);
}

/* Where a piece `depth` deep (true size) goes when the data put it with its
   back to a wall: the wall is found behind the point and the piece set
   against its face. In a model drawn bigger than the survey a bed would
   otherwise stand off its wall. No wall close behind: the point is kept. */
export function backToWall(x, y, rot, depth, level) {
  const a = (rot || 0) * DEG, fx = -Math.sin(a), fy = Math.cos(a);
  if (inWall(x, y, level)) return [x, y];
  for (let s = 0.01; s <= depth / 2 + 0.25; s += 0.01) {
    if (!inWall(x - fx * s, y - fy * s, level)) continue;
    const k = depth / (2 * K) + 0.01 - (s - 0.01);
    return [x + fx * k, y + fy * k];
  }
  return [x, y];
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

/* What hangs on a wall. The data gives a point near the wall and the way the
   piece looks; this slides it onto the wall's face, so a picture is never
   sunk in the plaster or left floating in front of it. */
export const ON_WALL = { picture: 1, mirror: 1, sconce: 1, extinguisher: 1, aircon: 1, wallheater: 1, boiler: 1, geyser: 1, wallcabinet: 1, lantern: 1 };

/* Wall pieces that come down to where furniture stands, so they must not
   hang over a bed or a sofa. */
const LOW = { extinguisher: 1, wallheater: 1 };

/* Their width (true size), so the whole piece has wall behind it. */
const WIDTH = { picture: (p) => p.w || 0.5, mirror: (p) => p.w || 0.5, aircon: () => 0.85, wallheater: () => 0.6, wallcabinet: (p) => p.w || 1.2, boiler: () => 0.4 };

/* Where a wall piece goes. The data gives a point near a wall and the way
   the piece looks (rot); the piece is set on the face of the wall behind
   that point. Where there is no wall there (a window, a doorway, a corner)
   or the spot is over a piece of furniture, it slides along the wall to the
   nearest place that has wall behind its whole width. Pieces placed this way
   are recorded in S.wallPieces. */
export function onWall(p) {
  const a = (p.rot || 0) * DEG, fx = -Math.sin(a), fy = Math.cos(a), tx = fy, ty = -fx, lv = p.level;
  const half = ((WIDTH[p.type] ? WIDTH[p.type](p) : 0.3) / 2) / K;
  const face = (x, y) => {
    if (inWall(x, y, lv)) {
      for (let i = 0; i < 40 && inWall(x, y, lv); i++) { x += fx * 0.01; y += fy * 0.01; }
      return inWall(x, y, lv) ? null : [x, y];
    }
    for (let s = 0.01; s <= 0.45; s += 0.01) if (inWall(x - fx * s, y - fy * s, lv)) return [x - fx * (s - 0.01), y - fy * (s - 0.01)];
    return null;
  };
  const fits = (q) => [-half, 0, half].every((d) => inWall(q[0] + tx * d - fx * 0.03, q[1] + ty * d - fy * 0.03, lv)) &&
    !(LOW[p.type] && S.blocks.some((b) => Math.abs(b.base - zAt(q[0], q[1], lv)) < 0.5 &&
      [-half, 0, half].some((d) => inside(q[0] + tx * d + fx * 0.12, q[1] + ty * d + fy * 0.12, b.poly))));
  for (let k = 0; k <= 30; k++) {
    const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.08;
    const q = face(p.at[0] + tx * off, p.at[1] + ty * off);
    if (q && fits(q)) return q;
  }
  return face(p.at[0], p.at[1]) || p.at;
}

export function buildFurniture() {
  S.wallPieces = [];
  const later = [];
  H.furniture.forEach((p) => {
    if (p.type === "bath") {
      const item = byId(p.room);
      if (item) bath({ rect: p.rect, level: p.level, z: item.z }, Object.assign({ solid, backToWall }, p));
      return;
    }
    if (p.type === "curtain") {
      curtain(p, zAt((p.a[0] + p.b[0]) / 2 + (p.side || 0), (p.a[1] + p.b[1]) / 2, p.level));
      return;
    }
    if (ROWS[p.type]) { ROWS[p.type](p, p.level); return; }
    const make = PIECES[p.type];
    if (!make) return;
    // wall pieces go up once the furniture they must keep clear of stands
    if (ON_WALL[p.type]) { later.push(p); return; }
    // a lamp hangs from a ceiling that is drawn KZ times higher
    const q = p.h && (p.type === "pendant" || p.type === "chandelier") ? Object.assign({}, p, { h: p.h * KZ }) : p;
    const at = BLOCK[p.type] ? backToWall(p.at[0], p.at[1], p.rot, BLOCK[p.type](p)[1], p.level) : p.at;
    place(make(q), at[0], at[1], p.level, p.rot, lampGroup(p, at));
    if (!p.soft) blockPiece(p.type, p, at[0], at[1], p.level, p.rot);
  });
  later.forEach((p) => {
    const q = onWall(p);
    place(PIECES[p.type](p), q[0], q[1], p.level, p.rot, lampGroup(p, q));
    S.wallPieces.push({ type: p.type, x: q[0], y: q[1], rot: p.rot, level: p.level, low: !!LOW[p.type] });
  });
  finishLights();
}
