/* The 3D view: a model of the house to walk through.

   The walls are the survey's own wall outlines (js/survey.js), raised to the
   heights its sections give (js/house.js, `tops`): flat under the slabs,
   sloping under the old house's gable, arched under the glazed room's
   vault. Every door and window is a gap the survey draws, with a lintel
   above it, a sill under the windows and a leaf that opens the way the
   survey swings it. Floors sit at the survey's levels, so there are steps.
   Plan coordinates (x east, y north, meters) become three.js (x, height, -y).

   Doors start closed and open with a click. Furniture comes from the listing
   photos. Walking is a small physics loop: walls, closed doors and big pieces
   of furniture push you back, floors and stairs set your height, and you
   fall if you step off something. The sky follows the clock (js/sky.js).

   Everything that never moves is merged into one mesh per material at the
   end, so the browser draws a few dozen objects instead of thousands. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createSky } from "./sky.js";

const H = window.HOUSE;
const F = H.FLOOR;
const WALL_T = 0.15;
const DOOR_H = 2.05;
const EYE = 1.55, BODY = 1.7, RADIUS = 0.2, STEP = 0.45, GRAVITY = 9.8;
const REACH = 3.2;
const CENTER = H.extras.center;
const X = H.extras;
const DEG = Math.PI / 180;
/* Where each level's walls start: the ground, the apartment's slab, the wing's. */
const BASE = { 0: 0, 1: H.Z.apt - 0.2, 2: H.Z.terrace - 0.15 };

function t(k) { return window.I18N && window.I18N.listo ? window.I18N.t(k) : ""; }
function plain(s) {
  return String(s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
const $ = (id) => document.getElementById(id);
const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

let S = null;

/* ---------- textures, drawn on canvases so nothing is downloaded ---------- */

function tiles(g, s, n, colors, grout, gw) {
  const k = s / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      g.fillStyle = typeof colors === "function" ? colors(i, j) : colors[(i + j * n) % colors.length];
      g.fillRect(i * k, j * k, k, k);
    }
  }
  g.fillStyle = grout;
  for (let i = 0; i < n; i++) { g.fillRect(i * k, 0, gw, s); g.fillRect(0, i * k, s, gw); }
}
function speckle(g, s, colors, count, r0, r1) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[i % colors.length];
    g.beginPath();
    g.arc(Math.random() * s, Math.random() * s, r0 + Math.random() * (r1 - r0), 0, Math.PI * 2);
    g.fill();
  }
}
function stripes(g, s, light, dark, n) {
  const k = s / n;
  for (let i = 0; i < n; i++) {
    const gr = g.createLinearGradient(i * k, 0, (i + 1) * k, 0);
    gr.addColorStop(0, dark); gr.addColorStop(0.5, light); gr.addColorStop(1, dark);
    g.fillStyle = gr;
    g.fillRect(i * k, 0, k, s);
  }
}

/* m: how many meters one copy of the picture covers. */
const TEX = {
  checker: { m: 0.8, draw(g, s) {
    tiles(g, s, 2, (i, j) => ((i + j) % 2 ? "#ecebe6" : "#222220"), "#c9c4b8", 2);
    speckle(g, s, ["rgba(255,255,255,0.22)", "rgba(0,0,0,0.10)"], 1400, 0.5, 1.3);
  } },
  white: { m: 0.4, draw(g, s) {
    tiles(g, s, 1, ["#efede8"], "#d3cdc1", 3);
    speckle(g, s, ["rgba(0,0,0,0.035)"], 300, 1, 3);
  } },
  cream: { m: 0.45, draw(g, s) {
    tiles(g, s, 1, ["#ece4d6"], "#cbbfa9", 3);
    speckle(g, s, ["rgba(120,90,50,0.05)"], 300, 1, 3);
  } },
  terracotta: { m: 0.6, draw(g, s) {
    tiles(g, s, 2, ["#b4643c", "#a95b36", "#ad5e38", "#bb6b42"], "#86492c", 4);
    speckle(g, s, ["rgba(0,0,0,0.07)", "rgba(255,220,180,0.06)"], 600, 1, 2.5);
  } },
  calcareo: { m: 0.4, draw(g, s) {
    tiles(g, s, 1, ["#e3d6bd"], "#bfae8c", 3);
    g.fillStyle = "#8f6240";
    g.beginPath(); g.moveTo(s / 2, s * 0.2); g.lineTo(s * 0.8, s / 2); g.lineTo(s / 2, s * 0.8); g.lineTo(s * 0.2, s / 2); g.closePath(); g.fill();
    g.fillStyle = "#e3d6bd";
    g.beginPath(); g.moveTo(s / 2, s * 0.32); g.lineTo(s * 0.68, s / 2); g.lineTo(s / 2, s * 0.68); g.lineTo(s * 0.32, s / 2); g.closePath(); g.fill();
    g.fillStyle = "#6f8a5e";
    [[0, 0], [s, 0], [0, s], [s, s]].forEach((c) => { g.beginPath(); g.arc(c[0], c[1], s * 0.15, 0, Math.PI * 2); g.fill(); });
  } },
  parquet: { m: 1.2, draw(g, s) {
    const rows = 12, h = s / rows, tones = ["#a8754a", "#9a6a40", "#b07d50", "#94653d"];
    for (let r = 0; r < rows; r++) {
      let x = -Math.random() * s * 0.4;
      while (x < s) {
        const len = s * (0.28 + Math.random() * 0.22);
        g.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        g.fillRect(x, r * h, len, h);
        g.fillStyle = "rgba(60,35,15,0.55)";
        g.fillRect(x, r * h, 1.5, h);
        x += len;
      }
      g.fillStyle = "rgba(60,35,15,0.5)";
      g.fillRect(0, r * h, s, 1.2);
    }
  } },
  bathtile: { m: 0.3, draw(g, s) { tiles(g, s, 2, ["#f4f4f1", "#efefec"], "#c7c7c1", 3); } },
  kitchen: { m: 0.6, draw(g, s) { tiles(g, s, 2, ["#d9d1c0", "#d3cab7"], "#b1a891", 3); } },
  terrace: { m: 0.8, draw(g, s) { tiles(g, s, 2, ["#d7cebe", "#d1c7b5"], "#b5aa95", 3); } },
  concrete: { m: 2, draw(g, s) {
    g.fillStyle = "#bdb8ae"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#b2ada3", "#c8c3b9", "#aaa59b"], 1500, 0.6, 2);
  } },
  roofing: { m: 1, draw(g, s) {
    g.fillStyle = "#a19d94"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#96928a", "#aca89f"], 1200, 0.6, 1.8);
  } },
  pavers: { m: 0.8, draw(g, s) {
    const b = s / 4, tones = ["#9d978d", "#a7a197", "#938d83", "#a39d92"];
    g.fillStyle = "#7f796f"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = i * b, y = j * b;
        for (let k = 0; k < 2; k++) {
          g.fillStyle = tones[Math.floor(Math.random() * tones.length)];
          if ((i + j) % 2 === 0) g.fillRect(x + 2, y + k * b / 2 + 2, b - 4, b / 2 - 4);
          else g.fillRect(x + k * b / 2 + 2, y + 2, b / 2 - 4, b - 4);
        }
      }
    }
  } },
  gravel: { m: 1.2, draw(g, s) {
    g.fillStyle = "#cfc5ae"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#b9ae96", "#ddd3bd", "#a99f88", "#e8e0cc", "#c4b9a0"], 2600, 0.8, 2.6);
  } },
  grass: { m: 3, draw(g, s) {
    g.fillStyle = "#7fa65a"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#6f9a4c", "#8db866", "#78a052", "#93bd6c", "#6a9147"], 3500, 0.6, 2.2);
  } },
  asphalt: { m: 2.5, draw(g, s) {
    g.fillStyle = "#5c5e60"; g.fillRect(0, 0, s, s);
    speckle(g, s, ["#4f5153", "#6a6c6e", "#57595b", "#636567"], 3000, 0.5, 1.6);
  } },
  sidewalk: { m: 0.8, draw(g, s) {
    tiles(g, s, 2, ["#d1ccc2", "#cdc8be"], "#aaa49a", 3);
    g.fillStyle = "rgba(0,0,0,0.08)";
    for (let i = 1; i < 8; i += 2) { g.fillRect(i * s / 8, 0, 1.5, s); g.fillRect(0, i * s / 8, s, 1.5); }
  } },
  stone: { m: 0.9, draw(g, s) {
    g.fillStyle = "#5f5548"; g.fillRect(0, 0, s, s);
    const tones = ["#a08f78", "#8a7b66", "#b09c82", "#7d6f5c", "#9c8a70"];
    for (let i = 0; i < 26; i++) {
      const w = s * (0.18 + Math.random() * 0.22), h = s * (0.12 + Math.random() * 0.16);
      const x = Math.random() * s, y = Math.random() * s;
      g.fillStyle = tones[i % tones.length];
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
        g.beginPath();
        g.moveTo(x + dx, y + dy); g.lineTo(x + dx + w, y + dy + h * 0.2); g.lineTo(x + dx + w * 0.9, y + dy + h);
        g.lineTo(x + dx - w * 0.1, y + dy + h * 0.85); g.closePath(); g.fill();
      }
    }
  } },
  metal: { m: 0.6, draw(g, s) { stripes(g, s, "#d7dadc", "#aeb3b7", 8); } },
  metalblue: { m: 0.6, draw(g, s) { stripes(g, s, "#9db2c4", "#6f8799", 8); } },
  tiles: { m: 0.3, draw(g, s) { tiles(g, s, 2, ["#efe3a8", "#e9dc9c"], "#cbbd7d", 3); } },
  zebra: { m: 1, draw(g, s) {
    g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#151515"; g.lineCap = "round";
    for (let k = 0; k < 9; k++) {
      g.lineWidth = 6 + Math.random() * 9;
      g.beginPath();
      for (let x = 0; x <= s; x += 8) {
        const y = k * s / 9 + Math.sin(x / 22 + k) * 10 + Math.sin(x / 9) * 3;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  } },
  deco: { m: 1, alpha: true, w: 256, h: 128, draw(g, w, h) {
    g.strokeStyle = "#7a4528"; g.lineWidth = 9; g.lineJoin = "miter";
    g.strokeRect(4, 6, w - 8, h - 12);
    g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w / 2, h - 6); g.stroke();
    [[w / 4, h / 2], [3 * w / 4, h / 2]].forEach((c) => {
      g.strokeRect(c[0] - 34, c[1] - 30, 68, 60);
      g.beginPath();
      g.moveTo(c[0] - 34, c[1]); g.lineTo(c[0] - 14, c[1]); g.lineTo(c[0] - 14, c[1] - 14); g.lineTo(c[0] + 14, c[1] - 14);
      g.lineTo(c[0] + 14, c[1] + 14); g.lineTo(c[0] + 34, c[1] + 14);
      g.stroke();
    });
  } },
  balusters: { m: 0.8, alpha: true, w: 256, h: 128, draw(g, w, h) {
    g.fillStyle = "#6b4423";
    g.fillRect(0, 0, w, 14); g.fillRect(0, h - 12, w, 12);
    for (let x = 12; x < w; x += 32) {
      g.fillRect(x, 10, 9, h - 20);
      g.fillRect(x - 3, h / 2 - 8, 15, 16);
    }
  } },
  bars: { m: 0.6, alpha: true, w: 128, h: 256, draw(g, w, h) {
    g.fillStyle = "#f4f4f1";
    g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); g.fillRect(0, h * 0.52, w, 7);
    for (let x = 4; x < w; x += 21) g.fillRect(x, 0, 6, h);
  } }
};
/* Finishes the photos show, added to the ones above. */
Object.assign(TEX, {
  marble: { m: 0.8, draw(g, s) {
    tiles(g, s, 2, ["#d9c7ab", "#d2bea0", "#dccbb0", "#cfb999"], "#b7a283", 3);
    speckle(g, s, ["rgba(120,84,48,0.10)", "rgba(255,244,224,0.12)"], 900, 2, 9);
  } },
  redtile: { m: 0.6, draw(g, s) {
    tiles(g, s, 2, ["#8c4a30", "#84452c", "#914e33", "#7f4129"], "#5f3222", 3);
    speckle(g, s, ["rgba(0,0,0,0.08)", "rgba(255,210,170,0.05)"], 500, 1, 2.5);
  } },
  white40: { m: 0.8, draw(g, s) {
    tiles(g, s, 2, ["#f1f0ec", "#eeede8"], "#b9b7b0", 3);
    speckle(g, s, ["rgba(0,0,0,0.03)"], 300, 1, 3);
  } },
  boards: { m: 1.2, draw(g, s) { stripes(g, s, "#6a4326", "#553419", 6); speckle(g, s, ["rgba(0,0,0,0.10)"], 300, 1, 3); } },
  pine: { m: 0.9, draw(g, s) { stripes(g, s, "#c58f52", "#b17c43", 6); speckle(g, s, ["rgba(90,50,20,0.25)"], 60, 2, 5); } },
  redsheet: { m: 0.6, draw(g, s) { stripes(g, s, "#9a4f38", "#7d3d2a", 8); } },
  louvre: { m: 0.5, draw(g, s) {
    g.fillStyle = "#e9dfc4"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#c9bb97";
    for (let y = 0; y < s; y += s / 16) g.fillRect(0, y, s, s / 40);
  } },
  blocks: { m: 0.4, draw(g, s) {
    tiles(g, s, 2, ["#cfe3ea", "#c4dbe4"], "#f2f2ee", 6);
    speckle(g, s, ["rgba(255,255,255,0.35)"], 120, 3, 8);
  } }
});
/* Wall tiles of the baths and the kitchen, by colour. */
[["white", "#f3f3ef", "#c9c9c3"], ["turquoise", "#7fcfc0", "#5aa99b"], ["pink", "#f1d9d6", "#d0aaa6"], ["beige", "#dccbb0", "#b9a585"],
 ["cream", "#efe6d2", "#cdbf9f"], ["yellow", "#efe3a8", "#cbbd7d"]].forEach((c) => {
  TEX["tile-" + c[0]] = { m: 0.3, draw(g, s) { tiles(g, s, 2, [c[1]], c[2], 3); } };
});
const texCache = new Map();
function tex(name) {
  if (texCache.has(name)) return texCache.get(name);
  const spec = TEX[name];
  const c = document.createElement("canvas");
  c.width = spec.w || 256; c.height = spec.h || 256;
  const g = c.getContext("2d");
  if (spec.w) spec.draw(g, c.width, c.height); else spec.draw(g, c.width);
  const tx = new THREE.CanvasTexture(c);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 8;
  tx.repeat.set(1 / spec.m, 1 / spec.m);
  texCache.set(name, tx);
  return tx;
}
/* A copy of a texture for a box face, stretched to its size in meters. */
function texFor(name, w, h) {
  const tx = tex(name).clone();
  const m = TEX[name].m;
  tx.repeat.set(w / m, h / m);
  tx.needsUpdate = true;
  return tx;
}

