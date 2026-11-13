/* Lights you can switch. Every lamp of a room (chandeliers, pendants, wall
   lamps, table and bedside lamps) is wired to the others in that room:
   click any of them, or press E looking at one, and the room's lamps and
   the light they cast go off or on together. Outdoors, the lamps of the
   garden are one circuit.

   A room's lamps are built into their own group (lampGroup), given their
   own copies of the glowing materials, and merged once all are placed
   (finishLights). updateLights() keeps their glow in step with the night. */
import * as THREE from "three";
import { H, S } from "./core.js";
import { merge } from "./geometry.js";
import { M } from "./materials.js";

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

/* The group a lamp is built into, or undefined for any other piece. */
export function lampGroup(p, at) {
  if (!isLamp(p)) return undefined;
  const id = circuitAt(at[0], at[1], p.level);
  if (!circuits.has(id)) circuits.set(id, { room: id, group: new THREE.Group(), glows: [], points: [], on: true });
  return circuits.get(id).group;
}

/* Merges each room's lamps, with materials of their own, and makes them
   clickable. The point lights the sky made for the lamps are matched to
   their rooms by S.lampRooms. */
export function finishLights() {
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
      isLight: true, room: c.room, glows: c.glows, points: c.points, parts: merged.children,
      get on() { return c.on; },
      set(on) {
        c.on = on;
        updateLights(S.sky ? S.sky.state().night : 0);
        c.points.forEach((l) => { l.off = !on; if (!on) l.light.intensity = 0; });
        if (S.sky && S.sky.relight) S.sky.relight();
      }
    };
    merged.children.forEach((m) => { m.userData.light = light; });
    S.clickable.push(...merged.children);
    S.lights.push(light);
  });
  circuits.clear();
}

/* Once the sky has made its point lights, each joins its room's circuit. */
export function wireLamps(lamps) {
  (S.lights || []).forEach((l) => { l.points.length = 0; });
  lamps.forEach((l) => {
    const light = (S.lights || []).filter((x) => x.room === l.room)[0];
    if (light) light.points.push(l);
  });
}

/* A lamp that is on glows more as the night comes; one that is off is dark. */
export function updateLights(night) {
  (S.lights || []).forEach((l) => {
    l.glows.forEach((m) => {
      const on = l.on;
      m.emissiveIntensity = on ? (m.userData.glow ? 1.2 + 2.2 * night : m.userData.base) : 0;
      m.color.copy(m.userData.color).multiplyScalar(on ? 1 : 0.55);
    });
  });
}
