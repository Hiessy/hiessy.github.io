/* The sky over the 3D walk, set by the clock.

   The sun, the moon and the stars are where they would be over La Cumbre
   (30.98° S, 64.49° W) at the hour your own clock shows, read as Argentine
   time. By day the dome is a blue gradient with the sun's disc; around
   sunrise and sunset it warms toward the sun; at night it goes nearly black
   and fills with stars: every star the eye can see, each in its real place
   (the Yale Bright Star Catalog, assets/sky/stars.json), over the glow and
   haze of the Milky Way, all turning round the south pole as the night
   goes on. The lights follow: sunlight fades and warms, the moon
   takes over, lamps and windows glow. The moon is placed and phased from a
   short lunar theory (good to a fraction of a degree), its lit side turned
   toward the sun. Now and then a shooting star crosses the night, and more
   rarely a comet drifts by with its tail away from the sun.

   createSky(scene, options) returns { setHour(h or null), hour(), update(t),
   state() }. Nothing here knows about the house except where north is. */
import * as THREE from "three";

const LAT = -30.98, LON = -64.49, TZ = -3;
const DEG = Math.PI / 180;
const R = 420;                       // the dome's radius

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const u = clamp((v - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

/* Days since J2000.0 for a calendar date and clock hours (UTC-3). */
function daysJ2000(date, hours) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  return jdn - 0.5 + (hours - TZ) / 24 - 2451545.0;
}
/* Local sidereal time in radians. */
function sidereal(D) {
  const gmst = 18.697374558 + 24.06570982441908 * D;
  return ((((gmst + LON / 15) % 24) + 24) % 24) * 15 * DEG;
}
/* The sun's and the moon's right ascension and declination (radians), how
   much of the moon is lit (0 new, 1 full) and its age as a fraction of the
   month (0 new, 0.5 full). The moon's place takes the six largest terms of
   its longitude and its tilt to the ecliptic. */
function bodies(D) {
  const g = (357.529 + 0.98560028 * D) * DEG, q = 280.459 + 0.98564736 * D;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG, e = 23.439 * DEG;
  const eq = (l, b) => {
    const x = Math.cos(b) * Math.cos(l), y = Math.cos(e) * Math.cos(b) * Math.sin(l) - Math.sin(e) * Math.sin(b);
    const z = Math.sin(e) * Math.cos(b) * Math.sin(l) + Math.cos(e) * Math.sin(b);
    return { ra: Math.atan2(y, x), dec: Math.asin(z) };
  };
  const Lm = 218.316 + 13.176396 * D, Mm = (134.963 + 13.064993 * D) * DEG, F = (93.272 + 13.22935 * D) * DEG;
  const Dm = (297.85 + 12.190749 * D) * DEG;
  const lon = (Lm + 6.289 * Math.sin(Mm) + 1.274 * Math.sin(2 * Dm - Mm) + 0.658 * Math.sin(2 * Dm) + 0.214 * Math.sin(2 * Mm)
    - 0.186 * Math.sin(g) - 0.114 * Math.sin(2 * F)) * DEG;
  const lat = 5.128 * Math.sin(F) * DEG;
  const elong = Math.acos(clamp(Math.cos(lat) * Math.cos(lon - L), -1, 1));
  const ahead = (((lon - L) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) < Math.PI;
  return { sun: eq(L, 0), moon: eq(lon, lat), age: ahead ? elong / (2 * Math.PI) : 1 - elong / (2 * Math.PI), lit: (1 - Math.cos(elong)) / 2 };
}
/* Equatorial unit vector to (east, north, up) at this latitude and time. */
function horizonMatrix(lst) {
  const s = Math.sin(lst), c = Math.cos(lst), sp = Math.sin(LAT * DEG), cp = Math.cos(LAT * DEG);
  return [[-s, c, 0], [-c * sp, -s * sp, cp], [c * cp, s * cp, sp]];
}
function unit(ra, dec) { return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]; }
function apply(M, v) { return M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]); }

