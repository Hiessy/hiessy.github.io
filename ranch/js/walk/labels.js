/* Room name labels floating in the model. */
import * as THREE from "three";
import { $, H, K, KZ, S, X, plain, t } from "./core.js";
import { center } from "./geometry.js";

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function makeLabel(text, num) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const g = c.getContext("2d");
  g.font = "600 44px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  const pad = 22, pillW = num ? g.measureText(num).width + 34 : 0, gap = num ? 12 : 0;
  const textW = Math.min(g.measureText(text).width, 512 - 2 * pad - pillW - gap - 8);
  const w = pad * 2 + pillW + gap + textW, x0 = (512 - w) / 2;
  g.fillStyle = "rgba(255,255,255,0.9)";
  roundRect(g, x0, 24, w, 80, 40); g.fill();
  g.textBaseline = "middle";
  if (num) {
    g.fillStyle = "#2B2B28";
    roundRect(g, x0 + pad - 8, 36, pillW, 56, 28); g.fill();
    g.fillStyle = "#FFFFFF"; g.textAlign = "center";
    g.fillText(num, x0 + pad - 8 + pillW / 2, 65);
  }
  g.fillStyle = "#1F1F1C"; g.textAlign = "left";
  g.fillText(text, x0 + pad + pillW + gap - (num ? 8 : 0), 65, textW);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 4;
  // A fixed size on screen, like a pin on a map: readable from afar and never
  // huge when you stand next to it.
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, sizeAttenuation: false }));
  sp.scale.set(0.3 / K, 0.075 / KZ, 1);
  sp.renderOrder = 10;
  return sp;
}

export function buildLabels() {
  const group = S.labels;
  group.children.slice().forEach((sp) => { group.remove(sp); sp.material.map.dispose(); sp.material.dispose(); });
  const put = (text, num, x, y, h) => {
    if (!text) return;
    const sp = makeLabel(text, num);
    sp.position.set(x, h, -y);
    group.add(sp);
  };
  H.rooms.forEach((r) => {
    const c = center(r), h = r.z + 2.05;
    put(plain(t(r.name)), String(r.n), c[0], c[1], h);
  });
  H.spaces.forEach((s) => {
    if (!s.name || s.kind === "roof" || s.kind === "balcony") return;
    const c = center(s);
    put(plain(t(s.name)).replace(/\s*·.*$/, ""), "", c[0], c[1], (s.z || 0) + 2.1);
  });
  put(plain(t("space.garden")).replace(/\s*\(.*\)$/, ""), "", X.labels.garden[0], X.labels.garden[1], 1.8);
}
