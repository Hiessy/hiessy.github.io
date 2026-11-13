/* Door leaves and how they swing, slide and light up. */
import * as THREE from "three";
import { DEG, DOOR_H, S, t } from "./core.js";
import { M } from "./materials.js";
import { updatePrompt } from "./pointer.js";
import { texFor } from "./textures.js";
import { collider } from "./walls.js";

export const SIDE = { n: [0, 1], s: [0, -1], e: [1, 0], w: [-1, 0] };

export function leafMaterial(kind) {
  if (kind === "red") return new THREE.MeshStandardMaterial({ color: 0x8b3a22, roughness: 0.6 });
  if (kind === "white") return new THREE.MeshStandardMaterial({ color: 0xc3cfd6, roughness: 0.5 });
  return new THREE.MeshStandardMaterial({ color: 0x6e4426, roughness: 0.65 });
}

/* One leaf, hinged at its local origin, running along +x for `w`. */
export function makeLeaf(kind, w, h) {
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
/* fold: a door that opens flat against the wall's face, as the bedrooms'
   louvre doors do in the photos: its hinges sit on the face toward `side`
   (fold.off from the wall's middle) and it turns fold.deg degrees. */
export function addDoor(a, b, base, kind, side, tall, dbl, fold) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const h = tall || DOOR_H;
  const door = { kind, t: 0, target: 0, pivots: [], parts: [], name: kind === "gate" ? "gate" : "door", deg: fold ? fold.deg : 88 };
  const off = fold ? fold.off : 0;
  const hinge = (p, dirx, diry, w) => {
    const pivot = new THREE.Object3D();
    pivot.position.set(p[0] + side[0] * off, base, -(p[1] + side[1] * off));
    const base0 = Math.atan2(diry, dirx);
    const left = -diry * side[0] + dirx * side[1];   // leftNormal · side
    pivot.rotation.y = base0;
    const leaf = makeLeaf(kind, w, h);
    pivot.add(leaf);
    S.world.add(pivot);
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
    S.world.add(pivot);
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

export function setDoorPose(d) {
  const e = d.t * d.t * (3 - 2 * d.t);
  if (d.slide) { d.slide.leaf.position.x = d.slide.x0 - 0.94 * d.slide.len * e; return; }
  d.pivots.forEach((p) => { p.pivot.rotation.y = p.base0 + p.sign * e * (d.deg || 88) * DEG; });
}

export function toggleDoor(d) { d.target = d.target > 0.5 ? 0 : 1; updatePrompt(); }

export function highlight(d, on) {
  if (!d) return;
  d.parts.forEach((p) => p.traverse((o) => {
    if (o.isMesh && o.material !== M.glass && o.material.emissive) {
      o.material.emissive.setHex(on ? 0x8a5a1a : 0x000000);
      o.material.emissiveIntensity = on ? 0.45 : 0;
    }
  }));
}
