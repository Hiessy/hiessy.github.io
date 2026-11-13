/* Resizing, the frame loop and ghost flight. */
import { $, REACH, S } from "./core.js";
import { setDoorPose } from "./doors.js";
import { hud } from "./hud.js";
import { drawMinimap } from "./minimap.js";
import { levelOf, step } from "./physics.js";
import { doorAt, setHover } from "./pointer.js";
import { updateLights } from "./lights.js";
import { updateGeo } from "./geo.js";

export function resize() {
  const stage = $("stage");
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  S.renderer.setSize(w, h, false);
  S.camera.aspect = w / h;
  S.camera.updateProjectionMatrix();
}

export function loop(now) {
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
  if (S.frame % 10 === 0) { const night = S.sky.state().night; updateLights(night); if (S.landmarks) S.landmarks.update(night); }
  S.renderer.render(S.scene, S.camera);
  S.frame = (S.frame || 0) + 1;
  if (S.frame % 3 === 0) { drawMinimap(); updateGeo(); }
}

/* Ghost flight for the overview and the aerial view: the camera and the
   point it turns around move together, with no walls in the way. */
export function fly(dt) {
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
