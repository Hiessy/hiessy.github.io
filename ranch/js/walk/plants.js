/* The garden: irises, flower beds, shrubs, urns, the ivy-covered post, stepping stones.
   PLANTS are single pieces at a point; ROWS are planted from a to b. */
import * as THREE from "three";
import { K } from "./core.js";
import { ball, bx, cy, lathe, place, rng } from "./geometry.js";
import { M, mat, texTrue } from "./materials.js";

const BLADE = 0x3f7a35, DEEP = 0x2f5d2a;
const petal = (c) => mat(c, { roughness: 0.75 });

/* Strap leaves fanning out of one point. */
function blades(g, R, n, h, color) {
  const m = mat(color || BLADE, { roughness: 0.9 });
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, t = 0.1 + R() * 0.35, hh = h * (0.7 + R() * 0.5);
    const b = bx(g, 0.035, hh, 0.008, Math.cos(a) * 0.05, hh / 2 * Math.cos(t), Math.sin(a) * 0.05, m);
    b.rotation.set(0, -a, -t, "YXZ");
    b.position.x += Math.cos(a) * Math.sin(t) * hh / 2;
    b.position.z += Math.sin(a) * Math.sin(t) * hh / 2;
    b.castShadow = false;
  }
}

/* A mound of leaves with flower heads over it. */
function mound(g, R, r, h, leaf, colors, count) {
  ball(g, r, 0, h * 0.5, 0, leaf, 1).scale.y = h / r * 0.7;
  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2, d = R() * r * 0.95, y = h * (0.75 + R() * 0.35) * (1 - d / r * 0.45);
    ball(g, 0.05 + R() * 0.035, Math.cos(a) * d, y + 0.03, Math.sin(a) * d, petal(colors[i % colors.length]), 0).castShadow = false;
  }
}

