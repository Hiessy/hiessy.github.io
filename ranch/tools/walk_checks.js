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
   - neighbours: the houses around missing, or standing on our lot.
   - geo: the compass overlay not switching, off the cadastre, or in the way.
   - stairs: a wall rising through a flight's treads or headroom.
   - reach: a room or space that can't be walked to from the street. */
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
  // its foot stands at its true height above the horizon, however large it is drawn
  const foot = new THREE.Box3().setFromObject(S.cristo).min.y - from.y;
  const elev = Math.atan2(foot, Math.hypot(d.x, d.z)) * 180 / Math.PI;
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

/* Nothing of the house stands in a stair's way: along each flight, no wall
   rises through the treads into the 1.9 m above them. */
export function stairs() {
  const bad = [];
  H.ramps.forEach((r) => {
    for (let s = 0; s <= r.len + 1e-6; s += 0.05) {
      const g = r.segs.filter((q) => s <= q.s0 + q.len + 1e-6)[0] || r.segs[r.segs.length - 1], u = (s - g.s0) / g.len;
      const cx = g.a[0] + (g.b[0] - g.a[0]) * u, cy = g.a[1] + (g.b[1] - g.a[1]) * u, h = r.h1 + (r.h2 - r.h1) * s / r.len;
      const nx = -(g.b[1] - g.a[1]) / g.len, ny = (g.b[0] - g.a[0]) / g.len;
      [-0.3, 0, 0.3].forEach((o) => {
        const x = cx + nx * o, y = cy + ny * o;
        [0, 1, 2].forEach((lv) => {
          if (!inWall(x, y, lv)) return;
          // a wall spans from its level's base (the ground, or just under the
          // upper floor) to its top; it must keep out of the tread's headroom
          const top = H.topAt(x, y, lv), bottom = lv === 0 ? 0 : H.FLOOR[lv] - 0.2;
          if (top > h + 0.02 && bottom < h + 1.9) bad.push(r.id + " at " + x.toFixed(2) + "," + y.toFixed(2) + ": a wall up to " + top.toFixed(2) + " over a tread at " + h.toFixed(2));
        });
      });
    }
  });
  return [...new Set(bad)].slice(0, 8);
}

/* Every room and space can be walked to from the street, doors open: a
   flood fill over the real floors and colliders (a few seconds). */
export async function reach() {
  const ph = await import("../js/walk/physics.js");
  const shut = S.doors.map((d) => [d.t, d.target]);
  S.doors.forEach((d) => { d.t = 1; d.target = 1; });
  const seen = new Set(), q = [[H.start.x, H.start.y, 0]], rooms = {}, key = (x, y, f) => Math.round(x * 5) + "," + Math.round(y * 5) + "," + Math.round(f * 4);
  let n = 0;
  while (q.length && n < 400000) {
    const [x, y, f] = q.pop(); n++;
    const lv = f < 1.4 ? 0 : S.surfaces.some((s) => s.level === 2 && !s.roof && inside(x, y, s.poly)) ? 2 : 1, r = H.at(x, y, lv);
    if (r && Math.abs(r.z - f) < 0.3) rooms[H.idOf(r)] = 1;
    [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]].forEach((d) => {
      const nx = x + d[0], ny = y + d[1];
      if (nx < -45 || nx > 15 || ny < -8 || ny > 30) return;
      const g = ph.floorAt(nx, ny, f);
      if (f - g > 3.5 || ph.blocked(nx, ny, g)) return;
      const k = key(nx, ny, g);
      if (!seen.has(k)) { seen.add(k); q.push([nx, ny, g]); }
    });
  }
  S.doors.forEach((d, i) => { d.t = shut[i][0]; d.target = shut[i][1]; });
  return H.rooms.concat(H.spaces).map(H.idOf).filter((id) => !rooms[id]).map((id) => id + " can't be reached");
}

/* The Cristo can be made out from the street balcony: it looks at least
   1.5 degrees tall. */
export async function cristoSize() {
  if (!S.cristo) return ["no Cristo"];
  const THREE = await import("three");
  const b = new THREE.Box3().setFromObject(S.cristo), from = new THREE.Vector3(-0.6 * K, (H.Z.apt + 1.55 / KZ) * KZ, -18.5 * K);
  const top = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2), foot = top.clone().setY(b.min.y);
  const deg = top.sub(from).angleTo(foot.sub(from)) * 180 / Math.PI;
  return deg < 1.5 ? ["looks " + deg.toFixed(2) + " degrees tall"] : [];
}

