/* The 3D view: a model of the house to walk through.

   The walls are the survey's own wall outlines (assets/model/survey.js), raised to the
   heights its sections give (assets/model/house.js, `tops`): flat under the slabs,
   sloping under the old house's gable, arched under the glazed room's
   vault. Every door and window is a gap the survey draws, with a lintel
   above it, a sill under the windows and a leaf that opens the way the
   survey swings it. Floors sit at the survey's levels, so there are steps.
   Plan coordinates (x east, y north, meters) become three.js (x, height, -y).

   Doors start closed and open with a click. Furniture comes from the listing
   photos. Walking is a small physics loop: walls, closed doors and big pieces
   of furniture push you back, floors and stairs set your height, and you
   fall if you step off something. The sky follows the clock (walk/sky.js).

   Everything that never moves is merged into one mesh per material at the
   end, so the browser draws a few dozen objects instead of thousands.

   The code is in walk/, a file for each concern: core (state), textures,
   materials, geometry, walls, doors, openings, pieces and furniture, labels,
   scene, roofs, physics, pointer, minimap, hud, controls, loop, skybar, sky. */
import * as THREE from "three";
import { createSky } from "./walk/sky.js";
import { bindControls } from "./walk/controls.js";
import { $, CENTER, H, K, KZ, S, t, touch } from "./walk/core.js";
import { byId, center } from "./walk/geometry.js";
import { hud, setMode, setToggle } from "./walk/hud.js";
import { loop, resize } from "./walk/loop.js";
import { M, palette } from "./walk/materials.js";
import { jumpTo } from "./walk/physics.js";
import { buildScene } from "./walk/scene.js";
import { setSky } from "./walk/skybar.js";

export function start() {
  if (S.scene) { resume(); return; }
  const canvas = $("walk-canvas");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    const m = $("walk-msg");
    m.hidden = false;
    m.textContent = t("walk.nowebgl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdcebf5);
  scene.fog = new THREE.Fog(0xdde9f1, 90, 330);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 900);

  Object.assign(S, {
    canvas, renderer, scene, camera,
    world: new THREE.Group(), static: new THREE.Group(), roofs: null, labels: new THREE.Group(),
    colliders: [], surfaces: [], blocks: [], doors: [], clickable: [], hover: null, pointer: null,
    player: { x: H.start.x, y: H.start.y, feet: 0, vz: 0, yaw: H.start.yaw, pitch: -0.02 },
    keys: {}, joy: { f: 0, s: 0 }, frame: 0, lamps: [], sky: null, skyMode: 0,
    mode: "walk", active: false, running: true, mini: $("minimap")
  });
  // the model, stretched to the size it is shown at (see K and KZ in core.js)
  S.world.scale.set(K, KZ, K);
  scene.add(S.world);
  palette();
  buildScene();
  S.lamps = S.lamps.map((l) => [l[0] * K, l[1] * KZ, l[2] * K, (l[3] || 9) * 1.2, l[4]]);
  // The sun, the moon, the stars and every light, by the clock (walk/sky.js).
  S.sky = createSky(scene, { center: { x: CENTER.x * K, y: CENTER.y * K }, span: 36 * K, camera, north: H.NORTH, touch, lamps: S.lamps, glass: M.glass, glow: M.glow,
                             pixelRatio: () => renderer.getPixelRatio() });
  bindControls();
  const sb = $("sky-btn");
  if (sb) sb.addEventListener("click", () => setSky((S.skyMode + 1) % 5));
  setSky(0);
  new ResizeObserver(resize).observe($("stage"));
  resize();
  setMode("walk");
  setToggle("toggle-labels", true);
  requestAnimationFrame(loop);
}

export function goTo(id) {
  if (!S.scene) return;
  const item = byId(id);
  if (!item) return;
  // the middle of the room's outline, not where its label sits
  const poly = H.polyOf(item);
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  jumpTo((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, item.level, poly);
}

export function pause() {
  if (!S.scene) return;
  S.running = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

export function resume() {
  if (!S.scene || S.running) return;
  S.running = true;
  S.last = 0;
  resize();
  hud();
  requestAnimationFrame(loop);
}