export const PLANTS = {
  /* An iris clump: sword leaves, a few tall stems with a flower each. */
  iris(p) {
    const g = new THREE.Group(), R = rng(p.seed || 7), c = petal(p.color || 0x7a6bd0), fall = petal(p.color2 || 0x5a48b0);
    blades(g, R, 9, 0.55);
    const n = p.blooms === undefined ? 3 : p.blooms;
    for (let i = 0; i < n; i++) {
      const x = (R() - 0.5) * 0.22, z = (R() - 0.5) * 0.22, h = 0.6 + R() * 0.25;
      cy(g, 0.007, 0.007, h, x, h / 2, z, mat(BLADE), 5).castShadow = false;
      ball(g, 0.05, x, h + 0.03, z, c, 0).scale.y = 1.3;
      for (let k = 0; k < 3; k++) { const a = k * 2.094 + i; ball(g, 0.035, x + Math.cos(a) * 0.055, h - 0.01, z + Math.sin(a) * 0.055, fall, 0).scale.y = 0.6; }
    }
    return g;
  },
  /* A clump of grassy leaves with small flowers on thin stems (the yellow one by the galeria). */
  daylily(p) {
    const g = new THREE.Group(), R = rng(p.seed || 11), c = petal(p.color || 0xe8a81c);
    blades(g, R, 14, 0.5, 0x5a8a3a);
    for (let i = 0; i < 12; i++) {
      const a = R() * 6.28, d = 0.1 + R() * 0.3, h = 0.45 + R() * 0.3;
      cy(g, 0.005, 0.005, h, Math.cos(a) * d * 0.5, h / 2, Math.sin(a) * d * 0.5, mat(BLADE), 4).castShadow = false;
      ball(g, 0.04, Math.cos(a) * d, h, Math.sin(a) * d, c, 0).castShadow = false;
    }
    return g;
  },
  /* A rounded shrub; color: its leaves (red for the photinias); flowers: [colors]. */
  shrub(p) {
    const g = new THREE.Group(), R = rng(p.seed || 3), s = p.size || 1;
    const leaf = p.color ? mat(p.color, { flatShading: true }) : M.leaf;
    ball(g, 0.42 * s, 0, 0.42 * s, 0, leaf, 1);
    ball(g, 0.3 * s, 0.25 * s, 0.6 * s, 0.1 * s, p.color ? leaf : M.leaf2, 1);
    ball(g, 0.3 * s, -0.22 * s, 0.35 * s, -0.15 * s, p.color ? M.leaf : M.leaf2, 1);
    if (p.flowers) for (let i = 0; i < 26; i++) {
      const a = R() * 6.28, b = R() * 1.3, r = 0.44 * s;
      ball(g, 0.035, Math.cos(a) * Math.sin(b) * r, 0.42 * s + Math.cos(b) * r, Math.sin(a) * Math.sin(b) * r, petal(p.flowers[i % p.flowers.length]), 0).castShadow = false;
    }
    return g;
  },
  /* A clipped ball of box. */
  boxwood(p) {
    const g = new THREE.Group(), s = p.size || 1;
    ball(g, 0.36 * s, 0, 0.36 * s, 0, mat(0x4a7a34, { flatShading: true }), 2).scale.y = 0.95;
    return g;
  },
  /* A terracotta urn, empty or planted. */
  urn(p) {
    const g = new THREE.Group(), s = p.size || 1, R = rng(p.seed || 5);
    lathe(g, [[0.1, 0], [0.13, 0.02], [0.2, 0.18], [0.23, 0.32], [0.19, 0.46], [0.12, 0.54], [0.15, 0.6], [0.13, 0.6]].map((q) => [q[0] * s, q[1] * s]), 0, 0, 0, mat(0xb5653e, { roughness: 0.8, side: THREE.DoubleSide }));
    if (p.plant) { ball(g, 0.2 * s, 0, 0.72 * s, 0, M.leaf, 1); ball(g, 0.14 * s, 0.1 * s, 0.86 * s, 0.04 * s, M.leaf2, 1); }
    if (p.flowers) {
      const o = new THREE.Group();
      mound(o, R, 0.22 * s, 0.26 * s, M.leaf, p.flowers, 16);
      o.position.y = 0.56 * s;
      g.add(o);
    }
    return g;
  },
  /* A low pot of flowers. */
  pot(p) {
    const g = new THREE.Group(), R = rng(p.seed || 9);
    cy(g, 0.16, 0.11, 0.24, 0, 0.12, 0, M.pot, 12);
    const o = new THREE.Group();
    mound(o, R, 0.19, 0.22, M.leaf2, p.flowers || [0xd8323a, 0xf0d870], 14);
    o.position.y = 0.2;
    g.add(o);
    return g;
  },
  /* The post in the lawn, wrapped in ivy, with its lantern on top. */
  ivypost(p) {
    const g = new THREE.Group(), R = rng(13);
    cy(g, 0.07, 0.09, 3.3, 0, 1.65, 0, mat(0x55585b), 8);
    for (let i = 0; i < 26; i++) {
      const y = 0.2 + i * 0.105, r = 0.34 - Math.abs(y - 1.3) * 0.07 + R() * 0.08, a = R() * 6.28;
      ball(g, r, Math.cos(a) * 0.09, y, Math.sin(a) * 0.09, i % 3 ? mat(DEEP, { flatShading: true }) : M.leaf, 1);
    }
    bx(g, 0.2, 0.3, 0.2, 0, 3.35, 0, M.black);
    bx(g, 0.15, 0.22, 0.15, 0, 3.35, 0, M.glow);
    cy(g, 0.02, 0.16, 0.1, 0, 3.55, 0, M.black, 4);
    return g;
  },
  /* A clump of bamboo. */
  bamboo(p) {
    const g = new THREE.Group(), R = rng(p.seed || 17);
    for (let i = 0; i < 9; i++) {
      const x = (R() - 0.5) * 0.9, z = (R() - 0.5) * 0.5, h = 3 + R() * 1.6;
      const c = cy(g, 0.02, 0.028, h, x, h / 2, z, mat(0xb9b06a, { roughness: 0.6 }), 5);
      c.rotation.z = (R() - 0.5) * 0.12;
      ball(g, 0.4 + R() * 0.25, x, h * (0.72 + R() * 0.2), z, i % 2 ? M.leaf2 : mat(0x7fa055, { flatShading: true }), 1).scale.set(1, 1.5, 1);
    }
    return g;
  },
  /* The terracotta frog at the end of the galeria. */
  frog() {
    const g = new THREE.Group(), c = mat(0xc9703c, { roughness: 0.7 });
    ball(g, 0.16, 0, 0.15, 0, c, 1).scale.set(1, 0.9, 1.15);
    ball(g, 0.11, 0, 0.33, -0.08, c, 1);
    [-0.06, 0.06].forEach((x) => { ball(g, 0.035, x, 0.42, -0.1, c, 0); bx(g, 0.07, 0.05, 0.12, x * 2.2, 0.03, -0.12, c); });
    return g;
  },
  /* A lantern on a wall bracket. */
  lantern(p) {
    const g = new THREE.Group(), up = p.up || 2.1;
    bx(g, 0.03, 0.03, 0.2, 0, up + 0.2, -0.1, M.black);
    bx(g, 0.15, 0.24, 0.15, 0, up, -0.18, M.black);
    bx(g, 0.11, 0.17, 0.11, 0, up, -0.18, M.glow);
    cy(g, 0.02, 0.12, 0.07, 0, up + 0.15, -0.18, M.black, 4);
    return g;
  }
};