/* ---------- materials and shapes ---------- */

const mats = new Map();
function mat(color, opts) {
  const key = color + "|" + JSON.stringify(opts || {});
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9, metalness: 0 }, opts || {})));
  }
  return mats.get(key);
}
function texMat(name, opts) {
  const key = "tex:" + name + "|" + JSON.stringify(opts || {});
  if (!mats.has(key)) {
    const o = Object.assign({ map: tex(name), color: 0xffffff, roughness: 0.85 }, opts || {});
    if (TEX[name].alpha) Object.assign(o, { alphaTest: 0.5, side: THREE.DoubleSide });
    mats.set(key, new THREE.MeshStandardMaterial(o));
  }
  return mats.get(key);
}
const GLASS = { transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.1, depthWrite: false };
/* Slabs that are a room's ceiling cast their shadow from their top face.
   From the default (the face away from the sun) the sun leaked in a bright
   line where the walls meet them. */
const TOP_SHADOW = { shadowSide: THREE.FrontSide };
const M = {};
function palette() {
  Object.assign(M, {
    wall: mat(0xf3f0e9), trim: mat(0xfafaf7), casing: mat(0x5a3a22, { roughness: 0.6 }), glass: mat(0xbcd6ea, GLASS), wood: mat(0x6b4423, { roughness: 0.75 }),
    dark: mat(0x3f2716, { roughness: 0.7 }), light: mat(0xa77b4f, { roughness: 0.75 }), white: mat(0xf4f3ef, { roughness: 0.4 }),
    steel: mat(0xb8bcbf, { roughness: 0.35, metalness: 0.6 }), black: mat(0x1d1d1d, { roughness: 0.5 }),
    chrome: mat(0xc4c7ca, { roughness: 0.25, metalness: 0.8 }), granite: mat(0x6f6a64, { roughness: 0.4 }),
    mirror: mat(0xcfdbe3, { roughness: 0.05, metalness: 0.9 }), linen: mat(0xf6f3ec), brick: mat(0xa0583a),
    leaf: mat(0x4f7a3a, { flatShading: true }), leaf2: mat(0x5f8a45, { flatShading: true }), bark: mat(0x6b4f36),
    pot: mat(0xb5653e), green: mat(0x2f5d3a, { roughness: 0.6, metalness: 0.3 }), glow: mat(0xfff1c8, { emissive: 0xffd88a, emissiveIntensity: 1.2 }),
    fence: mat(0xd6cfc1), sill: mat(0xb9b2a5, { roughness: 0.7 })
  });
}

function shapeOf(poly) { return new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], p[1]))); }
/* A flat polygon lying on the ground (or on a floor) at height y. */
function flat(poly, material, y) {
  const geo = new THREE.ShapeGeometry(shapeOf(poly));
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}
/* A slab whose top sits at `top`. */
function slab(poly, material, top, thick) {
  const geo = new THREE.ExtrudeGeometry(shapeOf(poly), { depth: thick, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.position.y = top - thick;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
/* A box standing between two plan points, from `base` to `top`. */
function bar(ax, ay, bx, by, base, top, thick, material) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  if (len < 0.01 || top - base < 0.01) return null;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, top - base, thick), material);
  m.position.set((ax + bx) / 2, (base + top) / 2, -(ay + by) / 2);
  m.rotation.y = Math.atan2(dy, dx);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function rectPoly(r) { return [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]; }
function inside(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function center(item) {
  const poly = H.polyOf(item);
  let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
  poly.forEach((p) => { x1 = Math.min(x1, p[0]); x2 = Math.max(x2, p[0]); y1 = Math.min(y1, p[1]); y2 = Math.max(y2, p[1]); });
  if (item.street) x2 = H.streetX((y1 + y2) / 2);
  if (item.lab) {
    const l = item.lab;
    return [l[2] === "s" ? l[0] + 1.1 : l[2] === "e" ? l[0] - 1.1 : l[0], l[1]];
  }
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}
function byId(id) { return H.rooms.concat(H.spaces).filter((i) => H.idOf(i) === String(id))[0]; }

/* Pieces built in their own frame: x across, y up, front toward -z. */
function bx(g, w, h, d, x, y, z, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function cy(g, rt, rb, h, x, y, z, material, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function ball(g, r, x, y, z, material, detail) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail === undefined ? 1 : detail), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
/* Puts a piece at plan point (x, y) on `level`, turned rot degrees. */
function place(piece, x, y, level, rot) {
  piece.position.set(x, zAt(x, y, level || 0), -y);
  piece.rotation.y = (rot || 0) * DEG;
  S.static.add(piece);
  return piece;
}

/* Merges every mesh under `group` into one mesh per material. */
function merge(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    Object.keys(g.attributes).forEach((n) => { if (n !== "position" && n !== "normal" && n !== "uv") g.deleteAttribute(n); });
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, geos: [], cast: false });
    const b = buckets.get(key);
    b.geos.push(g);
    b.cast = b.cast || o.castShadow;
  });
  const out = new THREE.Group();
  buckets.forEach((b) => {
    const merged = mergeGeometries(b.geos, false);
    if (!merged) return;
    const m = new THREE.Mesh(merged, b.material);
    m.castShadow = b.cast && !b.material.transparent;
    m.receiveShadow = true;
    if (b.material.transparent) m.renderOrder = 2;
    out.add(m);
  });
  return out;
}


/* ---------- walls ---------- */

/* The floor's height under a point on a level. */
function zAt(x, y, level) {
  const r = H.at(x, y, level);
  return r ? r.z : F[level];
}
/* Clips a polygon to the rectangle [x1, y1, x2, y2]. */
function clipRect(poly, r) {
  const edges = [[1, 0, -r[0]], [-1, 0, r[2]], [0, 1, -r[1]], [0, -1, r[3]]];
  let out = poly;
  for (const e of edges) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length];
      const da = e[0] * a[0] + e[1] * a[1] + e[2], db = e[0] * b[0] + e[1] * b[1] + e[2];
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const u = da / (da - db); out.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]); }
    }
    if (out.length < 3) return [];
  }
  // drop repeated corners
  return out.filter((p, i) => { const q = out[(i + 1) % out.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5; });
}
function areaOf(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}
function meshOf(pos, uv, material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
/* A flat or sloping face over a plan outline: zf(x, y) is its height. */
function sloped(poly, zf, material) {
  const pos = [], uv = [];
  THREE.ShapeUtils.triangulateShape(poly.map((q) => new THREE.Vector2(q[0], q[1])), []).forEach((f) => {
    let t = f.map((i) => poly[i]);
    if (areaOf(t) < 0) t = [t[0], t[2], t[1]];      // facing up
    t.forEach((q) => { pos.push(q[0], zf(q[0], q[1]), -q[1]); uv.push(q[0], q[1]); });
  });
  return meshOf(pos, uv, material);
}
/* A solid from `base` up to a top that may slope: poly is its plan outline,
   zf(x, y) the height of its top at each corner. */
function prism(poly, base, zf, material) {
  const n = poly.length, pos = [], uv = [], ccw = areaOf(poly) > 0;
  const P = (q, h) => [q[0], h, -q[1]];
  let run = 0;
  for (let i = 0; i < n; i++) {
    const a = ccw ? poly[i] : poly[(i + 1) % n], b = ccw ? poly[(i + 1) % n] : poly[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), za = zf(a[0], a[1]), zb = zf(b[0], b[1]);
    pos.push(...P(a, base), ...P(b, base), ...P(b, zb), ...P(a, base), ...P(b, zb), ...P(a, za));
    uv.push(run, base, run + len, base, run + len, zb, run, base, run + len, zb, run, za);
    run += len;
  }
  THREE.ShapeUtils.triangulateShape(poly.map((q) => new THREE.Vector2(q[0], q[1])), []).forEach((f) => {
    let t = f.map((i) => poly[i]);
    if (areaOf(t) < 0) t = [t[0], t[2], t[1]];
    t.forEach((q) => { pos.push(...P(q, zf(q[0], q[1]))); uv.push(q[0], q[1]); });
  });
  return meshOf(pos, uv, material);
}
/* A piece of wall from a to b, `t` thick, from z0 up to z1a at a and z1b at b. */
function wallBox(a, b, t, z0, z1a, z1b, material) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  if (len < 0.01 || Math.max(z1a, z1b) - z0 < 0.01) return null;
  const nx = (-dy / len) * t / 2, ny = (dx / len) * t / 2;
  const poly = [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]];
  const zf = (x, y) => z1a + (z1b - z1a) * Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (len * len)));
  const m = prism(poly, z0, zf, material || M.wall);
  S.static.add(m);
  return m;
}
function inWall(x, y, level) {
  return S.wallPolys[level].some((w) => x >= w.bb[0] && x <= w.bb[2] && y >= w.bb[1] && y <= w.bb[3] && inside(x, y, w.poly));
}
/* Every wall outline of the survey, cut where the height changes (`tops`)
   and raised to it; its sides are what you bump into. */