/* The brightest stars: right ascension (hours), declination (degrees),
   magnitude, and a tint (0 blue-white, 1 yellow, 2 orange-red). */
const BRIGHT = [
  [6.752, -16.72, -1.46, 0], [6.399, -52.7, -0.74, 0], [14.66, -60.83, -0.27, 1], [14.261, 19.18, -0.05, 2],
  [18.616, 38.78, 0.03, 0], [5.278, 46.0, 0.08, 1], [5.242, -8.2, 0.13, 0], [7.655, 5.22, 0.34, 0],
  [1.629, -57.24, 0.46, 0], [5.919, 7.41, 0.5, 2], [14.064, -60.37, 0.61, 0], [19.846, 8.87, 0.77, 0],
  [12.443, -63.1, 0.76, 0], [4.599, 16.51, 0.86, 2], [16.49, -26.43, 0.96, 2], [13.42, -11.16, 0.97, 0],
  [7.755, 28.03, 1.14, 1], [22.961, -29.62, 1.16, 0], [20.69, 45.28, 1.25, 0], [12.795, -59.69, 1.25, 0],
  [10.14, 11.97, 1.35, 0], [6.977, -28.97, 1.5, 0], [12.519, -57.11, 1.63, 2], [17.56, -37.1, 1.62, 0],
  [5.419, 6.35, 1.64, 0], [5.438, 28.61, 1.65, 0], [9.22, -69.72, 1.67, 0], [5.604, -1.2, 1.69, 0],
  [22.137, -46.96, 1.74, 0], [5.679, -1.94, 1.77, 0], [12.9, 55.96, 1.77, 0], [8.159, -47.34, 1.83, 0],
  [18.403, -34.38, 1.85, 0], [11.062, 61.75, 1.79, 1], [3.405, 49.86, 1.8, 1], [7.14, -26.39, 1.84, 1],
  [8.375, -59.51, 1.86, 2], [13.792, 49.31, 1.86, 0], [17.622, -43.0, 1.87, 1], [16.811, -69.03, 1.92, 2],
  [6.629, 16.4, 1.93, 0], [20.427, -56.74, 1.94, 0], [12.252, -58.75, 2.8, 0], [12.356, -60.4, 3.6, 2],
  [9.133, -43.43, 1.96, 2], [7.577, 31.89, 1.98, 0], [2.53, 89.26, 1.98, 1], [10.333, 19.84, 2.08, 2],
  [0.14, 29.09, 2.06, 0], [5.796, -9.67, 2.06, 0], [0.726, -17.99, 2.04, 2], [2.065, 42.33, 2.1, 2]
];
const TINT = [[0.82, 0.88, 1.0], [1.0, 0.96, 0.82], [1.0, 0.78, 0.62]];

/* A star's colour from its temperature (hundreds of kelvin): red-orange
   below 4,000 K, yellow-white round the sun's 5,800, blue-white above 10,000. */
function starTint(k) {
  const u = clamp((k - 35) / 70, 0, 1), A = [1, 0.72, 0.5], W = [1, 0.96, 0.86], Bl = [0.8, 0.87, 1];
  const mix = (p, q, f) => p.map((v, n) => v + (q[n] - v) * f);
  return u < 0.4 ? mix(A, W, u / 0.4) : mix(W, Bl, (u - 0.4) / 0.6);
}

/* The stars' points. With the catalog (assets/sky/stars.json: the Yale
   Bright Star Catalog, every star the eye can see, 9,096 of them, each
   [right ascension h, declination deg, magnitude, temperature /100 K]), each
   one is where it is in the real sky; before it has loaded, the brightest
   (BRIGHT) stand in. Under them all, the faint haze of the Milky Way along
   the galactic plane. */
