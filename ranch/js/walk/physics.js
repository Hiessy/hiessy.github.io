/* Walking: stairs and floors under your feet, collisions, jumping, and where you can stand. */
import { BODY, EYE, F, GRAVITY, H, K, KZ, RADIUS, S, STEP } from "./core.js";
import { inside } from "./geometry.js";
import { hud, setMode } from "./hud.js";

/* The heights a stair gives at (x, y): for each run whose width covers the
   point, the height at the nearest point of its path. A winder passes over
   its own way in, so one point can have two. */
export function rampHeights(r, x, y) {
  const out = [];
  r.segs.forEach((g) => {
    const dx = g.b[0] - g.a[0], dy = g.b[1] - g.a[1];
    const u = Math.max(0, Math.min(1, ((x - g.a[0]) * dx + (y - g.a[1]) * dy) / (g.len * g.len)));
    if (Math.hypot(x - (g.a[0] + u * dx), y - (g.a[1] + u * dy)) > r.w / 2 + 0.03) return;
    out.push(r.h1 + ((r.h2 - r.h1) * (g.s0 + u * g.len)) / r.len);
  });
  return out;
}

/* A surface's height at (x, y): floors are flat, some roofs slope. Roofs
   are only there to stand on while they are shown. */
export function heightOf(s, x, y) { return s.hf ? s.hf(x, y) : s.h; }
function live(s) { return !s.roof || !S.roofs || S.roofs.visible; }

export function floorAt(x, y, feet) {
  let best = 0;
  S.surfaces.forEach((s) => {
    if (!live(s) || !inside(x, y, s.poly)) return;
    const h = heightOf(s, x, y);
    if (h <= feet + STEP && h > best) best = h;
  });
  H.ramps.forEach((r) => rampHeights(r, x, y).forEach((h) => { if (h <= feet + STEP && h > best) best = h; }));
  return best;
}

export function collide(p, feet) {
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

export function levelOf(p) {
  if (p.feet < 1.4) return 0;
  return S.surfaces.some((s) => s.level === 2 && live(s) && inside(p.x, p.y, s.poly) && p.feet > heightOf(s, p.x, p.y) - 0.5) ? 2 : 1;
}

/* Space (or the touch button) jumps: a good meter, enough to clear a railing
   and get onto the roofs; only from the ground or a stair, never in mid-air. */
export const JUMP = 4.7 / KZ;

export function jump() {
  const p = S.player;
  if (p.vz !== 0 || p.feet - floorAt(p.x, p.y, p.feet) > 0.02) return;
  p.vz = JUMP;
}

/* A walk at a person's pace: speed builds up and eases off instead of
   starting and stopping at once, the head bobs a little with each step, and
   the eyes follow the feet smoothly up and down stairs. */
export const WALK = 1.5 / K, RUN = 3.4 / K, ACCEL = 9;

export function step(dt) {
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
  p.bob = (p.bob || 0) + (onGround ? v * K * dt * 4.4 : 0);
  const amt = onGround ? Math.min(1, v / WALK) : 0;
  p.bobAmt = (p.bobAmt || 0) + (amt - (p.bobAmt || 0)) * (1 - Math.exp(-6 * dt));
  const up = Math.abs(Math.sin(p.bob)) * 0.028 * p.bobAmt, side = Math.sin(p.bob) * 0.012 * p.bobAmt;
  // the eyes trail the feet a little, so stairs read as steps and not jolts
  const eye = p.feet + EYE;
  p.eye = dt > 0 && p.eye !== undefined && Math.abs(p.eye - eye) < 1.2 ? p.eye + (eye - p.eye) * (1 - Math.exp(-14 * dt)) : eye;
  // the visitor is worked out in survey meters, the camera sits in the stretched model
  S.camera.position.set(p.x * K + rx * side, p.eye * KZ + up - 0.014 * p.bobAmt, -(p.y * K + ry * side));
  S.camera.rotation.set(p.pitch, p.yaw, side * 0.6, "YXZ");
}

/* Where your feet go at (x, y) on a level: the stair if you are on one, else
   that level's floor, else the ground. */
export function standAt(x, y, lv) {
  const c = [];
  H.ramps.forEach((r) => rampHeights(r, x, y).forEach((h) => c.push(h)));
  S.surfaces.forEach((s) => { if (s.level === lv && !s.roof && inside(x, y, s.poly)) c.push(s.h); });
  if (!c.length) return 0;
  return c.reduce((a, b) => (Math.abs(b - F[lv]) < Math.abs(a - F[lv]) ? b : a));
}

/* True when a body at (x, y) would touch a wall, a closed door or a big
   piece of furniture. */
export function blocked(x, y, feet) {
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
export function freeSpot(x, y, feet, poly) {
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
export function jumpTo(x, y, level, poly) {
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
