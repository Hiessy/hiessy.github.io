/* The catalog of 3D pieces: everything a house like this one would have, each
   built from boxes, cylinders and spheres, in meters, standing on y = 0 with
   its middle at x = z = 0 and its front toward +z (the existing pieces keep
   the orientation the house uses). Colors follow the listing photos.

   The first part reuses the pieces the 3D walk already builds (js/walk/
   pieces.js); the second part adds what the house has but the walk doesn't
   need: appliances, bathroom fixtures, kitchen units, doors, windows,
   curtains, rugs, fans, decoration.

   CATALOG is a list of { id, name, cat, make() }; make() returns a new
   THREE.Group each time. Exported to .obj by export-obj.js. */
import * as THREE from "three";
import { bx, cy, ball } from "../../js/walk/geometry.js";
import { M, mat } from "../../js/walk/materials.js";
import { BUILD, chair } from "../../js/walk/pieces.js";
import { basin, bidet, toilet, vanity } from "../../js/walk/bathroom.js";
import { DECOR } from "../../js/walk/decor.js";
import { PLANTS } from "../../js/walk/plants.js";

const std = (color, o) => mat(color, o || {});
const WOOD = 0x6b4423, PINE = 0xc58f52, DARKW = 0x3f2716;
const grp = () => new THREE.Group();
const tag = (g, name) => { g.name = name; return g; };

