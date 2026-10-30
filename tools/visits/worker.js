// Counts visits to hiessy.github.io and stores them in D1.
//
//   POST /v                 the call from js/visits.js, one per page opened
//   GET  /day/YYYY-MM-DD    that day's visits as JSON; requires the token
//
// No cookies, and the IP is never stored. `visitor` is a hash of IP and browser
// with the day inside it: enough to count distinct people in a day, and it can't
// follow anyone from one day to the next. `mine` marks a visit from a browser that
// opened /?me: it's stored, but left out of the visit and visitor counts.

const ORIGIN = "https://hiessy.github.io";
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python/i;
const ARGENTINA = -3 * 3600 * 1000; // no daylight saving since 2009

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/v") return visit(req, env);
    const day = url.pathname.match(/^\/day\/(\d{4}-\d{2}-\d{2})$/);
    if (req.method === "GET" && day) return exportDay(req, env, day[1]);
    return new Response(null, { status: 404 });
  },
};

async function visit(req, env) {
  if (req.headers.get("Origin") !== ORIGIN) return new Response(null, { status: 403 });
  const ua = req.headers.get("User-Agent") || "";
  if (BOTS.test(ua)) return new Response(null, { status: 204 });
  const d = await req.json().catch(() => null);
  if (!d || typeof d.p !== "string") return new Response(null, { status: 400 });

  const now = Date.now();
  const day = new Date(now + ARGENTINA).toISOString().slice(0, 10);
  const ip = req.headers.get("CF-Connecting-IP") || "";
  const cf = req.cf || {};
  await env.DB.prepare(
    `INSERT INTO visits (ts, day, page, referrer, country, region, city, network,
                         browser, os, device, screen, language, visitor, mine)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    new Date(now).toISOString(),
    day,
    short(d.p, 200),
    short(d.r, 300),
    cf.country || "",
    cf.region || "",
    cf.city || "",
    cf.asOrganization || "",
    browser(ua),
    system(ua),
    /Mobi|Android|iPhone|iPad/.test(ua) ? "mobile" : "desktop",
    short(d.s, 20),
    short(d.l, 20),
    await hash(`${ip}|${ua}|${day}|${env.SALT}`),
    d.m ? 1 : 0
  ).run();
  return new Response(null, { status: 204 });
}

async function exportDay(req, env, day) {
  if (req.headers.get("Authorization") !== `Bearer ${env.TOKEN}`) {
    return new Response(null, { status: 401 });
  }
  const { results } = await env.DB.prepare(
    "SELECT * FROM visits WHERE day = ? ORDER BY ts"
  ).bind(day).all();
  const others = results.filter((v) => !v.mine);
  return Response.json({
    day,
    visits: others.length,
    visitors: new Set(others.map((v) => v.visitor)).size,
    mine: results.length - others.length,
    rows: results,
  });
}

function short(x, n) {
  return String(x || "").slice(0, n);
}

// Order matters: Edge and Opera also say "Chrome", and Chrome says "Safari".
function browser(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung";
  if (/Firefox|FxiOS/.test(ua)) return "Firefox";
  if (/Chrome|CriOS/.test(ua)) return "Chrome";
  if (/Safari/.test(ua)) return "Safari";
  return "other";
}

function system(ua) {
  if (/Windows/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "other";
}

async function hash(text) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(b)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
}
