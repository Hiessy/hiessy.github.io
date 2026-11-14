/* Keyboard, mouse, touch and joystick. */
import { $, S, touch } from "./core.js";
import { bar } from "./geometry.js";
import { hud, setMode, setToggle } from "./hud.js";
import { buildLabels } from "./labels.js";
import { fly, resize } from "./loop.js";
import { MAP, mapFrame } from "./minimap.js";
import { jump, jumpTo, levelOf } from "./physics.js";
import { doorAt, setHover, tapAt, updatePrompt, use } from "./pointer.js";
import { skyLabel } from "./skybar.js";
import { switchAll, switchHere } from "./lights.js";

export function bindControls() {
  const canvas = S.canvas, keys = S.keys;
  const map = { KeyW: "forward", ArrowUp: "forward", KeyS: "back", ArrowDown: "back",
                KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
                ShiftLeft: "run", ShiftRight: "run" };
  const live = () => S.running && S.mode === "walk" && (S.active || document.pointerLockElement === canvas);
  // 1, 2 and 3 switch the view from anywhere, the mouse captured or not
  const VIEW_KEYS = { Digit1: "walk", Numpad1: "walk", Digit2: "orbit", Numpad2: "orbit", Digit3: "aerial", Numpad3: "aerial" };
  document.addEventListener("keydown", (e) => {
    if (!S.running || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (VIEW_KEYS[e.code] && canvas.offsetParent !== null) { setMode(VIEW_KEYS[e.code]); return; }
    // C shows or hides the compass and location overlay (walk/geo.js)
    if (e.code === "KeyC" && canvas.offsetParent !== null && S.geo) { S.geo.toggle(); return; }
    // L switches the lights of the room you stand in (walk/lights.js)
    if (e.code === "KeyL" && canvas.offsetParent !== null && S.lights) {
      switchHere(S.player.x, S.player.y, levelOf(S.player));
      setToggle("toggle-lights", S.lights.some((l) => l.on));
      return;
    }
    // the overview and the aerial view fly like a ghost: WASD or arrows
    // across, E up, Q down, through walls
    if (S.mode === "orbit" && ghostKeysLive()) {
      const fly = Object.assign({ KeyE: "up", KeyQ: "down" }, map);
      if (!fly[e.code]) return;
      keys[fly[e.code]] = true;
      e.preventDefault();
      return;
    }
    if (!live()) return;
    if (e.code === "KeyE" && S.hover) { use(S.hover); return; }
    if (e.code === "Space") { e.preventDefault(); jump(); return; }
    if (!map[e.code]) return;
    keys[map[e.code]] = true;
    if (e.code.indexOf("Arrow") === 0) e.preventDefault();
  });
  document.addEventListener("keyup", (e) => {
    if (map[e.code]) keys[map[e.code]] = false;
    if (e.code === "KeyE") keys.up = false;
    if (e.code === "KeyQ") keys.down = false;
  });
  // the ghost keys work whenever the 3D view is on screen
  const ghostKeysLive = () => {
    if (document.fullscreenElement) return true;
    if (canvas.offsetParent === null) return false;
    const r = canvas.getBoundingClientRect();
    return r.bottom > 80 && r.top < window.innerHeight - 80;
  };
  canvas.addEventListener("pointerenter", () => { S.overStage = true; });
  canvas.addEventListener("pointerleave", () => { S.overStage = false; Object.keys(keys).forEach((k) => { keys[k] = false; }); });
  // keep the buttons in sight when the page's sticky header covers the top
  // of the 3D view
  const bar = document.querySelector(".hud-bar"), lvl = $("level"), top = document.querySelector(".top");
  const clearHeader = () => {
    if (!bar || !top) return;
    const r = $("stage").getBoundingClientRect();
    const off = document.fullscreenElement ? 0 : Math.max(0, Math.min(top.getBoundingClientRect().bottom - r.top, r.height - 160));
    bar.style.top = (10 + off) + "px";
    if (lvl) lvl.style.top = (62 + off) + "px";
  };
  window.addEventListener("scroll", clearHeader, { passive: true });
  window.addEventListener("resize", clearHeader);
  document.addEventListener("fullscreenchange", clearHeader);
  clearHeader();
  window.addEventListener("blur", () => { Object.keys(keys).forEach((k) => { keys[k] = false; }); });

  // Desktop: click to capture the mouse; if the browser refuses, drag to look.
  $("start-btn").addEventListener("click", () => {
    if (touch) { S.active = true; hud(); return; }
    if (canvas.requestPointerLock) canvas.requestPointerLock(); else { S.active = true; S.dragLook = true; hud(); }
  });
  document.addEventListener("pointerlockchange", () => {
    S.active = document.pointerLockElement === canvas;
    if (!S.active) Object.keys(keys).forEach((k) => { keys[k] = false; });
    hud();
  });
  document.addEventListener("pointerlockerror", () => { S.active = true; S.dragLook = true; hud(); });
  document.addEventListener("mousemove", (e) => {
    if (S.mode !== "walk" || document.pointerLockElement !== canvas) return;
    look(e.movementX, e.movementY, 0.0022);
  });
  // With the mouse captured, a click opens the door in the crosshair.
  document.addEventListener("mousedown", (e) => {
    if (e.button === 0 && document.pointerLockElement === canvas && S.hover) use(S.hover);
  });
  let drag = null, down = null;
  canvas.addEventListener("pointerdown", (e) => {
    down = [e.clientX, e.clientY];
    if (e.pointerType === "mouse" && S.mode === "walk" && S.dragLook) drag = [e.clientX, e.clientY];
  });
  window.addEventListener("pointerup", (e) => {
    drag = null;
    if (!down || document.pointerLockElement === canvas) { down = null; return; }
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
    if (moved < 6 && e.target === canvas) tapAt(e.clientX, e.clientY);
    down = null;
  });
  window.addEventListener("mousemove", (e) => {
    if (drag) {
      look(e.clientX - drag[0], e.clientY - drag[1], 0.004);
      drag = [e.clientX, e.clientY];
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (S.mode !== "orbit" || e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect();
    S.pointer = [e.clientX - r.left, e.clientY - r.top];
    setHover(doorAt(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, 400));
    updatePrompt();
  });
  canvas.addEventListener("pointerleave", () => { if (S.mode === "orbit") setHover(null); });

  $("jump").addEventListener("click", (e) => { e.stopPropagation(); jump(); });
  $("jump").addEventListener("touchstart", (e) => { e.preventDefault(); e.stopPropagation(); jump(); }, { passive: false });

  // Touch: the left thumb moves, a drag anywhere else looks around.
  const joy = $("joy"), knob = joy.querySelector(".knob");
  let joyId = null, lookId = null, last = null;
  joy.addEventListener("touchstart", (e) => {
    e.preventDefault();
    joyId = e.changedTouches[0].identifier;
    joyMove(e.changedTouches[0]);
  }, { passive: false });
  function joyMove(tch) {
    const r = joy.getBoundingClientRect(), R = r.width / 2;
    let dx = (tch.clientX - (r.left + R)) / R, dy = (tch.clientY - (r.top + R)) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    S.joy.s = dx; S.joy.f = -dy;
    knob.style.transform = "translate(" + (dx * R * 0.6) + "px," + (dy * R * 0.6) + "px)";
  }
  canvas.addEventListener("touchstart", (e) => {
    if (S.mode !== "walk") return;
    const tch = e.changedTouches[0];
    lookId = tch.identifier; last = [tch.clientX, tch.clientY];
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    Array.prototype.forEach.call(e.changedTouches, (tch) => {
      if (tch.identifier === joyId) joyMove(tch);
      else if (tch.identifier === lookId && last) {
        look(tch.clientX - last[0], tch.clientY - last[1], 0.005);
        last = [tch.clientX, tch.clientY];
      }
    });
    if (joyId !== null || lookId !== null) { if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  const end = (e) => {
    Array.prototype.forEach.call(e.changedTouches, (tch) => {
      if (tch.identifier === joyId) { joyId = null; S.joy.f = 0; S.joy.s = 0; knob.style.transform = ""; }
      if (tch.identifier === lookId) { lookId = null; last = null; }
    });
  };
  window.addEventListener("touchend", end);
  window.addEventListener("touchcancel", end);

  // The little map: a click jumps there.
  S.mini.addEventListener("click", (e) => {
    const r = S.mini.getBoundingClientRect(), fr = mapFrame(r.width, r.height);
    const x = MAP.x0 + (e.clientX - r.left - fr.ox) / fr.k;
    const y = MAP.y0 + (r.height - (e.clientY - r.top) - fr.oy) / fr.k;
    jumpTo(x, y);
  });

  // Buttons.
  $("mode-walk").addEventListener("click", () => setMode("walk"));
  $("mode-orbit").addEventListener("click", () => setMode("orbit"));
  if ($("mode-aerial")) $("mode-aerial").addEventListener("click", () => setMode("aerial"));
  $("toggle-roofs").addEventListener("click", () => { S.roofs.visible = !S.roofs.visible; setToggle("toggle-roofs", S.roofs.visible); });
  $("toggle-lights").addEventListener("click", () => { switchAll(); setToggle("toggle-lights", S.lights.some((l) => l.on)); });
  $("toggle-labels").addEventListener("click", () => { S.labels.visible = !S.labels.visible; setToggle("toggle-labels", S.labels.visible); });
  $("toggle-full").addEventListener("click", () => {
    const stage = $("stage");
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) stage.requestFullscreen();
  });
  document.addEventListener("fullscreenchange", () => setToggle("toggle-full", !!document.fullscreenElement));
  document.addEventListener("idioma", () => { buildLabels(); hud(); skyLabel(); });
}

export function look(dx, dy, k) {
  const p = S.player;
  p.yaw -= dx * k;
  p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - dy * k));
}