function buildWalls() {
  S.wallPolys = { 0: [], 1: [], 2: [] };
  [0, 1, 2].forEach((lv) => {
    const zones = H.tops.filter((z) => z.level === lv);
    H.wallsOf(lv).forEach((poly) => {
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      const bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      S.wallPolys[lv].push({ poly, bb });
      let top = BASE[lv] + 0.5;
      zones.forEach((z) => {
        const r = z.rect;
        if (bb[2] < r[0] || bb[0] > r[2] || bb[3] < r[1] || bb[1] > r[3]) return;
        const piece = clipRect(poly, r);
        if (piece.length < 3 || Math.abs(areaOf(piece)) < 1e-4) return;
        const zf = (x) => z.z + (z.g || 0) * (x - r[0]);
        S.static.add(prism(piece, BASE[lv], zf, M.wall));
        piece.forEach((p) => { top = Math.max(top, zf(p[0])); });
      });
      // its sides are what you bump into, each as high as the wall is there
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = -(b[1] - a[1]) / len * 0.06, ny = (b[0] - a[0]) / len * 0.06;
        const h = Math.min(top, Math.max(H.topAt(mx, my, lv), H.topAt(mx + nx, my + ny, lv), H.topAt(mx - nx, my - ny, lv)));
        collider(a[0], a[1], b[0], b[1], BASE[lv], h, 0.005);
      }
    });
  });
}
/* Tiles or boards on a room's walls up to `h`: on every side of its outline
   that has a wall behind it (doors and windows don't). */
function wainscot(r, h, material) {
  const poly = H.polyOf(r), ccw = areaOf(poly) > 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.12) continue;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, nx = ccw ? uy : -uy, ny = ccw ? -ux : ux;   // out of the room
    if (!inWall((a[0] + b[0]) / 2 + nx * 0.05, (a[1] + b[1]) / 2 + ny * 0.05, r.level)) continue;
    const p = [a[0] - nx * 0.012, a[1] - ny * 0.012], q = [b[0] - nx * 0.012, b[1] - ny * 0.012];
    const m = quad([[p[0], p[1], r.z], [q[0], q[1], r.z], [q[0], q[1], r.z + h], [p[0], p[1], r.z + h]], material);
    m.castShadow = false;
    S.static.add(m);
  }
}

function collider(ax, ay, bx2, by2, base, top, half, door) {
  S.colliders.push({ ax, ay, bx: bx2, by: by2, base, top, half, door: door || null });
}

/* ---------- doors ---------- */

const SIDE = { n: [0, 1], s: [0, -1], e: [1, 0], w: [-1, 0] };

function leafMaterial(kind) {
  if (kind === "red") return new THREE.MeshStandardMaterial({ color: 0x8b3a22, roughness: 0.6 });
  if (kind === "white") return new THREE.MeshStandardMaterial({ color: 0xc3cfd6, roughness: 0.5 });
  return new THREE.MeshStandardMaterial({ color: 0x6e4426, roughness: 0.65 });
}
/* One leaf, hinged at its local origin, running along +x for `w`. */
function makeLeaf(kind, w, h) {
  const g = new THREE.Group();
  if (kind === "gate") {
    const m = new THREE.MeshStandardMaterial({ map: texFor("bars", w, h), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 });
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), m);
    p.position.set(w / 2, h / 2, 0);
    p.castShadow = true;
    g.add(p);
    return g;
  }
  if (kind === "louvre") {
    // the bedrooms' cream shutter doors
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), new THREE.MeshStandardMaterial({ map: texFor("louvre", w, h), roughness: 0.7 }));
    p.position.set(w / 2, h / 2, 0);
    p.castShadow = true;
    g.add(p);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.steel);
    knob.position.set(w - 0.07, 1.0, 0);
    knob.scale.z = 2.6;
    g.add(knob);
    return g;
  }
  if (kind === "yellow" || kind === "glazed-wood") {
    // a panelled door with glass in its upper part: the corridor's yellow
    // one, and the brown one into the glazed room
    const frame = new THREE.MeshStandardMaterial({ color: kind === "yellow" ? 0xe9d99a : 0x6e4426, roughness: 0.6 });
    const low = h * 0.36, hi = h - low;
    const add = (bw, bh, x, y, d) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, d || 0.045), frame);
      b.position.set(x, y, 0);
      b.castShadow = true;
      g.add(b);
    };
    add(w, low, w / 2, low / 2);
    add(0.09, hi, 0.045, low + hi / 2);
    add(0.09, hi, w - 0.045, low + hi / 2);
    add(w, 0.09, w / 2, h - 0.045);
    add(0.03, hi, w / 2, low + hi / 2, 0.03);
    [0.33, 0.66].forEach((k) => add(w, 0.03, w / 2, low + hi * k, 0.03));
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w - 0.16, hi - 0.08, 0.012), M.glass);
    pane.position.set(w / 2, low + hi / 2, 0);
    pane.renderOrder = 2;
    g.add(pane);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.steel);
    knob.position.set(w - 0.08, 1.0, 0);
    knob.scale.z = 2.6;
    g.add(knob);
    return g;
  }
  if (kind === "glass" || kind === "double-glass" || kind === "slide-glass") {
    // white aluminium frames, as in the photos
    const frame = new THREE.MeshStandardMaterial({ color: 0xe9ebec, roughness: 0.45, metalness: 0.2 });
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, h - 0.1, 0.015), M.glass);
    pane.position.set(w / 2, h / 2, 0);
    pane.renderOrder = 2;
    g.add(pane);
    [[w, 0.06, w / 2, 0.03], [w, 0.06, w / 2, h - 0.03], [0.06, h, 0.03, h / 2], [0.06, h, w - 0.03, h / 2]].forEach((f) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(f[0], f[1], 0.05), frame);
      b.position.set(f[2], f[3], 0);
      b.castShadow = true;
      g.add(b);
    });
    if (kind !== "slide-glass") {
      const knob = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.08), M.steel);
      knob.position.set(w - 0.09, 1.0, 0);
      g.add(knob);
    }
    return g;
  }
  const m = leafMaterial(kind);
  const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.045), m);
  p.position.set(w / 2, h / 2, 0);
  p.castShadow = true;
  g.add(p);
  // two raised panels, so a wooden door reads as a door
  {
    const panel = new THREE.MeshStandardMaterial({ color: kind === "red" ? 0x7a3220 : kind === "white" ? 0xaebcc4 : 0x5e3a20, roughness: 0.65 });
    [[h * 0.72, h * 0.36], [h * 0.27, h * 0.36]].forEach((pp) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, pp[1], 0.06), panel);
      b.position.set(w / 2, pp[0], 0);
      g.add(b);
    });
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.steel);
  knob.position.set(w - 0.08, 1.0, 0);
  knob.scale.z = 2.6;
  g.add(knob);
  return g;
}
/* A door on a wall from A to B (plan points). It opens toward `side`. */
function addDoor(a, b, base, kind, side, tall, dbl) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const h = tall || DOOR_H;
  const door = { kind, t: 0, target: 0, pivots: [], parts: [], name: kind === "gate" ? "gate" : "door" };
  const hinge = (p, dirx, diry, w) => {
    const pivot = new THREE.Object3D();
    pivot.position.set(p[0], base, -p[1]);
    const base0 = Math.atan2(diry, dirx);
    const left = -diry * side[0] + dirx * side[1];   // leftNormal · side
    pivot.rotation.y = base0;
    const leaf = makeLeaf(kind, w, h);
    pivot.add(leaf);
    S.scene.add(pivot);
    door.pivots.push({ pivot, base0, sign: left >= 0 ? 1 : -1, leaf });
    door.parts.push(leaf);
  };
  // A sliding door is two panels: the half by `a` stays, the other slides
  // over it on the inner side, so it never leaves the wall.
  let shut = [a, b];
  if (kind === "slide-glass") {
    const half = len / 2, mid = [a[0] + dx / 2, a[1] + dy / 2];
    const pivot = new THREE.Object3D();
    pivot.position.set(a[0], base, -a[1]);
    pivot.rotation.y = Math.atan2(dy, dx);
    const fixed = makeLeaf(kind, half + 0.03, h);
    const moving = makeLeaf(kind, half + 0.03, h);
    const inner = -dy * side[0] + dx * side[1] >= 0 ? -1 : 1;   // local z toward `side`
    fixed.position.z = -0.025 * inner;
    moving.position.set(half - 0.03, 0, 0.025 * inner);
    pivot.add(fixed, moving);
    S.scene.add(pivot);
    door.slide = { leaf: moving, x0: half - 0.03, len: half };
    door.parts.push(moving, fixed);
    collider(a[0], a[1], mid[0], mid[1], base, base + h, 0.04);
    shut = [mid, b];
  } else if (dbl || kind === "double-glass" || kind === "gate") {
    hinge(a, ux, uy, len / 2 - 0.01);
    hinge(b, -ux, -uy, len / 2 - 0.01);
  } else {
    hinge(a, ux, uy, len - 0.02);
  }
  // Each door gets its own materials, so lighting one up under the pointer
  // leaves the others alone. The glass stays shared: it never lights up.
  const own = new Map();
  door.parts.forEach((p) => p.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.door = door;
    if (o.material === M.glass) return;
    if (!own.has(o.material)) own.set(o.material, o.material.clone());
    o.material = own.get(o.material);
  }));
  collider(shut[0][0], shut[0][1], shut[1][0], shut[1][1], base, base + h, 0.04, door);
  S.doors.push(door);
  S.clickable.push(...door.parts);
  return door;
}
function setDoorPose(d) {
  const e = d.t * d.t * (3 - 2 * d.t);
  if (d.slide) { d.slide.leaf.position.x = d.slide.x0 - 0.94 * d.slide.len * e; return; }
  d.pivots.forEach((p) => { p.pivot.rotation.y = p.base0 + p.sign * e * 88 * DEG; });
}
function toggleDoor(d) { d.target = d.target > 0.5 ? 0 : 1; updatePrompt(); }
function highlight(d, on) {
  if (!d) return;
  d.parts.forEach((p) => p.traverse((o) => {
    if (o.isMesh && o.material !== M.glass && o.material.emissive) {
      o.material.emissive.setHex(on ? 0x8a5a1a : 0x000000);
      o.material.emissiveIntensity = on ? 0.45 : 0;
    }
  }));
}

/* A window in the gap from a to b: glass, a white frame with mullions, and
   bars outside where the photos show them. */
const BARS = { V4: 1, V7: 1, V8: 1, V9: 1, V20: 1, V21: 1, V22: 1, V23: 1 };
function windowIn(o, zf, r1, r2) {
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
function buildOpenings() {
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
    addDoor(hinge[0], hinge[1], zf, dbl && o.leaf === "glass" ? "double-glass" : o.leaf, [nx * s, ny * s], o.head, dbl);
  });
  // the vehicle gate on the building line opens inward
  const g = H.gate;
  addDoor(g.a, g.b, 0, "gate", [-H.OUT[0], -H.OUT[1]], g.h, true);
}

/* ---------- furniture ---------- */