function starGeometry(touch, catalog) {
  const pos = [], col = [], size = [], phase = [];
  let seed = 20151;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rnd(); return (s - 3) / 0.7071; };
  const add = (v, mag, t, dim) => {
    pos.push(v[0] * 400, v[1] * 400, v[2] * 400);
    // magnitude to a point size in pixels and a brightness
    const b = Math.min(1, dim || clamp(1.45 - mag * 0.15, 0.42, 1.7));
    col.push(t[0] * b, t[1] * b, t[2] * b);
    size.push(clamp(5.6 - mag * 0.75, 1.6, 7.4));
    phase.push(rnd() * 6.283);
  };
  if (catalog) {
    for (let i = 0; i < catalog.length; i += 4) add(unit(catalog[i] * 15 * DEG, catalog[i + 1] * DEG), catalog[i + 2], starTint(catalog[i + 3]));
  } else BRIGHT.forEach((s) => add(unit(s[0] * 15 * DEG, s[1] * DEG), s[2], TINT[s[3]]));
  // the Milky Way's haze: too faint to see one by one, densest toward Sagittarius
  const ag = 192.859 * DEG, dg = 27.128 * DEG, lcp = 122.932 * DEG;
  const m = touch ? 12000 : 30000;
  for (let i = 0; i < m; i++) {
    const toward = rnd() < 0.6;
    const l = toward ? gauss() * 55 * DEG : rnd() * 6.283;
    const b = gauss() * (toward ? 7.5 : 5.5) * DEG;
    const dec = Math.asin(Math.sin(dg) * Math.sin(b) + Math.cos(dg) * Math.cos(b) * Math.cos(lcp - l));
    const ra = ag + Math.atan2(Math.cos(b) * Math.sin(lcp - l), Math.cos(dg) * Math.sin(b) - Math.sin(dg) * Math.cos(b) * Math.cos(lcp - l));
    add(unit(ra, dec), 7, TINT[rnd() < 0.75 ? 0 : 1], 0.22 + 0.2 * rnd());
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("size", new THREE.Float32BufferAttribute(size, 1));
  geo.setAttribute("phase", new THREE.Float32BufferAttribute(phase, 1));
  return geo;
}

function starField(touch) {
  const geo = starGeometry(touch, null);
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, fade: { value: 0 }, px: { value: 1 } },
    vertexShader: `
      attribute float size; attribute float phase; attribute vec3 color;
      uniform float time; uniform float px;
      varying vec3 vColor; varying float vTw;
      void main() {
        vColor = color;
        vTw = 0.78 + 0.22 * sin(time * (1.3 + fract(phase) * 2.2) + phase);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * px * (0.9 + 0.1 * vTw);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float fade; varying vec3 vColor; varying float vTw;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c) * 2.0;
        float a = smoothstep(1.0, 0.0, d);
        a = a * a + 0.6 * smoothstep(0.35, 0.0, d);
        gl_FragColor = vec4(vColor * vTw, a * fade);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.matrixAutoUpdate = false;
  points.renderOrder = -5;
  points.add(milkyWay(mat.uniforms.fade));
  return points;
}

/* The glow of the Milky Way: a band along the galactic plane, brightest and
   widest toward Sagittarius and Scorpius (overhead in a winter night here),
   split by its dark lane, clumpy. Drawn on a sphere in the stars' own
   frame, so it turns with them. */
function milkyWay(fade) {
  const ngp = unit(192.859 * DEG, 27.128 * DEG), gc = unit(266.405 * DEG, -28.936 * DEG);
  const m = new THREE.Mesh(new THREE.SphereGeometry(404, 64, 32), new THREE.ShaderMaterial({
    uniforms: { fade, ngp: { value: new THREE.Vector3(...ngp) }, gc: { value: new THREE.Vector3(...gc) } },
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: "varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform float fade; uniform vec3 ngp; uniform vec3 gc; varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float noise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 d = normalize(vDir);
        float b = asin(clamp(dot(d, ngp), -1.0, 1.0));
        float c = dot(normalize(d - ngp * dot(d, ngp)), gc);          // 1 toward the centre, -1 away
        float width = mix(0.09, 0.2, smoothstep(-0.3, 1.0, c));
        float band = exp(-pow(b / width, 2.0)) * (0.35 + 0.65 * smoothstep(-0.4, 1.0, c));
        float bulge = exp(-pow(b / 0.16, 2.0)) * smoothstep(0.75, 1.0, c);
        float lane = 1.0 - 0.6 * exp(-pow((b - 0.01) / 0.022, 2.0)) * smoothstep(0.1, 0.9, c);
        float clump = 0.55 + 0.6 * noise(d * 9.0) + 0.35 * noise(d * 23.0);
        float v = (band * clump * lane + bulge * 0.8) * 0.2;
        gl_FragColor = vec4(vec3(0.78, 0.8, 0.92) * v * fade, 1.0);
      }`
  }));
  m.frustumCulled = false;
  m.renderOrder = -6;
  return m;
}

