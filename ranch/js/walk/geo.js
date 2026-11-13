/* The compass and location overlay of the 3D view: a strip along the top
   with the cardinal points sliding as you turn (and the sun, the moon and
   the Cristo where they lie), and a small card over the little map with
   where you stand on the earth: latitude and longitude, height above the
   sea, the way you face, the time, the sun and the moon, and how far the
   Cristo is. The button beside "Full screen" or the C key turns it off and
   on; the choice is remembered on this device.

   Coordinates come from H.geo: the lot's corner from the cadastre, and the
   plan turned H.NORTH degrees from true north (assets/model/house.js). */
import * as THREE from "three";
import { $, H, K, S, t } from "./core.js";

const DEG = Math.PI / 180, KEY = "ranch.geo";

/* Latitude and longitude (degrees) of a point of the plan. */
export function latLon(x, y) {
  const a = H.NORTH * DEG, E = x * Math.cos(a) - y * Math.sin(a), N = x * Math.sin(a) + y * Math.cos(a);
  return [H.geo.lat + N / 110574, H.geo.lon + E / (111320 * Math.cos(H.geo.lat * DEG))];
}

/* A plan direction (dx, dy) as a bearing from true north, clockwise. */
export function bearingOf(dx, dy) { return ((Math.atan2(dx, dy) / DEG - H.NORTH) % 360 + 360) % 360; }

// the points of the compass, in the page's language (read when drawn, as
// the language can change)
const point16 = (b) => [t("walk.geo.n"), t("walk.geo.nne"), t("walk.geo.ne"), t("walk.geo.ene"), t("walk.geo.e"), t("walk.geo.ese"), t("walk.geo.se"), t("walk.geo.sse"),
  t("walk.geo.s"), t("walk.geo.ssw"), t("walk.geo.sw"), t("walk.geo.wsw"), t("walk.geo.w"), t("walk.geo.wnw"), t("walk.geo.nw"), t("walk.geo.nnw")][Math.round(b / 22.5) % 16];