function chair(color, seat, metal) {
  const g = new THREE.Group();
  const frame = metal ? M.green : color ? mat(color, { roughness: 0.7 }) : M.wood;
  bx(g, 0.44, 0.05, 0.44, 0, 0.46, 0, seat ? mat(seat) : frame);
  [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach((p) => bx(g, 0.035, 0.46, 0.035, p[0], 0.23, p[1], frame));
  bx(g, 0.44, 0.46, 0.04, 0, 0.72, 0.2, frame);
  return g;
}
function lampShade(g, x, y, z, r) {
  cy(g, r * 0.62, r, r * 1.2, x, y, z, mat(0xf3ead6, { emissive: 0xffe2a8, emissiveIntensity: 0.35 }));
}
const BUILD = {
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
/* Footprints [width, depth] of the pieces you can't walk through. */
const BLOCK = {
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
function blockPiece(type, p, x, y, level, rot) {
  if (!BLOCK[type]) return;
  const fp = BLOCK[type](p);
  solid(x, y, fp[0], fp[1], rot, level);
}
/* A solid box w by d (d toward the piece's front) at (x, y), turned rot. */
function solid(x, y, w, d, rot, level) {
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
const CURTAINS = [0x3f6fb5, 0x6fae6b, 0xd99ab0, 0x7fb3c9, 0xc9b26f, 0x9a8fc9, 0x6bb5a0];
function bath(item, door, i) {
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

function buildFurniture() {
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

/* ---------- labels ---------- */

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function makeLabel(text, num) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const g = c.getContext("2d");
  g.font = "600 44px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const pad = 22, pillW = num ? g.measureText(num).width + 34 : 0, gap = num ? 12 : 0;
  const textW = Math.min(g.measureText(text).width, 512 - 2 * pad - pillW - gap - 8);
  const w = pad * 2 + pillW + gap + textW, x0 = (512 - w) / 2;
  g.fillStyle = "rgba(255,255,255,0.9)";
  roundRect(g, x0, 24, w, 80, 40); g.fill();
  g.textBaseline = "middle";
  if (num) {
    g.fillStyle = "#2B2B28";
    roundRect(g, x0 + pad - 8, 36, pillW, 56, 28); g.fill();
    g.fillStyle = "#FFFFFF"; g.textAlign = "center";
    g.fillText(num, x0 + pad - 8 + pillW / 2, 65);
  }
  g.fillStyle = "#1F1F1C"; g.textAlign = "left";
  g.fillText(text, x0 + pad + pillW + gap - (num ? 8 : 0), 65, textW);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 4;
  // A fixed size on screen, like a pin on a map: readable from afar and never
  // huge when you stand next to it.
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, sizeAttenuation: false }));
  sp.scale.set(0.3, 0.075, 1);
  sp.renderOrder = 10;
  return sp;
}
function buildLabels() {
  const group = S.labels;
  group.children.slice().forEach((sp) => { group.remove(sp); sp.material.map.dispose(); sp.material.dispose(); });
  const put = (text, num, x, y, h) => {
    if (!text) return;
    const sp = makeLabel(text, num);
    sp.position.set(x, h, -y);
    group.add(sp);
  };
  H.rooms.forEach((r) => {
    const c = center(r), h = r.z + 2.05;
    put(plain(t(r.name)), String(r.n), c[0], c[1], h);
  });
  H.spaces.forEach((s) => {
    if (!s.name || s.kind === "roof" || s.kind === "balcony") return;
    const c = center(s);
    put(plain(t(s.name)).replace(/\s*·.*$/, ""), "", c[0], c[1], (s.z || 0) + 2.1);
  });
  put(plain(t("space.garden")).replace(/\s*\(.*\)$/, ""), "", X.labels.garden[0], X.labels.garden[1], 1.8);
}

/* ---------- the scene ---------- */

function tree(x, y, size) {
  const g = new THREE.Group(), k = size || 1;
  cy(g, 0.12 * k, 0.2 * k, 2.4 * k, 0, 1.2 * k, 0, M.bark, 8);
  [[0, 2.9, 0, 1.4], [0.7, 2.6, 0.3, 1.0], [-0.6, 2.7, -0.3, 1.1]].forEach((s) => ball(g, s[3] * k, s[0] * k, s[1] * k, s[2] * k, M.leaf, 1));
  place(g, x, y, 0, 0);
}

/* A beam between two points [x, y, height], w wide and h deep. */
function beam3(A, B, w, h, material) {
  const a = new THREE.Vector3(A[0], A[2], -A[1]), b = new THREE.Vector3(B[0], B[2], -B[1]);
  const dir = b.clone().sub(a), len = dir.length();
  if (len < 0.01) return null;
  dir.normalize();
  const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(side, dir);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, w), material);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, up, side));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.castShadow = true;
  S.static.add(m);
  return m;
}

