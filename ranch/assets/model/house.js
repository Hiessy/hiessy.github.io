/* Ranch: what each thing on the plan and in the 3D walk is, in meters.

   The geometry itself (walls, the rooms' outlines, every door and window,
   the survey's own line work and its sections) is in assets/model/survey.js, made from
   the survey plan of August 2015 ("plano de transcripción y relevamiento",
   1:100). This file says what those shapes are: names, floor finishes,
   heights taken from the survey's sections, roofs, furniture from the
   listing photos, and what is outdoors.

   The axes follow the house's inner walls, not the compass and not quite the
   street: y runs north along them and x grows toward the street, so the lot
   reaches west into negative x. The building line leans 2.4 degrees against
   the walls (x = -STREET * y) and true north is NORTH degrees clockwise from
   +y. (0, 0) is the lot's south corner on the building line.

   Heights (z) are above the sidewalk. The survey's levels: the front block's
   floor +0.35, the glazed room's and the wing's +0.20, the apartment's +3.00.

   Names are i18n keys, never text: `t()` returns the key untouched and is only
   there so `.claude/skills/i18n/revisar.py` sees which keys are in use. */
(function () {
  "use strict";
  var t = function (k) { return k; };
  var SV = window.SURVEY;

  var STREET = 0.852 / 20.168;                       // the building line: x = -STREET * y
  function streetX(y) { return -STREET * y; }
  var OUT = [1 / Math.hypot(1, STREET), STREET / Math.hypot(1, STREET)];   // out to the street
  var NORTH = 7.82;                                  // degrees from +y to true north, clockwise
  var TILT = Math.atan(STREET);

  /* The lot as the survey draws it: 20.19 m on López y Planes. */
  var lot = [[0, 0], [-0.852, 20.168], [-36.673, 23.381], [-37.656, 3.501]];

  /* Floor heights. Levels: 0 ground, 1 the apartment over the drive, 2 the
     wing's roof terrace. */
  var Z = { front: 0.35, back: 0.2, drive: 0, apt: 3.0, terrace: 2.9 };
  var FLOOR = { 0: 0, 1: Z.apt, 2: Z.terrace };

  var F = Z.front, B = Z.back;
  var P = window.HOUSE_PARTS;                         // rooms, furniture and neighbours: assets/model/house/
  var built = P.rooms({ t: t, Z: Z, F: F, B: B });
  var rooms = built.rooms, spaces = built.spaces;

  /* Where walls stop and ceilings sit: one entry for each part of the house,
     a rectangle [x1, y1, x2, y2] that together cover every wall of a level,
     and the height there as z0 + gx * (x - x1): flat, or sloping with the
     depth. Read off the survey's sections A-A (through the old house and the
     glazed room), B-B (the apartment) and D-D (along the front).

     The old house's roof is a gable with its ridge 8.45 m behind the
     building line; rooms under it have sloping ceilings (3.31 m at the front,
     4.60 under the ridge, 2.98 at the back). The glazed room's is a shallow
     arch, 2.48 m at its sides and 3.19 in the middle. The apartment's falls
     4.5 degrees toward the back, from 3.40 m to 2.40. */
  var RIDGE = -8.45, GF = 0.2199, GR = 0.4986, MONO = 0.0787;
  function arch(x) {            // the vault's underside over the glazed room's floor
    var R = 4.378, c = -14.25, d = x - c;
    return Z.back + 2.48 + Math.sqrt(Math.max(0, R * R - d * d)) - (R - 0.71);
  }
  var tops = [
    { id: "hall", level: 0, rect: [-2.41, 4.8, 1.0, 12.68], z: F + 2.7 },
    { id: "south", level: 0, rect: [-9.25, -0.6, 1.0, 4.8], z: F + 2.7 },
    { id: "gableF", level: 0, rect: [RIDGE, 4.8, -2.41, 17.0], z: F + 3.31 + (-2.6 - RIDGE) * GF, g: -GF },
    { id: "gableR", level: 0, rect: [-11.9, 4.8, RIDGE, 17.0], z: F + 4.6 - (RIDGE + 11.9) * GR, g: GR },
    { id: "lobby", level: 0, rect: [-10.2, -0.6, -9.25, 4.8], z: F + 2.7 },
    { id: "kitchenS", level: 0, rect: [-11.9, -0.6, -10.2, 4.8], z: F + 2.9 },
    { id: "kitchenN", level: 0, rect: [-13.85, -0.6, -11.9, 4.95], z: F + 2.9 },
    { id: "laundry", level: 0, rect: [-16.25, -0.6, -13.85, 4.95], z: F + 2.3 },
    { id: "stairbox", level: 0, rect: [-2.41, 12.68, 1.0, 17.0], z: Z.apt - 0.15 },
    { id: "pilasters", level: 0, rect: [-14.5, 17.0, 1.0, 22.5], z: Z.apt - 0.2 },
    { id: "wing", level: 0, rect: [-28.3, -0.6, -16.7, 7.4], z: B + 2.55 },
    { id: "wing0", level: 0, rect: [-16.7, -0.6, -16.25, 4.95], z: B + 2.55 },
    { id: "posts", level: 0, rect: [-39.0, -0.6, -28.3, 14.0], z: 2.3 },
    { id: "landing", level: 1, rect: [-2.7, 12.5, 1.0, 16.8], z: Z.apt + 2.6 },
    { id: "apt", level: 1, rect: [-14.0, 16.8, 1.0, 22.5], z: Z.apt + 3.4 - (-1.2 + 14.0) * MONO, g: MONO },
    { id: "tower", level: 2, rect: [-28.0, 3.0, -22.9, 7.5], z: Z.terrace + 2.15 }
  ];
  // the vault, as the survey draws it: ten flat strips across the glazed room
  (function () {
    var x1 = -16.7, x2 = -11.9, n = 10, w = (x2 - x1) / n;
    for (var i = 0; i < n; i++) {
      var a = x1 + i * w, b = a + w, za = arch(Math.max(a, -16.64)), zb = arch(Math.min(b, -11.86));
      tops.push({ id: "vault" + i, level: 0, vault: true, rect: [a, 4.95, b, 13.3], z: za, g: (zb - za) / w });
    }
  })();

  /* Roofs, for the upper plan's labels and the 3D view. slab: a flat
     concrete roof, its top `t` above the ceiling; sheet: corrugated sheet. */
  var roofs = [
    { id: "main", name: t("roof.main"), kind: "gable", rect: [-12.1, 4.5, -2.2, 16.95], lab: [-7.2, 10.7] },
    { id: "hall", name: t("roof.hall"), kind: "slab", poly: [[-2.41, 4.95], [-0.21, 4.95], [-0.53, 12.6], [-2.41, 12.6]], z: F + 2.7, t: 0.2 },
    { id: "south", name: t("roof.south"), kind: "slab", poly: [[0, 0], [-0.21, 4.95], [-2.41, 4.95], [-2.41, 4.8], [-10.2, 4.8], [-10.2, 0.95]], z: F + 2.7, t: 0.2, lab: [-5.0, 2.5] },
    { id: "kitchen", name: t("roof.kitchen"), kind: "slab", poly: [[-10.2, 0.95], [-10.2, 4.8], [-11.9, 4.8], [-11.9, 4.95], [-13.85, 4.95], [-13.85, 1.29]], z: F + 2.9, t: 0.2 },
    { id: "laundry", name: t("roof.laundry"), kind: "slab", poly: [[-13.85, 1.29], [-13.85, 4.95], [-16.25, 5.05], [-16.25, 1.51]], z: F + 2.3, t: 0.2 },
    { id: "glazed", name: t("roof.glazed"), kind: "vault", rect: [-16.7, 4.95, -11.86, 13.3], lab: [-14.3, 9.1] },
    { id: "wing", name: t("roof.wing"), kind: "slab", poly: [[-16.25, 1.51], [-16.25, 5.05], [-18.0, 5.3], [-18.0, 7.2], [-28.1, 7.2], [-28.1, 4.65], [-28.1, 2.61]], z: B + 2.55, t: 0.15, terrace: true },
    { id: "galeria", name: t("roof.galeria"), kind: "leanto", poly: [[-16.66, 7.2], [-16.66, 8.45], [-26.55, 8.45], [-26.55, 7.2]], z: 2.72, drop: 0.38, lab: [-21.6, 7.82] },
    { id: "grill", name: t("roof.grill"), kind: "sheet", poly: [[-28.1, 2.7], [-28.1, 7.2], [-33.85, 7.2], [-33.85, 3.25]], z: 2.45, lab: [-30.9, 5.0] },
    { id: "carport", name: t("roof.carport"), kind: "sheet", poly: [[-33.7, 3.7], [-33.3, 12.55], [-37.3, 12.8], [-37.75, 3.85]], z: 2.4, lab: [-35.5, 8.2] }
  ];

  /* Solid parapets on top of walls: from a to b, `t` thick, between z0 and z1. */
  var parapets = [
    { a: [0, 0], b: [streetX(4.95), 4.95], t: 0.3, z0: F + 2.9, z1: F + 3.1, inset: 0.15 },          // bedroom 2's front
    { a: [streetX(4.95), 4.95], b: [streetX(12.6), 12.6], t: 0.3, z0: F + 2.7, z1: F + 3.59, inset: 0.15 },  // the hall's front
    { a: [-0.15, 0.15], b: [-16.25, 1.66], t: 0.3, z0: F + 2.9, z1: F + 3.1 },                        // the party wall, by the old house
    { a: [-16.25, 1.66], b: [-28.1, 2.76], t: 0.3, z0: B + 2.7, z1: B + 3.7 },                        // and by the wing: the terrace's parapet
    { a: [-28.1, 2.76], b: [-28.1, 4.65], t: 0.2, z0: B + 2.7, z1: B + 3.6 },                         // the walkway's end
    { a: [-16.3, 1.82], b: [-16.3, 5.0], t: 0.15, z0: B + 2.7, z1: B + 3.6 }                          // the terrace's street end
  ];

  /* Door and window heights above the room's floor, by the survey's table
     of openings (its P and V marks): [sill, head]. Doors start at 0. */
  var HEAD = 2.05;
  var sizes = {
    P1: [0, 2.05], P2: [0, 2.05], P3: [0, 2.05], P4: [0, 2.05], P5: [0, 2.05], P6: [0, 2.75], P7: [0, 2.05], P8: [0, 2.05],
    P9: [0, 2.5], P10: [0, 2.5], PV1: [0, 2.05], PV2: [0, 2.05],
    V1: [0.1, 2.15], V2: [0.1, 2.15], V3: [0.1, 2.15], V4: [1.05, 2.05], V5: [0.9, 2.15], V6: [0.6, 2.15], V7: [1.45, 2.05],
    V8: [1.05, 2.05], V9: [1.15, 2.05], V10: [1.65, 2.05], V11: [1.1, 2.05], V12: [1.1, 2.05], V13: [1.55, 1.95],
    V16: [0, 2.5], V17: [0, 2.5], V18: [0, 2.5], V19: [0, 2.5], V20: [1.05, 2.05], V21: [1.2, 2.05], V22: [0.85, 2.05],
    V23: [1.45, 2.05], V24: [1.2, 1.8], V25: [1.2, 1.8], V26: [0.9, 2.1], V26b: [0.9, 2.1], V27: [1.75, 2.05],
    V28: [1.1, 2.05], V29: [1.1, 2.05]
  };
  /* What each door is made of, where the photos show it: by the index of the
     opening in survey.js. white: a white bath door; yellow: the corridor's
     glazed one; louvre: the bedrooms' cream shutter doors; red: dark red. */
  var doorKind = { P1: "red", P2: "double-glass", P5: "white", P6: "louvre", P8: "glazed-wood", P9: "glass", P10: "glass", PV1: "slide-glass", PV2: "slide-glass" };

  /* Openings the survey doesn't draw as gaps: the kitchen's two high windows
     over its neighbours' roofs, and the vehicle gate on the building line. */
  var extraOpenings = [
    { id: "V14", kind: "high", level: 0, a: [-12.05, 4.8], b: [-13.4, 4.8], t: 0.3, sill: 2.35, head: 2.75 },
    { id: "V15", kind: "high", level: 0, a: [-13.66, 2.45], b: [-13.66, 3.8], t: 0.3, sill: 2.35, head: 2.75 }
  ];
  var gate = { a: [streetX(16.95) - 0.12, 16.95], b: [streetX(20.1) - 0.12, 20.1], h: 1.9 };

  /* The rest of the 3D scene, so walk.js holds no coordinates. */
  var extras = {
    // the apartment's slab over the drive, and its roof with the back overhang
    apartment: { slab: [[0.03, 16.9], [0.03, 20.1], [-1.0, 20.3], [-13.55, 21.5], [-13.55, 16.8], [-1.0, 16.8], [-1.0, 16.9]],
                 roof: [[-0.85, 16.75], [-0.85, 20.45], [-14.2, 21.75], [-14.2, 16.75]], parapet: 6.75 },
    landingRoof: [[-0.45, 12.6], [-0.75, 16.9], [-2.7, 16.9], [-2.7, 12.6]],
    tower: { roof: [[-23.05, 3.65], [-23.05, 7.3], [-26.7, 7.3], [-26.7, 3.65]], tank: [-24.2, 5.4] },
    tanks: [[-7.2, 3.1], [-8.4, 3.2], [-17.6, 3.6]],              // water tanks on the flat roofs, as the roof plan shows
    posts: [[-18.4, 8.3], [-21.1, 8.3], [-23.75, 8.3], [-26.4, 8.3], [-33.6, 7.05]],   // the galeria's; the carports' are in the survey
    balusters: [[[-18.1, 8.3], [-20.35, 8.3]], [[-21.25, 8.3], [-25.2, 8.3]], [[-26.1, 8.3], [-26.5, 8.3]], [[-16.66, 8.3], [-18.1, 8.3]]],
    grill: [-30.6, 3.55, 0],
    chimney: [-12.6, 3.9],
    // the 1.20 m wall along the drive's north side, with the apartment's columns on it
    lowWall: [[-0.86, 20.17], [-13.6, 21.31]],
    labels: { garden: [-24.5, 12.2], tracks: [-22.6, 16.0], gravel: [-31.5, 9.6] },
    map: { x0: -39.6, x1: 3.6, y0: -1.4, y1: 25.2 },
    center: { x: -18, y: 11 },
    trees: [[2.3, 4.3, 0.8], [2.0, 11.9, 0.75]],
    lamp: [2.3, 17.6],
    sign: [0.75, 15.1],          // the hostería's hanging sign on its post
    stone: [[12.61, 13.64], [14.55, 16.9]],   // laja stone on the street front, as y ranges
    // steps where a door leads down: [x1, y1, x2, y2, top]
    steps: [[-0.25, 6.3, 0.2, 7.95, 0.18], [-4.0, 16.76, -5.1, 17.2, 0.18], [-16.66, 6.1, -17.1, 7.15, 0.1], [-16.66, 9.55, -17.1, 10.75, 0.1],
            [-12.9, 13.26, -14.7, 13.7, 0.1], [-20.3, 8.35, -21.3, 8.75, 0.08], [-25.2, 8.35, -26.15, 8.75, 0.08],
            [-17.6, 5.55, -18.0, 6.45, 0.1]]
  };

  var garden = {
    // the drive's pavers stop short of the glazed room: irises and lavender grow in the strip between
    pavers: [[-12.5, 14.6], [-12.5, 16.76], [-13.56, 16.76], [-13.56, 21.3], [-17.3, 21.63], [-17.3, 14.6]],
    // the brick patio along the glazed room's garden side, up to the galería
    patio: [[-16.66, 8.35], [-16.66, 13.2], [-18.2, 13.2], [-18.2, 8.35]],
    gravel: [[-27.4, 7.1], [-33.5, 7.1], [-33.45, 12.4], [-30.2, 12.2], [-27.4, 9.4]],
    tracks: [
      [[-17.3, 20.0], [-22.0, 18.8], [-28.0, 14.4], [-33.45, 11.7]],
      [[-17.3, 18.5], [-22.0, 17.3], [-27.5, 12.9], [-33.45, 9.9]]
    ],
    tree: { c: [-25.0, 19.0], r: 3.1 },
    statue: [-29.6, 20.9],
    bench: [-21.8, 20.4],
    hedge: [[-28.2, 2.75], [-37.5, 3.6]]      // the survey's "cerco verde" along the south line
  };

  var furniture = P.furniture;

  /* Railings, 1 m high, from a to b. deco: the brown patterned one over the
     galería; glass: the street balcony's. */
  var railings = [
    { level: 2, a: [-18.06, 7.15], b: [-23.2, 7.15], deco: true },
    { level: 2, a: [-18.06, 5.25], b: [-18.06, 7.15], deco: true },
    { level: 2, a: [-16.3, 5.0], b: [-18.06, 5.25] },
    { level: 2, a: [-28.05, 2.9], b: [-28.05, 4.65] },
    { level: 2, a: [-27.3, 4.65], b: [-28.05, 4.65] },
    { level: 1, a: [-11.89, 17.07], b: [-13.49, 17.07] },
    { level: 1, a: [-13.49, 17.07], b: [-13.49, 18.53] },
    { level: 1, a: [0.03, 16.9], b: [0.03, 20.1], glass: true },
    { level: 1, a: [-1.0, 16.9], b: [0.03, 16.9], glass: true },
    { level: 1, a: [-1.0, 20.25], b: [0.03, 20.1], glass: true },
    { level: 1, a: [-1.65, 14.82], b: [-2.4, 14.82], steel: true },      // the landing's edge over the stair
    { level: 1, a: [-1.65, 13.55], b: [-1.65, 14.82], steel: true }
  ];

  /* The neighbours' buildings, for the 3D view: each parcel within about 70 m
     from the cadastre, shrunk around its middle to its built area. They were
     worked out along the street; `fromStreet` turns them onto the walls. */
  function fromStreet(p) {
    var c = Math.cos(TILT), s = Math.sin(TILT);
    return [+(p[0] * c - p[1] * s).toFixed(2), +(p[0] * s + p[1] * c).toFixed(2)];
  }
  var neighbours = P.neighbours;
  neighbours.forEach(function (n) { n.poly = n.poly.map(fromStreet); });

  /* Stairs as ramps along a path: the height climbs from h1 to h2 with the
     distance walked along `path`, `w` wide. The apartment's is the survey's
     winder: in from the street door, up along the back of its box, round
     the end and back along the street wall to the landing. The steel one
     climbs steeply beside the wing's last bath to the roof. */
  var ramps = [
    { id: "aptstair", path: [[-2.05, 14.35], [-2.05, 13.12], [-1.25, 13.12], [-1.25, 14.82]], w: 0.78, h1: 0, h2: Z.apt, steps: 16, wood: true,
      rails: [[-1.65, 13.45, -1.65, 13.75, 1.75, 4.2], [-1.65, 13.75, -1.65, 14.82, 2.2, 4.2]] },
    { id: "steelstair", path: [[-26.92, 6.45], [-26.92, 4.65]], w: 0.7, h1: 0, h2: Z.terrace, steps: 15, steel: true, rails: [[-27.3, 4.65, -27.3, 6.45, 0.5, 4.2]] }
  ];

  /* Where the survey cuts its sections, to draw the cut lines on the plan:
     A-A along the depth through the old house, B-B along the drive, C-C
     across the wing, D-D along the front rooms. */
  var cuts = [
    { id: "A", a: [1.2, 6.9], b: [-37.9, 6.9] },
    { id: "B", a: [1.6, 18.75], b: [-16.0, 18.75] },
    { id: "C", a: [-24.6, 1.4], b: [-24.6, 9.2] },
    { id: "D", a: [-1.5, -0.9], b: [-1.5, 21.6] }
  ];

  function toPoly(flat) {
    var p = [];
    for (var i = 0; i < flat.length; i += 2) p.push([flat[i], flat[i + 1]]);
    return p;
  }
  function idOf(s) { return s.n ? String(s.n) : s.id; }
  var polyCache = {};
  function polyOf(s) {
    if (s.poly) return s.poly;
    var id = idOf(s);
    if (!polyCache[id]) {
      if (s.rect) { var r = s.rect; polyCache[id] = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]; }
      else polyCache[id] = toPoly(SV.rooms[id] || []);
    }
    return polyCache[id];
  }
  function inside(x, y, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  /* The room or space under a point, on a level. */
  function at(x, y, level) {
    var all = rooms.concat(spaces);
    for (var i = 0; i < all.length; i++) if (all[i].level === level && inside(x, y, polyOf(all[i]))) return all[i];
    return null;
  }
  /* The top of the walls (and the ceiling) at a point: see `tops`. */
  function topAt(x, y, level) {
    for (var i = tops.length - 1; i >= 0; i--) {
      var z = tops[i], r = z.rect;
      if (z.level === level && x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return z.z + (z.g || 0) * (x - r[0]);
    }
    return FLOOR[level] + 2.6;
  }
  /* Doors and windows with their level, heights and material worked out.
     The tower's are on level 2. */
  var openings = SV.openings.concat(extraOpenings).map(function (o, i) {
    var q = {};
    for (var k in o) q[k] = o[k];
    if (q.level === 1 && q.a[0] < -20) q.level = 2;
    var s = sizes[q.id] || [0, HEAD];
    if (q.sill === undefined) q.sill = /window|block|high/.test(q.kind) ? s[0] : 0;
    if (q.head === undefined) q.head = s[1];
    if (q.kind === "open") q.head = q.id ? s[1] : 2.2;
    if (/door|double|glass|slide/.test(q.kind)) q.leaf = doorKind[q.id] || (q.kind === "slide" ? "slide-glass" : q.glass ? "glass" : "wood");
    q.i = i;
    return q;
  });
  // the corridor's far door is the yellow glazed one; the bedrooms' arch has no leaf
  openings.forEach(function (o) {
    if (o.id === "P7" && Math.abs(o.a[1] - 4.85) < 0.2) o.leaf = "yellow";
    if (o.id === "V13") o.round = true;
    // bedroom 11's louvre doors fold back flat against the corridor's wall, as
    // the photos show them; swinging into the room, one leaf stood in front
    // of its bath's door
    if (o.id === "P6" && Math.abs(o.a[1] - 5.804) < 0.05) { o.swing = 1; o.fold = 172; }
  });
  function wallsOf(level) {
    return (SV.walls[level === 0 ? 0 : 1] || []).map(toPoly).filter(function (p) {
      return level === 0 || (level === 2) === (p[0][0] < -20);
    });
  }

  window.HOUSE = {
    STREET: STREET,
    NORTH: NORTH,
    OUT: OUT,
    streetX: streetX,
    lot: lot,
    Z: Z,
    FLOOR: FLOOR,
    rooms: rooms,
    spaces: spaces,
    tops: tops,
    arch: arch,
    roof: { ridge: RIDGE, gf: GF, gr: GR, mono: MONO },
    roofs: roofs,
    parapets: parapets,
    extras: extras,
    garden: garden,
    neighbours: neighbours,
    gate: gate,
    openings: openings,
    wallsOf: wallsOf,
    furniture: furniture,
    railings: railings,
    ramps: ramps,
    cuts: cuts,
    polyOf: polyOf,
    idOf: idOf,
    inside: inside,
    at: at,
    topAt: topAt,
    /* Where the 3D walk starts: across the street, facing the house. */
    start: { x: 9.6, y: 9.4, yaw: Math.PI / 2 }
  };
})();