/* ---------- new pieces ---------- */
const NEW = {
  chair() { return chair(null, 0xeadfc8, false); },
  chairMetal() { return chair(null, null, true); },
  stool() {
    const g = grp();
    cy(g, 0.17, 0.17, 0.04, 0, 0.5, 0, M.wood, 16);
    [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]].forEach((p) => bx(g, 0.035, 0.48, 0.035, p[0], 0.24, p[1], M.wood));
    return g;
  },
  table() {
    const g = grp();
    bx(g, 1.4, 0.04, 0.8, 0, 0.74, 0, std(PINE));
    [[-0.64, -0.34], [0.64, -0.34], [-0.64, 0.34], [0.64, 0.34]].forEach((p) => bx(g, 0.06, 0.72, 0.06, p[0], 0.36, p[1], M.wood));
    return g;
  },
  roundTable() {
    const g = grp();
    cy(g, 0.45, 0.45, 0.04, 0, 0.74, 0, std(PINE), 24);
    cy(g, 0.05, 0.07, 0.72, 0, 0.36, 0, M.wood, 10);
    cy(g, 0.28, 0.28, 0.03, 0, 0.015, 0, M.wood, 16);
    return g;
  },
  bookcase() {
    const g = grp(), w = 0.9, h = 1.9, d = 0.32;
    [-1, 1].forEach((s) => bx(g, 0.03, h, d, s * (w / 2 - 0.015), h / 2, 0, std(WOOD)));
    for (let i = 0; i <= 5; i++) bx(g, w, 0.03, d, 0, 0.03 + i * 0.37, 0, std(WOOD));
    bx(g, w, h, 0.01, 0, h / 2, -d / 2 + 0.005, std(DARKW));
    const colors = [0x9b3b2e, 0x2d5d8a, 0xd0a53a, 0x3f7a4f, 0xe9dfc8, 0x6b4a8a];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 9; k++) bx(g, 0.05, 0.22 + (k % 3) * 0.03, 0.2, -0.38 + k * 0.095, 0.15 + r * 0.37 + 0.12, 0, std(colors[(r + k) % colors.length]));
    return g;
  },
  dresser() {
    const g = grp(), w = 1.1, h = 0.85, d = 0.48;
    bx(g, w, h, d, 0, h / 2 + 0.05, 0, std(WOOD));
    bx(g, w + 0.04, 0.03, d + 0.03, 0, h + 0.065, 0, std(DARKW));
    [-0.12, 0.2, 0.5].forEach((y) => { bx(g, w - 0.08, 0.005, 0.01, 0, h / 2 + 0.05 + y, d / 2, M.dark); bx(g, 0.14, 0.025, 0.03, 0, h / 2 + 0.05 + y + 0.12, d / 2 + 0.01, M.steel); });
    [[-0.5, -0.2], [0.5, -0.2], [-0.5, 0.2], [0.5, 0.2]].forEach((p) => bx(g, 0.05, 0.05, 0.05, p[0], 0.025, p[1], M.dark));
    return g;
  },
  mirror() {
    const g = grp();
    bx(g, 0.5, 0.7, 0.03, 0, 1.45, 0, std(DARKW));
    bx(g, 0.42, 0.62, 0.032, 0, 1.45, 0, M.mirror);
    return g;
  },
  mirrorOctagon() {
    const g = grp();
    const ring = cy(g, 0.32, 0.32, 0.04, 0, 1.5, 0, std(0x8a6a3a), 8); ring.rotation.x = Math.PI / 2;
    const face = cy(g, 0.26, 0.26, 0.045, 0, 1.5, 0, M.mirror, 8); face.rotation.x = Math.PI / 2;
    return g;
  },
  pictureFrame() {
    const g = grp();
    bx(g, 0.6, 0.45, 0.03, 0, 1.6, 0, std(0xb18d3a));
    bx(g, 0.5, 0.35, 0.032, 0, 1.6, 0, std(0x6f8f6a));
    return g;
  },
  clock() {
    const g = grp();
    const f = cy(g, 0.15, 0.15, 0.03, 0, 2.0, 0, M.white, 20); f.rotation.x = Math.PI / 2;
    bx(g, 0.012, 0.1, 0.01, 0, 2.03, 0.02, M.black); bx(g, 0.1, 0.012, 0.01, 0.04, 2.0, 0.02, M.black);
    return g;
  },
  rug() {
    const g = grp();
    bx(g, 2.0, 0.015, 1.4, 0, 0.008, 0, std(0x8a3a3a));
    bx(g, 1.8, 0.017, 1.2, 0, 0.009, 0, std(0xd9c9a0));
    bx(g, 1.5, 0.019, 0.9, 0, 0.01, 0, std(0x5a2f2f));
    return g;
  },
  curtain() {
    const g = grp(), c = std(0x8d8f94, { roughness: 1 });
    for (let i = 0; i < 9; i++) bx(g, 0.1, 2.3, 0.06 + (i % 2) * 0.03, -0.45 + i * 0.11, 1.2, 0, c);
    bx(g, 1.1, 0.03, 0.03, 0, 2.37, 0, std(WOOD));
    return g;
  },
  pillow() {
    const g = grp(), c = std(0xf0ece2);
    bx(g, 0.5, 0.12, 0.3, 0, 0.06, 0, c);
    bx(g, 0.46, 0.1, 0.26, 0, 0.12, 0, c);
    return g;
  },
  vase() {
    const g = grp(), c = std(0xb5653e);
    cy(g, 0.07, 0.09, 0.28, 0, 0.14, 0, c, 14);
    cy(g, 0.05, 0.07, 0.08, 0, 0.32, 0, c, 14);
    for (let i = 0; i < 5; i++) { const a = i * 1.26; bx(g, 0.01, 0.35, 0.01, Math.cos(a) * 0.03, 0.55, Math.sin(a) * 0.03, M.leaf); ball(g, 0.04, Math.cos(a) * 0.05, 0.74, Math.sin(a) * 0.05, std(0xd9a21b), 1); }
    return g;
  },
  pot() {
    const g = grp();
    cy(g, 0.2, 0.15, 0.3, 0, 0.15, 0, M.pot, 14);
    ball(g, 0.26, 0, 0.55, 0, M.leaf, 1); ball(g, 0.18, 0.12, 0.72, 0.05, M.leaf2, 1);
    return g;
  },
  trashBin() {
    const g = grp();
    cy(g, 0.16, 0.13, 0.4, 0, 0.2, 0, std(0x2f9a4a), 14);
    cy(g, 0.17, 0.17, 0.03, 0, 0.415, 0, std(0x258040), 14);
    return g;
  },
  coatRack() {
    const g = grp();
    cy(g, 0.025, 0.025, 1.7, 0, 0.85, 0, std(DARKW), 8);
    cy(g, 0.18, 0.2, 0.03, 0, 0.015, 0, std(DARKW), 14);
    [0, 1.57, 3.14, 4.71].forEach((a) => bx(g, 0.1, 0.02, 0.02, Math.cos(a) * 0.06, 1.65, Math.sin(a) * 0.06, std(DARKW)).rotation.y = -a);
    return g;
  },
  // ---- kitchen
  stove() {
    const g = grp(), body = std(0xe9e6df, { roughness: 0.4 });
    bx(g, 0.56, 0.86, 0.6, 0, 0.43, 0, body);
    bx(g, 0.58, 0.03, 0.62, 0, 0.875, 0, M.black);
    [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach((p) => cy(g, 0.07, 0.07, 0.02, p[0], 0.9, p[1], M.black, 14));
    bx(g, 0.46, 0.4, 0.01, 0, 0.4, 0.305, M.black);
    bx(g, 0.4, 0.02, 0.03, 0, 0.66, 0.33, M.steel);
    [-0.2, -0.1, 0, 0.1, 0.2].forEach((x) => cy(g, 0.02, 0.02, 0.03, x, 0.78, 0.31, M.black, 8).rotation.x = Math.PI / 2);
    return g;
  },
  oven() {
    const g = grp();
    bx(g, 0.6, 0.6, 0.55, 0, 0.3, 0, std(0x2b2b2b));
    bx(g, 0.46, 0.34, 0.01, 0, 0.3, 0.28, M.glass);
    bx(g, 0.5, 0.02, 0.03, 0, 0.52, 0.3, M.steel);
    return g;
  },
  microwave() {
    const g = grp();
    bx(g, 0.46, 0.28, 0.34, 0, 0.14, 0, std(0xdcdcd8));
    bx(g, 0.3, 0.2, 0.01, -0.05, 0.14, 0.175, M.black);
    bx(g, 0.08, 0.2, 0.01, 0.17, 0.14, 0.175, M.dark);
    return g;
  },
  kettle() {
    const g = grp();
    cy(g, 0.08, 0.1, 0.18, 0, 0.09, 0, M.white, 14);
    cy(g, 0.02, 0.07, 0.05, 0, 0.2, 0, M.white, 10);
    bx(g, 0.02, 0.14, 0.02, 0.1, 0.12, 0, M.black);
    return g;
  },
  kitchenSink() {
    const g = grp();
    bx(g, 1.2, 0.8, 0.6, 0, 0.4, 0, std(0xf2f0ea));
    bx(g, 1.22, 0.035, 0.62, 0, 0.82, 0, std(0x4a3f3f, { roughness: 0.4 }));
    bx(g, 0.5, 0.01, 0.38, -0.2, 0.84, 0, M.steel);
    cy(g, 0.015, 0.015, 0.25, -0.2, 0.96, -0.24, M.chrome, 8);
    bx(g, 0.012, 0.012, 0.12, -0.2, 1.08, -0.18, M.chrome);
    [[-0.3, 0.3]].forEach(() => { bx(g, 0.004, 0.7, 0.01, 0.2, 0.4, 0.305, M.black); });
    return g;
  },
  wallCabinets() {
    const g = grp(), c = std(0xf2f0ea);
    bx(g, 1.6, 0.7, 0.32, 0, 1.75, 0, c);
    [-0.4, 0, 0.4].forEach((x) => { bx(g, 0.004, 0.66, 0.01, x + 0.4, 1.75, 0.165, M.black); bx(g, 0.02, 0.12, 0.02, x + 0.34, 1.6, 0.18, M.steel); });
    return g;
  },
  waterHeater() {
    const g = grp();
    cy(g, 0.25, 0.25, 1.2, 0, 0.7, 0, std(0xeeeeee, { roughness: 0.4 }), 20);
    cy(g, 0.25, 0.25, 0.04, 0, 0.1, 0, M.black, 20);
    bx(g, 0.1, 0.1, 0.03, 0, 1.0, 0.25, M.black);
    cy(g, 0.02, 0.02, 0.2, -0.1, 1.4, 0, M.steel, 8); cy(g, 0.02, 0.02, 0.2, 0.1, 1.4, 0, M.steel, 8);
    return g;
  },
  gasHeater() {
    const g = grp();
    bx(g, 0.65, 0.58, 0.2, 0, 0.55, 0, std(0xe8e4d8));
    bx(g, 0.5, 0.3, 0.01, 0, 0.5, 0.105, M.black);
    cy(g, 0.03, 0.03, 0.4, 0.2, 0.1, 0, M.steel, 8);
    return g;
  },
  // ---- bathroom
  toilet() {
    const g = grp();
    cy(g, 0.17, 0.2, 0.38, 0, 0.19, 0.05, M.white, 16);
    cy(g, 0.2, 0.18, 0.06, 0, 0.41, 0.07, M.white, 16);
    bx(g, 0.38, 0.36, 0.17, 0, 0.6, -0.2, M.white);
    cy(g, 0.03, 0.03, 0.03, 0.12, 0.8, -0.2, M.chrome, 8);
    return g;
  },
  bidet() {
    const g = grp();
    cy(g, 0.15, 0.18, 0.38, 0, 0.19, 0.05, M.white, 16);
    cy(g, 0.17, 0.15, 0.05, 0, 0.405, 0.06, M.white, 16);
    cy(g, 0.015, 0.015, 0.08, 0, 0.5, -0.12, M.chrome, 8);
    return g;
  },
  basin() {
    const g = grp();
    cy(g, 0.06, 0.09, 0.78, 0, 0.39, -0.05, M.white, 12);
    bx(g, 0.5, 0.14, 0.4, 0, 0.84, 0, M.white);
    cy(g, 0.015, 0.015, 0.14, 0, 0.98, -0.15, M.chrome, 8);
    bx(g, 0.012, 0.012, 0.1, 0, 1.05, -0.1, M.chrome);
    return g;
  },
  vanity() {
    const g = grp();
    bx(g, 0.7, 0.8, 0.45, 0, 0.4, 0, std(0xf2f0ea));
    bx(g, 0.72, 0.03, 0.47, 0, 0.815, 0, std(0xe6dcc8));
    cy(g, 0.17, 0.12, 0.08, 0, 0.82, 0, M.white, 20);
    cy(g, 0.015, 0.015, 0.14, 0, 0.93, -0.18, M.chrome, 8);
    bx(g, 0.5, 0.6, 0.02, 0, 1.45, -0.22, M.mirror);
    return g;
  },
  bathtub() {
    const g = grp();
    bx(g, 1.6, 0.5, 0.72, 0, 0.25, 0, M.white);
    bx(g, 1.4, 0.04, 0.55, 0, 0.5, 0, std(0xdde6ea));
    cy(g, 0.015, 0.015, 0.2, -0.7, 0.6, 0, M.chrome, 8);
    return g;
  },
  shower() {
    const g = grp();
    bx(g, 0.8, 0.05, 0.8, 0, 0.03, 0, M.white);
    cy(g, 0.012, 0.012, 2.1, -0.38, 1.05, -0.38, M.chrome, 8);
    bx(g, 0.012, 0.012, 0.25, -0.38, 2.1, -0.26, M.chrome);
    cy(g, 0.07, 0.07, 0.03, -0.38, 2.08, -0.15, M.chrome, 12);
    bx(g, 0.8, 1.95, 0.015, 0, 1.0, 0.4, std(0x7fb3c9, { transparent: true, opacity: 0.45 }));
    bx(g, 0.015, 1.95, 0.8, 0.4, 1.0, 0, std(0x7fb3c9, { transparent: true, opacity: 0.45 }));
    return g;
  },
  towelRail() {
    const g = grp();
    bx(g, 0.6, 0.02, 0.02, 0, 1.15, 0, M.chrome); bx(g, 0.6, 0.02, 0.02, 0, 1.0, 0, M.chrome);
    [-0.29, 0.29].forEach((x) => bx(g, 0.02, 0.2, 0.08, x, 1.08, 0.03, M.chrome));
    bx(g, 0.5, 0.35, 0.03, 0, 1.08, 0.07, std(0x3f78a8));
    return g;
  },
  // ---- appliances and climate
  fan() {
    const g = grp();
    cy(g, 0.2, 0.22, 0.03, 0, 0.015, 0, M.black, 16);
    cy(g, 0.02, 0.02, 1.0, 0, 0.5, 0, M.steel, 8);
    const hub = cy(g, 0.12, 0.12, 0.2, 0, 1.05, 0, M.white, 14); hub.rotation.x = Math.PI / 2;
    const cage = cy(g, 0.22, 0.22, 0.03, 0, 1.05, 0.1, M.glass, 20); cage.rotation.x = Math.PI / 2;
    return g;
  },
  ceilingFan() {
    const g = grp();
    cy(g, 0.012, 0.012, 0.3, 0, 2.5, 0, M.black, 6);
    cy(g, 0.1, 0.1, 0.1, 0, 2.3, 0, std(0x5a3a22), 14);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; bx(g, 0.55, 0.012, 0.12, Math.cos(a) * 0.35, 2.3, Math.sin(a) * 0.35, std(WOOD)).rotation.y = -a; }
    return g;
  },
  airConditioner() {
    const g = grp();
    bx(g, 0.9, 0.28, 0.22, 0, 2.1, 0, std(0xf2f2ee, { roughness: 0.4 }));
    bx(g, 0.8, 0.02, 0.15, 0, 1.99, 0.03, M.black);
    return g;
  },
  washingMachine() {
    const g = grp();
    bx(g, 0.6, 0.85, 0.58, 0, 0.425, 0, M.white);
    const door = cy(g, 0.2, 0.2, 0.04, 0, 0.45, 0.3, std(0x8fb6cc, { transparent: true, opacity: 0.6 }), 20); door.rotation.x = Math.PI / 2;
    bx(g, 0.45, 0.07, 0.02, 0, 0.78, 0.29, M.black);
    return g;
  },
  television() {
    const g = grp();
    bx(g, 0.9, 0.55, 0.05, 0, 1.0, 0, M.black);
    bx(g, 0.84, 0.49, 0.052, 0, 1.0, 0, std(0x15181d, { roughness: 0.2 }));
    bx(g, 0.2, 0.03, 0.15, 0, 0.72, 0, M.black); bx(g, 0.05, 0.2, 0.04, 0, 0.82, 0, M.black);
    return g;
  },
  tvStand() {
    const g = grp();
    bx(g, 1.2, 0.5, 0.4, 0, 0.25, 0, std(DARKW));
    bx(g, 1.22, 0.03, 0.42, 0, 0.515, 0, std(WOOD));
    bx(g, 0.5, 0.35, 0.01, -0.3, 0.25, 0.205, std(0x1b1209)); bx(g, 0.5, 0.35, 0.01, 0.3, 0.25, 0.205, std(0x1b1209));
    return g;
  },
  // ---- openings
  doorLeaf() {
    const g = grp();
    bx(g, 0.8, 2.05, 0.045, 0, 1.025, 0, std(0x6e4426, { roughness: 0.65 }));
    [[1.5, 0.7], [0.55, 0.7]].forEach((p) => bx(g, 0.52, p[1] * 0.7, 0.05, 0, p[0] - 0.0, 0, std(0x5e3a20)));
    ball(g, 0.035, 0.32, 1.0, 0.03, M.steel, 1);
    return g;
  },
  doorFrame() {
    const g = grp(), c = std(0x5a3a22, { roughness: 0.6 });
    [-1, 1].forEach((s) => bx(g, 0.07, 2.1, 0.17, s * 0.435, 1.05, 0, c));
    bx(g, 0.94, 0.07, 0.17, 0, 2.115, 0, c);
    return g;
  },
  doubleGlassDoor() {
    const g = grp(), fr = std(0xe9ebec, { roughness: 0.45 });
    [-1, 1].forEach((s) => {
      bx(g, 0.04, 2.05, 0.05, s * 0.68, 1.025, 0, fr); bx(g, 0.04, 2.05, 0.05, 0, 1.025, 0, fr);
      bx(g, 0.64, 2.0, 0.012, s * 0.34, 1.025, 0, M.glass);
      bx(g, 0.64, 0.05, 0.05, s * 0.34, 0.03, 0, fr); bx(g, 0.64, 0.05, 0.05, s * 0.34, 2.02, 0, fr);
    });
    return g;
  },
  window() {
    const g = grp(), fr = std(0xf2f2ee, { roughness: 0.5 });
    bx(g, 1.5, 0.05, 0.1, 0, 0.9, 0, fr); bx(g, 1.5, 0.05, 0.1, 0, 2.1, 0, fr);
    [-0.725, 0, 0.725].forEach((x) => bx(g, 0.05, 1.25, 0.1, x, 1.5, 0, fr));
    bx(g, 1.4, 1.2, 0.012, 0, 1.5, 0, M.glass);
    return g;
  },
  barredWindow() {
    const g = NEW.window();
    for (let i = 0; i < 9; i++) bx(g, 0.025, 1.2, 0.025, -0.64 + i * 0.16, 1.5, 0.08, M.trim);
    bx(g, 1.4, 0.03, 0.03, 0, 1.5, 0.08, M.trim);
    return g;
  },
  shutters() {
    const g = grp(), c = std(0xe9dfc4);
    [-1, 1].forEach((s) => { bx(g, 0.5, 1.3, 0.03, s * 0.52, 1.5, 0, c); for (let i = 0; i < 12; i++) bx(g, 0.46, 0.012, 0.04, s * 0.52, 0.9 + i * 0.1, 0, std(0xc9bb97)); });
    return g;
  },
  gate() {
    const g = grp(), c = std(0xf4f4f1);
    bx(g, 3.2, 0.06, 0.04, 0, 0.1, 0, c); bx(g, 3.2, 0.06, 0.04, 0, 1.75, 0, c); bx(g, 3.2, 0.05, 0.04, 0, 0.95, 0, c);
    for (let i = 0; i <= 20; i++) bx(g, 0.03, 1.8, 0.03, -1.55 + i * 0.155, 0.9, 0, c);
    return g;
  },
  // ---- outdoor
  gardenBench() {
    const g = grp(), c = std(0x1f2a24);
    bx(g, 1.5, 0.05, 0.5, 0, 0.45, 0, c);
    for (let i = 0; i < 6; i++) bx(g, 1.5, 0.04, 0.05, 0, 0.7 + i * 0.05, -0.22, c).rotation.x = -0.15;
    [-0.65, 0.65].forEach((x) => { bx(g, 0.05, 0.45, 0.45, x, 0.225, 0, c); bx(g, 0.05, 0.4, 0.05, x, 0.65, -0.22, c); });
    return g;
  },
  grill() {
    const g = grp();
    bx(g, 1.5, 1.6, 0.7, 0, 0.8, 0, M.brick);
    bx(g, 1.1, 0.5, 0.08, 0, 1.0, 0.33, M.black);
    bx(g, 0.6, 1.9, 0.5, 0, 2.55, -0.05, M.brick);
    return g;
  },
  lampPost() {
    const g = grp();
    cy(g, 0.06, 0.08, 6.5, 0, 3.25, 0, std(0x55585b), 8);
    bx(g, 1.4, 0.06, 0.06, 0.7, 6.4, 0, std(0x55585b)); bx(g, 0.4, 0.12, 0.2, 1.35, 6.32, 0, M.glow);
    return g;
  },
  floorLamp() {
    const g = grp();
    cy(g, 0.15, 0.16, 0.03, 0, 0.015, 0, M.black, 14);
    cy(g, 0.015, 0.015, 1.45, 0, 0.75, 0, M.black, 6);
    cy(g, 0.12, 0.2, 0.24, 0, 1.6, 0, std(0xf3ead6, { emissive: 0xffe2a8, emissiveIntensity: 0.35 }), 16);
    return g;
  }
};