function buildScene() {
  const scene = S.scene;
  S.lamps = [];

  // Ground around the lot, the lot itself, the sidewalks and the street.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat(0xa7b08c));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(CENTER.x, -0.03, -CENTER.y);
  ground.receiveShadow = true;
  scene.add(ground);
  S.static.add(flat(H.lot, texMat("grass"), 0.004));
  const e = H.OUT;
  const band = (o1, o2) => [[-40, o1], [-40, o2], [70, o2], [70, o1]]
    .map((q) => [H.streetX(q[0]) + q[1] * e[0], q[0] + q[1] * e[1]]);
  S.static.add(flat(band(0, 2.5), texMat("sidewalk"), 0.012));
  S.static.add(flat(band(2.5, 10.5), texMat("asphalt"), 0.008));
  S.static.add(flat(band(10.5, 13), texMat("sidewalk"), 0.012));
  [[2.38, 2.52], [10.48, 10.62]].forEach((c) => S.static.add(flat(band(c[0], c[1]), mat(0xe8e4da), 0.03)));

  // Neighbours: the cadastre's parcels around, each a block of render under a
  // tile or sheet roof (js/house.js), solid to walk into.
  const RENDER = [0xf1ece2, 0xe9dfcf, 0xdcd3c3, 0xf4f1ea];
  const ROOFS = [0xa65f45, 0x8d969c, 0x9a5a40, 0x6f8796];
  H.neighbours.forEach((b, i) => {
    const h = b.floors === 2 ? 5.8 : 3.0;
    S.static.add(slab(b.poly, mat(RENDER[i % RENDER.length], { roughness: 0.9 }), h, h));
    S.static.add(slab(b.poly, mat(ROOFS[(i * 7) % ROOFS.length], { roughness: 0.75 }), h + 0.3, 0.3));
    b.poly.forEach((p, k) => {
      const q = b.poly[(k + 1) % b.poly.length];
      collider(p[0], p[1], q[0], q[1], 0, h + 0.3, 0.05);
    });
  });

  // Garden: gravel, pavers, wheel tracks, the hedge, the big tree and the statue.
  const G = H.garden;
  S.static.add(flat(G.gravel, texMat("gravel"), 0.02));
  S.static.add(flat(G.pavers, texMat("pavers"), 0.02));
  G.tracks.forEach((c) => {
    const curve = new THREE.CubicBezierCurve(...c.map((p) => new THREE.Vector2(p[0], p[1])));
    const pts = curve.getPoints(28);
    for (let i = 0; i < pts.length - 1; i++) {
      const m = bar(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 0.0, 0.035, 0.45, texMat("pavers"));
      if (m) { m.castShadow = false; S.static.add(m); }
    }
  });
  {
    const h = G.hedge, m = bar(h[0][0], h[0][1] + 0.4, h[1][0], h[1][1] + 0.4, 0, 1.7, 0.7, M.leaf2);
    if (m) S.static.add(m);
  }
  const big = new THREE.Group();
  cy(big, 0.22, 0.36, 3.0, 0, 1.5, 0, M.bark, 10);
  [[0, 3.6, 0, 2.4], [1.2, 3.2, 0.6, 1.8], [-1.1, 3.3, -0.5, 1.9], [0.3, 4.4, -0.8, 1.6]].forEach((s) => ball(big, s[3], s[0], s[1], s[2], M.leaf, 1));
  place(big, G.tree.c[0], G.tree.c[1], 0, 0);
  collider(G.tree.c[0] - 0.2, G.tree.c[1], G.tree.c[0] + 0.2, G.tree.c[1], 0, 3, 0.25);
  const statue = new THREE.Group();
  bx(statue, 0.5, 1.1, 0.5, 0, 0.55, 0, M.white);
  cy(statue, 0.12, 0.2, 0.75, 0, 1.48, 0, M.white, 12);
  ball(statue, 0.11, 0, 1.95, 0, M.white, 2);
  place(statue, G.statue[0], G.statue[1], 0, 0);
  solid(G.statue[0], G.statue[1], 0.5, 0.5, 0, 0);
  X.trees.forEach((tr) => tree(tr[0], tr[1], tr[2]));
  const post = new THREE.Group();
  cy(post, 0.06, 0.08, 6.5, 0, 3.25, 0, mat(0x55585b), 8);
  bx(post, 1.4, 0.06, 0.06, -0.7, 6.4, 0, mat(0x55585b));
  bx(post, 0.4, 0.12, 0.2, -1.35, 6.32, 0, M.glow);
  place(post, X.lamp[0], X.lamp[1], 0, 180);
  S.lamps.push([X.lamp[0] + 1.3, 6.1, -X.lamp[1], 22, 60]);

  // Floors at the survey's levels, each with its finish: on the ground floor
  // a block from the ground up, so a raised floor shows no gap at the doors.
  // Ceilings: flat where the room has its own height, else under the roof.
  const ceil = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, side: THREE.BackSide, emissive: 0xf6f4ee, emissiveIntensity: 0.18 });
  const woodCeil = new THREE.MeshStandardMaterial({ map: tex("boards"), side: THREE.BackSide, roughness: 0.8, emissive: 0x2a180c, emissiveIntensity: 0.25 });
  H.rooms.concat(H.spaces).forEach((r) => {
    const poly = H.polyOf(r);
    if (poly.length < 3) return;
    if (r.fin) S.static.add(slab(poly, texMat(r.fin), r.z + 0.004, r.level === 0 ? Math.max(0.03, r.z + 0.03) : 0.02));
    if (r.kind !== "stair") S.surfaces.push({ poly, h: r.z, level: r.level });
    if (!r.n) return;
    if (typeof r.h === "number") { S.static.add(flat(poly, ceil, r.z + r.h)); return; }
    if (r.h === "vault") return;                         // the vault itself is its ceiling
    H.tops.forEach((z) => {
      if (z.level !== r.level) return;
      const piece = clipRect(poly, z.rect);
      if (piece.length < 3 || Math.abs(areaOf(piece)) < 1e-3) return;
      S.static.add(sloped(piece, (x) => z.z + (z.g || 0) * (x - z.rect[0]) - 0.012, r.h === "mono" ? woodCeil : ceil));
    });
  });
  // the stair's own ground, and where you can stand on the stairs' level
  S.surfaces.push({ poly: H.polyOf(byId("aptstair")), h: 0, level: 0 });

  // Slabs: the apartment's floor over the drive with its beams, the landing's
  // over the bath, and the wing's roof, which is the terrace.
  S.static.add(slab(X.apartment.slab, mat(0xe9e5dc, TOP_SHADOW), H.Z.apt, 0.2));
  S.static.add(slab(H.polyOf(byId(35)), mat(0xe9e5dc, TOP_SHADOW), H.Z.apt, 0.15));
  [-1.3, -4.4, -7.6, -10.8, -13.4].forEach((x) => {
    const m = bar(x, 16.8, x, 20.3 + (-x) * 0.09, H.Z.apt - 0.5, H.Z.apt - 0.2, 0.2, M.wall);
    if (m) S.static.add(m);
  });
  const wing = H.roofs.filter((r) => r.id === "wing")[0];
  S.static.add(slab(wing.poly, mat(0xd9d3c7, TOP_SHADOW), wing.z + wing.t, wing.t));

  // Walls from the survey, the parapets on top of them, doors and windows.
  buildWalls();
  H.parapets.forEach((p) => {
    const k = p.inset || 0;
    const pa = [p.a[0] - e[0] * k, p.a[1] - e[1] * k], pb = [p.b[0] - e[0] * k, p.b[1] - e[1] * k];
    wallBox(pa, pb, p.t, p.z0, p.z1, p.z1);
    collider(pa[0], pa[1], pb[0], pb[1], p.z0, p.z1, p.t / 2);
  });
  buildOpenings();
  H.rooms.forEach((r) => {
    if (r.tile) wainscot(r, r.kind === "bath" ? 2.0 : 1.6, texMat("tile-" + r.tile, { side: THREE.DoubleSide }));
    if (r.wainscot) wainscot(r, 1.1, texMat("pine", { side: THREE.DoubleSide }));
  });
  // the hall's white joists and the beams under the corridor's sloping ceiling
  const hall = byId(1);
  for (let y = 5.5; y < 12.5; y += 0.85) {
    const m = bar(-2.41, y, H.streetX(y) - 0.32, y, hall.z + hall.h - 0.13, hall.z + hall.h, 0.07, M.trim);
    if (m) { m.castShadow = false; S.static.add(m); }
  }
  for (let y = 5.7; y < 15.2; y += 1.3) {
    beam3([-11.62, y, H.topAt(-11.62, y, 0) - 0.1], [-9.24, y, H.topAt(-9.24, y, 0) - 0.1], 0.07, 0.16, M.trim);
  }
  // stone at the foot of the street front, by the apartment's door
  X.stone.forEach((r) => {
    const o = 0.03, a = [H.streetX(r[0]) + e[0] * o, r[0] + e[1] * o], b = [H.streetX(r[1]) + e[0] * o, r[1] + e[1] * o];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = bar(a[0], a[1], b[0], b[1], 0, 1.3, 0.05, new THREE.MeshStandardMaterial({ map: texFor("stone", len, 1.3), roughness: 0.95 }));
    if (m) S.static.add(m);
  });

  // Boundary walls: the 1.20 m one along the drive, garden height on the rest
  // of the north side and across the back. The house's own wall and the
  // hedge behind it close the south side.
  const L = H.lot, lw = X.lowWall;
  const fence = (a, b, h) => {
    const m = bar(a[0], a[1], b[0], b[1], 0, h, 0.2, M.fence);
    if (m) S.static.add(m);
    const cap = bar(a[0], a[1], b[0], b[1], h, h + 0.05, 0.26, mat(0xc7bfae));
    if (cap) S.static.add(cap);
    collider(a[0], a[1], b[0], b[1], 0, h, 0.1);
  };
  fence(lw[0], lw[1], 1.2);
  fence(lw[1], L[2], 1.8);
  fence(L[2], L[3], 1.8);
  fence(L[3], [-28.1, 2.66], 1.8);

  // Railings: balconies, the terrace (brown pattern over the galería), the
  // stair's steel one, and the galería's wooden balustrade with its gaps.
  H.railings.forEach((r) => {
    const a = r.a, b = r.b, base = F[r.level], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const add = (m) => { if (m) S.static.add(m); };
    if (r.glass) add(bar(a[0], a[1], b[0], b[1], base, base + 1.0, 0.025, M.glass));
    else if (r.deco) {
      add(bar(a[0], a[1], b[0], b[1], base, base + 0.95, 0.04, new THREE.MeshStandardMaterial({ map: texFor("deco", len, 1), alphaTest: 0.5, side: THREE.DoubleSide })));
      add(bar(a[0], a[1], b[0], b[1], base + 0.95, base + 1.02, 0.07, mat(0x7a4528)));
    } else {
      const m = r.steel ? M.black : M.trim, n = Math.max(1, Math.round(len / 0.45));
      add(bar(a[0], a[1], b[0], b[1], base + 0.95, base + 1.0, 0.05, m));
      add(bar(a[0], a[1], b[0], b[1], base + 0.45, base + 0.48, 0.03, m));
      for (let i = 0; i <= n; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.0, 0.035), m);
        p.position.set(a[0] + (b[0] - a[0]) * i / n, base + 0.5, -(a[1] + (b[1] - a[1]) * i / n));
        S.static.add(p);
      }
    }
    collider(a[0], a[1], b[0], b[1], base, base + 1.0, 0.05);
  });
  X.balusters.forEach((s) => {
    const a = s[0], b = s[1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = bar(a[0], a[1], b[0], b[1], 0.2, 1.1, 0.04, new THREE.MeshStandardMaterial({ map: texFor("balusters", len, 0.9), alphaTest: 0.5, side: THREE.DoubleSide }));
    if (m) S.static.add(m);
    collider(a[0], a[1], b[0], b[1], 0, 1.1, 0.04);
  });

  // Stairs: a tread for each riser along the stair's path, a stringer along
  // each straight run, open underneath so the way in passes below.
  H.ramps.forEach((r) => {
    r.segs = [];
    r.len = 0;
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      r.segs.push({ a, b, len, s0: r.len });
      r.len += len;
    }
    const at = (s) => {
      const g = r.segs.filter((q) => s <= q.s0 + q.len + 1e-6)[0] || r.segs[r.segs.length - 1], u = (s - g.s0) / g.len;
      return { x: g.a[0] + (g.b[0] - g.a[0]) * u, y: g.a[1] + (g.b[1] - g.a[1]) * u, ang: Math.atan2(g.b[1] - g.a[1], g.b[0] - g.a[0]) };
    };
    const hAt = (s) => r.h1 + (r.h2 - r.h1) * s / r.len;
    const tread = r.steel ? mat(0x3a3a3a, { roughness: 0.6, metalness: 0.4 }) : mat(0x8a5a33, { roughness: 0.6 });
    const run = r.len / r.steps;
    for (let i = 0; i < r.steps; i++) {
      const p = at((i + 0.5) * run);
      const m = new THREE.Mesh(new THREE.BoxGeometry(run + 0.04, 0.04, r.w), tread);
      m.position.set(p.x, hAt((i + 1) * run) - 0.02, -p.y);
      m.rotation.y = p.ang;
      m.castShadow = true;
      m.receiveShadow = true;
      S.static.add(m);
    }
    r.segs.forEach((g) => {
      const ux = (g.b[0] - g.a[0]) / g.len, uy = (g.b[1] - g.a[1]) / g.len;
      [-1, 1].forEach((sd) => {
        const k = sd * r.w / 2, ox = -uy * k, oy = ux * k;
        beam3([g.a[0] + ox, g.a[1] + oy, hAt(g.s0) - 0.1], [g.b[0] + ox, g.b[1] + oy, hAt(g.s0 + g.len) - 0.1], 0.04, 0.2, tread);
      });
    });
    (r.rails || []).forEach((c) => collider(c[0], c[1], c[2], c[3], c[4], c[5], 0.03));
  });

  // Low steps outside the doors that lead down to the garden and the drive.
  X.steps.forEach((r) => S.static.add(slab(rectPoly(r), mat(0xc9bfae, { roughness: 0.85 }), r[4], r[4])));

  // The hostería's sign: a wooden post on the sidewalk with an arm and a
  // board that faces both ways along the street. Kept out of the merged
  // static meshes because its board has a painted face.
  {
    const g = new THREE.Group();
    const wood = mat(0x5a3a22, { roughness: 0.7 });
    bx(g, 0.1, 2.6, 0.1, 0, 1.3, 0, wood);
    bx(g, 1.1, 0.06, 0.06, 0.5, 2.52, 0, wood);
    const c = document.createElement("canvas");
    c.width = 512; c.height = 192;
    const k = c.getContext("2d");
    k.fillStyle = "#3b2a1c"; k.fillRect(0, 0, 512, 192);
    k.strokeStyle = "#d9c9a8"; k.lineWidth = 8; k.strokeRect(10, 10, 492, 172);
    k.fillStyle = "#f3ead8"; k.textAlign = "center";
    k.font = "italic bold 64px Georgia, serif"; k.fillText(t("walk.sign"), 256, 92);
    k.font = "bold 38px Georgia, serif"; k.fillText(t("walk.sign.sub"), 256, 152);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.03), [wood, wood, wood, wood, face, face]);
    board.position.set(0.55, 2.2, 0);
    board.castShadow = true;
    g.add(board);
    [0.2, 0.9].forEach((dx) => bx(g, 0.012, 0.1, 0.012, dx, 2.44, 0, M.black));
    g.position.set(X.sign[0], 0, -X.sign[1]);
    S.scene.add(g);
    collider(X.sign[0] - 0.08, X.sign[1], X.sign[0] + 0.08, X.sign[1], 0, 2.6, 0.06);
  }

  // The grill: brick block and chimney, against the south wall. The galería's
  // posts and its two lanterns. A brick chimney on the kitchen's roof.
  const grill = new THREE.Group();
  bx(grill, 1.5, 1.6, 0.7, 0, 0.8, 0, M.brick);
  bx(grill, 1.1, 0.5, 0.08, 0, 1.0, 0.33, M.black);
  bx(grill, 0.6, 1.9, 0.5, 0, 2.55, -0.05, M.brick);
  place(grill, X.grill[0], X.grill[1], 0, X.grill[2]);
  solid(X.grill[0], X.grill[1], 1.5, 0.7, X.grill[2], 0);
  X.posts.forEach((p) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.25, 0.1), M.trim);
    m.position.set(p[0], 1.27, -p[1]);
    m.castShadow = true;
    S.static.add(m);
    collider(p[0], p[1] - 0.01, p[0], p[1] + 0.01, 0, 2.3, 0.05);
  });
  [[-19.6, 7.24], [-24.3, 7.24]].forEach((p) => {
    const lantern = new THREE.Group();
    bx(lantern, 0.14, 0.24, 0.14, 0, 0, 0, M.black);
    bx(lantern, 0.1, 0.16, 0.1, 0, 0, 0, M.glow);
    lantern.position.set(p[0], 2.15, -(p[1] + 0.08));
    S.static.add(lantern);
    S.lamps.push([p[0], 2.1, -(p[1] + 0.5), 7, 10]);
  });
  const ch = new THREE.Group();
  bx(ch, 0.6, 1.5, 0.6, 0, 0.75, 0, M.brick);
  bx(ch, 0.72, 0.08, 0.72, 0, 1.54, 0, mat(0x8c8579));
  ch.position.set(X.chimney[0], H.Z.front + 3.1, -X.chimney[1]);
  S.static.add(ch);

  buildFurniture();
  // the lamps that come on at night: where the photos hang chandeliers and pendants
  H.furniture.forEach((p) => {
    if (p.type === "chandelier" || p.type === "pendant") S.lamps.push([p.at[0], zAt(p.at[0], p.at[1], p.level) + (p.h || 2.7) - 0.75, -p.at[1], 9, 13]);
  });
  S.lamps.push([-3.6, H.Z.apt + 2.5, -18.4, 9, 13], [-10.2, H.Z.apt + 2.3, -18.3, 7, 9], [-7.0, H.Z.front + 2.5, -6.9, 7, 8], [-7.0, H.Z.front + 2.5, -14.6, 7, 8]);

  // Roofs, which the walk shows and the overview hides by default.
  buildRoofs();

  scene.add(merge(S.static));
  S.static = null;
  scene.add(S.labels);
  buildLabels();
}

