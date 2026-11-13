/* The furniture pieces themselves (beds, sofas, tables, lamps, cars...), each a small group of boxes,
   cylinders and hoops, shaped after the listing photos. Front toward -z. */
import * as THREE from "three";
import { ball, bx, cy, hoop } from "./geometry.js";
import { M, mat, texBox, texTrue } from "./materials.js";
import { texFor } from "./textures.js";

const LEGS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

export function chair(color, seat, metal) {
  const g = new THREE.Group();
  const frame = metal ? M.green : color ? mat(color, { roughness: 0.7 }) : M.wood;
  bx(g, 0.44, 0.05, 0.44, 0, 0.46, 0, seat ? mat(seat) : frame);
  [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach((p) => bx(g, 0.035, 0.46, 0.035, p[0], 0.23, p[1], frame));
  [-0.19, 0.19].forEach((x) => bx(g, 0.035, 0.5, 0.035, x, 0.72, 0.2, frame));
  bx(g, 0.42, 0.1, 0.03, 0, 0.9, 0.2, frame);
  bx(g, 0.42, 0.06, 0.03, 0, 0.68, 0.2, frame);
  return g;
}

/* The hall's bentwood chairs: a round seat and a hoop for a back. */
function bentwood(seat) {
  const g = new THREE.Group(), wood = mat(0x2a1d14, { roughness: 0.5 });
  cy(g, 0.2, 0.2, 0.035, 0, 0.46, 0, mat(seat || 0x9a8a2a), 18);
  cy(g, 0.21, 0.21, 0.02, 0, 0.435, 0, wood, 18);
  [[-0.14, -0.14], [0.14, -0.14], [-0.15, 0.15], [0.15, 0.15]].forEach((q) => cy(g, 0.014, 0.012, 0.43, q[0], 0.215, q[1], wood, 6));
  hoop(g, 0.17, 0.011, Math.PI * 2, 0, 0.2, 0, wood).rotation.x = Math.PI / 2;
  hoop(g, 0.19, 0.014, Math.PI, 0, 0.46, 0.17, wood).scale.y = 2.3;
  hoop(g, 0.11, 0.011, Math.PI, 0, 0.46, 0.17, wood).scale.y = 2.9;
  return g;
}

/* The dining room's dark chairs with a carved crest and turned spindles. */
function carved() {
  const g = new THREE.Group(), w = M.dark;
  bx(g, 0.44, 0.05, 0.42, 0, 0.45, 0, w);
  bx(g, 0.38, 0.025, 0.36, 0, 0.485, 0, mat(0x5a3220, { roughness: 0.55 }));
  [-0.19, 0.19].forEach((x) => {
    bx(g, 0.04, 0.45, 0.04, x, 0.225, -0.18, w);
    bx(g, 0.04, 1.06, 0.04, x, 0.53, 0.19, w);
    bx(g, 0.025, 0.025, 0.36, x, 0.16, 0, w);
  });
  bx(g, 0.44, 0.17, 0.035, 0, 0.99, 0.19, w);
  cy(g, 0.11, 0.11, 0.035, 0, 1.07, 0.19, w, 12).rotation.x = Math.PI / 2;
  bx(g, 0.4, 0.05, 0.03, 0, 0.62, 0.19, w);
  for (let i = 0; i < 5; i++) cy(g, 0.012, 0.012, 0.3, -0.14 + i * 0.07, 0.78, 0.19, w, 6);
  return g;
}

/* The glazed room's folding director chairs. */
function director(color) {
  const g = new THREE.Group(), wood = M.light, cloth = mat(color || 0x7a7f86);
  [-0.26, 0.26].forEach((x) => {
    bx(g, 0.03, 0.72, 0.03, x, 0.3, 0, wood).rotation.x = 0.62;
    bx(g, 0.03, 0.72, 0.03, x, 0.3, 0, wood).rotation.x = -0.62;
    bx(g, 0.03, 0.03, 0.5, x, 0.66, 0, wood);
    bx(g, 0.03, 0.42, 0.03, x, 0.76, 0.22, wood);
    bx(g, 0.03, 0.14, 0.03, x, 0.59, -0.2, wood);
  });
  bx(g, 0.5, 0.015, 0.4, 0, 0.52, 0, cloth);
  bx(g, 0.52, 0.17, 0.012, 0, 0.86, 0.22, cloth);
  return g;
}

/* The glazed room's striped upholstered chairs. */
function striped() {
  const g = new THREE.Group(), fabric = texTrue("stripes");
  LEGS.forEach((q) => bx(g, 0.04, 0.4, 0.04, q[0] * 0.2, 0.2, q[1] * 0.19, M.dark));
  bx(g, 0.5, 0.12, 0.48, 0, 0.46, 0, fabric);
  const back = cy(g, 0.25, 0.25, 0.09, 0, 0.82, 0.23, fabric, 16);
  back.rotation.x = Math.PI / 2;
  back.scale.z = 1.1;
  return g;
}

/* The garden's black slatted armchairs. */
function gardenChair(color) {
  const g = new THREE.Group(), c = mat(color || 0x1c1f1d, { roughness: 0.6 });
  for (let i = 0; i < 5; i++) bx(g, 0.5, 0.02, 0.07, 0, 0.42, -0.18 + i * 0.09, c);
  for (let i = 0; i < 4; i++) bx(g, 0.5, 0.06, 0.02, 0, 0.56 + i * 0.09, 0.24, c);
  [-0.27, 0.27].forEach((x) => {
    bx(g, 0.03, 0.03, 0.5, x, 0.63, 0, c);
    bx(g, 0.03, 0.63, 0.03, x, 0.315, -0.23, c);
    bx(g, 0.03, 0.9, 0.03, x, 0.45, 0.24, c);
  });
  return g;
}

function plastic() {
  const g = new THREE.Group(), c = mat(0xf1ead8, { roughness: 0.5 });
  LEGS.forEach((q) => bx(g, 0.035, 0.42, 0.035, q[0] * 0.2, 0.21, q[1] * 0.19, c));
  bx(g, 0.46, 0.03, 0.44, 0, 0.43, 0, c);
  for (let i = 0; i < 6; i++) bx(g, 0.035, 0.4, 0.02, -0.19 + i * 0.076, 0.66, 0.21, c);
  bx(g, 0.46, 0.05, 0.03, 0, 0.87, 0.21, c);
  return g;
}

/* A chair by the name of its style. */
export function seatOf(style, o) {
  o = o || {};
  if (style === "bentwood") return bentwood(o.seat);
  if (style === "carved") return carved();
  if (style === "director") return director(o.color);
  if (style === "striped") return striped();
  if (style === "garden") return gardenChair(o.color);
  if (style === "plastic") return plastic();
  return chair(o.color, o.seat, o.metal);
}

export function lampShade(g, x, y, z, r) {
  cy(g, r * 0.62, r, r * 1.2, x, y, z, mat(0xf3ead6, { emissive: 0xffe2a8, emissiveIntensity: 0.35 }));
}

/* A small vase of flowers standing at height y. kind: roses, dried, sunflower,
   pink, yellow, mixed. */
const BLOOMS = {
  roses: [0xb3202a, 0xc8323a], dried: [0xb89a6a, 0x8a6a3c, 0xd8c39a], sunflower: [0xe8b820], pink: [0xe58aa8, 0xf2b6c6],
  yellow: [0xe8c23a, 0xf0d870], mixed: [0xe58aa8, 0xe8c23a, 0xb3202a, 0xf2f0e6], white: [0xf2f0e6]
};
export function bouquet(g, kind, x, y, z, scale, vase) {
  const k = scale || 1, tones = BLOOMS[kind] || BLOOMS.mixed, big = kind === "sunflower" || kind === "dried";
  cy(g, 0.045 * k, 0.06 * k, 0.16 * k, x, y + 0.08 * k, z, mat(vase || 0x3f5f8a, { roughness: 0.35 }), 10);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9, r = (i ? 0.07 : 0) * k, h = (0.3 + (i % 3) * 0.05) * k;
    const stem = bx(g, 0.008, h, 0.008, x + Math.cos(a) * r * 0.5, y + 0.14 * k + h / 2, z + Math.sin(a) * r * 0.5, kind === "dried" ? mat(0x8a7a52) : M.leaf);
    stem.rotation.z = -Math.cos(a) * 0.25 * (i ? 1 : 0);
    stem.rotation.x = Math.sin(a) * 0.25 * (i ? 1 : 0);
    const head = ball(g, (big ? 0.055 : 0.038) * k, x + Math.cos(a) * r, y + 0.14 * k + h, z + Math.sin(a) * r, mat(tones[i % tones.length], { roughness: 0.8 }), big ? 1 : 0);
    if (kind === "sunflower") { head.scale.y = 0.4; ball(g, 0.025 * k, head.position.x, head.position.y + 0.012, head.position.z, mat(0x4a2f18), 0); }
  }
}

