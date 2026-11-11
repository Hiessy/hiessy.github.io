/* The furniture pieces themselves (beds, sofas, tables, lamps, cars...), each a small group of boxes. */
import * as THREE from "three";
import { ball, bx, cy } from "./geometry.js";
import { M, mat, texMat } from "./materials.js";
import { texFor, tiles } from "./textures.js";

export function chair(color, seat, metal) {
  const g = new THREE.Group();
  const frame = metal ? M.green : color ? mat(color, { roughness: 0.7 }) : M.wood;
  bx(g, 0.44, 0.05, 0.44, 0, 0.46, 0, seat ? mat(seat) : frame);
  [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach((p) => bx(g, 0.035, 0.46, 0.035, p[0], 0.23, p[1], frame));
  bx(g, 0.44, 0.46, 0.04, 0, 0.72, 0.2, frame);
  return g;
}

export function lampShade(g, x, y, z, r) {
  cy(g, r * 0.62, r, r * 1.2, x, y, z, mat(0xf3ead6, { emissive: 0xffe2a8, emissiveIntensity: 0.35 }));
}

export const BUILD = {
  bed(p) {
    const g = new THREE.Group(), w = p.w || 0.9, l = 1.95;
    const frame = p.frame === 0xb8b8b8 ? M.chrome : mat(p.frame || 0x6b4423, { roughness: 0.7 });
    const spread = p.color === "zebra" ? new THREE.MeshStandardMaterial({ map: texFor("zebra", 1, 1), roughness: 0.9 }) : mat(p.color || 0x1f5c46);
    bx(g, w, 0.34, l, 0, 0.17, 0, frame);
    bx(g, w - 0.06, 0.16, l - 0.08, 0, 0.42, 0, M.linen);
    bx(g, w + 0.04, 0.26, l * 0.74, 0, 0.42, -l * 0.13, spread);
    // one pillow on a single bed, two on a double
    if (w > 1.2) [-1, 1].forEach((s) => bx(g, w / 2 - 0.16, 0.12, 0.36, s * w / 4, 0.56, l / 2 - 0.3, M.linen));
    else bx(g, w - 0.24, 0.12, 0.36, 0, 0.56, l / 2 - 0.3, M.linen);
    bx(g, w + 0.06, 1.1, 0.06, 0, 0.55, l / 2 + 0.03, frame);
    bx(g, w + 0.06, 0.6, 0.05, 0, 0.3, -l / 2 - 0.025, frame);
    return g;
  },
  daybed(p) {
    const g = new THREE.Group();
    bx(g, 1.95, 0.3, 0.9, 0, 0.2, 0, mat(0x8a5a2b, { roughness: 0.7 }));
    bx(g, 1.88, 0.14, 0.84, 0, 0.42, 0, mat(p.color || 0x4b7a3a));
    [-0.48, 0.48].forEach((x) => bx(g, 0.86, 0.38, 0.18, x, 0.66, 0.33, mat(0x1e2a44)));
    [-0.98, 0.98].forEach((x) => bx(g, 0.06, 0.62, 0.9, x, 0.31, 0, mat(0x8a5a2b, { roughness: 0.7 })));
    return g;
  },
  nightstand(p) {
    const g = new THREE.Group(), w = p.w || 0.42;
    bx(g, w, 0.55, 0.38, 0, 0.275, 0, p.color ? mat(p.color) : M.dark);
    cy(g, 0.04, 0.06, 0.24, 0, 0.67, 0, M.white);
    lampShade(g, 0, 0.86, 0, 0.13);
    return g;
  },
  wardrobe(p) {
    const g = new THREE.Group(), w = p.w || 1.2;
    bx(g, w, 1.95, 0.56, 0, 0.975, 0, M.dark);
    bx(g, 0.012, 1.8, 0.01, 0, 1.0, -0.285, M.black);
    [-0.06, 0.06].forEach((x) => bx(g, 0.03, 0.08, 0.04, x, 1.05, -0.3, M.steel));
    return g;
  },
  closet(p) {
    const g = new THREE.Group(), w = p.w || 1.2;
    bx(g, w, 2.1, 0.5, 0, 1.05, 0, mat(0xe6d9b8));
    for (let y = 0.25; y < 2.0; y += 0.12) bx(g, w - 0.08, 0.02, 0.02, 0, y, -0.255, mat(0xcfc09a));
    bx(g, 0.015, 2.0, 0.03, 0, 1.05, -0.26, mat(0xb9aa85));
    return g;
  },
  sofa(p) {
    const g = new THREE.Group(), w = p.w || 1.9;
    const frame = mat(p.frame || 0x8a5a2b, { roughness: 0.7 }), cushion = mat(p.color || 0xd98c5f);
    bx(g, w, 0.36, 0.85, 0, 0.23, 0, frame);
    bx(g, w - 0.3, 0.15, 0.62, 0, 0.48, -0.06, cushion);
    bx(g, w - 0.12, 0.48, 0.2, 0, 0.66, 0.32, cushion);
    [-1, 1].forEach((s) => bx(g, 0.14, 0.6, 0.85, s * (w / 2 - 0.07), 0.35, 0, frame));
    return g;
  },
  armchair(p) { return BUILD.sofa(Object.assign({}, p, { w: 0.82 })); },
  coffee(p) {
    const g = new THREE.Group(), w = p.w || 1.0, d = p.d || 0.55;
    bx(g, w, 0.04, d, 0, 0.42, 0, M.wood);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((q) => bx(g, 0.04, 0.4, 0.04, q[0] * (w / 2 - 0.05), 0.2, q[1] * (d / 2 - 0.05), M.wood));
    return g;
  },
  side() {
    const g = new THREE.Group();
    bx(g, 0.45, 0.03, 0.45, 0, 0.56, 0, mat(0xe8e2d6, { roughness: 0.3 }));
    bx(g, 0.4, 0.54, 0.4, 0, 0.27, 0, M.dark);
    cy(g, 0.05, 0.07, 0.25, 0, 0.7, 0, M.white);
    lampShade(g, 0, 0.9, 0, 0.14);
    return g;
  },
  console() {
    const g = new THREE.Group();
    bx(g, 1.0, 0.05, 0.36, 0, 0.8, 0, M.dark);
    [[-0.45, -0.14], [0.45, -0.14], [-0.45, 0.14], [0.45, 0.14]].forEach((q) => bx(g, 0.05, 0.78, 0.05, q[0], 0.39, q[1], M.dark));
    bx(g, 1.0, 0.62, 0.04, 0, 1.5, 0.17, M.dark);
    bx(g, 0.88, 0.5, 0.02, 0, 1.5, 0.15, M.mirror);
    return g;
  },
  lamp() {
    const g = new THREE.Group();
    cy(g, 0.15, 0.16, 0.03, 0, 0.015, 0, M.black);
    cy(g, 0.015, 0.015, 1.45, 0, 0.75, 0, M.black);
    lampShade(g, 0, 1.55, 0, 0.2);
    return g;
  },
  sideboard(p) {
    const g = new THREE.Group(), w = p.w || 1.4;
    bx(g, w, 0.85, 0.45, 0, 0.425, 0, M.dark);
    bx(g, w + 0.04, 0.03, 0.48, 0, 0.865, 0, M.wood);
    return g;
  },
  chandelier(p) {
    const g = new THREE.Group(), h = p.h || 2.7;
    cy(g, 0.008, 0.008, 0.5, 0, h - 0.25, 0, M.black, 6);
    ball(g, 0.1, 0, h - 0.55, 0, M.steel, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      bx(g, 0.26, 0.015, 0.015, Math.cos(a) * 0.13, h - 0.56, Math.sin(a) * 0.13, M.steel).rotation.y = -a;
      ball(g, 0.05, Math.cos(a) * 0.27, h - 0.5, Math.sin(a) * 0.27, M.glow, 1);
    }
    return g;
  },
  pendant(p) {
    const g = new THREE.Group(), h = p.h || 2.7;
    cy(g, 0.008, 0.008, 0.7, 0, h - 0.35, 0, M.black, 6);
    cy(g, 0.06, 0.24, 0.3, 0, h - 0.82, 0, mat(0xe9d6b0, { emissive: 0xffd9a0, emissiveIntensity: 0.4 }));
    ball(g, 0.05, 0, h - 0.95, 0, M.glow, 1);
    return g;
  },
  dining(p) {
    const g = new THREE.Group(), w = p.w || 1.0, d = p.d || w;
    if (p.round) {
      cy(g, w / 2, w / 2, 0.04, 0, 0.74, 0, p.metal ? M.white : M.wood, 20);
      cy(g, 0.04, 0.04, 0.72, 0, 0.36, 0, p.metal ? M.green : M.wood, 8);
    } else {
      bx(g, w, 0.04, d, 0, 0.74, 0, p.wood ? M.light : M.wood);
      // a tablecloth drapes over the top, so it is a little bigger and higher
      if (p.cloth) bx(g, w + 0.14, 0.32, d + 0.14, 0, 0.605, 0, mat(p.cloth));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((q) => bx(g, 0.05, 0.72, 0.05, q[0] * (w / 2 - 0.06), 0.36, q[1] * (d / 2 - 0.06), p.metal ? M.green : M.wood));
    }
    const n = p.chairs === undefined ? 4 : p.chairs;
    const spots = n === 0 ? []
      : n === 2 ? [[w / 2 + 0.32, 0], [-w / 2 - 0.32, 0]]
      : n === 3 ? [[0, d / 2 + 0.32], [w / 2 + 0.32, 0], [-w / 2 - 0.32, 0]]
      : [[0, d / 2 + 0.32], [0, -d / 2 - 0.32], [w / 2 + 0.32, 0], [-w / 2 - 0.32, 0]];
    spots.forEach((s) => {
      const c = chair(null, p.seat, p.metal);
      c.position.set(s[0], 0, s[1]);
      c.rotation.y = Math.atan2(s[0], s[1]);
      g.add(c);
    });
    return g;
  },
  cafe() {
    const g = BUILD.dining({ w: 0.7, round: true, chairs: 0 });
    [[0.55, 0, 0x3c5a8a], [-0.55, 0, 0xc94f6d]].forEach((s) => {
      const c = new THREE.Group();
      const fabric = mat(s[2]);
      bx(c, 0.5, 0.03, 0.42, 0, 0.45, 0, fabric);
      bx(c, 0.5, 0.3, 0.02, 0, 0.75, 0.2, fabric);
      [[-0.24, -0.2], [0.24, -0.2], [-0.24, 0.2], [0.24, 0.2]].forEach((q) => bx(c, 0.03, 0.9, 0.03, q[0], 0.45, q[1], M.light));
      c.position.set(s[0], 0, s[1]);
      c.rotation.y = Math.atan2(s[0], s[1]);
      g.add(c);
    });
    return g;
  },
  counter(p) {
    const g = new THREE.Group(), w = p.w || 2;
    bx(g, w, 0.86, 0.6, 0, 0.43, 0, mat(p.cabinet || 0x6b3f22, { roughness: 0.6 }));
    for (let x = -w / 2 + 0.5; x < w / 2 - 0.1; x += 0.5) bx(g, 0.01, 0.7, 0.01, x, 0.45, -0.302, M.black);
    bx(g, w + 0.02, 0.04, 0.62, 0, 0.88, 0, M.granite);
    bx(g, w, 0.62, 0.02, 0, 1.22, 0.3, texMat("tiles"));
    if (p.sink !== undefined) {
      bx(g, 0.5, 0.03, 0.38, p.sink, 0.895, -0.02, M.steel);
      cy(g, 0.015, 0.015, 0.28, p.sink, 1.03, 0.2, M.steel, 8);
    }
    if (p.stove !== undefined) {
      bx(g, 0.56, 0.93, 0.62, p.stove, 0.465, -0.01, M.black);
      [[-0.13, -0.12], [0.13, -0.12], [-0.13, 0.12], [0.13, 0.12]].forEach((q) => cy(g, 0.07, 0.07, 0.02, p.stove + q[0], 0.94, q[1], M.steel, 12));
    }
    return g;
  },
  fridge() {
    const g = new THREE.Group();
    bx(g, 0.68, 1.75, 0.68, 0, 0.875, 0, M.white);
    bx(g, 0.66, 0.01, 0.01, 0, 1.2, -0.345, M.black);
    bx(g, 0.03, 0.4, 0.04, 0.27, 1.45, -0.36, M.steel);
    return g;
  },
  heater() {
    const g = new THREE.Group();
    cy(g, 0.24, 0.24, 0.9, 0, 1.75, 0.08, M.white, 18);
    return g;
  },
  washer() {
    const g = new THREE.Group();
    bx(g, 0.6, 0.85, 0.6, 0, 0.425, 0, M.white);
    const door = cy(g, 0.17, 0.17, 0.03, 0, 0.48, -0.31, mat(0x9fb3c0, { roughness: 0.2 }), 20);
    door.rotation.x = Math.PI / 2;
    return g;
  },
  tub() {
    const g = new THREE.Group();
    bx(g, 0.55, 0.85, 0.5, 0, 0.425, 0, mat(0xd9d6cf));
    bx(g, 0.45, 0.02, 0.38, 0, 0.86, -0.02, M.steel);
    return g;
  },
  shelf(p) {
    const g = new THREE.Group(), w = p.w || 1.5, d = p.d || 0.4;
    [-1, 1].forEach((s) => bx(g, 0.03, 2.0, d, s * (w / 2 - 0.015), 1.0, 0, M.light));
    const tones = [0xc94f3d, 0xe0b34a, 0x4f7ab3, 0x7aa35a, 0xe8e2d0, 0x9b6b3f];
    for (let i = 0; i < 5; i++) {
      const y = 0.1 + i * 0.45;
      bx(g, w - 0.04, 0.025, d, 0, y, 0, M.light);
      if (i === 4) break;
      for (let x = -w / 2 + 0.15; x < w / 2 - 0.15; x += 0.22 + Math.random() * 0.15) {
        const hh = 0.12 + Math.random() * 0.2;
        bx(g, 0.14, hh, d * 0.6, x, y + hh / 2 + 0.015, 0, mat(tones[Math.floor(Math.random() * tones.length)]));
      }
    }
    return g;
  },
  desk(p) {
    const g = new THREE.Group(), w = p.w || 1.6;
    bx(g, w, 1.0, 0.08, 0, 0.5, -0.26, mat(0xd8c7a6));
    for (let x = -w / 2 + 0.2; x < w / 2; x += 0.2) for (let y = 0.15; y < 1.0; y += 0.2) ball(g, 0.012, x, y, -0.305, M.dark, 0);
    bx(g, w + 0.06, 0.05, 0.64, 0, 1.05, 0, M.dark);
    [-1, 1].forEach((s) => bx(g, 0.06, 1.0, 0.6, s * w / 2, 0.5, 0, M.dark));
    bx(g, w, 0.04, 0.5, 0, 0.75, 0.05, M.dark);
    return g;
  },
  tv() {
    const g = new THREE.Group();
    bx(g, 1.0, 0.5, 0.42, 0, 0.25, 0, M.wood);
    bx(g, 0.95, 0.56, 0.05, 0, 0.82, 0.05, M.black);
    bx(g, 0.2, 0.06, 0.18, 0, 0.53, 0.05, M.black);
    return g;
  },
  bench() {
    const g = new THREE.Group();
    bx(g, 1.5, 0.05, 0.45, 0, 0.45, 0, M.white);
    for (let i = 0; i < 3; i++) bx(g, 1.5, 0.07, 0.03, 0, 0.6 + i * 0.12, 0.21, M.white);
    [-0.65, 0.65].forEach((x) => { bx(g, 0.05, 0.45, 0.42, x, 0.22, 0, M.black); bx(g, 0.04, 0.85, 0.04, x, 0.43, 0.22, M.black); });
    return g;
  },
  plant() {
    const g = new THREE.Group();
    cy(g, 0.2, 0.14, 0.38, 0, 0.19, 0, M.pot);
    ball(g, 0.32, 0, 0.62, 0, M.leaf, 1);
    ball(g, 0.22, 0.12, 0.85, 0.05, M.leaf2, 1);
    return g;
  },
  bush() {
    const g = new THREE.Group();
    ball(g, 0.6, 0, 0.45, 0, M.leaf, 1);
    ball(g, 0.45, 0.45, 0.35, 0.15, M.leaf2, 1);
    ball(g, 0.42, -0.4, 0.35, -0.1, M.leaf2, 1);
    return g;
  },
  car(p) {
    const g = new THREE.Group(), paint = mat(p.color || 0xf2f2f0, { roughness: 0.35, metalness: 0.4 });
    bx(g, 1.76, 0.6, 4.2, 0, 0.6, 0, paint);
    bx(g, 1.62, 0.52, 2.1, 0, 1.15, 0.25, mat(0x2b3440, { roughness: 0.1, metalness: 0.3 }));
    bx(g, 1.5, 0.06, 1.75, 0, 1.43, 0.28, paint);
    [[-0.82, -1.35], [0.82, -1.35], [-0.82, 1.35], [0.82, 1.35]].forEach((q) => {
      const w = cy(g, 0.33, 0.33, 0.24, q[0], 0.33, q[1], M.black, 16);
      w.rotation.z = Math.PI / 2;
    });
    [-0.62, 0.62].forEach((x) => {
      bx(g, 0.3, 0.1, 0.03, x, 0.75, -2.1, mat(0xfafae0, { emissive: 0xfff6c0, emissiveIntensity: 0.4 }));
      bx(g, 0.3, 0.1, 0.03, x, 0.75, 2.1, mat(0xb3261e, { emissive: 0x801010, emissiveIntensity: 0.4 }));
    });
    return g;
  }
};