/* A quad between four 3D points [x, y(plan), h], textured in meters. */
function quad(p, material, uScale) {
  const v = (q) => [q[0], q[2], -q[1]];
  const a = v(p[0]), b = v(p[1]), c = v(p[2]), d = v(p[3]);
  const pos = [...a, ...b, ...c, ...a, ...c, ...d];
  const len = (m, n) => Math.hypot(m[0] - n[0], m[1] - n[1], m[2] - n[2]);
  const U = len(p[0].map(Number), p[1].map(Number)) * (uScale || 1), V = len(p[1], p[2]);
  const uv = [0, 0, U, 0, U, V, 0, 0, U, V, 0, V];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function triangle(p, material) {
  const v = (q) => [q[0], q[2], -q[1]];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([...v(p[0]), ...v(p[1]), ...v(p[2])], 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  return m;
}

function buildRoofs() {
  const roofs = new THREE.Group();
  const sheet = (name) => new THREE.MeshStandardMaterial({ map: tex(name), roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
  const blue = sheet("metalblue"), metal = sheet("metal"), red = sheet("redsheet");
  const conc = mat(0xd6d0c4, TOP_SHADOW), wood = mat(0x6a4326, { roughness: 0.7 });
  const R = H.roof, Fz = H.Z.front, SKIN = 0.06;

  // The old house's gable: two slopes of blue sheet meeting on a ridge that
  // runs along the street, 8.45 m behind the building line, with fascia
  // boards along the eaves and the two ends.
  const main = H.roofs.filter((r) => r.id === "main")[0].rect;
  const zr = (x) => (x >= R.ridge ? Fz + 3.31 + (-2.6 - x) * R.gf : Fz + 4.6 - (R.ridge - x) * R.gr) + SKIN;
  const xf = main[2], xb = main[0], y1 = main[1], y2 = main[3];
  roofs.add(quad([[xf, y1, zr(xf)], [xf, y2, zr(xf)], [R.ridge, y2, zr(R.ridge)], [R.ridge, y1, zr(R.ridge)]], blue));
  roofs.add(quad([[R.ridge, y1, zr(R.ridge)], [R.ridge, y2, zr(R.ridge)], [xb, y2, zr(xb)], [xb, y1, zr(xb)]], blue));
  roofs.add(bar(R.ridge, y1, R.ridge, y2, zr(R.ridge) - 0.03, zr(R.ridge) + 0.05, 0.3, mat(0x7f95a8)));
  [xf, xb].forEach((x) => roofs.add(bar(x, y1, x, y2, zr(x) - 0.22, zr(x), 0.03, M.trim)));
  [y1, y2].forEach((y) => {
    [[xf, R.ridge], [R.ridge, xb]].forEach((s) => {
      const b = beam3([s[0], y, zr(s[0]) - 0.11], [s[1], y, zr(s[1]) - 0.11], 0.03, 0.22, M.trim);
      if (b) { S.static.remove(b); roofs.add(b); }
    });
  });

  // Flat roofs: concrete slabs over the hall, the south strip, the kitchen
  // and the laundry (the wing's is the terrace, always there); light sheet
  // over the galería, the grill and the carport.
  H.roofs.forEach((r) => {
    if (r.kind === "slab" && !r.terrace) roofs.add(slab(r.poly, conc, r.z + r.t, r.t));
    if (r.kind === "sheet") roofs.add(slab(r.poly, metal, r.z + 0.05, 0.05));
    if (r.kind === "leanto") {
      const p = r.poly;
      roofs.add(quad([[p[0][0], p[0][1], r.z], [p[3][0], p[3][1], r.z], [p[2][0], p[2][1], r.z - r.drop], [p[1][0], p[1][1], r.z - r.drop]], metal));
    }
  });

  // The glazed room's vault: a shallow arch across the room, as the survey
  // draws it, white inside and out, on white ribs.
  const g = H.roofs.filter((r) => r.id === "glazed")[0].rect, n = 10, w = (-11.9 + 16.7) / n;
  const vm = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) {
    const xa = -16.7 + i * w, xc = xa + w, za = H.arch(Math.max(xa, -16.64)) + 0.012, zc = H.arch(Math.min(xc, -11.86)) + 0.012;
    roofs.add(quad([[xa, g[1], za], [xa, g[3], za], [xc, g[3], zc], [xc, g[1], zc]], vm));
    [5.02, 6.5, 7.9, 9.3, 10.7, 12.1, 13.22].forEach((y) => beam3([xa, y, za - 0.06], [xc, y, zc - 0.06], 0.06, 0.08, M.trim));
  }

  // The apartment's roof falls toward the back, with a parapet on the street
  // and a wooden board along its other edges; the landing's is a slab.
  const A = X.apartment.roof, za2 = (x) => H.Z.apt + 3.4 - (-1.2 - x) * R.mono + SKIN;
  roofs.add(quad(A.map((p) => [p[0], p[1], za2(p[0])]), red));
  roofs.add(bar(A[3][0], A[3][1], A[2][0], A[2][1], za2(A[3][0]) - 0.2, za2(A[3][0]), 0.04, wood));
  [[A[0], A[3]], [A[1], A[2]]].forEach((s) => {
    const b = beam3([s[0][0], s[0][1], za2(s[0][0]) - 0.1], [s[1][0], s[1][1], za2(s[1][0]) - 0.1], 0.04, 0.2, wood);
    if (b) { S.static.remove(b); roofs.add(b); }
  });
  wallBox([-1.1, 16.88], [-1.1, 20.22], 0.2, H.Z.apt + 3.35, X.apartment.parapet, X.apartment.parapet);
  roofs.add(slab(X.landingRoof, conc, H.Z.apt + 2.75, 0.15));
  wallBox([H.streetX(12.68) - 0.1, 12.68], [H.streetX(16.9) - 0.1, 16.9], 0.2, H.Z.apt + 2.6, H.Z.apt + 2.9, H.Z.apt + 2.9);

  // The room on the wing's roof, with its water tank on top; the other tanks
  // stand on the flat roofs.
  roofs.add(slab(X.tower.roof, conc, H.Z.terrace + 2.3, 0.15));
  const tank = (x, y, z, group) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.48, 1.0, 18), mat(0x2a2a2a, { roughness: 0.5 }));
    m.position.set(x, z + 0.5, -y);
    m.castShadow = true;
    group.add(m);
  };
  tank(X.tower.tank[0], X.tower.tank[1], H.Z.terrace + 2.3, roofs);
  X.tanks.forEach((p, i) => (i < 2 ? tank(p[0], p[1], Fz + 2.9, roofs) : tank(p[0], p[1], H.Z.terrace, S.static)));

  S.roofs = merge(roofs);
  S.scene.add(S.roofs);
}

/* ---------- walking ---------- */

/* The heights a stair gives at (x, y): for each run whose width covers the
   point, the height at the nearest point of its path. A winder passes over
   its own way in, so one point can have two. */
function rampHeights(r, x, y) {
  const out = [];
  r.segs.forEach((g) => {
    const dx = g.b[0] - g.a[0], dy = g.b[1] - g.a[1];
    const u = Math.max(0, Math.min(1, ((x - g.a[0]) * dx + (y - g.a[1]) * dy) / (g.len * g.len)));
    if (Math.hypot(x - (g.a[0] + u * dx), y - (g.a[1] + u * dy)) > r.w / 2 + 0.03) return;
    out.push(r.h1 + ((r.h2 - r.h1) * (g.s0 + u * g.len)) / r.len);
  });
  return out;
}
function floorAt(x, y, feet) {
  let best = 0;
  S.surfaces.forEach((s) => { if (s.h <= feet + STEP && s.h > best && inside(x, y, s.poly)) best = s.h; });
  H.ramps.forEach((r) => rampHeights(r, x, y).forEach((h) => { if (h <= feet + STEP && h > best) best = h; }));
  return best;
}
function collide(p, feet) {
  for (let pass = 0; pass < 3; pass++) {
    S.colliders.forEach((w) => {
      if (w.door && w.door.t > 0.08) return;
      if (w.top <= feet + 0.3 || w.base >= feet + BODY) return;
      const dx = w.bx - w.ax, dy = w.by - w.ay, l2 = dx * dx + dy * dy || 1e-9;
      let u = ((p.x - w.ax) * dx + (p.y - w.ay) * dy) / l2;
      u = Math.max(0, Math.min(1, u));
      const cx = w.ax + u * dx, cyy = w.ay + u * dy;
      let ex = p.x - cx, ey = p.y - cyy;
      const d = Math.hypot(ex, ey), min = RADIUS + w.half;
      if (d >= min) return;
      if (d < 1e-6) { const n = Math.hypot(dy, dx) || 1; ex = -dy / n; ey = dx / n; } else { ex /= d; ey /= d; }
      p.x = cx + ex * min;
      p.y = cyy + ey * min;
    });
  }
}
function levelOf(p) {
  if (p.feet < 1.4) return 0;
  return S.surfaces.some((s) => s.level === 2 && inside(p.x, p.y, s.poly)) ? 2 : 1;
}
/* Space (or the touch button) jumps: about half a meter, only from the
   ground or a stair, never in mid-air. */
const JUMP = 3.3;
function jump() {
  const p = S.player;
  if (p.vz !== 0 || p.feet - floorAt(p.x, p.y, p.feet) > 0.02) return;
  p.vz = JUMP;
}
/* A walk at a person's pace: speed builds up and eases off instead of
   starting and stopping at once, the head bobs a little with each step, and
   the eyes follow the feet smoothly up and down stairs. */
const WALK = 1.35, RUN = 3.0, ACCEL = 9;
function step(dt) {
  const p = S.player, k = S.keys;
  let f = (k.forward ? 1 : 0) - (k.back ? 1 : 0) + S.joy.f;
  let s = (k.right ? 1 : 0) - (k.left ? 1 : 0) + S.joy.s;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const speed = k.run ? RUN : WALK;
  const fx = -Math.sin(p.yaw), fy = Math.cos(p.yaw), rx = Math.cos(p.yaw), ry = Math.sin(p.yaw);
  const tx = (fx * f + rx * s) * speed, ty = (fy * f + ry * s) * speed;
  const ease = 1 - Math.exp(-ACCEL * dt);
  p.vx = (p.vx || 0) + (tx - (p.vx || 0)) * ease;
  p.vy = (p.vy || 0) + (ty - (p.vy || 0)) * ease;
  const q = { x: p.x + p.vx * dt, y: p.y + p.vy * dt };
  q.x = Math.max(-70, Math.min(40, q.x));
  q.y = Math.max(-40, Math.min(60, q.y));
  collide(q, p.feet);
  if (dt > 0) { p.vx = (q.x - p.x) / dt; p.vy = (q.y - p.y) / dt; }
  p.x = q.x; p.y = q.y;
  const ground = floorAt(p.x, p.y, p.feet);
  const onGround = p.vz === 0 && p.feet - ground <= STEP;
  if (onGround) p.feet = ground;
  else {
    p.vz -= GRAVITY * dt;
    p.feet += p.vz * dt;
    if (p.feet <= ground) { p.feet = ground; p.vz = 0; }
  }
  // head bob: about two steps a second at a walk, a few centimeters
  const v = Math.hypot(p.vx, p.vy);
  p.bob = (p.bob || 0) + (onGround ? v * dt * 4.4 : 0);
  const amt = onGround ? Math.min(1, v / WALK) : 0;
  p.bobAmt = (p.bobAmt || 0) + (amt - (p.bobAmt || 0)) * (1 - Math.exp(-6 * dt));
  const up = Math.abs(Math.sin(p.bob)) * 0.028 * p.bobAmt, side = Math.sin(p.bob) * 0.012 * p.bobAmt;
  // the eyes trail the feet a little, so stairs read as steps and not jolts
  const eye = p.feet + EYE;
  p.eye = dt > 0 && p.eye !== undefined && Math.abs(p.eye - eye) < 1.2 ? p.eye + (eye - p.eye) * (1 - Math.exp(-14 * dt)) : eye;
  S.camera.position.set(p.x + rx * side, p.eye + up - 0.014 * p.bobAmt, -(p.y + ry * side));
  S.camera.rotation.set(p.pitch, p.yaw, side * 0.6, "YXZ");
}

/* ---------- doors under the pointer ---------- */

const ray = new THREE.Raycaster();
function doorAt(ndcX, ndcY, far) {
  ray.setFromCamera({ x: ndcX, y: ndcY }, S.camera);
  ray.far = far;
  const hits = ray.intersectObjects(S.clickable, true);
  return hits.length ? hits[0].object.userData.door : null;
}
function setHover(d) {
  if (d === S.hover) return;
  highlight(S.hover, false);
  S.hover = d;
  highlight(d, true);
  S.canvas.style.cursor = d && S.mode === "orbit" ? "pointer" : "";
  updatePrompt();
}
/* "Click to open the door", under the crosshair when walking and under the
   pointer in the overview. */
