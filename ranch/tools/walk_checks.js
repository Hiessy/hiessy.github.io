/* Checks for the 3D walk, run in the browser console on the 3D tab (or by
   pasting into the browser pane's JavaScript tool):
     const c = await import("/ranch/tools/walk_checks.js"); await c.run();
   Each check returns the things that fail it; an empty list is a pass.
   - narrowDoors: swing doors under 85 cm in the survey that are not built
     40% wider (only where the wall beside them leaves no room).
   - looseWallPieces: pictures, extinguishers, lamps... not resting on a wall
     face, or standing over a piece of furniture.
   - lights: rooms whose lights don't all go off and on again together. */
import { S, H } from "../js/walk/core.js";
import { inWall, spanOf } from "../js/walk/walls.js";
import { inside } from "../js/walk/geometry.js";

export function narrowDoors() {
  // every swing door the survey draws under 85 cm, on a wall along the axes,
  // must be built (about) 40% wider, unless the wall beside it leaves no room
  return H.openings.filter((o) => o.kind === "door").map((o) => {
    const len = Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]), sp = spanOf(o);
    const axis = Math.abs(o.b[0] - o.a[0]) < 0.02 || Math.abs(o.b[1] - o.a[1]) < 0.02;
    return { id: o.id, at: [+o.a[0].toFixed(2), +o.a[1].toFixed(2)], survey: +len.toFixed(2), built: +Math.hypot(sp[1][0] - sp[0][0], sp[1][1] - sp[0][1]).toFixed(2), axis };
  }).filter((d) => d.axis && d.survey < 0.849 && d.built < d.survey * 1.36);
}

export function looseWallPieces() {
  const bad = [];
  (S.wallPieces || []).forEach((w) => {
    const a = (w.rot || 0) * Math.PI / 180, fx = -Math.sin(a), fy = Math.cos(a);
    const behind = inWall(w.x - fx * 0.03, w.y - fy * 0.03, w.level), front = inWall(w.x + fx * 0.02, w.y + fy * 0.02, w.level);
    const onFurniture = w.low && S.blocks.some((b) => inside(w.x + fx * 0.12, w.y + fy * 0.12, b.poly));
    if (!behind || front || onFurniture) bad.push({ type: w.type, at: [+w.x.toFixed(2), +w.y.toFixed(2)], behind, front, onFurniture });
  });
  if (!S.wallPieces) bad.push("no record of wall pieces");
  return bad;
}

export function lights() {
  if (!S.lights || !S.lights.length) return ["no switchable lights"];
  const bad = [];
  S.lights.forEach((l) => {
    const was = l.on;
    l.set(false);
    if (l.glows.some((m) => m.emissiveIntensity > 0.001) || l.points.some((p) => p.intensity > 0.001)) bad.push(l.room + " stays lit when off");
    l.set(true);
    if (!l.glows.length) bad.push(l.room + " has no lamp to light");
    l.set(was);
  });
  return bad;
}

export async function run() {
  return { narrowDoors: narrowDoors(), looseWallPieces: looseWallPieces(), lights: lights() };
}

export { H };