/* ---------- the list ---------- */
const E = (id, name, cat, make) => ({ id, name, cat, make: () => tag(make(), id) });
const B = (type, p) => () => BUILD[type](p || {});
const D = (type, p) => () => DECOR[type](p || {});
const P = (type, p) => () => PLANTS[type](p || {});

export const CATALOG = [
  // bedroom
  E("bed-single", "Single bed (iron frame, green plaid)", "bedroom", B("bed", { w: 0.9, color: 0x1f5c46, frame: 0xb8b8b8 })),
  E("bed-double", "Double bed (dark wood)", "bedroom", B("bed", { w: 1.4, color: 0x1d6b5a, frame: 0x3f2716 })),
  E("bed-zebra", "Double bed (black, zebra spread)", "bedroom", B("bed", { w: 1.4, color: "zebra", frame: 0x1c1c1c })),
  E("daybed", "Daybed", "bedroom", B("daybed", { color: 0x4b7a3a })),
  E("nightstand", "Nightstand", "bedroom", B("nightstand", {})),
  E("wardrobe", "Wardrobe", "bedroom", B("wardrobe", { w: 1.2 })),
  E("closet", "Closet", "bedroom", B("closet", { w: 1.2 })),
  E("dresser", "Chest of drawers", "bedroom", NEW.dresser),
  E("pillow", "Pillow", "bedroom", NEW.pillow),
  E("curtain", "Curtain", "bedroom", NEW.curtain),
  // living and dining
  E("sofa", "Sofa", "living", B("sofa", { w: 1.9 })),
  E("sofa-rattan", "Rattan sofa", "living", B("sofa", { w: 1.7, frame: 0x8a5a2b, style: "rattan", fabric: "floral" })),
  E("armchair", "Armchair", "living", B("armchair", {})),
  E("armchair-pink", "Armchair (pink cushions)", "living", B("armchair", { frame: 0x3f2716, color: 0xd6336c, style: "cushion" })),
  E("coffee-table", "Coffee table", "living", B("coffee", { w: 1.0, d: 0.55 })),
  E("side-table", "Side table with lamp", "living", B("side", {})),
  E("console", "Console with mirror", "living", B("console", {})),
  E("sideboard", "Sideboard", "living", B("sideboard", { w: 1.4 })),
  E("bookcase", "Bookcase with books", "living", NEW.bookcase),
  E("tv", "Television", "living", NEW.television),
  E("tv-stand", "TV stand", "living", NEW.tvStand),
  E("rug", "Rug", "living", NEW.rug),
  E("table", "Dining table", "dining", NEW.table),
  E("table-round", "Round table", "dining", NEW.roundTable),
  E("table-set", "Dining table with four chairs", "dining", B("dining", { w: 1.2, d: 0.8, chairs: 4 })),
  E("table-cafe", "Café table with two chairs", "dining", B("cafe", {})),
  E("chair", "Dining chair", "dining", NEW.chair),
  E("chair-metal", "Metal garden chair", "dining", NEW.chairMetal),
  E("stool", "Stool", "dining", NEW.stool),
  E("desk", "Desk (reception)", "dining", B("desk", { w: 1.6 })),
  E("shelf", "Shelf", "dining", B("shelf", { w: 1.4, d: 0.35 })),
  E("chair-bentwood", "Bentwood chair", "dining", B("seat", { style: "bentwood", seat: 0x9a8a2a })),
  E("chair-carved", "Carved dining chair", "dining", B("seat", { style: "carved" })),
  E("chair-director", "Director chair", "dining", B("seat", { style: "director" })),
  E("chair-striped", "Striped upholstered chair", "dining", B("seat", { style: "striped" })),
  E("chair-plastic", "Plastic chair", "dining", B("seat", { style: "plastic" })),
  E("hutch", "Hutch", "dining", B("hutch", {})),
  // kitchen
  E("counter", "Kitchen counter", "kitchen", B("counter", { w: 1.8, cabinet: 0x6b3f22, sink: 0.45, stove: -0.5 })),
  E("sink-unit", "Sink unit", "kitchen", NEW.kitchenSink),
  E("wall-cabinets", "Wall cabinets", "kitchen", NEW.wallCabinets),
  E("fridge", "Refrigerator", "kitchen", B("fridge", {})),
  E("stove", "Gas stove", "kitchen", NEW.stove),
  E("oven", "Oven", "kitchen", NEW.oven),
  E("microwave", "Microwave", "kitchen", NEW.microwave),
  E("kettle", "Kettle", "kitchen", NEW.kettle),
  E("water-heater", "Water heater (termotanque)", "kitchen", NEW.waterHeater),
  E("bin", "Trash bin", "kitchen", NEW.trashBin),
  // bathroom and laundry
  E("toilet", "Toilet", "bathroom", () => toilet()),
  E("bidet", "Bidet", "bathroom", () => bidet()),
  E("basin", "Pedestal basin", "bathroom", () => basin()),
  E("vanity", "Vanity with mirror", "bathroom", () => vanity(0, "oval")),
  E("bathtub", "Bathtub", "bathroom", NEW.bathtub),
  E("shower", "Shower with glass", "bathroom", NEW.shower),
  E("towel-rail", "Towel rail with towel", "bathroom", NEW.towelRail),
  E("toilet-green", "Toilet (green, the turquoise bath's)", "bathroom", () => toilet(0x7fb89a)),
  E("bidet-green", "Bidet (green)", "bathroom", () => bidet(0x7fb89a)),
  E("washing-machine", "Washing machine", "laundry", NEW.washingMachine),
  E("laundry-tub", "Laundry tub", "laundry", B("tub", {})),
  // climate
  E("gas-heater", "Wall gas heater", "climate", NEW.gasHeater),
  E("heater", "Heater", "climate", B("heater", {})),
  E("fan", "Standing fan", "climate", NEW.fan),
  E("ceiling-fan", "Ceiling fan", "climate", NEW.ceilingFan),
  E("air-conditioner", "Split air conditioner", "climate", NEW.airConditioner),
  // lighting
  E("chandelier", "Chandelier", "lighting", B("chandelier", { h: 2.7 })),
  E("pendant", "Pendant lamp", "lighting", B("pendant", { h: 2.7 })),
  E("table-lamp", "Table lamp", "lighting", B("lamp", {})),
  E("floor-lamp", "Floor lamp", "lighting", NEW.floorLamp),
  // openings
  E("door", "Interior door", "openings", NEW.doorLeaf),
  E("door-frame", "Door casing", "openings", NEW.doorFrame),
  E("door-double-glass", "Double glass door", "openings", NEW.doubleGlassDoor),
  E("window", "Window", "openings", NEW.window),
  E("window-barred", "Barred window", "openings", NEW.barredWindow),
  E("shutters", "Louvre shutters", "openings", NEW.shutters),
  E("gate", "Vehicle gate", "openings", NEW.gate),
  // decoration
  E("mirror", "Wall mirror", "decor", NEW.mirror),
  E("mirror-octagon", "Octagonal mirror", "decor", NEW.mirrorOctagon),
  E("picture", "Picture frame", "decor", NEW.pictureFrame),
  E("clock", "Wall clock", "decor", NEW.clock),
  E("vase", "Vase with flowers", "decor", NEW.vase),
  E("plant-pot", "Potted plant", "decor", NEW.pot),
  E("coat-rack", "Coat rack", "decor", NEW.coatRack),
  E("painting", "Painting (landscape)", "decor", D("picture", { w: 1.0, h: 0.55, art: "landscape" })),
  E("vase-roses", "Vase of roses", "decor", D("flowers", { kind: "roses" })),
  E("vase-sunflowers", "Vase of sunflowers", "decor", D("flowers", { kind: "sunflower" })),
  E("sconce", "Wall lamp", "lighting", D("sconce", {})),
  E("extinguisher", "Fire extinguisher", "decor", D("extinguisher", {})),
  E("water-tank-steel", "Steel water heater", "kitchen", D("boiler", {})),
  // outdoors
  E("chair-garden", "Slatted garden armchair", "outdoor", B("seat", { style: "garden" })),
  E("iris", "Iris clump", "outdoor", P("iris", {})),
  E("daylily", "Yellow flower clump", "outdoor", P("daylily", {})),
  E("shrub-red", "Red shrub", "outdoor", P("shrub", { color: 0x9a3a32 })),
  E("boxwood", "Clipped box ball", "outdoor", P("boxwood", {})),
  E("urn", "Terracotta urn with flowers", "outdoor", P("urn", { flowers: [0xe8861c, 0xd8323a] })),
  E("flower-pot", "Pot of flowers", "outdoor", P("pot", {})),
  E("ivy-post", "Ivy-covered lamp post", "outdoor", P("ivypost", {})),
  E("bamboo", "Bamboo clump", "outdoor", P("bamboo", {})),
  E("frog", "Terracotta frog", "outdoor", P("frog", {})),
  E("bench", "Garden bench", "outdoor", NEW.gardenBench),
  E("grill", "Brick grill", "outdoor", NEW.grill),
  E("lamp-post", "Street lamp post", "outdoor", NEW.lampPost),
  E("plant", "Plant", "outdoor", B("plant", {})),
  E("bush", "Bush", "outdoor", B("bush", {})),
  E("car", "Car (white)", "outdoor", B("car", { color: 0xf2f2f0 }))
];
