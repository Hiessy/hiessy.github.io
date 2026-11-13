/* The baths: toilet, bidet, basin and shower, laid out along one wall the way the photos show them.
   Fixtures are built with their back toward +z (the wall) and their front toward -z. */
import * as THREE from "three";
import { K, KZ, S } from "./core.js";
import { bar, bx, cy, place } from "./geometry.js";
import { M, mat, texBox } from "./materials.js";

function ceramic(c) { return c ? mat(c, { roughness: 0.3 }) : M.white; }
function hollow(c) { return mat(c ? 0x3f5f4c : 0xdcdcd6, { roughness: 0.25 }); }

export function toilet(c) {
  const g = new THREE.Group(), m = ceramic(c);
  cy(g, 0.13, 0.11, 0.2, 0, 0.1, 0.05, m, 14);
  cy(g, 0.19, 0.14, 0.2, 0, 0.3, -0.04, m, 18).scale.z = 1.25;
  cy(g, 0.2, 0.2, 0.025, 0, 0.412, -0.04, m, 18).scale.z = 1.25;
  cy(g, 0.185, 0.185, 0.02, 0, 0.435, -0.04, m, 18).scale.z = 1.22;
  bx(g, 0.4, 0.36, 0.17, 0, 0.62, 0.21, m);
  bx(g, 0.42, 0.03, 0.19, 0, 0.815, 0.21, m);
  cy(g, 0.022, 0.022, 0.015, 0, 0.838, 0.21, M.chrome, 10);
  return g;
}

export function bidet(c) {
  const g = new THREE.Group(), m = ceramic(c);
  cy(g, 0.12, 0.1, 0.2, 0, 0.1, 0.05, m, 14);
  cy(g, 0.18, 0.13, 0.2, 0, 0.3, -0.02, m, 18).scale.z = 1.3;
  cy(g, 0.13, 0.12, 0.012, 0, 0.402, -0.04, hollow(c), 18).scale.z = 1.3;
  bx(g, 0.3, 0.05, 0.08, 0, 0.385, 0.2, m);
  [-0.07, 0.07].forEach((x) => cy(g, 0.018, 0.018, 0.05, x, 0.435, 0.19, M.chrome, 8));
  cy(g, 0.012, 0.012, 0.07, 0, 0.44, 0.17, M.chrome, 6).rotation.x = 0.9;
  return g;
}

/* A pedestal basin with its mirror and a glass shelf above. mirror: "oval" or a rectangle. */
export function basin(c, mirror) {
  const g = new THREE.Group(), m = ceramic(c);
  cy(g, 0.07, 0.09, 0.72, 0, 0.36, 0.12, m, 12);
  cy(g, 0.24, 0.16, 0.16, 0, 0.8, 0.02, m, 18).scale.z = 0.85;
  bx(g, 0.48, 0.14, 0.1, 0, 0.81, 0.21, m);
  cy(g, 0.18, 0.17, 0.012, 0, 0.878, 0.0, hollow(c), 18).scale.z = 0.8;
  cy(g, 0.015, 0.015, 0.1, 0, 0.93, 0.2, M.chrome, 8);
  bx(g, 0.02, 0.02, 0.11, 0, 0.975, 0.15, M.chrome);
  wallSet(g, mirror);
  return g;
}

/* A basin set in a white cabinet with a marble top (the pink bath's). */
export function vanity(c, mirror) {
  const g = new THREE.Group();
  bx(g, 0.6, 0.76, 0.42, 0, 0.42, 0.05, mat(0xf2f0ea, { roughness: 0.5 }));
  bx(g, 0.64, 0.035, 0.48, 0, 0.82, 0.02, mat(0xefe6d6, { roughness: 0.25 }));
  cy(g, 0.17, 0.16, 0.012, 0, 0.842, 0, hollow(c), 18).scale.z = 0.8;
  cy(g, 0.015, 0.015, 0.1, 0, 0.89, 0.19, M.chrome, 8);
  bx(g, 0.02, 0.02, 0.11, 0, 0.935, 0.14, M.chrome);
  wallSet(g, mirror);
  return g;
}

function wallSet(g, mirror) {
  if (mirror === "oval") {
    const a = cy(g, 0.24, 0.24, 0.03, 0, 1.52, 0.25, M.white, 24), b = cy(g, 0.2, 0.2, 0.012, 0, 1.52, 0.236, M.mirror, 24);
    [a, b].forEach((m) => { m.rotation.x = Math.PI / 2; m.scale.z = 1.35; });
  } else {
    bx(g, 0.5, 0.64, 0.02, 0, 1.52, 0.255, M.white);
    bx(g, 0.44, 0.58, 0.012, 0, 1.52, 0.247, M.mirror);
  }
  bx(g, 0.44, 0.012, 0.1, 0, 1.12, 0.21, mat(0xcfe0e4, { transparent: true, opacity: 0.5, depthWrite: false }));
  cy(g, 0.025, 0.03, 0.12, 0.14, 1.19, 0.21, mat(0xd9c23a, { roughness: 0.4 }), 8);
}