/* The footprint of a placed group on the plan: its box's four corners. */
async function footprint(o) {
  const THREE = await import("three");
  const box = new THREE.Box3();
  o.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(o.matrixWorld).invert();
  o.traverse((m) => {
    if (!m.isMesh) return;
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)));
  });
  const c = [[box.min.x, box.min.z], [box.max.x, box.min.z], [box.max.x, box.max.z], [box.min.x, box.max.z]].map((q) => {
    const v = new THREE.Vector3(q[0], 0, q[1]).applyMatrix4(o.matrixWorld);
    return [v.x, -v.z];
  });
  return { poly: c, y0: new THREE.Vector3(0, box.min.y, 0).applyMatrix4(o.matrixWorld).y };
}
function overlap(a, b) {
  const axes = (p) => p.map((q, i) => { const r = p[(i + 1) % p.length]; return [-(r[1] - q[1]), r[0] - q[0]]; });
  let depth = 1e9;
  for (const ax of axes(a).concat(axes(b))) {
    const l = Math.hypot(ax[0], ax[1]) || 1, n = [ax[0] / l, ax[1] / l];
    const pr = (p) => p.reduce((m, q) => { const v = q[0] * n[0] + q[1] * n[1]; return [Math.min(m[0], v), Math.max(m[1], v)]; }, [1e9, -1e9]);
    const pa = pr(a), pb = pr(b), o = Math.min(pa[1], pb[1]) - Math.max(pa[0], pb[0]);
    if (o <= 0) return 0;
    depth = Math.min(depth, o);
  }
  return depth;
}

/* No chair runs into another chair, a piece of furniture or a wall. */
export async function chairs() {
  const bad = [], seats = [], others = [];
  for (const { p, piece } of S.pieces || []) {
    const mine = [];
    piece.traverse((o) => { if (o.name === "chair") mine.push(o); });
    for (const c of mine) seats.push({ owner: piece, fp: await footprint(c), at: p.at, type: p.type, level: p.level });
    if (!mine.length || piece.name !== "chair") {
      // the piece without its chairs
      const body = piece.clone(false);
      piece.children.forEach((ch) => { if (ch.name !== "chair") body.add(ch.clone()); });
      body.matrixWorld.copy(piece.matrixWorld);
      body.matrixAutoUpdate = false;
      if (body.children.length) others.push({ owner: piece, fp: await footprint(body), at: p.at, type: p.type, level: p.level });
    }
  }
  const shrink = (poly, k) => { const cx = poly.reduce((s, q) => s + q[0], 0) / 4, cy = poly.reduce((s, q) => s + q[1], 0) / 4; return poly.map((q) => [cx + (q[0] - cx) * k, cy + (q[1] - cy) * k]); };
  seats.forEach((a, i) => {
    seats.slice(i + 1).forEach((b) => {
      if (a.level === b.level && overlap(shrink(a.fp.poly, 0.92), shrink(b.fp.poly, 0.92)) > 0.005) bad.push("chairs of " + a.type + " at " + a.at + " and " + b.type + " at " + b.at + " overlap");
    });
    others.forEach((b) => {
      if (b.owner === a.owner || a.level !== b.level || /^(curtain|picture|mirror|sconce|pendant|chandelier|aircon)$/.test(b.type)) return;
      if (overlap(shrink(a.fp.poly, 0.9), shrink(b.fp.poly, 0.95)) > 0.005) bad.push("a chair of " + a.type + " at " + a.at + " runs into the " + b.type + " at " + b.at);
    });
    const inner = shrink(a.fp.poly, 0.8);
    if (inner.some((q) => inWall(q[0], q[1], a.level))) bad.push("a chair of " + a.type + " at " + a.at + " is in a wall");
  });
  return [...new Set(bad)];
}

/* No roof runs into another, and no wall pokes up through one. */
export function roofs() {
  const bad = [], tops = S.surfaces.filter((s) => s.roof);
  const hAt = (s, x, y) => (s.hf ? s.hf(x, y) : s.h);
  for (let x = -38; x <= 1; x += 0.25) {
    for (let y = -0.5; y <= 23; y += 0.25) {
      const here = tops.filter((s) => inside(x, y, s.poly));
      for (let i = 0; i < here.length; i++) for (let j = i + 1; j < here.length; j++) {
        const d = Math.abs(hAt(here[i], x, y) - hAt(here[j], x, y));
        if (d < 0.25) bad.push("two roofs meet within " + d.toFixed(2) + " m near " + x.toFixed(1) + "," + y.toFixed(1));
      }
      here.forEach((s) => {
        const h = hAt(s, x, y);
        [0, 1, 2].forEach((lv) => {
          if (inWall(x, y, lv) && H.topAt(x, y, lv) > h + 0.03 && (lv === 0 || H.FLOOR[lv] - 0.2 < h)) bad.push("a wall up to " + H.topAt(x, y, lv).toFixed(2) + " pokes through a roof at " + h.toFixed(2) + " near " + x.toFixed(1) + "," + y.toFixed(1));
        });
      });
    }
  }
  // one line per place, roughly
  const seen = new Set();
  return bad.filter((b) => { const k = b.replace(/(-?\d+\.\d)\d*,(-?\d+\.\d)\d*$/, (m, a, c) => Math.round(+a) + "," + Math.round(+c)); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
}

export async function run() {
  return { narrowDoors: narrowDoors(), looseWallPieces: looseWallPieces(), lights: lights(), cristo: await cristo(), neighbours: neighbours(), geo: await geo(), stairs: stairs(), reach: await reach(), cristoSize: await cristoSize(), chairs: await chairs(), roofs: roofs() };
}

