/* The door under the pointer: hover, prompt and tap. */
import * as THREE from "three";
import { $, REACH, S, t, touch } from "./core.js";
import { highlight, toggleDoor } from "./doors.js";

export const ray = new THREE.Raycaster();

export function doorAt(ndcX, ndcY, far) {
  ray.setFromCamera({ x: ndcX, y: ndcY }, S.camera);
  ray.far = far;
  const hits = ray.intersectObjects(S.clickable, true);
  return hits.length ? hits[0].object.userData.door || hits[0].object.userData.light || null : null;
}

export function setHover(d) {
  if (d === S.hover) return;
  highlight(S.hover, false);
  S.hover = d;
  highlight(d, true);
  S.canvas.style.cursor = d && S.mode === "orbit" ? "pointer" : "";
  updatePrompt();
}

/* "Click to open the door", under the crosshair when walking and under the
   pointer in the overview. */
export function updatePrompt() {
  const el = $("prompt"), cross = $("crosshair");
  if (!el) return;
  const d = S.hover;
  if (cross) cross.classList.toggle("on", !!d);
  el.hidden = !d;
  if (!d) return;
  if (d.isLight) {
    el.textContent = touch ? (d.on ? t("walk.light.off.touch") : t("walk.light.on.touch")) : (d.on ? t("walk.light.off") : t("walk.light.on"));
  } else if (d.kind === "gate") {
    if (touch) el.textContent = d.target > 0.5 ? t("walk.gate.close.touch") : t("walk.gate.open.touch");
    else el.textContent = d.target > 0.5 ? t("walk.gate.close") : t("walk.gate.open");
  } else if (touch) el.textContent = d.target > 0.5 ? t("walk.door.close.touch") : t("walk.door.open.touch");
  else el.textContent = d.target > 0.5 ? t("walk.door.close") : t("walk.door.open");
  if (S.mode === "orbit" && S.pointer) {
    el.style.left = S.pointer[0] + "px";
    el.style.top = S.pointer[1] + 22 + "px";
  } else {
    el.style.left = "";
    el.style.top = "";
  }
}

export function tapAt(clientX, clientY) {
  const r = S.canvas.getBoundingClientRect();
  const d = doorAt(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1, S.mode === "walk" ? REACH : 400);
  if (d) use(d);
}

/* What a click does to what is under it: a door opens or shuts, a lamp
   switches its room's lights. */
export function use(d) {
  if (d.isLight) { d.set(!d.on); updatePrompt(); } else toggleDoor(d);
}