const point = (b) => point16(Math.round(b / 45) * 45);
const dms = (v, pos, neg) => {
  const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60), s = ((a - d) * 60 - m) * 60;
  return d + "°" + String(m).padStart(2, "0") + "′" + s.toFixed(1).padStart(4, "0") + "″ " + (v < 0 ? neg : pos);
};
/* A number written the page's way: 1,145 and 1.19 in English, 1.145 and 1,19 in Spanish. */
const num = (v, d) => v.toLocaleString(document.documentElement.lang || undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

/* A text with its {names} filled in. */
const fmt = (k, o) => Object.keys(o).reduce((s, n) => s.replace("{" + n + "}", o[n]), t(k));

export function buildGeo() {
  const strip = $("compass"), card = $("geo"), btn = $("toggle-geo");
  if (!strip || !card || !btn) return;
  let on = true;
  try { on = localStorage.getItem(KEY) !== "off"; } catch (e) { /* no storage: on */ }
  let heading = 0;
  const dir = new THREE.Vector3();

  function where() {
    if (S.mode === "orbit" && S.orbit) return { x: S.orbit.target.x / K, y: -S.orbit.target.z / K, feet: 0 };
    return { x: S.player.x, y: S.player.y, feet: S.player.feet };
  }

  function drawStrip(sun, moon, cristo) {
    const w = strip.clientWidth, h = strip.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!w) return;
    if (strip.width !== Math.round(w * dpr)) { strip.width = Math.round(w * dpr); strip.height = Math.round(h * dpr); }
    const g = strip.getContext("2d"), span = 140, px = w / span;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(20, 22, 26, 0.45)";
    g.fillRect(0, 0, w, h);
    const x = (b) => w / 2 + (((b - heading + 540) % 360) - 180) * px;
    g.textAlign = "center"; g.textBaseline = "top";
    for (let b = 0; b < 360; b += 5) {
      const X = x(b);
      if (X < -10 || X > w + 10) continue;
      const major = b % 45 === 0, mid = b % 15 === 0;
      g.fillStyle = major ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)";
      g.fillRect(X - 0.5, h - (major ? 12 : mid ? 8 : 5), 1, major ? 12 : mid ? 8 : 5);
      if (major) { g.font = (b % 90 === 0 ? "700 13px" : "600 11px") + " system-ui, sans-serif"; g.fillStyle = b === 0 ? "#FF8A7A" : "#FFFFFF"; g.fillText(point(b), X, 3); }
      else if (mid) { g.font = "10px system-ui, sans-serif"; g.fillStyle = "rgba(255, 255, 255, 0.7)"; g.fillText(String(b), X, 5); }
    }
    // what lies where: the sun, the moon, the Cristo
    const mark = (b, draw) => { const X = x(b); if (X > 4 && X < w - 4) draw(X); };
    if (sun.el > -2) mark(sun.az, (X) => { g.fillStyle = "#FFD45A"; g.beginPath(); g.arc(X, h - 18, 4, 0, 7); g.fill(); });
    if (moon.el > -2) mark(moon.az, (X) => { g.fillStyle = "#DDE3F2"; g.beginPath(); g.arc(X, h - 18, 3.5, 0, 7); g.fill(); });
    mark(cristo, (X) => { g.fillStyle = "#FFFFFF"; g.fillRect(X - 0.75, h - 24, 1.5, 9); g.fillRect(X - 3, h - 21, 6, 1.5); });
    // the way you face
    g.fillStyle = "#FF8A7A";
    g.beginPath(); g.moveTo(w / 2 - 5, 0); g.lineTo(w / 2 + 5, 0); g.lineTo(w / 2, 6); g.closePath(); g.fill();
  }

  const row = (label, v, wide) => '<div class="row' + (wide ? " wide" : "") + '"><span>' + label + "</span><b>" + v + "</b></div>";

  function update() {
    if (!on || !S.camera) return;
    S.camera.getWorldDirection(dir);
    heading = bearingOf(dir.x, -dir.z);
    const p = where(), ll = latLon(p.x, p.y), st = S.sky ? S.sky.state() : { el: 0, az: 0, hour: 12, lit: 0, age: 0, moonEl: -90, moonAz: 0 };
    const c = H.landmarks.cristo.at, cristo = bearingOf(c[0] - p.x, c[1] - p.y), km = Math.hypot(c[0] - p.x, c[1] - p.y) / 1000;
    drawStrip({ el: st.el, az: st.az }, { el: st.moonEl, az: st.moonAz }, cristo);
    const hh = Math.floor(st.hour), mm = Math.floor((st.hour - hh) * 60);
    card.innerHTML = '<div class="place">' + t("walk.geo.place") + "</div>" +
      '<div class="row"><b>' + dms(ll[0], "N", "S") + "</b></div>" +
      '<div class="row"><b>' + dms(ll[1], "E", t("walk.geo.w")) + "</b></div>" +
      row(t("walk.geo.alt"), fmt("walk.geo.asl", { m: num(Math.round(H.geo.ground + (p.feet || 0)), 0) })) +
      row(t("walk.geo.heading"), Math.round(heading) + "° " + point16(heading)) +
      row(t("walk.geo.time"), String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0") + " (UTC" + H.geo.utc + ")", true) +
      row(t("walk.geo.sun"), st.el > -0.8 ? fmt("walk.geo.altaz", { alt: Math.round(st.el), az: Math.round(st.az) }) : t("walk.geo.below"), true) +
      row(t("walk.geo.moon"), fmt("walk.geo.lit", { p: Math.round((st.lit || 0) * 100), phase: (st.age || 0) < 0.5 ? t("walk.geo.waxing") : t("walk.geo.waning") }), true) +
      row(t("walk.geo.cristo"), fmt("walk.geo.far", { km: num(km, 2), az: Math.round(cristo) }), true);
  }

  function toggle(v) {
    on = v === undefined ? !on : !!v;
    strip.hidden = card.hidden = !on;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) { /* not remembered */ }
    // the strip sits just under the row of buttons, however it wraps
    const bar = document.querySelector(".hud-bar");
    if (bar) strip.style.top = bar.offsetTop + bar.offsetHeight + 8 + "px";
    update();
  }

  btn.addEventListener("click", () => toggle());
  S.geo = { toggle, update, latLon, heading: () => heading, get on() { return on; } };
  toggle(on);
}

/* Every few frames, from the loop. */
export function updateGeo() { if (S.geo) S.geo.update(); }