function updatePrompt() {
  const el = $("prompt"), cross = $("crosshair");
  if (!el) return;
  const d = S.hover;
  if (cross) cross.classList.toggle("on", !!d);
  el.hidden = !d;
  if (!d) return;
  const open = d.target > 0.5;
  if (d.kind === "gate") {
    if (touch) el.textContent = open ? t("walk.gate.close.touch") : t("walk.gate.open.touch");
    else el.textContent = open ? t("walk.gate.close") : t("walk.gate.open");
  } else if (touch) el.textContent = open ? t("walk.door.close.touch") : t("walk.door.open.touch");
  else el.textContent = open ? t("walk.door.close") : t("walk.door.open");
  if (S.mode === "orbit" && S.pointer) {
    el.style.left = S.pointer[0] + "px";
    el.style.top = S.pointer[1] + 22 + "px";
  } else {
    el.style.left = "";
    el.style.top = "";
  }
}
function tapAt(clientX, clientY) {
  const r = S.canvas.getBoundingClientRect();
  const d = doorAt(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1, S.mode === "walk" ? REACH : 400);
  if (d) toggleDoor(d);
}

/* ---------- the little map ---------- */

const MAP = H.extras.map;
function mapFrame(W, Hh) {
  const k = Math.min(W / (MAP.x1 - MAP.x0), Hh / (MAP.y1 - MAP.y0));
  return { k, ox: (W - k * (MAP.x1 - MAP.x0)) / 2, oy: (Hh - k * (MAP.y1 - MAP.y0)) / 2 };
}
function drawMinimap() {
  const c = S.mini;
  if (!c || c.offsetParent === null) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(c.clientWidth * dpr), Hh = Math.round(c.clientHeight * dpr);
  if (c.width !== W || c.height !== Hh) { c.width = W; c.height = Hh; }
  const g = c.getContext("2d"), fr = mapFrame(W, Hh);
  const mx = (x) => fr.ox + (x - MAP.x0) * fr.k, my = (y) => Hh - fr.oy - (y - MAP.y0) * fr.k;
  const path = (poly) => { g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(mx(p[0]), my(p[1])) : g.moveTo(mx(p[0]), my(p[1])))); g.closePath(); };
  g.clearRect(0, 0, W, Hh);
  g.fillStyle = "rgba(247,246,242,0.94)";
  g.fillRect(0, 0, W, Hh);
  path(H.lot); g.fillStyle = "#DDEBD2"; g.fill();
  g.lineWidth = dpr; g.strokeStyle = "#6B6A65"; g.stroke();
  const lv = S.mode === "walk" ? levelOf(S.player) : 0;
  const COL = { bedroom: "#dbe5f1", bath: "#c4d7e7", living: "#f0e0c4", service: "#e0dbcf", hall: "#e8e4dc",
                stair: "#d6cfc2", covered: "#ffffff", balcony: "#ffffff", terrace: "#ffffff", roof: "#bdb7aa" };
  H.rooms.concat(H.spaces).forEach((r) => {
    const here = lv === 0 ? r.level === 0 : r.level > 0;
    if (!here) return;
    path(H.polyOf(r));
    g.fillStyle = COL[r.kind] || "#dddddd"; g.fill();
    g.strokeStyle = "#2B2B28"; g.lineWidth = dpr * 0.8; g.stroke();
  });
  if (S.mode !== "walk") return;
  const p = S.player, px = mx(p.x), py = my(p.y);
  const a = Math.atan2(Math.cos(p.yaw), -Math.sin(p.yaw));
  g.fillStyle = "rgba(194,65,12,0.25)";
  g.beginPath(); g.moveTo(px, py);
  g.arc(px, py, 26 * dpr, -a - 0.6, -a + 0.6); g.closePath(); g.fill();
  g.fillStyle = "#C2410C";
  g.beginPath(); g.arc(px, py, 4 * dpr, 0, Math.PI * 2); g.fill();
}
/* Where your feet go at (x, y) on a level: the stair if you are on one, else
   that level's floor, else the ground. */
function standAt(x, y, lv) {
  const c = [];
  H.ramps.forEach((r) => rampHeights(r, x, y).forEach((h) => c.push(h)));
  S.surfaces.forEach((s) => { if (s.level === lv && inside(x, y, s.poly)) c.push(s.h); });
  if (!c.length) return 0;
  return c.reduce((a, b) => (Math.abs(b - F[lv]) < Math.abs(a - F[lv]) ? b : a));
}
/* True when a body at (x, y) would touch a wall, a closed door or a big
   piece of furniture. */
function blocked(x, y, feet) {
  if (S.blocks.some((b) => b.base < feet + 0.5 && b.base > feet - 0.5 && inside(x, y, b.poly))) return true;
  return S.colliders.some((w) => {
    if (w.door && w.door.t > 0.08) return false;
    if (w.top <= feet + 0.3 || w.base >= feet + BODY) return false;
    const dx = w.bx - w.ax, dy = w.by - w.ay, l2 = dx * dx + dy * dy || 1e-9;
    const u = Math.max(0, Math.min(1, ((x - w.ax) * dx + (y - w.ay) * dy) / l2));
    return Math.hypot(x - (w.ax + u * dx), y - (w.ay + u * dy)) < RADIUS + w.half + 0.03;
  });
}
/* The nearest free spot around (x, y), inside `poly` when there is one. */
function freeSpot(x, y, feet, poly) {
  const ok = (px, py) => (!poly || inside(px, py, poly)) && !blocked(px, py, feet);
  if (ok(x, y)) return [x, y];
  for (let r = 0.2; r <= 4; r += 0.2) {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (ok(px, py)) return [px, py];
    }
  }
  return [x, y];
}
/* Puts you at (x, y) on a level (the one you are on, if none is given). */
function jumpTo(x, y, level, poly) {
  const p = S.player;
  const lv = level === undefined ? levelOf(p) : level;
  const feet = standAt(x, y, lv);
  const spot = freeSpot(x, y, feet, poly);
  p.x = spot[0]; p.y = spot[1]; p.vz = 0;
  p.feet = standAt(p.x, p.y, lv);
  if (S.mode !== "walk") setMode("walk");
  step(0);
  hud();
}

/* ---------- controls, HUD and loop ---------- */

function hud() {
  const lv = levelOf(S.player);
  const level = $("level");
  if (level) {
    if (S.mode !== "walk") level.textContent = "";
    else if (lv === 0) level.textContent = t("walk.level.ground");
    else if (lv === 1) level.textContent = t("walk.level.upper");
    else level.textContent = t("walk.level.roof");
  }
  const hint = $("hint");
  if (hint) hint.textContent = S.mode === "orbit" ? (touch ? t("walk.hint.orbit.touch") : t("walk.hint.orbit")) : touch ? t("walk.hint.touch") : t("walk.hint.desktop");
  const btn = $("start-btn");
  if (btn) btn.textContent = touch ? t("walk.start.touch") : t("walk.start");
  const startBox = $("start");
  if (startBox) startBox.hidden = S.mode !== "walk" || S.active;
  const joy = $("joy");
  if (joy) joy.hidden = !(touch && S.mode === "walk" && S.active);
  const jumpBtn = $("jump");
  if (jumpBtn) {
    jumpBtn.hidden = !(touch && S.mode === "walk" && S.active);
    jumpBtn.textContent = t("walk.jump");
  }
  const cross = $("crosshair");
  if (cross) cross.hidden = !(S.mode === "walk" && S.active);
  S.lastLevel = lv;
  updatePrompt();
}

function setToggle(id, on) {
  const b = $(id);
  if (!b) return;
  b.classList.toggle("on", on);
  b.setAttribute("aria-pressed", on ? "true" : "false");
}

/* The aerial view is the overview's camera, pointed straight down. */
function setMode(mode) {
  const prev = S.mode;
  const aerial = mode === "aerial";
  if (aerial) mode = "orbit";
  S.mode = mode;
  S.aerial = aerial;
  const shown = aerial ? "aerial" : mode;
  ["walk", "orbit", "aerial"].forEach((m) => {
    const b = $("mode-" + m);
    if (!b) return;
    b.classList.toggle("on", shown === m);
    b.setAttribute("aria-pressed", shown === m ? "true" : "false");
  });
  setHover(null);
  if (mode === "orbit") {
    if (document.pointerLockElement) document.exitPointerLock();
    S.active = false;
    if (!S.orbit) {
      S.orbit = new OrbitControls(S.camera, S.canvas);
      S.orbit.enableDamping = true;
      S.orbit.maxPolarAngle = 1.45;
      S.orbit.minDistance = 4;
      S.orbit.maxDistance = 110;
    }
    S.orbit.enabled = true;
    S.orbit.minPolarAngle = 0;
    if (aerial) {
      // straight down from 40 m, north (the plan's top) up on screen
      S.camera.position.set(CENTER.x - 1, 40, -CENTER.y + 0.01);
      S.camera.up.set(0, 1, 0);
    } else S.camera.position.set(CENTER.x + 4, 22, -CENTER.y + 22);
    S.orbit.target.set(CENTER.x - 1, 0, -CENTER.y);
    S.orbit.update();
    S.roofs.visible = false;
  } else {
    if (S.orbit) S.orbit.enabled = false;
    S.roofs.visible = true;
    if (prev === "orbit" && S.flown && S.orbit) {
      const tx = S.orbit.target.x, ty = -S.orbit.target.z;
      if (inside(tx, ty, H.lot)) {
        const p = S.player, feet = standAt(tx, ty, 0), spot = freeSpot(tx, ty, feet, null);
        p.x = spot[0]; p.y = spot[1]; p.feet = standAt(p.x, p.y, 0); p.vx = p.vy = p.vz = 0; p.eye = undefined;
      }
    }
    S.flown = false;
    step(0);
  }
  setToggle("toggle-roofs", S.roofs.visible);
  hud();
}