function spreadOf(p, w, l) {
  if (p.color === "zebra") return new THREE.MeshStandardMaterial({ map: texFor("zebra", 1, 1), roughness: 0.9 });
  const name = p.spread || { 0x1f5c46: "plaid-green", 0x1d6b5a: "plaid-teal", 0x4f9a3a: "lime" }[p.color];
  return name ? texBox(name, w, l) : mat(p.color || 0x1f5c46);
}

export const BUILD = {
  /* A bed: head toward +z. The frame's colour picks the bedstead the photos
     show: chrome tubes, a carved board, dark spindles or a plain black panel. */
  bed(p) {
    const g = new THREE.Group(), w = p.w || 0.9, l = 1.95, W = w + 0.06;
    const iron = p.frame === 0xb8b8b8;
    const frame = iron ? M.chrome : mat(p.frame || 0x6b4423, { roughness: 0.7 });
    const head = p.head || (iron ? "iron" : p.frame === 0x6b4423 ? "carved" : p.frame === 0x3f2716 ? "spindle" : p.frame === 0x1c1c1c ? "panel" : "plain");
    const spread = spreadOf(p, w, l);
    bx(g, w, 0.1, l, 0, 0.29, 0, frame);
    LEGS.forEach((q) => bx(g, 0.05, 0.26, 0.05, q[0] * (w / 2 - 0.03), 0.13, q[1] * (l / 2 - 0.03), frame));
    bx(g, w - 0.04, 0.16, l - 0.06, 0, 0.42, 0, M.linen);
    // the spread covers the pillow and hangs over the sides
    bx(g, w + 0.03, 0.24, l - 0.1, 0, 0.4, -0.03, spread);
    const n = w > 1.2 ? 2 : 1;
    for (let i = 0; i < n; i++) bx(g, w / n - 0.16, 0.09, 0.36, (i - (n - 1) / 2) * w / n, 0.55, l / 2 - 0.3, spread);
    const zh = l / 2 + 0.03, zf = -l / 2 - 0.025;
    if (head === "iron") {
      [[zh, 1.02], [zf, 0.72]].forEach((e) => {
        const z = e[0], h = e[1];
        [-1, 1].forEach((s) => cy(g, 0.02, 0.02, h - 0.14, s * w / 2, (h - 0.14) / 2, z, M.chrome, 8));
        hoop(g, w / 2, 0.02, Math.PI, 0, h - 0.14, z, M.chrome).scale.y = 0.28;
        cy(g, 0.012, 0.012, w, 0, 0.42, z, M.chrome, 6).rotation.z = Math.PI / 2;
        for (let i = 1; i < 6; i++) cy(g, 0.008, 0.008, h - 0.42, -w / 2 + i * w / 6, 0.42 + (h - 0.42) / 2, z, M.chrome, 5);
      });
    } else if (head === "carved") {
      bx(g, W, 0.62, 0.05, 0, 0.6, zh, frame);
      const top = cy(g, W / 2 - 0.06, W / 2 - 0.06, 0.05, 0, 0.9, zh, frame, 20);
      top.rotation.x = Math.PI / 2;
      top.scale.y = 0.55;
      [-1, 1].forEach((s) => { bx(g, 0.07, 1.05, 0.07, s * W / 2, 0.525, zh, frame); ball(g, 0.05, s * W / 2, 1.1, zh, frame, 1); });
      bx(g, W, 0.36, 0.05, 0, 0.36, zf, frame);
      [-1, 1].forEach((s) => { bx(g, 0.07, 0.62, 0.07, s * W / 2, 0.31, zf, frame); ball(g, 0.045, s * W / 2, 0.66, zf, frame, 1); });
    } else if (head === "spindle") {
      [[zh, 1.15], [zf, 0.62]].forEach((e) => {
        const z = e[0], h = e[1];
        [-1, 1].forEach((s) => { bx(g, 0.07, h, 0.07, s * W / 2, h / 2, z, frame); ball(g, 0.05, s * W / 2, h + 0.04, z, frame, 1); });
        bx(g, W, 0.09, 0.05, 0, h - 0.1, z, frame);
        bx(g, W, 0.07, 0.05, 0, 0.42, z, frame);
        const k = Math.round(W / 0.14);
        for (let i = 1; i < k; i++) cy(g, 0.016, 0.016, h - 0.56, -W / 2 + i * W / k, 0.42 + (h - 0.56) / 2 + 0.03, z, frame, 6);
      });
    } else if (head === "panel") {
      bx(g, W + 0.04, 1.15, 0.07, 0, 0.575, zh, frame);
      bx(g, W - 0.16, 0.5, 0.075, 0, 0.8, zh, mat(0x2a2a2a, { roughness: 0.5 }));
      bx(g, W + 0.04, 0.55, 0.07, 0, 0.275, zf, frame);
    } else {
      bx(g, W, 0.85, 0.05, 0, 0.425, zh, frame);
      bx(g, W, 0.4, 0.05, 0, 0.2, zf, frame);
    }
    return g;
  },
  daybed(p) {
    const g = new THREE.Group(), pine = mat(0xa8713c, { roughness: 0.7 });
    bx(g, 1.95, 0.22, 0.9, 0, 0.24, 0, pine);
    bx(g, 1.88, 0.14, 0.84, 0, 0.42, 0, p.color ? texBox("plaid-green", 1.9, 0.85, { color: 0xb8d8a0 }) : mat(0x4b7a3a));
    [-0.48, 0.48].forEach((x) => bx(g, 0.8, 0.36, 0.16, x, 0.66, 0.33, mat(0x1c1c1e)).rotation.x = -0.18);
    [-0.98, 0.98].forEach((x) => { bx(g, 0.06, 0.62, 0.9, x, 0.31, 0, pine); bx(g, 0.065, 0.3, 0.6, x, 0.36, 0, mat(0x96622f, { roughness: 0.7 })); });
    return g;
  },
  nightstand(p) {
    const g = new THREE.Group(), w = p.w || 0.42, c = p.color ? mat(p.color, { roughness: 0.6 }) : M.wood;
    bx(g, w, 0.5, 0.36, 0, 0.3, 0, c);
    bx(g, w + 0.03, 0.03, 0.39, 0, 0.565, 0, c);
    LEGS.forEach((q) => bx(g, 0.03, 0.06, 0.03, q[0] * (w / 2 - 0.03), 0.03, q[1] * 0.15, c));
    bx(g, w - 0.06, 0.005, 0.01, 0, 0.4, -0.181, M.black);
    ball(g, 0.014, 0, 0.47, -0.19, M.steel, 0);
    if (p.lamp !== false) { cy(g, 0.04, 0.06, 0.2, 0, 0.68, 0, M.white); lampShade(g, 0, 0.86, 0, Math.min(0.13, w * 0.4)); }
    return g;
  },
  /* A wardrobe with panelled doors: pine in the apartment, a mirror on the
     middle door in bedroom 6. */
  wardrobe(p) {
    const g = new THREE.Group(), w = p.w || 1.2, h = p.pine ? 2.05 : 1.95;
    const body = p.pine ? mat(0x8a5a2e, { roughness: 0.7 }) : M.dark, panel = p.pine ? mat(0x7a4d26, { roughness: 0.7 }) : mat(0x4a2e1a, { roughness: 0.7 });
    bx(g, w, h, 0.56, 0, h / 2, 0, body);
    bx(g, w + 0.08, 0.06, 0.62, 0, h + 0.03, 0, body);
    const n = p.mirror ? 3 : w > 1.6 ? 4 : 2, dw = w / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * dw;
      if (p.mirror && i === 1) bx(g, dw - 0.14, h * 0.6, 0.012, x, h * 0.58, -0.287, M.mirror);
      else {
        bx(g, dw - 0.12, h * 0.42, 0.012, x, h * 0.7, -0.287, panel);
        bx(g, dw - 0.12, h * 0.34, 0.012, x, h * 0.25, -0.287, panel);
      }
      if (i) bx(g, 0.01, h - 0.08, 0.012, -w / 2 + i * dw, h / 2, -0.287, M.black);
      ball(g, 0.018, x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), h * 0.48, -0.3, M.steel, 0);
    }
    return g;
  },
  closet(p) {
    const g = new THREE.Group(), w = p.w || 1.2;
    bx(g, w, 2.1, 0.5, 0, 1.05, 0, mat(0xe6d9b8));
    for (let y = 0.25; y < 2.0; y += 0.12) bx(g, w - 0.08, 0.02, 0.02, 0, y, -0.255, mat(0xcfc09a));
    bx(g, 0.015, 2.0, 0.03, 0, 1.05, -0.26, mat(0xb9aa85));
    return g;
  },
  /* Sofas and armchairs. style: "cushion" (dark wood, big round cushions),
     "rattan" (hooped arms, flowered cushions), "louis" (white frame, oval
     backs), "wood" (slatted frame, loose cushions) or a plain upholstered one. */
  sofa(p) {
    const g = new THREE.Group(), w = p.w || 1.9, style = p.style || "box";
    const frame = mat(p.frame || 0x8a5a2b, { roughness: 0.7 });
    const cushion = p.fabric ? texTrue(p.fabric) : mat(p.color || 0xd98c5f);
    const n = Math.max(1, Math.round((w - 0.2) / 0.62)), cw = (w - 0.2) / n, xs = [];
    for (let i = 0; i < n; i++) xs.push(-(w - 0.2) / 2 + (i + 0.5) * cw);
    const legs = (r, h, inset) => LEGS.forEach((q) => cy(g, r, r * 0.8, h, q[0] * (w / 2 - inset), h / 2, q[1] * 0.32, frame, 8));
    if (style === "cushion") {
      legs(0.03, 0.3, 0.05);
      bx(g, w, 0.05, 0.74, 0, 0.32, 0, frame);
      for (let i = 0; i < 4; i++) bx(g, w - 0.1, 0.05, 0.03, 0, 0.48 + i * 0.12, 0.36, frame);
      [-1, 1].forEach((s) => {
        bx(g, 0.07, 0.04, 0.8, s * (w / 2 - 0.035), 0.6, 0, frame);
        bx(g, 0.05, 0.6, 0.05, s * (w / 2 - 0.035), 0.3, -0.34, frame);
        bx(g, 0.05, 0.9, 0.05, s * (w / 2 - 0.035), 0.45, 0.36, frame);
      });
      xs.forEach((x) => {
        ball(g, 0.3, x, 0.46, -0.04, cushion, 2).scale.set(cw / 0.62, 0.36, 1.05);
        ball(g, 0.3, x, 0.78, 0.24, cushion, 2).scale.set(cw / 0.62, 0.95, 0.4);
      });
    } else if (style === "rattan") {
      legs(0.025, 0.28, 0.06);
      bx(g, w, 0.06, 0.78, 0, 0.3, 0, frame);
      [-1, 1].forEach((s) => {
        const x = s * (w / 2 - 0.03);
        hoop(g, 0.27, 0.022, Math.PI * 2, x, 0.5, -0.05, frame).rotation.y = Math.PI / 2;
        hoop(g, 0.17, 0.018, Math.PI * 2, x, 0.5, -0.05, frame).rotation.y = Math.PI / 2;
        cy(g, 0.02, 0.02, 0.62, x, 0.6, 0.36, frame, 6);
      });
      cy(g, 0.022, 0.022, w, 0, 0.92, 0.36, frame, 6).rotation.z = Math.PI / 2;
      xs.forEach((x) => {
        bx(g, cw - 0.03, 0.14, 0.62, x, 0.41, -0.04, cushion);
        bx(g, cw - 0.03, 0.44, 0.14, x, 0.7, 0.27, cushion).rotation.x = -0.14;
      });
    } else if (style === "louis") {
      legs(0.022, 0.32, 0.05);
      bx(g, w, 0.08, 0.6, 0, 0.35, 0, frame);
      bx(g, w - 0.08, 0.08, 0.54, 0, 0.43, -0.01, cushion);
      xs.forEach((x) => {
        const o = cy(g, cw / 2 - 0.02, cw / 2 - 0.02, 0.05, x, 0.84, 0.28, frame, 20);
        o.rotation.x = Math.PI / 2;
        o.scale.z = 1.15;
        const pad = cy(g, cw / 2 - 0.07, cw / 2 - 0.07, 0.05, x, 0.84, 0.265, cushion, 20);
        pad.rotation.x = Math.PI / 2;
        pad.scale.z = 1.15;
      });
      [-1, 1].forEach((s) => {
        const x = s * (w / 2 - 0.03);
        bx(g, 0.04, 0.04, 0.46, x, 0.62, 0.03, frame);
        bx(g, 0.05, 0.03, 0.22, x, 0.65, 0.03, cushion);
        bx(g, 0.04, 0.26, 0.04, x, 0.5, -0.2, frame);
        bx(g, 0.04, 0.5, 0.04, x, 0.6, 0.28, frame);
      });
    } else if (style === "wood") {
      legs(0.03, 0.3, 0.05);
      bx(g, w, 0.07, 0.8, 0, 0.3, 0, frame);
      bx(g, w, 0.4, 0.05, 0, 0.62, 0.38, frame);
      [-1, 1].forEach((s) => { bx(g, 0.07, 0.3, 0.8, s * (w / 2 - 0.035), 0.48, 0, frame); });
      xs.forEach((x) => {
        bx(g, cw - 0.04, 0.16, 0.62, x, 0.42, -0.05, cushion);
        bx(g, cw - 0.04, 0.4, 0.16, x, 0.7, 0.26, cushion).rotation.x = -0.12;
      });
    } else {
      bx(g, w, 0.3, 0.85, 0, 0.21, 0, frame);
      LEGS.forEach((q) => bx(g, 0.05, 0.06, 0.05, q[0] * (w / 2 - 0.06), 0.03, q[1] * 0.36, M.black));
      bx(g, w, 0.5, 0.2, 0, 0.6, 0.325, frame);
      [-1, 1].forEach((s) => bx(g, 0.16, 0.32, 0.85, s * (w / 2 - 0.08), 0.5, 0, frame));
      const iw = (w - 0.34) / n;
      for (let i = 0; i < n; i++) {
        const x = -(w - 0.34) / 2 + (i + 0.5) * iw;
        bx(g, iw - 0.02, 0.14, 0.62, x, 0.43, -0.09, cushion);
        bx(g, iw - 0.02, 0.36, 0.14, x, 0.68, 0.17, cushion).rotation.x = -0.12;
      }
    }
    return g;
  },
  armchair(p) { return BUILD.sofa(Object.assign({}, p, { w: 0.82 })); },
  /* A lone chair: style as in seatOf. */
  seat(p) { return seatOf(p.style, p); },
  coffee(p) {
    const g = new THREE.Group(), w = p.w || 1.0, d = p.d || 0.55;
    bx(g, w, 0.04, d, 0, 0.42, 0, M.wood);
    LEGS.forEach((q) => bx(g, 0.04, 0.4, 0.04, q[0] * (w / 2 - 0.05), 0.2, q[1] * (d / 2 - 0.05), M.wood));
    if (p.vase) bouquet(g, p.vase, 0, 0.44, 0, 0.9);
    return g;
  },
  /* A small side table: a marble top, a lamp or a vase where the photos show them. */
  side(p) {
    const g = new THREE.Group(), w = p.w || 0.45, h = 0.56;
    bx(g, w, 0.03, w, 0, h, 0, p.marble === false ? M.dark : mat(0xe8e2d6, { roughness: 0.3 }));
    bx(g, w - 0.04, 0.05, w - 0.04, 0, h - 0.04, 0, M.dark);
    LEGS.forEach((q) => bx(g, 0.035, h - 0.05, 0.035, q[0] * (w / 2 - 0.03), (h - 0.05) / 2, q[1] * (w / 2 - 0.03), M.dark));
    bx(g, w - 0.06, 0.02, w - 0.06, 0, 0.18, 0, M.dark);
    const two = p.lamp && p.vase;
    if (p.lamp) { cy(g, 0.05, 0.07, 0.25, two ? -w * 0.18 : 0, h + 0.14, 0, mat(0xb5653e, { roughness: 0.4 })); lampShade(g, two ? -w * 0.18 : 0, h + 0.36, 0, 0.14); }
    if (p.vase) bouquet(g, p.vase, two ? w * 0.22 : 0, h + 0.015, two ? -w * 0.1 : 0, 0.85, p.vaseColor);
    return g;
  },
  console(p) {
    const g = new THREE.Group(), gold = mat(0x8a6a2e, { roughness: 0.5, metalness: 0.3 });
    bx(g, 1.0, 0.05, 0.36, 0, 0.8, 0, mat(0xe8e2d6, { roughness: 0.3 }));
    bx(g, 0.96, 0.1, 0.32, 0, 0.73, 0, gold);
    [[-0.42, -0.12], [0.42, -0.12]].forEach((q) => { cy(g, 0.03, 0.02, 0.7, q[0], 0.35, q[1], gold, 8); ball(g, 0.045, q[0], 0.5, q[1], gold, 1); });
    bx(g, 1.25, 0.6, 0.04, 0, 1.55, 0.17, mat(0x2a1d14, { roughness: 0.5 }));
    bx(g, 1.1, 0.46, 0.02, 0, 1.55, 0.15, M.mirror);
    bouquet(g, (p && p.vase) || "roses", 0.3, 0.825, 0, 0.9, 0xd9d2c2);
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
  /* A hutch: cupboard below, glazed doors above. */
  hutch(p) {
    const g = new THREE.Group(), w = p.w || 0.8, c = mat(0x4a2c18, { roughness: 0.7 });
    bx(g, w, 0.8, 0.42, 0, 0.4, 0, c);
    bx(g, w, 1.0, 0.3, 0, 1.3, 0.06, c);
    bx(g, w + 0.06, 0.05, 0.36, 0, 1.82, 0.06, c);
    [-1, 1].forEach((s) => bx(g, w / 2 - 0.08, 0.8, 0.01, s * w / 4, 1.32, -0.092, M.glass));
    bx(g, 0.012, 0.7, 0.012, 0, 0.4, -0.212, M.black);
    return g;
  },
  chandelier(p) {
    const g = new THREE.Group(), h = p.h || 2.7, metal = p.white ? M.white : mat(0x6a5a3a, { roughness: 0.4, metalness: 0.5 });
    cy(g, 0.008, 0.008, 0.5, 0, h - 0.25, 0, M.black, 6);
    cy(g, 0.05, 0.05, 0.03, 0, h - 0.015, 0, metal, 10);
    ball(g, 0.07, 0, h - 0.55, 0, metal, 1);
    cy(g, 0.02, 0.035, 0.2, 0, h - 0.68, 0, metal, 8);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const arm = hoop(g, 0.14, 0.01, Math.PI, c * 0.14, h - 0.62, s * 0.14, metal);
      arm.rotation.set(Math.PI, -a, 0);
      cy(g, 0.035, 0.02, 0.015, c * 0.28, h - 0.61, s * 0.28, metal, 8);
      cy(g, 0.012, 0.012, 0.09, c * 0.28, h - 0.56, s * 0.28, M.white, 6);
      ball(g, 0.03, c * 0.28, h - 0.49, s * 0.28, M.glow, 1).scale.y = 1.4;
    }
    return g;
  },
  /* A hanging lamp. globe: the hall's white glass bell; macrame: the glazed
     room's woven shade on a bamboo ring; ball: a white globe at the ceiling. */
  pendant(p) {
    const g = new THREE.Group(), h = p.h || 2.7;
    const glassy = mat(0xf7f5ee, { emissive: 0xfff0cc, emissiveIntensity: 0.45, roughness: 0.3 });
    if (p.ball) {
      cy(g, 0.06, 0.06, 0.05, 0, h - 0.025, 0, M.white, 10);
      ball(g, 0.17, 0, h - 0.2, 0, glassy, 2);
      return g;
    }
    if (p.macrame) {
      cy(g, 0.012, 0.012, 0.75, 0, h - 0.375, 0, mat(0x9a5a34, { roughness: 0.7 }), 6);
      cy(g, 0.05, 0.07, 0.1, 0, h - 0.72, 0, mat(0x9a5a34, { roughness: 0.7 }), 8);
      cy(g, 0.07, 0.3, 0.34, 0, h - 0.94, 0, mat(0xefe2c4, { emissive: 0xffd9a0, emissiveIntensity: 0.4, roughness: 1 }), 8);
      hoop(g, 0.3, 0.014, Math.PI * 2, 0, h - 1.11, 0, mat(0xb98a4a)).rotation.x = Math.PI / 2;
      ball(g, 0.05, 0, h - 1.0, 0, M.glow, 1);
      return g;
    }
    cy(g, 0.008, 0.008, 0.7, 0, h - 0.35, 0, p.globe ? M.white : M.black, 6);
    if (p.globe) {
      cy(g, 0.03, 0.05, 0.06, 0, h - 0.7, 0, M.white, 10);
      cy(g, 0.06, 0.2, 0.17, 0, h - 0.8, 0, glassy, 16);
    } else cy(g, 0.06, 0.24, 0.3, 0, h - 0.82, 0, mat(0xe9d6b0, { emissive: 0xffd9a0, emissiveIntensity: 0.4 }));
    ball(g, 0.05, 0, h - 0.92, 0, M.glow, 1);
    return g;
  },
  /* A table with its chairs. style: the chairs (see seatOf); cloth: a
     tablecloth's colour; glass: a glass top; vase: flowers in the middle. */
  dining(p) {
    const g = new THREE.Group(), w = p.w || 1.0, d = p.d || w;
    const leg = p.metal ? M.green : p.wood ? M.light : M.wood;
    if (p.round) {
      cy(g, w / 2, w / 2, 0.04, 0, 0.74, 0, p.metal ? M.white : M.wood, 20);
      cy(g, 0.04, 0.04, 0.72, 0, 0.36, 0, leg, 8);
      cy(g, w * 0.3, w * 0.32, 0.03, 0, 0.015, 0, leg, 12);
    } else {
      bx(g, w, 0.04, d, 0, 0.74, 0, p.top ? mat(p.top, { roughness: 0.6 }) : p.wood ? M.light : M.wood);
      // a tablecloth drapes over the top, so it is a little bigger and higher
      if (p.cloth) { bx(g, w + 0.03, 0.02, d + 0.03, 0, 0.77, 0, mat(p.cloth)); bx(g, w + 0.06, 0.3, d + 0.06, 0, 0.615, 0, mat(p.cloth)); }
      if (p.glass) bx(g, w - 0.04, 0.012, d - 0.04, 0, 0.768, 0, M.glass);
      LEGS.forEach((q) => bx(g, 0.05, 0.72, 0.05, q[0] * (w / 2 - 0.06), 0.36, q[1] * (d / 2 - 0.06), leg));
    }
    if (p.vase) bouquet(g, p.vase, 0, p.cloth ? 0.78 : 0.76, 0, 1, p.vaseColor);
    const n = p.chairs === undefined ? 4 : p.chairs;
    const spots = n === 0 ? []
      : n === 2 ? [[w / 2 + 0.32, 0], [-w / 2 - 0.32, 0]]
      : n === 3 ? [[0, d / 2 + 0.32], [w / 2 + 0.32, 0], [-w / 2 - 0.32, 0]]
      : [[0, d / 2 + 0.32], [0, -d / 2 - 0.32], [w / 2 + 0.32, 0], [-w / 2 - 0.32, 0]];
    spots.forEach((s) => {
      const c = seatOf(p.style, { seat: p.seat, metal: p.metal, color: p.chairColor });
      c.position.set(s[0], 0, s[1]);
      c.rotation.y = Math.atan2(s[0], s[1]);
      g.add(c);
    });
    return g;
  },
  /* A small table with a chair at each end: the hall's with a white cloth and
     bentwood chairs, the glazed room's in bare wood with striped chairs. */
  cafe(p) {
    const style = p.style || (p.wood ? "striped" : "bentwood");
    const g = BUILD.dining({ w: 0.7, d: 0.7, chairs: 0, wood: p.wood, cloth: p.wood ? null : (p.cloth || 0xf1efe8), vase: p.vase });
    [0.57, -0.57].forEach((x, i) => {
      const c = seatOf(i && p.style2 ? p.style2 : style, { seat: p.seat });
      c.position.set(x, 0, 0);
      c.rotation.y = Math.atan2(x, 0);
      g.add(c);
    });
    return g;
  },
  /* Kitchen units along a wall: sink, stove, wall cabinets above. */
  counter(p) {
    const g = new THREE.Group(), w = p.w || 2;
    const cab = mat(p.cabinet || 0x6b3f22, { roughness: 0.6 });
    bx(g, w, 0.76, 0.58, 0, 0.48, 0, cab);
    bx(g, w - 0.06, 0.1, 0.5, 0, 0.05, 0.03, M.black);
    for (let x = -w / 2 + 0.5; x < w / 2 - 0.1; x += 0.5) { bx(g, 0.01, 0.7, 0.01, x, 0.48, -0.292, M.black); bx(g, 0.015, 0.1, 0.02, x - 0.05, 0.72, -0.3, M.steel); }
    bx(g, w + 0.02, 0.04, 0.62, 0, 0.88, 0, p.top ? mat(p.top, { roughness: 0.35 }) : mat(0xd8cdb8, { roughness: 0.35 }));
    if (p.splash !== false) bx(g, w, 0.62, 0.02, 0, 1.22, 0.3, texTrue(p.splash || "tiles"));
    if (p.sink !== undefined) {
      bx(g, 0.5, 0.012, 0.38, p.sink, 0.901, -0.02, M.steel);
      bx(g, 0.42, 0.01, 0.3, p.sink, 0.905, -0.02, mat(0x8a8f93, { roughness: 0.3, metalness: 0.6 }));
      cy(g, 0.015, 0.015, 0.26, p.sink, 1.03, 0.22, M.chrome, 8);
      bx(g, 0.02, 0.02, 0.16, p.sink, 1.15, 0.15, M.chrome);
    }
    if (p.stove !== undefined) {
      const body = p.stoveColor ? mat(p.stoveColor, { roughness: 0.4 }) : M.black;
      bx(g, 0.56, 0.88, 0.62, p.stove, 0.44, -0.01, body);
      bx(g, 0.57, 0.03, 0.63, p.stove, 0.915, -0.01, M.black);
      LEGS.forEach((q) => cy(g, 0.07, 0.07, 0.02, p.stove + q[0] * 0.13, 0.94, q[1] * 0.12, M.steel, 12));
      bx(g, 0.44, 0.36, 0.01, p.stove, 0.42, -0.325, mat(0x15181d, { roughness: 0.2 }));
      bx(g, 0.4, 0.02, 0.03, p.stove, 0.66, -0.34, M.steel);
      for (let i = 0; i < 5; i++) cy(g, 0.018, 0.018, 0.03, p.stove - 0.2 + i * 0.1, 0.8, -0.33, M.steel, 8).rotation.x = Math.PI / 2;
    }
    if (p.upper) {
      bx(g, w, 0.6, 0.32, 0, 1.85, 0.14, cab);
      for (let x = -w / 2 + 0.5; x < w / 2 - 0.1; x += 0.5) bx(g, 0.01, 0.56, 0.01, x, 1.85, -0.022, M.black);
    }
    if (p.kettle !== undefined) {
      cy(g, 0.07, 0.09, 0.18, p.kettle, 0.99, 0.05, M.white, 12);
      bx(g, 0.02, 0.12, 0.02, p.kettle + 0.1, 1.0, 0.05, M.black);
    }
    return g;
  },
  fridge() {
    const g = new THREE.Group();
    bx(g, 0.68, 1.75, 0.66, 0, 0.875, 0.01, M.white);
    bx(g, 0.66, 0.012, 0.012, 0, 1.2, -0.325, M.black);
    bx(g, 0.03, 0.3, 0.04, 0.27, 1.42, -0.34, M.steel);
    bx(g, 0.03, 0.4, 0.04, 0.27, 0.9, -0.34, M.steel);
    return g;
  },
  heater() {
    const g = new THREE.Group();
    cy(g, 0.24, 0.24, 0.9, 0, 1.75, 0.08, M.white, 18);
    cy(g, 0.02, 0.02, 0.3, -0.08, 1.2, 0.08, M.steel, 6);
    cy(g, 0.02, 0.02, 0.3, 0.08, 1.2, 0.08, M.steel, 6);
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
    cy(g, 0.012, 0.012, 0.2, 0, 1.0, 0.2, M.chrome, 6);
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
  /* The reception desk: a buttoned front, a dark top, a television and flowers on it. */
  desk(p) {
    const g = new THREE.Group(), w = p.w || 1.6;
    bx(g, w, 1.0, 0.08, 0, 0.5, -0.26, texBox("tufted", w, 1.0));
    bx(g, w + 0.06, 0.05, 0.64, 0, 1.05, 0, M.dark);
    [-1, 1].forEach((s) => bx(g, 0.06, 1.0, 0.6, s * w / 2, 0.5, 0, M.dark));
    bx(g, w, 0.04, 0.5, 0, 0.75, 0.05, M.dark);
    if (p.tufted) {
      bx(g, 0.56, 0.34, 0.03, -w * 0.25, 1.3, 0.05, M.black);
      bx(g, 0.2, 0.02, 0.14, -w * 0.25, 1.085, 0.05, M.black);
      bx(g, 0.04, 0.08, 0.03, -w * 0.25, 1.12, 0.05, M.black);
      bouquet(g, "sunflower", w * 0.3, 1.075, 0, 1.2, 0xb5653e);
    }
    return g;
  },
  tv() {
    const g = new THREE.Group();
    bx(g, 1.0, 0.5, 0.42, 0, 0.25, 0, M.wood);
    bx(g, 0.95, 0.56, 0.04, 0, 0.84, 0.05, M.black);
    bx(g, 0.89, 0.5, 0.01, 0, 0.84, 0.028, mat(0x15181d, { roughness: 0.15 }));
    bx(g, 0.2, 0.06, 0.18, 0, 0.53, 0.05, M.black);
    return g;
  },
  bench() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) bx(g, 1.5, 0.03, 0.09, 0, 0.45, -0.17 + i * 0.11, M.white);
    for (let i = 0; i < 3; i++) bx(g, 1.5, 0.07, 0.03, 0, 0.6 + i * 0.12, 0.21, M.white);
    [-0.65, 0.65].forEach((x) => {
      bx(g, 0.05, 0.45, 0.42, x, 0.22, 0, M.black);
      bx(g, 0.04, 0.85, 0.04, x, 0.43, 0.22, M.black);
      bx(g, 0.04, 0.03, 0.46, x, 0.66, 0, M.black);
    });
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
