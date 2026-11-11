/* The door under the pointer: hover, prompt and tap. */
import * as THREE from "three";
import { $, REACH, S, t, touch } from "./core.js";
import { highlight, toggleDoor } from "./doors.js";

export const ray = new THREE.Raycaster();

export function doorAt(ndcX, ndcY, far) {
  ray.setFromCamera({ x: ndcX, y: ndcY }, S.camera);
  ray.far = far;
  const hits = ray.intersectObjects(S.clickable, true);
  return hits.length ? hits[0].object.userData.door : null;
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
  const open = d.target > 0.5;
  if (d.kind === "gate") {
    if (touch) el.textContent = open ? t("walk.gate.close.touch") : t("walk.gate.open.touch");
    else el.textContent = open ? t("walk.gate.close") : t("walk.gate.open");
  } else if (touch) el.textContent = open ? t("walk.door.close.touch") : t("walk.door.open.touch");
  else el.textContent = open ? t("walk.door.close") : t("walk.door.open");
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
  if (d) toggleDoor(d);
}
