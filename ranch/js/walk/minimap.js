/* The little map with your position. */
import { H, S } from "./core.js";
import { bath } from "./furniture.js";
import { levelOf } from "./physics.js";

export const MAP = H.extras.map;

export function mapFrame(W, Hh) {
  const k = Math.min(W / (MAP.x1 - MAP.x0), Hh / (MAP.y1 - MAP.y0));
  return { k, ox: (W - k * (MAP.x1 - MAP.x0)) / 2, oy: (Hh - k * (MAP.y1 - MAP.y0)) / 2 };
}

export function drawMinimap() {
  const c = S.mini;
  if (!c || c.offsetParent === null) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(c.clientWidth * dpr), Hh = Math.round(c.clientHeight * dpr);
  if (c.width !== W || c.height !== Hh) { c.width = W; c.height = Hh; }
  const g = c.getContext("2d"), fr = mapFrame(W, Hh);
  const mx = (x) => fr.ox + (x - MAP.x0) * fr.k, my = (y) => Hh - fr.oy - (y - MAP.y0) * fr.k;
  const path = (poly) => { g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(mx(p[0]), my(p[1])) : g.moveTo(mx(p[0]), my(p[1])))); g.closePath(); };
  g.clearRect(0, 0, W, Hh);
  g.fillStyle = "rgba(247,246,242,0.94)";
  g.fillRect(0, 0, W, Hh);
  path(H.lot); g.fillStyle = "#DDEBD2"; g.fill();
  g.lineWidth = dpr; g.strokeStyle = "#6B6A65"; g.stroke();
  const lv = S.mode === "walk" ? levelOf(S.player) : 0;
  const COL = { bedroom: "#dbe5f1", bath: "#c4d7e7", living: "#f0e0c4", service: "#e0dbcf", hall: "#e8e4dc",
                stair: "#d6cfc2", covered: "#ffffff", balcony: "#ffffff", terrace: "#ffffff", roof: "#bdb7aa" };
  H.rooms.concat(H.spaces).forEach((r) => {
    const here = lv === 0 ? r.level === 0 : r.level > 0;
    if (!here) return;
    path(H.polyOf(r));
    g.fillStyle = COL[r.kind] || "#dddddd"; g.fill();
    g.strokeStyle = "#2B2B28"; g.lineWidth = dpr * 0.8; g.stroke();
  });
  if (S.mode !== "walk") return;
  const p = S.player, px = mx(p.x), py = my(p.y);
  const a = Math.atan2(Math.cos(p.yaw), -Math.sin(p.yaw));
  g.fillStyle = "rgba(194,65,12,0.25)";
  g.beginPath(); g.moveTo(px, py);
  g.arc(px, py, 26 * dpr, -a - 0.6, -a + 0.6); g.closePath(); g.fill();
  g.fillStyle = "#C2410C";
  g.beginPath(); g.arc(px, py, 4 * dpr, 0, Math.PI * 2); g.fill();
}
