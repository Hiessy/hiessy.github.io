/* The houses around the lot (assets/model/house/neighbours.js): walls and
   roofs (gable, hip, flat or a single slope) from the traced ones, the
   turret, the pool and the brick wall across the street; the farther
   cadastre blocks as plain boxes. All solid to walk into. */
import * as THREE from "three";
import { H, S } from "./core.js";
import { bar, cy, quad, rectPoly, slab, triangle } from "./geometry.js";
import { mat, texMat } from "./materials.js";
import { collider } from "./walls.js";

const roofMat = (c) => mat(c, { roughness: 0.75, side: THREE.DoubleSide });
const wallMat = (c) => mat(c, { roughness: 0.9, side: THREE.DoubleSide });

function walls(poly, h) {
  poly.forEach((p, k) => { const q = poly[(k + 1) % poly.length]; collider(p[0], p[1], q[0], q[1], 0, h + 0.3, 0.05); });
}

/* A rectangular house: its walls up to the eaves and its roof. */
function house(b) {
  const r = b.rect, x1 = r[0], y1 = r[1], x2 = r[2], y2 = r[3], h = b.h || 3, rise = b.rise || 1.5, o = 0.35;
  const add = (m) => { if (m) S.static.add(m); return m; };
  add(slab(rectPoly(r), wallMat(b.wall || 0xf1ece2), h, h));
  if (b.stone) add(slab([[x2 - 0.02, y1], [x2 + 0.03, y1], [x2 + 0.03, y2], [x2 - 0.02, y2]], texMat("stone"), 1.2, 1.2));
  walls(rectPoly(r), h);
  const top = roofMat(b.top || 0xa65f45), side = wallMat(b.wall || 0xf1ece2);
  const X1 = x1 - o, X2 = x2 + o, Y1 = y1 - o, Y2 = y2 + o;
  if (b.roof === "flat") {
    add(slab(rectPoly(r), top, h + 0.25, 0.25));
    return;
  }
  if (b.roof === "shed") {
    // one slope, falling to the `low` side
    const zf = (x, y) => h + rise * (b.low === "e" ? (x2 - x) / (x2 - x1) : b.low === "w" ? (x - x1) / (x2 - x1) : b.low === "n" ? (y2 - y) / (y2 - y1) : (y - y1) / (y2 - y1));
    add(quad([[X1, Y1, zf(x1, y1)], [X2, Y1, zf(x2, y1)], [X2, Y2, zf(x2, y2)], [X1, Y2, zf(x1, y2)]], top));
    // the walls rise to meet it on the high sides
    [[[x1, y1], [x2, y1]], [[x2, y1], [x2, y2]], [[x2, y2], [x1, y2]], [[x1, y2], [x1, y1]]].forEach((e) => {
      const za = zf(e[0][0], e[0][1]), zb = zf(e[1][0], e[1][1]);
      if (za - h < 0.02 && zb - h < 0.02) return;
      add(quad([[e[0][0], e[0][1], h], [e[1][0], e[1][1], h], [e[1][0], e[1][1], zb], [e[0][0], e[0][1], za]], side));
    });
    return;
  }
  const alongX = b.axis !== "y", hip = b.roof === "hip";
  const zr = h + rise;
  if (alongX) {
    const ym = (y1 + y2) / 2, inset = hip ? Math.min((y2 - y1) / 2, (x2 - x1) / 2 - 0.1) : 0;
    const ra = [X1 + inset, ym, zr], rb = [X2 - inset, ym, zr];
    add(quad([[X1, Y1, h], [X2, Y1, h], rb, ra], top));
    add(quad([[X2, Y2, h], [X1, Y2, h], ra, rb], top));
    if (hip) { add(triangle([[X1, Y2, h], [X1, Y1, h], ra], top)); add(triangle([[X2, Y1, h], [X2, Y2, h], rb], top)); }
    else { add(triangle([[x1, y1, h], [x1, y2, h], [x1, ym, zr]], side)); add(triangle([[x2, y2, h], [x2, y1, h], [x2, ym, zr]], side)); }
  } else {
    const xm = (x1 + x2) / 2, inset = hip ? Math.min((x2 - x1) / 2, (y2 - y1) / 2 - 0.1) : 0;
    const ra = [xm, Y1 + inset, zr], rb = [xm, Y2 - inset, zr];
    add(quad([[X2, Y1, h], [X2, Y2, h], rb, ra], top));
    add(quad([[X1, Y2, h], [X1, Y1, h], ra, rb], top));
    if (hip) { add(triangle([[X1, Y1, h], [X2, Y1, h], ra], top)); add(triangle([[X2, Y2, h], [X1, Y2, h], rb], top)); }
    else { add(triangle([[x1, y1, h], [x2, y1, h], [xm, y1, zr]], side)); add(triangle([[x2, y2, h], [x1, y2, h], [xm, y2, zr]], side)); }
  }
}

/* A round turret with a dome. */
function tower(b) {
  const g = new THREE.Group(), r = b.r || 1.5, h = b.h || 7;
  cy(g, r, r, h, 0, h / 2, 0, wallMat(b.wall || 0xf3f0e8), 20);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofMat(b.top || 0xc06a48));
  dome.position.y = h;
  dome.scale.y = 1.2;
  g.add(dome);
  g.position.set(b.tower[0], 0, -b.tower[1]);
  S.static.add(g);
  collider(b.tower[0] - r, b.tower[1], b.tower[0] + r, b.tower[1], 0, h, r * 0.7);
}

export function buildTown() {
  S.town = [];
  const RENDER = [0xf1ece2, 0xe9dfcf, 0xdcd3c3, 0xf4f1ea], ROOFS = [0xa65f45, 0x8d969c, 0x9a5a40, 0x6f8796];
  H.neighbours.forEach((b, i) => {
    if (b.rect) house(b);
    else if (b.tower) tower(b);
    else if (b.pool) {
      const r = b.pool;
      S.static.add(slab(rectPoly([r[0] - 0.4, r[1] - 0.4, r[2] + 0.4, r[3] + 0.4]), mat(0xe9e4d8), 0.08, 0.08));
      S.static.add(slab(rectPoly(r), mat(0x2f7fc4, { roughness: 0.15, metalness: 0.1 }), 0.1, 0.02));
    } else if (b.fence) {
      const a = b.fence[0], c = b.fence[1], m = bar(a[0], a[1], c[0], c[1], 0, b.h || 1.8, 0.25, texMat("brickpave"));
      if (m) S.static.add(m);
      collider(a[0], a[1], c[0], c[1], 0, b.h || 1.8, 0.12);
    } else if (b.poly) {
      const h = b.floors === 2 ? 5.8 : 3.0;
      S.static.add(slab(b.poly, mat(RENDER[i % RENDER.length], { roughness: 0.9 }), h, h));
      S.static.add(slab(b.poly, mat(ROOFS[(i * 7) % ROOFS.length], { roughness: 0.75 }), h + 0.3, 0.3));
      walls(b.poly, h);
    } else return;
    S.town.push(b.id);
  });
}
