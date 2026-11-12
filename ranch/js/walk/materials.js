/* Shared materials and the palette the pieces are made from. */
import * as THREE from "three";
import { TEX, tex, texFor } from "./textures.js";

export const mats = new Map();

export function mat(color, opts) {
  const key = color + "|" + JSON.stringify(opts || {});
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9, metalness: 0 }, opts || {})));
  }
  return mats.get(key);
}

export function texMat(name, opts) {
  const key = "tex:" + name + "|" + JSON.stringify(opts || {});
  if (!mats.has(key)) {
    const o = Object.assign({ map: tex(name), color: 0xffffff, roughness: 0.85 }, opts || {});
    if (TEX[name].alpha) Object.assign(o, { alphaTest: 0.5, side: THREE.DoubleSide });
    mats.set(key, new THREE.MeshStandardMaterial(o));
  }
  return mats.get(key);
}

/* A textured material for one face of w by h meters: a bedspread, a cushion,
   a shower curtain. A picture ("art-...") fills its frame once. */
export function texBox(name, w, h, opts) {
  const key = "box:" + name + "|" + w.toFixed(2) + "x" + h.toFixed(2) + "|" + JSON.stringify(opts || {});
  if (!mats.has(key)) {
    const map = TEX[name].art ? tex(name) : texFor(name, w, h);
    mats.set(key, new THREE.MeshStandardMaterial(Object.assign({ map, color: 0xffffff, roughness: 0.85 }, opts || {})));
  }
  return mats.get(key);
}

export const GLASS = { transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.1, depthWrite: false };

/* Slabs that are a room's ceiling cast their shadow from their top face.
   From the default (the face away from the sun) the sun leaked in a bright
   line where the walls meet them. */
export const TOP_SHADOW = { shadowSide: THREE.FrontSide };

export const M = {};

export function palette() {
  Object.assign(M, {
    wall: mat(0xf3f0e9), trim: mat(0xfafaf7), casing: mat(0x5a3a22, { roughness: 0.6 }), glass: mat(0xbcd6ea, GLASS), wood: mat(0x6b4423, { roughness: 0.75 }),
    dark: mat(0x3f2716, { roughness: 0.7 }), light: mat(0xa77b4f, { roughness: 0.75 }), white: mat(0xf4f3ef, { roughness: 0.4 }),
    steel: mat(0xb8bcbf, { roughness: 0.35, metalness: 0.6 }), black: mat(0x1d1d1d, { roughness: 0.5 }),
    chrome: mat(0xc4c7ca, { roughness: 0.25, metalness: 0.8 }), granite: mat(0x6f6a64, { roughness: 0.4 }),
    mirror: mat(0xdbe6ec, { roughness: 0.12, metalness: 0.15 }), linen: mat(0xf6f3ec), brick: mat(0xa0583a),
    leaf: mat(0x4f7a3a, { flatShading: true }), leaf2: mat(0x5f8a45, { flatShading: true }), bark: mat(0x6b4f36),
    pot: mat(0xb5653e), green: mat(0x2f5d3a, { roughness: 0.6, metalness: 0.3 }), glow: mat(0xfff1c8, { emissive: 0xffd88a, emissiveIntensity: 1.2 }),
    fence: mat(0xd6cfc1), sill: mat(0xb9b2a5, { roughness: 0.7 })
  });
}
