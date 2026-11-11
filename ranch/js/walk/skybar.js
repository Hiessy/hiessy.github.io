/* The sky button: follow the clock, or try dawn, midday, dusk and night. */
import { $, S, t } from "./core.js";

export function skyName(m) {
  return m === 1 ? t("walk.sky.dawn") : m === 2 ? t("walk.sky.day") : m === 3 ? t("walk.sky.dusk") : m === 4 ? t("walk.sky.night") : t("walk.sky.now");
}

export function skyLabel() {
  const b = $("sky-btn");
  if (!b || !S.scene) return;
  b.textContent = t("walk.sky") + ": " + skyName(S.skyMode);
  b.classList.toggle("on", S.skyMode !== 0);
  b.setAttribute("aria-pressed", S.skyMode !== 0 ? "true" : "false");
}

/* The sky's hour: 0 follows the clock; the others try dawn, midday, dusk
   and night without waiting for them. */
export function setSky(m) {
  S.skyMode = m;
  const k = S.sky;
  k.setHour(m === 1 ? k.hourAt(-1.5, true) : m === 2 ? 13 : m === 3 ? k.hourAt(-1.5, false) : m === 4 ? 23.5 : null);
  skyLabel();
}
