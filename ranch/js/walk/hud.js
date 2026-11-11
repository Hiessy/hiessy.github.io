/* The on-screen state: level, hints, buttons, and the camera modes. */
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { $, CENTER, H, S, t, touch } from "./core.js";
import { inside } from "./geometry.js";
import { freeSpot, jump, levelOf, standAt, step } from "./physics.js";
import { setHover, updatePrompt } from "./pointer.js";

export function hud() {
  const lv = levelOf(S.player);
  const level = $("level");
  if (level) {
    if (S.mode !== "walk") level.textContent = "";
    else if (lv === 0) level.textContent = t("walk.level.ground");
    else if (lv === 1) level.textContent = t("walk.level.upper");
    else level.textContent = t("walk.level.roof");
  }
  const hint = $("hint");
  if (hint) hint.textContent = S.mode === "orbit" ? (touch ? t("walk.hint.orbit.touch") : t("walk.hint.orbit")) : touch ? t("walk.hint.touch") : t("walk.hint.desktop");
  const btn = $("start-btn");
  if (btn) btn.textContent = touch ? t("walk.start.touch") : t("walk.start");
  const startBox = $("start");
  if (startBox) startBox.hidden = S.mode !== "walk" || S.active;
  const joy = $("joy");
  if (joy) joy.hidden = !(touch && S.mode === "walk" && S.active);
  const jumpBtn = $("jump");
  if (jumpBtn) {
    jumpBtn.hidden = !(touch && S.mode === "walk" && S.active);
    jumpBtn.textContent = t("walk.jump");
  }
  const cross = $("crosshair");
  if (cross) cross.hidden = !(S.mode === "walk" && S.active);
  S.lastLevel = lv;
  updatePrompt();
}

export function setToggle(id, on) {
  const b = $(id);
  if (!b) return;
  b.classList.toggle("on", on);
  b.setAttribute("aria-pressed", on ? "true" : "false");
}

/* The aerial view is the overview's camera, pointed straight down. */
export function setMode(mode) {
  const prev = S.mode;
  const aerial = mode === "aerial";
  if (aerial) mode = "orbit";
  S.mode = mode;
  S.aerial = aerial;
  const shown = aerial ? "aerial" : mode;
  ["walk", "orbit", "aerial"].forEach((m) => {
    const b = $("mode-" + m);
    if (!b) return;
    b.classList.toggle("on", shown === m);
    b.setAttribute("aria-pressed", shown === m ? "true" : "false");
  });
  setHover(null);
  if (mode === "orbit") {
    if (document.pointerLockElement) document.exitPointerLock();
    S.active = false;
    if (!S.orbit) {
      S.orbit = new OrbitControls(S.camera, S.canvas);
      S.orbit.enableDamping = true;
      S.orbit.maxPolarAngle = 1.45;
      S.orbit.minDistance = 4;
      S.orbit.maxDistance = 110;
    }
    S.orbit.enabled = true;
    S.orbit.minPolarAngle = 0;
    if (aerial) {
      // straight down from 40 m, north (the plan's top) up on screen
      S.camera.position.set(CENTER.x - 1, 40, -CENTER.y + 0.01);
      S.camera.up.set(0, 1, 0);
    } else S.camera.position.set(CENTER.x + 4, 22, -CENTER.y + 22);
    S.orbit.target.set(CENTER.x - 1, 0, -CENTER.y);
    S.orbit.update();
    S.roofs.visible = false;
  } else {
    if (S.orbit) S.orbit.enabled = false;
    S.roofs.visible = true;
    if (prev === "orbit" && S.flown && S.orbit) {
      const tx = S.orbit.target.x, ty = -S.orbit.target.z;
      if (inside(tx, ty, H.lot)) {
        const p = S.player, feet = standAt(tx, ty, 0), spot = freeSpot(tx, ty, feet, null);
        p.x = spot[0]; p.y = spot[1]; p.feet = standAt(p.x, p.y, 0); p.vx = p.vy = p.vz = 0; p.eye = undefined;
      }
    }
    S.flown = false;
    step(0);
  }
  setToggle("toggle-roofs", S.roofs.visible);
  hud();
}