function bindControls() {
  const canvas = S.canvas, keys = S.keys;
  const map = { KeyW: "forward", ArrowUp: "forward", KeyS: "back", ArrowDown: "back",
                KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
                ShiftLeft: "run", ShiftRight: "run" };
  const live = () => S.running && S.mode === "walk" && (S.active || document.pointerLockElement === canvas);
  // 1, 2 and 3 switch the view from anywhere, the mouse captured or not
  const VIEW_KEYS = { Digit1: "walk", Numpad1: "walk", Digit2: "orbit", Numpad2: "orbit", Digit3: "aerial", Numpad3: "aerial" };
  document.addEventListener("keydown", (e) => {
    if (!S.running || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (VIEW_KEYS[e.code] && canvas.offsetParent !== null) { setMode(VIEW_KEYS[e.code]); return; }
    // the overview and the aerial view fly like a ghost: WASD or arrows
    // across, E up, Q down, through walls
    if (S.mode === "orbit" && ghostKeysLive()) {
      const fly = Object.assign({ KeyE: "up", KeyQ: "down" }, map);
      if (!fly[e.code]) return;
      keys[fly[e.code]] = true;
      e.preventDefault();
      return;
    }
    if (!live()) return;
    if (e.code === "KeyE" && S.hover) { toggleDoor(S.hover); return; }
    if (e.code === "Space") { e.preventDefault(); jump(); return; }
    if (!map[e.code]) return;
    keys[map[e.code]] = true;
    if (e.code.indexOf("Arrow") === 0) e.preventDefault();
  });
  document.addEventListener("keyup", (e) => {
    if (map[e.code]) keys[map[e.code]] = false;
    if (e.code === "KeyE") keys.up = false;
    if (e.code === "KeyQ") keys.down = false;
  });
  // the ghost keys work whenever the 3D view is on screen
  const ghostKeysLive = () => {
    if (document.fullscreenElement) return true;
    if (canvas.offsetParent === null) return false;
    const r = canvas.getBoundingClientRect();
    return r.bottom > 80 && r.top < window.innerHeight - 80;
  };
  canvas.addEventListener("pointerenter", () => { S.overStage = true; });
  canvas.addEventListener("pointerleave", () => { S.overStage = false; Object.keys(keys).forEach((k) => { keys[k] = false; }); });
  // keep the buttons in sight when the page's sticky header covers the top
  // of the 3D view
  const bar = document.querySelector(".hud-bar"), lvl = $("level"), top = document.querySelector(".top");
  const clearHeader = () => {
    if (!bar || !top) return;
    const r = $("stage").getBoundingClientRect();
    const off = document.fullscreenElement ? 0 : Math.max(0, Math.min(top.getBoundingClientRect().bottom - r.top, r.height - 160));
    bar.style.top = (10 + off) + "px";
    if (lvl) lvl.style.top = (62 + off) + "px";
  };
  window.addEventListener("scroll", clearHeader, { passive: true });
  window.addEventListener("resize", clearHeader);
  document.addEventListener("fullscreenchange", clearHeader);
  clearHeader();
  window.addEventListener("blur", () => { Object.keys(keys).forEach((k) => { keys[k] = false; }); });

  // Desktop: click to capture the mouse; if the browser refuses, drag to look.
  $("start-btn").addEventListener("click", () => {
    if (touch) { S.active = true; hud(); return; }
    if (canvas.requestPointerLock) canvas.requestPointerLock(); else { S.active = true; S.dragLook = true; hud(); }
  });
  document.addEventListener("pointerlockchange", () => {
    S.active = document.pointerLockElement === canvas;
    if (!S.active) Object.keys(keys).forEach((k) => { keys[k] = false; });
    hud();
  });
  document.addEventListener("pointerlockerror", () => { S.active = true; S.dragLook = true; hud(); });
  document.addEventListener("mousemove", (e) => {
    if (S.mode !== "walk" || document.pointerLockElement !== canvas) return;
    look(e.movementX, e.movementY, 0.0022);
  });
  // With the mouse captured, a click opens the door in the crosshair.
  document.addEventListener("mousedown", (e) => {
    if (e.button === 0 && document.pointerLockElement === canvas && S.hover) toggleDoor(S.hover);
  });
  let drag = null, down = null;
  canvas.addEventListener("pointerdown", (e) => {
    down = [e.clientX, e.clientY];
    if (e.pointerType === "mouse" && S.mode === "walk" && S.dragLook) drag = [e.clientX, e.clientY];
  });
  window.addEventListener("pointerup", (e) => {
    drag = null;
    if (!down || document.pointerLockElement === canvas) { down = null; return; }
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
    if (moved < 6 && e.target === canvas) tapAt(e.clientX, e.clientY);
    down = null;
  });
  window.addEventListener("mousemove", (e) => {
    if (drag) {
      look(e.clientX - drag[0], e.clientY - drag[1], 0.004);
      drag = [e.clientX, e.clientY];
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (S.mode !== "orbit" || e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect();
    S.pointer = [e.clientX - r.left, e.clientY - r.top];
    setHover(doorAt(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, 400));
    updatePrompt();
  });
  canvas.addEventListener("pointerleave", () => { if (S.mode === "orbit") setHover(null); });

  $("jump").addEventListener("click", (e) => { e.stopPropagation(); jump(); });
  $("jump").addEventListener("touchstart", (e) => { e.preventDefault(); e.stopPropagation(); jump(); }, { passive: false });

  // Touch: the left thumb moves, a drag anywhere else looks around.
  const joy = $("joy"), knob = joy.querySelector(".knob");
  let joyId = null, lookId = null, last = null;
  joy.addEventListener("touchstart", (e) => {
    e.preventDefault();
    joyId = e.changedTouches[0].identifier;
    joyMove(e.changedTouches[0]);
  }, { passive: false });
  function joyMove(tch) {
    const r = joy.getBoundingClientRect(), R = r.width / 2;
    let dx = (tch.clientX - (r.left + R)) / R, dy = (tch.clientY - (r.top + R)) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    S.joy.s = dx; S.joy.f = -dy;
    knob.style.transform = "translate(" + (dx * R * 0.6) + "px," + (dy * R * 0.6) + "px)";
  }
  canvas.addEventListener("touchstart", (e) => {
    if (S.mode !== "walk") return;
    const tch = e.changedTouches[0];
    lookId = tch.identifier; last = [tch.clientX, tch.clientY];
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    Array.prototype.forEach.call(e.changedTouches, (tch) => {
      if (tch.identifier === joyId) joyMove(tch);
      else if (tch.identifier === lookId && last) {
        look(tch.clientX - last[0], tch.clientY - last[1], 0.005);
        last = [tch.clientX, tch.clientY];
      }
    });
    if (joyId !== null || lookId !== null) { if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  const end = (e) => {
    Array.prototype.forEach.call(e.changedTouches, (tch) => {
      if (tch.identifier === joyId) { joyId = null; S.joy.f = 0; S.joy.s = 0; knob.style.transform = ""; }
      if (tch.identifier === lookId) { lookId = null; last = null; }
    });
  };
  window.addEventListener("touchend", end);
  window.addEventListener("touchcancel", end);

  // The little map: a click jumps there.
  S.mini.addEventListener("click", (e) => {
    const r = S.mini.getBoundingClientRect(), fr = mapFrame(r.width, r.height);
    const x = MAP.x0 + (e.clientX - r.left - fr.ox) / fr.k;
    const y = MAP.y0 + (r.height - (e.clientY - r.top) - fr.oy) / fr.k;
    jumpTo(x, y);
  });

  // Buttons.
  $("mode-walk").addEventListener("click", () => setMode("walk"));
  $("mode-orbit").addEventListener("click", () => setMode("orbit"));
  if ($("mode-aerial")) $("mode-aerial").addEventListener("click", () => setMode("aerial"));
  $("toggle-roofs").addEventListener("click", () => { S.roofs.visible = !S.roofs.visible; setToggle("toggle-roofs", S.roofs.visible); });
  $("toggle-labels").addEventListener("click", () => { S.labels.visible = !S.labels.visible; setToggle("toggle-labels", S.labels.visible); });
  $("toggle-full").addEventListener("click", () => {
    const stage = $("stage");
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) stage.requestFullscreen();
  });
  document.addEventListener("fullscreenchange", () => setToggle("toggle-full", !!document.fullscreenElement));
  document.addEventListener("idioma", () => { buildLabels(); hud(); skyLabel(); });
}

function look(dx, dy, k) {
  const p = S.player;
  p.yaw -= dx * k;
  p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - dy * k));
}

function resize() {
  const stage = $("stage");
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  S.renderer.setSize(w, h, false);
  S.camera.aspect = w / h;
  S.camera.updateProjectionMatrix();
}

function loop(now) {
  if (!S.running) return;
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - (S.last || now)) / 1000);
  S.last = now;
  S.doors.forEach((d) => {
    if (d.t === d.target) return;
    d.t = d.target > d.t ? Math.min(d.target, d.t + dt / 0.45) : Math.max(d.target, d.t - dt / 0.45);
    setDoorPose(d);
  });
  if (S.mode === "walk") {
    step(dt);
    // the door in the middle of the screen, within reach, is the one a click
    // (or E) opens
    if (S.active && S.frame % 4 === 0) setHover(doorAt(0, 0, REACH));
  } else if (S.orbit) { fly(dt); S.orbit.update(); }
  if (S.mode === "walk" && levelOf(S.player) !== S.lastLevel) hud();
  S.sky.update(now);
  S.renderer.render(S.scene, S.camera);
  S.frame = (S.frame || 0) + 1;
  if (S.frame % 3 === 0) drawMinimap();
}

/* Ghost flight for the overview and the aerial view: the camera and the
   point it turns around move together, with no walls in the way. */
function fly(dt) {
  const k = S.keys;
  const f = (k.forward ? 1 : 0) - (k.back ? 1 : 0), s = (k.right ? 1 : 0) - (k.left ? 1 : 0), u = (k.up ? 1 : 0) - (k.down ? 1 : 0);
  if (!f && !s && !u) return;
  const az = S.orbit.getAzimuthalAngle();
  const dist = S.camera.position.distanceTo(S.orbit.target);
  const v = Math.max(3, dist * 0.35) * (k.run ? 2.5 : 1) * dt;
  const dx = (-Math.sin(az) * f + Math.cos(az) * s) * v, dz = (-Math.cos(az) * f - Math.sin(az) * s) * v;
  S.camera.position.x += dx; S.camera.position.z += dz;
  S.orbit.target.x += dx; S.orbit.target.z += dz;
  S.camera.position.y = Math.max(1.5, S.camera.position.y + u * v);
  S.flown = true;
}

/* ---------- public ---------- */

function skyName(m) {
  return m === 1 ? t("walk.sky.dawn") : m === 2 ? t("walk.sky.day") : m === 3 ? t("walk.sky.dusk") : m === 4 ? t("walk.sky.night") : t("walk.sky.now");
}
function skyLabel() {
  const b = $("sky-btn");
  if (!b || !S) return;
  b.textContent = t("walk.sky") + ": " + skyName(S.skyMode);
  b.classList.toggle("on", S.skyMode !== 0);
  b.setAttribute("aria-pressed", S.skyMode !== 0 ? "true" : "false");
}
/* The sky's hour: 0 follows the clock; the others try dawn, midday, dusk
   and night without waiting for them. */
function setSky(m) {
  S.skyMode = m;
  const k = S.sky;
  k.setHour(m === 1 ? k.hourAt(-1.5, true) : m === 2 ? 13 : m === 3 ? k.hourAt(-1.5, false) : m === 4 ? 23.5 : null);
  skyLabel();
}

export function start() {
  if (S) { resume(); return; }
  const canvas = $("walk-canvas");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    const m = $("walk-msg");
    m.hidden = false;
    m.textContent = t("walk.nowebgl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdcebf5);
  scene.fog = new THREE.Fog(0xdde9f1, 90, 330);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 900);

  S = {
    canvas, renderer, scene, camera,
    static: new THREE.Group(), roofs: null, labels: new THREE.Group(),
    colliders: [], surfaces: [], blocks: [], doors: [], clickable: [], hover: null, pointer: null,
    player: { x: H.start.x, y: H.start.y, feet: 0, vz: 0, yaw: H.start.yaw, pitch: -0.02 },
    keys: {}, joy: { f: 0, s: 0 }, frame: 0, lamps: [], sky: null, skyMode: 0,
    mode: "walk", active: false, running: true, mini: $("minimap")
  };
  palette();
  buildScene();
  // The sun, the moon, the stars and every light, by the clock (js/sky.js).
  S.sky = createSky(scene, { center: CENTER, north: H.NORTH, touch, lamps: S.lamps, glass: M.glass, glow: M.glow,
                             pixelRatio: () => renderer.getPixelRatio() });
  bindControls();
  const sb = $("sky-btn");
  if (sb) sb.addEventListener("click", () => setSky((S.skyMode + 1) % 5));
  setSky(0);
  new ResizeObserver(resize).observe($("stage"));
  resize();
  setMode("walk");
  setToggle("toggle-labels", true);
  requestAnimationFrame(loop);
}

export function goTo(id) {
  if (!S) return;
  const item = byId(id);
  if (!item) return;
  // the middle of the room's outline, not where its label sits
  const poly = H.polyOf(item);
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  jumpTo((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, item.level, poly);
}

export function pause() {
  if (!S) return;
  S.running = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

export function resume() {
  if (!S || S.running) return;
  S.running = true;
  S.last = 0;
  resize();
  hud();
  requestAnimationFrame(loop);
}
