/* What hangs on the walls and stands about: pictures, mirrors, wall lamps, heaters, fans, curtains.
   A wall piece is built with its back on the wall (z = 0) and its face toward -z; `up` is the height of its middle. */
import * as THREE from "three";
import { S } from "./core.js";
import { ball, bx, cy } from "./geometry.js";
import { M, mat, texBox } from "./materials.js";
import { bouquet, lampShade } from "./pieces.js";

export const DECOR = {
  /* art: landscape, portrait, flowers, figure, print, sunset. */
  picture(p) {
    const g = new THREE.Group(), w = p.w || 0.5, h = p.h || 0.4, up = p.up || 1.6;
    bx(g, w, h, 0.03, 0, up, -0.015, mat(p.frame || 0xb18d3a, { roughness: 0.5 }));
    bx(g, w - 0.09, h - 0.09, 0.01, 0, up, -0.033, texBox("art-" + (p.art || "landscape"), 1, 1));
    return g;
  },
  /* shape: "octagon" (the dining room's), "oval", or a rectangle. */
  mirror(p) {
    const g = new THREE.Group(), w = p.w || 0.5, h = p.h || 0.7, up = p.up || 1.55;
    const frame = mat(p.frame || 0x3f2716, { roughness: 0.5 });
    if (p.shape === "octagon" || p.shape === "oval") {
      const seg = p.shape === "octagon" ? 8 : 24;
      const a = cy(g, w / 2, w / 2, 0.05, 0, up, -0.025, frame, seg), b = cy(g, w / 2 - 0.09, w / 2 - 0.09, 0.02, 0, up, -0.05, M.mirror, seg);
      [a, b].forEach((m) => { m.rotation.x = Math.PI / 2; m.rotation.y = Math.PI / seg; m.scale.z = h / w; });
      if (p.shape === "octagon") { const c = cy(g, w / 2 - 0.04, w / 2 - 0.04, 0.03, 0, up, -0.04, mat(0xe8dcc0), seg); c.rotation.x = Math.PI / 2; c.rotation.y = Math.PI / seg; }
      return g;
    }
    bx(g, w, h, 0.035, 0, up, -0.018, frame);
    bx(g, w - 0.1, h - 0.1, 0.01, 0, up, -0.038, M.mirror);
    return g;
  },
  sconce(p) {
    const g = new THREE.Group(), up = p.up || 1.9;
    bx(g, 0.08, 0.14, 0.02, 0, up - 0.1, -0.01, mat(0x8a6a2e, { roughness: 0.4, metalness: 0.4 }));
    bx(g, 0.015, 0.015, 0.12, 0, up - 0.1, -0.07, mat(0x8a6a2e, { roughness: 0.4, metalness: 0.4 }));
    lampShade(g, 0, up, -0.13, 0.08);
    return g;
  },
  extinguisher(p) {
    const g = new THREE.Group(), up = p.up || 1.0;
    cy(g, 0.065, 0.065, 0.42, 0, up, -0.08, mat(0xc0231c, { roughness: 0.4 }), 12);
    cy(g, 0.025, 0.04, 0.08, 0, up + 0.25, -0.08, M.black, 8);
    return g;
  },
  /* A split air conditioner high on the wall. */
  aircon(p) {
    const g = new THREE.Group(), up = p.up || 2.4;
    bx(g, 0.85, 0.27, 0.2, 0, up, -0.1, mat(0xf2f2ee, { roughness: 0.4 }));
    bx(g, 0.75, 0.02, 0.12, 0, up - 0.12, -0.13, mat(0xcfcfca));
    return g;
  },
  /* A gas wall heater with its grille. */
  wallheater(p) {
    const g = new THREE.Group(), c = mat(p.color || 0xe8e4d8, { roughness: 0.5 });
    bx(g, 0.6, 0.56, 0.16, 0, 0.5, -0.08, c);
    for (let i = 0; i < 6; i++) bx(g, 0.46, 0.015, 0.01, 0, 0.36 + i * 0.05, -0.165, M.black);
    return g;
  },
  /* The kitchen's water heater: a steel tank on the counter's end, its flue to the ceiling. */
  boiler(p) {
    const g = new THREE.Group(), up = p.up || 1.5, steel = mat(0xb9bdc0, { roughness: 0.3, metalness: 0.7 });
    cy(g, 0.2, 0.2, 1.0, 0, up, -0.22, steel, 18);
    cy(g, 0.12, 0.2, 0.08, 0, up + 0.54, -0.22, M.black, 14);
    cy(g, 0.05, 0.05, 0.7, 0, up + 0.9, -0.22, steel, 8);
    bx(g, 0.08, 0.2, 0.03, 0, up - 0.2, -0.43, M.black);
    return g;
  },
  /* A white instant water heater on the wall. */
  geyser(p) {
    const g = new THREE.Group(), up = p.up || 1.8;
    bx(g, 0.34, 0.6, 0.2, 0, up, -0.1, M.white);
    bx(g, 0.2, 0.08, 0.01, 0, up + 0.18, -0.205, M.black);
    cy(g, 0.04, 0.04, 0.4, 0, up + 0.5, -0.1, M.steel, 8);
    return g;
  },
  wallcabinet(p) {
    const g = new THREE.Group(), w = p.w || 1.2, up = p.up || 1.85, c = mat(p.color || 0xf2f0ea, { roughness: 0.5 });
    bx(g, w, 0.6, 0.32, 0, up, -0.16, c);
    const n = Math.round(w / 0.4);
    for (let i = 0; i < n; i++) {
      if (i) bx(g, 0.008, 0.56, 0.01, -w / 2 + i * w / n, up, -0.322, M.black);
      bx(g, 0.015, 0.1, 0.02, -w / 2 + (i + 0.85) * w / n, up - 0.2, -0.33, M.steel);
    }
    return g;
  },
  /* A fan on a stand. */
  fan() {
    const g = new THREE.Group();
    cy(g, 0.2, 0.22, 0.03, 0, 0.015, 0, M.white, 16);
    cy(g, 0.02, 0.02, 1.15, 0, 0.58, 0, M.white, 8);
    cy(g, 0.07, 0.07, 0.16, 0, 1.2, 0.02, M.white, 12).rotation.x = Math.PI / 2;
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 24), M.white);
    cage.position.set(0, 1.2, -0.08);
    g.add(cage);
    const disc = cy(g, 0.21, 0.21, 0.01, 0, 1.2, -0.08, mat(0xdfe6ea, { transparent: true, opacity: 0.45, depthWrite: false }), 24);
    disc.rotation.x = Math.PI / 2;
    return g;
  },
  bin(p) {
    const g = new THREE.Group();
    cy(g, 0.17, 0.14, 0.42, 0, 0.21, 0, mat(p.color || 0x3fae4a, { roughness: 0.6 }), 14);
    cy(g, 0.18, 0.18, 0.04, 0, 0.44, 0, mat(0x2f9a3e, { roughness: 0.6 }), 14);
    return g;
  },
  /* Flowers in a vase, standing at height `up` (a table top) or on the floor. */
  flowers(p) {
    const g = new THREE.Group();
    bouquet(g, p.kind, 0, p.up || 0, 0, p.scale || 1, p.vase);
    return g;
  }
};