/* Planted or laid from a to b. Each takes (p, level). */
function along(p, step, fn) {
  const dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], len = Math.hypot(dx, dy), n = Math.max(1, Math.round(len * K / step));
  const R = rng(Math.round((p.a[0] * 31 + p.a[1] * 17) * 10) + 99), wide = p.wide || 0;
  for (let i = 0; i <= n; i++) {
    const u = n ? i / n : 0, off = (R() - 0.5) * wide;
    fn(p.a[0] + dx * u - dy / len * off, p.a[1] + dy * u + dx / len * off, R, i);
  }
}

export const ROWS = {
  /* Irises in a band: mostly purple, some yellow, as by the glazed room. */
  irisbed(p, lv) {
    along(p, p.step || 0.32, (x, y, R, i) => {
      const yellow = p.colors ? null : R() < 0.3;
      const c = p.colors ? p.colors[i % p.colors.length] : yellow ? 0xe8c21c : 0x8a7ad8;
      place(PLANTS.iris({ seed: i * 7 + 3, color: c, color2: yellow ? 0xd9a514 : 0x6a58c0, blooms: R() < 0.25 ? 0 : 2 + Math.floor(R() * 2) }), x, y, lv, R() * 360);
    });
  },
  /* A bed of low flowers: colors in turn. */
  flowerbed(p, lv) {
    along(p, p.step || 0.4, (x, y, R, i) => {
      const g = new THREE.Group();
      mound(g, R, 0.24, p.h || 0.3, i % 2 ? M.leaf : M.leaf2, [p.colors[i % p.colors.length], p.colors[(i + 1) % p.colors.length]], 18);
      place(g, x, y, lv, R() * 360);
    });
  },
  /* Lavender: grey-green tufts with violet spikes. */
  lavender(p, lv) {
    along(p, p.step || 0.45, (x, y, R, i) => {
      const g = new THREE.Group();
      ball(g, 0.22, 0, 0.2, 0, mat(0x7f9a78, { flatShading: true }), 1).scale.y = 0.9;
      for (let k = 0; k < 14; k++) {
        const a = R() * 6.28, t = R() * 0.6, h = 0.42 + R() * 0.15;
        const s = bx(g, 0.012, 0.16, 0.012, Math.cos(a) * Math.sin(t) * h, Math.cos(t) * h, Math.sin(a) * Math.sin(t) * h, petal(0x8a6fc0));
        s.castShadow = false;
      }
      place(g, x, y, lv, 0);
    });
  },
  /* A clipped hedge, h high and t thick. */
  hedge(p, lv) {
    const R = rng(41), h = p.h || 1.6, t = p.t || 0.6;
    along(p, t * 0.8, (x, y) => {
      const g = new THREE.Group();
      ball(g, t * 0.62 * K, 0, h * 0.5, 0, R() < 0.5 ? M.leaf : M.leaf2, 1).scale.y = h / (t * K * 1.24);
      place(g, x, y, lv, R() * 360);
    });
  },
  /* Stepping stones across the lawn. */
  stones(p, lv) {
    along(p, p.step || 0.62, (x, y, R) => {
      const g = new THREE.Group();
      const s = cy(g, 0.26, 0.28, 0.035, 0, 0.03, 0, texTrue("flagstone"), 7);
      s.scale.set(1 + R() * 0.3, 1, 0.8 + R() * 0.2);
      s.castShadow = false;
      place(g, x, y, lv, R() * 360);
    });
  },
  /* A low white rail on short posts, round a bed. */
  rail(p, lv) {
    const dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], len = Math.hypot(dx, dy), rot = Math.atan2(dy, dx) / Math.PI * 180;
    const g = new THREE.Group();
    const L = len * K;       // a piece keeps its true size, so the rail is built at the length it is shown
    bx(g, L, 0.04, 0.04, 0, 0.42, 0, M.white);
    const n = Math.max(1, Math.round(L / 1.4));
    for (let i = 0; i <= n; i++) bx(g, 0.05, 0.45, 0.05, -L / 2 + i * L / n, 0.225, 0, M.white);
    place(g, p.a[0] + dx / 2, p.a[1] + dy / 2, lv, rot);
  },
  /* Flowers in a ring: round the ivy post. a is the middle, r the radius. */
  ring(p, lv) {
    const R = rng(23), n = Math.round(p.r * K * 6.28 / 0.38);
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.28, g = new THREE.Group();
      mound(g, R, 0.24, 0.3, i % 2 ? M.leaf : M.leaf2, p.colors, 14);
      place(g, p.a[0] + Math.cos(a) * p.r, p.a[1] + Math.sin(a) * p.r, lv, 0);
    }
  }
};
