/* What is seen far off: the Cristo Redentor on its hill east of the town
   (H.landmarks in assets/model/house.js).

   It is 1.19 km away, past where the view's fog and far plane end, so it is
   drawn nearer, DRAWN meters off, and shrunk by as much: from the house it
   looks just as it does from there, at its true bearing and height above
   the horizon. Its hill comes with it, and the sky's background hills keep
   clear of that stretch of the horizon (CLEAR). At night the statue is lit,
   as the real one is. */
import * as THREE from "three";
import { H, K, S } from "./core.js";

export const DRAWN = 380;

/* The direction the Cristo lies in, in the scene (radians, as atan2(z, x)),
   and how wide a stretch of the sky's hills must stay clear for it. */
export function cristoClearing() {
  const c = H.landmarks.cristo;
  return { a: Math.atan2(-c.at[1], c.at[0]), w: 0.32 };
}

export function buildLandmarks(scene) {
  const c = H.landmarks.cristo, dist = Math.hypot(c.at[0], c.at[1]);
  const ux = c.at[0] / dist, uz = -c.at[1] / dist, k = DRAWN / dist;
  // seen from the street balcony's corner of the lot
  const origin = new THREE.Vector3(0, 0, -15 * K);

  const stone = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.6, emissive: 0xfff2d8, emissiveIntensity: 0, fog: false });
  const g = new THREE.Group();
  const box = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone); m.position.set(x, y, z); g.add(m); return m; };
  const B = c.base, T = c.statue;
  // the base, the robe falling to it, shoulders, open arms, head
  box(3.2, B, 3.2, 0, B / 2, 0);
  box(3.8, 0.4, 3.8, 0, B - 0.2, 0);
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.05, T * 0.74, 16), stone);
  robe.position.y = B + T * 0.37;
  g.add(robe);
  box(1.5, T * 0.12, 0.8, 0, B + T * 0.78, 0);
  box(T * 0.72, 0.5, 0.55, 0, B + T * 0.8, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), stone);
  head.position.y = B + T * 0.92;
  g.add(head);
  // its arms open across the line to the town: it faces the house
  g.rotation.y = Math.atan2(ux, uz);
  // H.landmarks.cristo.enlarge: larger than life, standing where it does
  const big = k * (c.enlarge || 1);
  g.scale.setScalar(big);
  g.position.copy(origin).add(new THREE.Vector3(ux * DRAWN, c.ground * k, uz * DRAWN));
  g.name = "cristo";
  scene.add(g);

  // its hill: rising to the statue, then on to the ridge behind it, which
  // runs north and south along the valley
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8a9878, roughness: 1, flatShading: true, fog: false }));
  const behind = c.ridgeAt - dist, radial = behind / Math.sqrt(1 - (c.ground / c.ridge) ** 2);
  hill.scale.set(radial * k, c.ridge * k, 900 * k);
  hill.rotation.y = -Math.atan2(uz, ux);
  hill.position.copy(origin).add(new THREE.Vector3(ux * (DRAWN + behind * k), -0.5, uz * (DRAWN + behind * k)));
  scene.add(hill);

  // a soft glow round it at night
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const x = cv.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,240,210,0.9)"); gr.addColorStop(1, "rgba(255,240,210,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(16 * big * 2);
  glow.position.copy(g.position).add(new THREE.Vector3(0, (B + T * 0.6) * big, 0));
  scene.add(glow);

  S.cristo = g;
  S.landmarks = {
    update(night) {
      stone.emissiveIntensity = 0.85 * night;
      glow.material.opacity = 0.55 * night;
      glow.visible = night > 0.05;
    }
  };
}
