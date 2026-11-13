/* Checks for the 3D walk, run in the browser console on the 3D tab (or by
   pasting into the browser pane's JavaScript tool):
     const c = await import("/ranch/tools/walk_checks.js"); await c.run();
   Each check returns the things that fail it; an empty list is a pass.
   - narrowDoors: swing doors under 85 cm in the survey that are not built
     40% wider (only where the wall beside them leaves no room).
   - looseWallPieces: pictures, extinguishers, lamps... not resting on a wall
     face, or standing over a piece of furniture.
   - lights: rooms whose lights don't all go off and on again together.
   - cristo: the Cristo Redentor off its true bearing or hidden from the
     street balcony.
   - neighbours: the houses around missing, or standing on our lot. */
import { H, K, KZ, S } from "../js/walk/core.js";
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

/* The Cristo Redentor stands where it is: 67.1 degrees from true north, seen
   from the house (OpenStreetMap and the cadastre), and nothing hides it
   from the street balcony. */
export async function cristo() {
  const bad = [];
  if (!S.cristo) return ["no Cristo"];
  const THREE = await import("three");
  // the middle of the statue, not its foot on the hill
  const c = new THREE.Box3().setFromObject(S.cristo).getCenter(new THREE.Vector3());
  const from = new THREE.Vector3(-0.6 * K, (H.Z.apt + 1.55 / KZ) * KZ, -18.5 * K);
  const d = c.clone().sub(from);
  // the plan's +y is H.NORTH degrees west of true north (house.js)
  const planAngle = Math.atan2(d.x, -d.z) * 180 / Math.PI;             // clockwise from +y
  const bearing = (planAngle - H.NORTH + 360) % 360;
  if (Math.abs(bearing - 67.1) > 1.5) bad.push("bearing " + bearing.toFixed(1));
  const elev = Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI;
  if (elev < 3.5 || elev > 6.5) bad.push("elevation " + elev.toFixed(1));
  const ray = new THREE.Raycaster(from, d.clone().normalize());
  ray.camera = S.camera;
  const hit = ray.intersectObjects(S.scene.children, true).filter((h) => h.object.visible && !h.object.isPoints && !h.object.isSprite && h.object.material && !h.object.material.transparent)[0];
  let o = hit && hit.object, own = false;
  while (o) { if (o === S.cristo) own = true; o = o.parent; }
  if (!own) bad.push("hidden from the balcony by " + (hit ? (hit.object.name || hit.object.type) + " at " + hit.distance.toFixed(0) + " m" : "nothing hit"));
  return bad;
}

/* The houses around are the traced ones (aerial and Street View), and none
   stands on our lot. */
export function neighbours() {
  const traced = (H.neighbours || []).filter((n) => n.rect);
  const bad = [];
  if (traced.length < 15) bad.push("only " + traced.length + " traced buildings");
  traced.forEach((n) => {
    const r = n.rect, pts = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]], [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2]];
    if (pts.some((q) => inside(q[0], q[1], H.lot))) bad.push(n.id + " is on our lot");
  });
  if (!S.town || !S.town.length) bad.push("no neighbours built");
  return bad;
}

/* The compass and location overlay: it turns on and off with its button and
   the C key, its coordinates agree with the cadastre, its heading with the
   Cristo's bearing, and it keeps out of the middle of the picture. */
export async function geo() {
  const bad = [];
  if (!S.geo) return ["no overlay"];
  const box = document.getElementById("geo"), strip = document.getElementById("compass"), btn = document.getElementById("toggle-geo");
  if (!box || !strip || !btn) return ["overlay or its button missing"];
  const was = S.geo.on;
  document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyC", key: "c", bubbles: true }));
  if (S.geo.on === was || box.hidden !== was) bad.push("the C key doesn't switch it");
  btn.click();
  if (S.geo.on !== was) bad.push("the button doesn't switch it back");
  if (!S.geo.on) S.geo.toggle(true);
  // the lot's south corner, as the cadastre gives it
  const ll = S.geo.latLon(0, 0), dN = (ll[0] + 30.98084661) * 110574, dE = (ll[1] + 64.49239071) * 95420;
  if (Math.hypot(dN, dE) > 1) bad.push("lot corner " + Math.hypot(dN, dE).toFixed(1) + " m off");
  // facing the Cristo from the balcony reads its bearing
  const p = S.player, c = H.landmarks.cristo.at;
  Object.assign(p, { x: -0.6, y: 18.4, feet: H.Z.apt, vz: 0, eye: undefined });
  p.yaw = Math.atan2(-(c[0] + 0.6), c[1] - 18.4);
  const { step } = await import("../js/walk/physics.js");
  step(0);
  S.geo.update();
  if (Math.abs(S.geo.heading() - 67.1) > 1.5) bad.push("heading " + S.geo.heading().toFixed(1) + " facing the Cristo");
  // nothing of it in the middle half of the picture
  const st = document.getElementById("stage").getBoundingClientRect();
  const mid = { l: st.left + st.width / 4, r: st.right - st.width / 4, t: st.top + st.height / 4, b: st.bottom - st.height / 4 };
  [box, strip].forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width && r.left < mid.r && r.right > mid.l && r.top < mid.b && r.bottom > mid.t) bad.push(el.id + " covers the middle of the picture");
  });
  return bad;
}

export async function run() {
  return { narrowDoors: narrowDoors(), looseWallPieces: looseWallPieces(), lights: lights(), cristo: await cristo(), neighbours: neighbours(), geo: await geo() };
}