/* Shooting stars and comets: one set of points that draws whatever is
   crossing the sky at the moment. */
function streaks() {
  const N = 140;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("size", new THREE.BufferAttribute(new Float32Array(N), 1));
  geo.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(N), 1));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { px: { value: 1 } },
    vertexShader: `
      attribute float size; attribute float alpha; attribute vec3 color; uniform float px;
      varying float vA; varying vec3 vC;
      void main() { vA = alpha; vC = color; gl_PointSize = size * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying float vA; varying vec3 vC;
      void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(vC, a * a * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -3;
  geo.setDrawRange(0, 0);
  return pts;
}

/* The moon's face for a given age, lit from the right (+x): the sprite is
   turned on screen so that side faces the sun. Each pixel is a point on a
   sphere, lit by a sun `elongation` degrees round from behind it, with its
   seas darker and a faint earthshine on the dark side. */
const MARIA = [[0.32, -0.38, 0.26], [0.05, -0.22, 0.22], [-0.3, -0.05, 0.2], [0.28, 0.12, 0.16], [-0.12, 0.3, 0.18], [0.45, -0.05, 0.12], [-0.42, -0.4, 0.14]];
function moonTexture(age) {
  const S = 160, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d"), img = g.createImageData(S, S), r = S * 0.42;
  const psi = age * 2 * Math.PI, sx = Math.sin(psi < Math.PI ? psi : 2 * Math.PI - psi), sz = -Math.cos(psi);
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const x = (i - S / 2 + 0.5) / r, y = (j - S / 2 + 0.5) / r, rr = x * x + y * y, k = (j * S + i) * 4;
      if (rr > 1) continue;
      const z = Math.sqrt(1 - rr);
      let sea = 0;
      MARIA.forEach((m) => { const d = Math.hypot(x - m[0], y - m[1]); if (d < m[2]) sea = Math.max(sea, 1 - d / m[2]); });
      const albedo = 0.95 - 0.32 * Math.min(1, sea * 1.4);
      const light = x * sx + z * sz;                                  // the sun's direction against the surface
      const day = smooth(-0.04, 0.06, light) * (0.55 + 0.45 * Math.pow(Math.max(light, 0), 0.4));
      const v = albedo * Math.max(day, 0.045) * (0.85 + 0.15 * z);
      img.data[k] = 255 * Math.min(1, v * 1.02); img.data[k + 1] = 255 * Math.min(1, v); img.data[k + 2] = 255 * Math.min(1, v * 0.92);
      img.data[k + 3] = 255 * Math.min(1, smooth(1, 0.96, Math.sqrt(rr)) * (day > 0.02 ? 1 : 0.55));
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const KEYS = [   // sun elevation: zenith, horizon (hex), glow strength
  [-18, 0x010208, 0x060a18, 0],
  [-12, 0x040818, 0x111933, 0.05],
  [-6, 0x122045, 0x46486e, 0.55],
  [-2, 0x27407a, 0xc98a6c, 1.0],
  [1.5, 0x3d6aa8, 0xf0b98a, 0.9],
  [8, 0x5290cf, 0xe9dcc6, 0.35],
  [25, 0x4f8fd4, 0xcfe3f2, 0.1],
  [70, 0x3f82cf, 0xd3e6f4, 0.05]
];

export function createSky(scene, o) {
  const center = new THREE.Vector3(o.center.x, 0, -o.center.y);
  const north = (o.north || 0) * DEG;
  // (east, north, up) to three.js axes: the house's +y lies NORTH degrees west of true north
  const toScene = (e, n, u) => new THREE.Vector3(e * Math.cos(north) + n * Math.sin(north), u, -(-e * Math.sin(north) + n * Math.cos(north)));

  const uniforms = {
    zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, glowCol: { value: new THREE.Color(0xff9a52) }, glow: { value: 0 }, sunOn: { value: 1 }
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24), new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform vec3 zenith; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 glowCol;
      uniform float glow; uniform float sunOn;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 col = mix(horizon, zenith, pow(h, 0.5));
        float sd = max(dot(d, normalize(sunDir)), 0.0);
        col += glowCol * glow * (pow(sd, 5.0) * 0.55 + pow(sd, 40.0) * 0.8) * (1.0 - 0.7 * h);
        col = mix(col, vec3(1.0, 0.96, 0.86), smoothstep(0.99955, 0.9998, sd) * sunOn);
        if (d.y < 0.0) col = mix(horizon, ground, min(1.0, -d.y * 5.0));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`
  }));
  dome.position.copy(center);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  scene.add(dome);

  const stars = starField(o.touch);
  // the real stars, as soon as the catalog has loaded
  fetch(o.catalog || "assets/sky/stars.json").then((r) => r.json()).then((d) => {
    const old = stars.geometry;
    stars.geometry = starGeometry(o.touch, d.stars);
    old.dispose();
  }).catch(() => {});
  scene.add(stars);

  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
  moon.scale.set(24, 24, 1);
  moon.renderOrder = -4;
  scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xc9d6ff, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(110, 110, 1);
  halo.renderOrder = -5;
  scene.add(halo);
  const fx = streaks();
  scene.add(fx);

  // The sierras of the Punilla valley: the Sierras Chicas close to the east,
  // the higher Sierras Grandes farther west, lower hills up and down the valley.
  const hill = [0x7d8c5e, 0x6f7d55, 0x8a8f6a, 0x75855a, 0x83906a];
  const bump = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  let hs = 7;
  const hr = () => { hs = (hs * 16807) % 2147483647; return hs / 2147483647; };
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2 + hr() * 0.1, across = Math.abs(Math.cos(a));
    // a stretch of horizon kept clear for a landmark drawn there (o.clear)
    if ((o.clear || []).some((c) => Math.abs(Math.atan2(Math.sin(a - c.a), Math.cos(a - c.a))) < c.w)) continue;
    const d = 165 + hr() * 55 + (Math.cos(a) < 0 ? 45 : 0), r = 42 + hr() * 30, h = 8 + across * 30 + hr() * 12;
    const m = new THREE.Mesh(bump, new THREE.MeshStandardMaterial({ color: hill[i % hill.length], roughness: 1, flatShading: true }));
    m.scale.set(r, h, r * (0.7 + hr() * 0.5));
    m.position.set(center.x + Math.cos(a) * d, -1, center.z + Math.sin(a) * d);
    m.rotation.y = hr() * Math.PI;
    scene.add(m);
  }

  const hemi = new THREE.HemisphereLight(0xf4f7fb, 0xa59e8c, 2.7);
  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(o.touch ? 1024 : 2048, o.touch ? 1024 : 2048);
  const span = o.span || 36;
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: span * 4 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.target.position.copy(center);
  const reach = span * 2;
  scene.add(hemi, ambient, sun, sun.target);
  // lamps: a handful of warm lights that come on as it gets dark
  const lamps = (o.lamps || []).slice(0, o.touch ? 5 : 14).map((p) => {
    const l = new THREE.PointLight(0xffc98a, 0, p[3] || 9, 1.6);
    l.position.set(p[0], p[1], p[2]);
    scene.add(l);
    return { light: l, power: p[4] || 14, room: p[5], off: false };
  });

  const A = new THREE.Color(), B = new THREE.Color();
  const lerpHex = (target, h1, h2, u) => target.copy(A.setHex(h1)).lerp(B.setHex(h2), u);
  let chosen = null, last = -1, st = { el: 45, az: 0, night: 0, hour: 12 };

  function clock() {
    if (chosen !== null) return chosen;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }
  function solve(hours) {
    const D = daysJ2000(new Date(), hours), M = horizonMatrix(sidereal(D)), b = bodies(D);
    const s = apply(M, unit(b.sun.ra, b.sun.dec)), m = apply(M, unit(b.moon.ra, b.moon.dec));
    return { M, sun: s, moon: m, age: b.age, lit: b.lit, el: Math.asin(clamp(s[2], -1, 1)) / DEG };
  }
  /* The clock hour when the sun passes a given elevation, rising or setting. */
  function hourAt(el, rising) {
    const from = rising ? 3 : 12.5, to = rising ? 12.5 : 23;
    let prev = solve(from).el;
    for (let h = from + 0.05; h <= to; h += 0.05) {
      const e = solve(h).el;
      if ((prev - el) * (e - el) <= 0) return h;
      prev = e;
    }
    return rising ? 6 : 20;
  }

  let moonAge = -1;
  function refresh() {
    const hours = clock(), q = solve(hours), el = q.el;
    st = { el, az: (Math.atan2(q.sun[0], q.sun[1]) / DEG + 360) % 360, hour: hours, night: 1 - smooth(-7, 2, el), lit: q.lit };
    // colours between the two nearest keys
    let i = 0;
    while (i < KEYS.length - 2 && el > KEYS[i + 1][0]) i++;
    const k0 = KEYS[i], k1 = KEYS[i + 1], u = clamp((el - k0[0]) / (k1[0] - k0[0]), 0, 1);
    lerpHex(uniforms.zenith.value, k0[1], k1[1], u);
    lerpHex(uniforms.horizon.value, k0[2], k1[2], u);
    uniforms.ground.value.copy(uniforms.horizon.value).multiplyScalar(0.55);
    uniforms.glow.value = k0[3] + (k1[3] - k0[3]) * u;
    uniforms.sunOn.value = smooth(-1.5, 0.5, el);
    const sd = toScene(q.sun[0], q.sun[1], q.sun[2]);
    uniforms.sunDir.value.copy(sd);
    if (scene.fog) scene.fog.color.copy(uniforms.horizon.value);
    if (scene.background && scene.background.isColor) scene.background.copy(uniforms.horizon.value);

    const day = smooth(-4, 9, el), md = toScene(q.moon[0], q.moon[1], q.moon[2]);
    const moonUp = smooth(-2, 6, Math.asin(clamp(q.moon[2], -1, 1)) / DEG);
    // sunlight by day, moonlight by night, from wherever each one is
    if (el > -1.5) {
      sun.position.copy(center).addScaledVector(sd.clone().setY(Math.max(sd.y, 0.06)).normalize(), reach);
      sun.intensity = 3.4 * smooth(-1.5, 12, el);
      lerpHex(sun.color, 0xff8a4a, 0xfff1dc, smooth(0, 22, el));
    } else {
      sun.position.copy(center).addScaledVector(md.clone().setY(Math.max(md.y, 0.12)).normalize(), reach);
      sun.intensity = 0.42 * moonUp * (0.25 + 0.75 * q.lit) * st.night;
      sun.color.setHex(0xa9bcff);
    }
    sun.castShadow = sun.intensity > 0.05;
    hemi.intensity = 0.3 + 2.4 * day;
    lerpHex(hemi.color, 0x33456f, 0xf4f7fb, day);
    lerpHex(hemi.groundColor, 0x15161c, 0xa59e8c, day);
    ambient.intensity = 0.2 + 0.7 * day;
    lerpHex(ambient.color, 0x8e9fd0, 0xffffff, day);
    lamps.forEach((l) => { l.light.intensity = l.off ? 0 : l.power * st.night; });
    if (o.glass) { o.glass.emissive.setHex(0xffc27a); o.glass.emissiveIntensity = 0.55 * st.night; }
    if (o.glow) o.glow.emissiveIntensity = 1.2 + 2.2 * st.night;

    // the stars turn with the sky; they fade in through the twilight
    const M = q.M, e = toScene(M[0][0], M[1][0], M[2][0]), n = toScene(M[0][1], M[1][1], M[2][1]), up = toScene(M[0][2], M[1][2], M[2][2]);
    stars.matrix.makeBasis(e, n, up).setPosition(center);
    stars.matrixWorldNeedsUpdate = true;
    stars.material.uniforms.fade.value = 1 - smooth(-13, -3.5, el);
    stars.visible = stars.material.uniforms.fade.value > 0.01;

    if (Math.abs(q.age - moonAge) > 0.004) {
      if (moon.material.map) moon.material.map.dispose();
      moon.material.map = moonTexture(q.age);
      moon.material.needsUpdate = true;
      moonAge = q.age;
    }
    moon.position.copy(center).addScaledVector(md, 395);
    moon.visible = md.y > -0.02;
    moon.material.opacity = 0.4 + 0.6 * (1 - day);
    halo.position.copy(moon.position);
    halo.visible = moon.visible && st.night > 0.2;
    halo.material.opacity = 0.32 * q.lit * st.night;
    dirs.moon.copy(md); dirs.sun.copy(sd);
  }

  /* The moon's lit side faces the sun, wherever the camera looks. */
  const dirs = { moon: new THREE.Vector3(0, 1, 0), sun: new THREE.Vector3(0, -1, 0) };
  const right = new THREE.Vector3(), upv = new THREE.Vector3(), tang = new THREE.Vector3();
  function turnMoon() {
    if (!o.camera || !moon.visible) return;
    right.set(1, 0, 0).applyQuaternion(o.camera.quaternion);
    upv.set(0, 1, 0).applyQuaternion(o.camera.quaternion);
    tang.copy(dirs.sun).addScaledVector(dirs.moon, -dirs.moon.dot(dirs.sun));
    moon.material.rotation = Math.atan2(tang.dot(upv), tang.dot(right));
  }

  /* On a dark night something crosses the sky every 10 to 60 seconds, at
     random: mostly a shooting star, one time in four a comet zipping by.
     Each is a run of points: a bright head and a fading tail. */
  let nextMeteor = 0, meteor = null, comet = null;
  const rand = Math.random;
  const skyPoint = (az, el) => toScene(Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)).normalize();
  function launch(t, slow) {
    const a = skyPoint(rand() * 2 * Math.PI, (25 + rand() * 50) * DEG);
    // a direction along the sky, falling a little more often than rising
    const side = new THREE.Vector3().crossVectors(a, new THREE.Vector3(0, 1, 0)).normalize();
    const down = new THREE.Vector3().crossVectors(side, a).normalize();
    const turn = (rand() - 0.5) * 2.4;
    const dir = side.multiplyScalar(Math.cos(turn)).addScaledVector(down, -Math.abs(Math.sin(turn)) * (rand() < 0.75 ? 1 : -1)).normalize();
    return slow
      ? { t0: t, life: 5000 + rand() * 4000, from: a, dir, sweep: (14 + rand() * 12) * DEG, tail: (9 + rand() * 7) * DEG }
      : { t0: t, life: 450 + rand() * 900, from: a, dir, sweep: (8 + rand() * 18) * DEG, tail: (3 + rand() * 4) * DEG, bright: rand() < 0.15 };
  }
  const tmp = new THREE.Vector3(), awayFromSun = new THREE.Vector3();
  function drawStreaks(t) {
    const night = stars.material.uniforms.fade.value;
    if (night < 0.4) { fx.geometry.setDrawRange(0, 0); meteor = comet = null; return; }
    if (!nextMeteor) nextMeteor = t + 10000 + rand() * 50000;
    if (t > nextMeteor && !meteor && !comet) {
      if (rand() < 0.25) comet = launch(t, true); else meteor = launch(t, false);
      nextMeteor = t + 10000 + rand() * 50000;
    }
    const pos = fx.geometry.attributes.position.array, size = fx.geometry.attributes.size.array;
    const alpha = fx.geometry.attributes.alpha.array, col = fx.geometry.attributes.color.array;
    let n = 0;
    const put = (v, s, a, r, g, b) => { if (n >= 140) return; pos.set([center.x + v.x * 380, v.y * 380, center.z + v.z * 380], n * 3); size[n] = s; alpha[n] = a * night; col.set([r, g, b], n * 3); n++; };
    const along = (from, dir, ang) => tmp.copy(from).multiplyScalar(Math.cos(ang)).addScaledVector(dir, Math.sin(ang)).normalize();
    if (meteor) {
      const u = (t - meteor.t0) / meteor.life;
      if (u >= 1) meteor = null;
      else {
        const head = meteor.sweep * u, fadeIn = smooth(0, 0.15, u) * (1 - smooth(0.7, 1, u)), k = meteor.bright ? 1.6 : 1;
        for (let i = 0; i < 30; i++) {
          const f = i / 29, ang = head - meteor.tail * f * Math.min(1, u * 4);
          put(along(meteor.from, meteor.dir, ang), (5.5 - 3.8 * f) * k, fadeIn * Math.pow(1 - f, 1.4), 1, 0.97 - 0.2 * f, 0.88 - 0.3 * f);
        }
      }
    }
    if (comet) {
      const u = (t - comet.t0) / comet.life;
      if (u >= 1) comet = null;
      else {
        const vis = smooth(0, 0.2, u) * (1 - smooth(0.8, 1, u));
        const h = along(comet.from, comet.dir, comet.sweep * u).clone();
        put(h, 10, vis, 0.9, 0.97, 1);
        put(h, 30, vis * 0.45, 0.6, 0.85, 1);
        // the tail points away from the sun, along the sky
        awayFromSun.copy(dirs.sun).multiplyScalar(-1).addScaledVector(h, -h.dot(dirs.sun) * -1).normalize();
        awayFromSun.addScaledVector(h, -awayFromSun.dot(h)).normalize();
        for (let i = 1; i < 90; i++) {
          const f = i / 89, spread = (((Math.sin(i * 12.9898) * 43758.5453) % 1) - 0.25) * comet.tail * 0.06 * f;
          const p = along(h, awayFromSun, comet.tail * f).clone();
          const sideways = new THREE.Vector3().crossVectors(p, awayFromSun).normalize();
          p.addScaledVector(sideways, spread).normalize();
          put(p, 14 - 6 * f + 6 * f * f, vis * 0.42 * Math.pow(1 - f, 1.2), 0.7 + 0.3 * f, 0.85, 1);
        }
      }
    }
    ["position", "size", "alpha", "color"].forEach((k) => { fx.geometry.attributes[k].needsUpdate = true; });
    fx.geometry.setDrawRange(0, n);
  }

  return {
    /* An hour of the day (0 to 24), or null to follow the clock again. */
    setHour(h) { chosen = h; last = -1; },
    /* The lamps' lights, each with the room it is in (see lights.js), and a
       way to light them again at once after one is switched. */
    lamps,
    relight() { last = -1; },
    hour: clock,
    hourAt,
    /* Sends a shooting star (or a comet) across the night sky now. */
    shoot(isComet) { const t = performance.now(); if (isComet) comet = launch(t, true); else meteor = launch(t, false); },
    state: () => st,
    update(t) {
      stars.material.uniforms.time.value = t / 1000;
      const px = o.pixelRatio ? o.pixelRatio() : 1;
      stars.material.uniforms.px.value = px;
      fx.material.uniforms.px.value = px;
      if (last < 0 || t - last > 15000) { last = t; refresh(); }
      turnMoon();
      drawStreaks(t);
    }
  };
}