/* Curtains from a to b, hanging to the floor from `h`.
   style: "tied" (the glazed room's, gathered at the waist with a white tie),
          "pair" (drawn to the two ends of a window), or a plain run.
   sheer: thin and white, letting the light through. */
export function curtain(p, z) {
  const ax = p.a[0], ay = p.a[1], dx = p.b[0] - ax, dy = p.b[1] - ay, len = Math.hypot(dx, dy);
  const h = p.h || 2.3, ux = dx / len, uy = dy / len;
  const cloth = p.sheer
    ? mat(p.color || 0xfbfaf6, { roughness: 1, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false })
    : mat(p.color || 0x8d8f94, { roughness: 1, side: THREE.DoubleSide });
  const at = (u, y) => [ax + ux * u, z + y, -(ay + uy * u)];
  const pos = [];
  const quad = (u0, y0, u1, y1, u2, y2, u3, y3) => {
    const a = at(u0, y0), b = at(u1, y1), c = at(u2, y2), d = at(u3, y3);
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  // a panel is cut into narrow strips, so a tied one can gather at the waist
  const folds = (u0, u1, y0, y1, pinch) => {
    const n = Math.max(2, Math.round((u1 - u0) / 0.12)), mid = (u0 + u1) / 2;
    for (let i = 0; i < n; i++) {
      const a = u0 + (u1 - u0) * i / n, b = u0 + (u1 - u0) * (i + 1) / n;
      if (pinch) {
        const pa = mid + (a - mid) * 0.28, pb = mid + (b - mid) * 0.28, la = mid + (a - mid) * 0.8, lb = mid + (b - mid) * 0.8;
        quad(a, y1, b, y1, pb, 1.05, pa, 1.05);
        quad(pa, 1.05, pb, 1.05, lb, y0, la, y0);
      } else quad(a, y0, b, y0, b, y1, a, y1);
    }
  };
  const add = (m) => { m.castShadow = !p.sheer; S.static.add(m); };
  if (p.style === "tied") {
    const n = Math.max(1, Math.round(len / 0.95)), w = len / n;
    for (let i = 0; i < n; i++) {
      folds(i * w + 0.02, (i + 1) * w - 0.02, 0.04, h, true);
      const c = at((i + 0.5) * w, 1.05);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.07, 0.05), mat(0xf1efe8));
      tie.position.set(c[0], c[1], c[2]);
      tie.rotation.y = Math.atan2(dy, dx);
      add(tie);
    }
  } else if (p.style === "pair") {
    const w = Math.min(0.45, len * 0.3);
    folds(0, w, 0.9, h, false);
    folds(len - w, len, 0.9, h, false);
  } else folds(0, len, p.z0 === undefined ? 0.04 : p.z0, h, false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  add(new THREE.Mesh(geo, cloth));
  // the rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len + 0.1, 6), p.sheer ? M.white : mat(0x5a3a22));
  rod.rotation.set(0, Math.atan2(dy, dx), Math.PI / 2);
  rod.position.set(ax + dx / 2, z + h + 0.01, -(ay + dy / 2));
  S.static.add(rod);
}
