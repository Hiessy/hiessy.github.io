/* Lights you can switch, in every room.

   Each room is one circuit: its lamps from the photos (chandeliers,
   pendants, wall, table and bedside lamps), a ceiling light where the
   photos show none, and a switch plate on the wall beside its door. Click
   any lamp or the switch (or press E looking at it), or press L for the
   room you stand in; the Lights button in the bar turns the whole house on
   or off. Outdoors, the garden's lamps are one circuit.

   Light itself comes from a few point lights (POOL) that go to the lit
   rooms nearest you, so every room can glow without the cost of a light
   each. updateLights() keeps glows and lights in step with the night. */
import * as THREE from "three";
import { H, K, KZ, S, touch } from "./core.js";
import { bx, cy, merge, place, zAt } from "./geometry.js";
import { M, mat } from "./materials.js";
import { spanOf } from "./walls.js";

const POOL = touch ? 4 : 8;

/* Which pieces are lamps. */
export function isLamp(p) {
  if (p.type === "chandelier" || p.type === "pendant" || p.type === "sconce" || p.type === "lamp" || p.type === "lantern" || p.type === "ivypost") return true;
  if (p.type === "side") return !!p.lamp;
  if (p.type === "nightstand") return p.lamp !== false;
  return false;
}

/* The circuit a point belongs to: its room or space, or the garden. */
export function circuitAt(x, y, level) {
  const r = H.at(x, y, level);
  return r ? H.idOf(r) : "garden";
}

const circuits = new Map();
function circuit(id) {
  if (!circuits.has(id)) circuits.set(id, { room: id, group: new THREE.Group(), glows: [], points: [], on: true, sw: false });
  return circuits.get(id);
}

/* The group a lamp is built into, or undefined for any other piece. */
export function lampGroup(p, at) {
  if (!isLamp(p)) return undefined;
  return circuit(circuitAt(at[0], at[1], p.level)).group;
}

/* A flush ceiling light: a white disc that glows. */
function ceilingLight(drop) {
  const g = new THREE.Group();
  cy(g, 0.2, 0.2, 0.03, 0, drop - 0.015, 0, M.white, 20);
  cy(g, 0.17, 0.14, 0.06, 0, drop - 0.055, 0, M.glow, 20);
  return g;
}

/* A switch plate, its toggle up. */
function switchPlate() {
  const g = new THREE.Group();
  bx(g, 0.08, 0.12, 0.012, 0, 0, -0.006, mat(0xf4f2ec, { roughness: 0.4 }));
  bx(g, 0.025, 0.04, 0.016, 0, 0.005, -0.018, mat(0xe2ded4, { roughness: 0.4 }));
  return g;
}

/* A point inside a room, near its middle. */
function middleOf(poly) {
  const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
  const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  if (H.inside(c[0], c[1], poly)) return c;
  let best = null, bd = 1e9;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.2) for (let y = Math.min(...ys); y <= Math.max(...ys); y += 0.2) {
    if (!H.inside(x, y, poly)) continue;
    const d = Math.hypot(x - c[0], y - c[1]);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best || c;
}

/* Every room gets a ceiling light if it has no lamp, a switch beside a door,
   and the place its light shines from. */