/* One bath. item: { rect [x1, y1, x2, y2], level, z }.
   spec: wall  - the side the fixtures stand against (s, n, e, w)
         shower - the end the shower is at
         fix   - the fixtures along the wall, from the shower on (default bidet, toilet, basin)
         basin - a basin elsewhere: [x, y, rot]
         color - the fixtures' colour (white if none); curtain - its pattern, or none for an open shower
         sh    - the shower's size along the wall
   The rect is in the survey's meters and drawn K times bigger; the fixtures
   keep their true size, so their measures are divided by K here. */
export function bath(item, spec) {
  const r = item.rect, x1 = r[0], y1 = r[1], x2 = r[2], y2 = r[3], lv = item.level, base = item.z;
  const alongX = spec.wall === "s" || spec.wall === "n";
  const L = alongX ? x2 - x1 : y2 - y1, W = alongX ? y2 - y1 : x2 - x1;
  const SH = (spec.sh || 0.9) / K;
  // u runs along the wall from the shower's end, v out from the wall
  const lowEnd = spec.shower === "w" || spec.shower === "s";
  const wallLow = spec.wall === "s" || spec.wall === "w";
  const pt = (u, v) => {
    const a = lowEnd ? u : L - u, b = wallLow ? v : W - v;
    return alongX ? [x1 + a, y1 + b] : [x1 + b, y1 + a];
  };
  const rot = { s: 0, n: 180, w: 270, e: 90 }[spec.wall];
  const fix = spec.fix || ["bidet", "toilet", "basin"];
  const gap = Math.min(0.62 / K, (L - SH - 0.04) / fix.length);
  const depth = Math.min(0.45 / K, W - 0.72 / K);
  const make = { toilet: () => toilet(spec.color), bidet: () => bidet(spec.color),
                 basin: () => (spec.vanity ? vanity : basin)(spec.color, spec.mirror) };
  fix.forEach((name, i) => {
    const u = SH + 0.04 + gap * (i + 0.5), v = (name === "basin" ? 0.27 : 0.3) / K;
    const q = pt(u, v);
    place(make[name](), q[0], q[1], lv, rot);
    // a pedestal basin is small enough to stand at; the others are solid
    if (name !== "basin") { const c = pt(u, depth / 2); spec.solid(c[0], c[1], 0.36 / K, depth, rot, lv); }
  });
  if (spec.basin) { const q = spec.backToWall(spec.basin[0], spec.basin[1], spec.basin[2], 0.54, lv); place(make.basin(), q[0], q[1], lv, spec.basin[2]); }

  // the shower: across the whole end of a narrow bath, in the corner of a wide one
  const full = W - SH < 0.4 / K, sw = full ? W : SH;
  const tray = new THREE.Mesh(new THREE.BoxGeometry(alongX ? SH : sw, 0.04, alongX ? sw : SH), ceramic(spec.color && 0xd9e6dc));
  const tc = pt(SH / 2, sw / 2);
  tray.position.set(tc[0], base + 0.02, -tc[1]);
  S.static.add(tray);
  const drain = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.12), M.steel);
  drain.position.set(tc[0], base + 0.045, -tc[1]);
  S.static.add(drain);
  const add = (m) => { if (m) { m.castShadow = false; S.static.add(m); } };
  const side = (a, b) => {
    if (spec.curtain) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      add(bar(a[0], a[1], b[0], b[1], base + 0.12 / KZ, base + 1.95 / KZ, 0.012, texBox("curtain-" + spec.curtain, len * K, 1.83, { side: THREE.DoubleSide })));
      add(bar(a[0], a[1], b[0], b[1], base + 1.96 / KZ, base + 1.985 / KZ, 0.025, M.black));
    } else add(bar(a[0], a[1], b[0], b[1], base, base + 0.07, 0.06, ceramic(0)));
  };
  side(pt(SH, 0.01), pt(SH, sw - 0.01));
  if (!full) side(pt(0.01, SH), pt(SH, SH));
  // the arm and the head on the fixtures' wall, two taps under them
  const hp = pt(SH / 2, 0.02), ho = pt(SH / 2, 0.22 / K);
  add(bar(hp[0], hp[1], ho[0], ho[1], base + 2.0 / KZ, base + 2.025 / KZ, 0.02, M.chrome));
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.05, 12), M.chrome);
  head.position.set(ho[0], base + 1.98 / KZ, -ho[1]);
  S.static.add(head);
  [-0.09, 0.09].forEach((d) => {
    const q = pt(SH / 2 + d / K, 0.03);
    const tap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.chrome);
    tap.position.set(q[0], base + 1.1 / KZ, -q[1]);
    S.static.add(tap);
  });
}