function wireRooms() {
  H.rooms.forEach((r) => {
    const id = H.idOf(r), c = circuit(id), poly = H.polyOf(r), m = middleOf(poly);
    const floor = zAt(m[0], m[1], r.level), ceil = H.topAt(m[0], m[1], r.level);
    c.pos = [m[0], floor + Math.max(1.8, (ceil - floor) * 0.8), m[1]];
    // how far its light reaches: just past the room's walls (these lights cast
    // no shadows, so a longer reach would light the rooms beside it)
    const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
    c.reach = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 0.6;
    c.level = r.level;
    if (!c.group.children.length) place(ceilingLight((ceil - floor) * KZ), m[0], m[1], r.level, 0, c.group);
    // the switch: on the wall beside the jamb of a door into the room, on the room's side
    const door = H.openings.filter((o) => o.level === r.level && /door|double|open|glass|slide/.test(o.kind)).map((o) => {
      const sp = spanOf(o), dx = sp[1][0] - sp[0][0], dy = sp[1][1] - sp[0][1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      const mid = [(sp[0][0] + sp[1][0]) / 2, (sp[0][1] + sp[1][1]) / 2], off = o.t / 2 + 0.2;
      const s = circuitAt(mid[0] + nx * off, mid[1] + ny * off, o.level) === id ? 1 : circuitAt(mid[0] - nx * off, mid[1] - ny * off, o.level) === id ? -1 : 0;
      return s ? { o, sp, ux: dx / len, uy: dy / len, nx: nx * s, ny: ny * s } : null;
    }).filter(Boolean)[0];
    if (!door) return;
    const j = door.sp[0], k = door.o.t / 2 + 0.006;
    const at = [j[0] - door.ux * 0.18 + door.nx * k, j[1] - door.uy * 0.18 + door.ny * k];
    const plate = switchPlate();
    plate.position.y = 1.15;                // 1.15 m above the floor, true size
    const holder = new THREE.Group();
    holder.add(plate);
    place(holder, at[0], at[1], r.level, Math.atan2(door.nx, -door.ny) * 180 / Math.PI + 180, c.group);
    c.sw = true;
  });
}

/* Merges each circuit's lamps, with materials of their own, and makes them
   clickable. */
export function finishLights() {
  wireRooms();
  S.lights = [];
  circuits.forEach((c) => {
    const own = new Map();
    c.group.traverse((o) => {
      if (!o.isMesh || !o.material.emissive) return;
      const m = o.material;
      if (!own.has(m)) {
        const copy = m.clone();
        copy.userData.glow = m === M.glow;
        copy.userData.base = m.emissiveIntensity;
        copy.userData.color = m.color.clone();
        own.set(m, copy);
        if (m === M.glow || m.emissiveIntensity > 0) c.glows.push(copy);
      }
      o.material = own.get(m);
    });
    const merged = merge(c.group);
    S.world.add(merged);
    const light = {
      isLight: true, room: c.room, glows: c.glows, points: c.points, parts: merged.children, pos: c.pos, level: c.level, switch: c.sw, reach: c.reach,
      get on() { return c.on; },
      set(on) {
        c.on = on;
        updateLights(S.sky ? S.sky.state().night : 0, true);
        c.points.forEach((l) => { l.off = !on; if (!on) l.light.intensity = 0; });
        if (S.sky && S.sky.relight) S.sky.relight();
      }
    };
    merged.children.forEach((m) => { m.userData.light = light; });
    S.clickable.push(...merged.children);
    S.lights.push(light);
  });
  circuits.clear();
  // the pool of lights that go to the lit rooms nearest you
  S.lightPool = [];
  for (let i = 0; i < POOL; i++) {
    const l = new THREE.PointLight(0xffd9a8, 0, 6 * K, 2);
    S.scene.add(l);
    S.lightPool.push(l);
  }
}

/* The outdoor lamps' lights the sky made join the garden's circuit. */
export function wireLamps(lamps) {
  (S.lights || []).forEach((l) => { l.points.length = 0; });
  lamps.forEach((l) => {
    const light = (S.lights || []).filter((x) => x.room === l.room)[0];
    if (light) light.points.push(l);
  });
}

/* All on, or all off if any is on. */
export function switchAll() {
  const on = !(S.lights || []).some((l) => l.on);
  (S.lights || []).forEach((l) => l.set(on));
  return on;
}

/* The lights of the room you stand in. */
export function switchHere(x, y, level) {
  const id = circuitAt(x, y, level), l = (S.lights || []).filter((q) => q.room === id)[0];
  if (l) l.set(!l.on);
  return l;
}

/* A lamp that is on glows more as the night comes; one that is off is dark.
   The pool goes to the nearest rooms that are lit. */
let tick = 0;
export function updateLights(night, now) {
  (S.lights || []).forEach((l) => {
    l.glows.forEach((m) => {
      m.emissiveIntensity = l.on ? (m.userData.glow ? 1.2 + 2.2 * night : m.userData.base) : 0;
      m.color.copy(m.userData.color).multiplyScalar(l.on ? 1 : 0.55);
    });
  });
  if (!S.lightPool || !S.camera) return;
  if (!now && (tick++ % 3)) return;
  const cx = S.camera.position.x / K, cy2 = -S.camera.position.z / K, cz = S.camera.position.y / KZ;
  const lit = (S.lights || []).filter((l) => l.on && l.pos)
    .map((l) => ({ l, d: Math.hypot(l.pos[0] - cx, l.pos[2] - cy2) + Math.abs(l.pos[1] - cz) * 2 }))
    .sort((a, b) => a.d - b.d);
  S.lightPool.forEach((p, i) => {
    const e = lit[i];
    if (!e) { p.intensity = 0; return; }
    p.position.set(e.l.pos[0] * K, e.l.pos[1] * KZ, -e.l.pos[2] * K);
    p.distance = (e.l.reach || 4) * K;
    p.intensity = (6 + 3 * (e.l.reach || 4)) * (0.12 + 0.88 * night);
  });
}
