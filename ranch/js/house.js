/* Ranch: what each thing on the plan and in the 3D walk is, in meters.

   The geometry itself (walls, the rooms' outlines, every door and window,
   the survey's own line work and its sections) is in js/survey.js, made from
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

  /* kind: bedroom, bath, living, service, hall, stair, covered, balcony,
           terrace, roof
     z: the floor's height; h: the ceiling above it ("gable", "vault" and
        "mono" follow a roof, see `tops`)
     fin: the floor finish the 3D view paints; wall: the wall colour
     src: how sure it is: "plan" (drawn on the survey), "photos", "guess"
     lab: where the plan writes the name [x, y]; line: all on one line */
  var F = Z.front, B = Z.back;
  var rooms = [
    // the front block, on the street
    { n: 1, level: 0, kind: "living", name: t("name.entrance"), note: t("note.01"), info: t("info.01"), src: "plan", fin: "marble", z: F, h: 2.7, joists: true, vert: true, lab: [-1.55, 8.9] },
    { n: 2, level: 0, kind: "bedroom", name: t("name.bedroom"), note: t("note.02"), info: t("info.02"), src: "plan", fin: "terracotta", z: F, h: 2.7, lab: [-1.9, 2.5] },
    { n: 3, level: 0, kind: "bedroom", name: t("name.bedroom"), note: t("note.03"), info: t("info.03"), src: "plan", fin: "redtile", z: F, h: "gable", lab: [-3.85, 6.55] },
    { n: 4, level: 0, kind: "living", name: t("name.sitting"), note: t("note.04"), info: t("info.04"), src: "plan", fin: "checker", z: F, h: "gable" },
    { n: 5, level: 0, kind: "bath", name: t("name.bath"), info: t("info.05"), src: "plan", fin: "bathtile", z: F, h: 2.5, tile: "white" },
    { n: 6, level: 0, kind: "bedroom", name: t("name.bedroom"), note: t("note.06"), info: t("info.06"), src: "plan", fin: "redtile", z: F, h: "gable", lab: [-3.9, 14.6] },
    // the south strip: store and three baths, each bedroom's own
    { n: 7, level: 0, kind: "service", name: t("name.store"), info: t("info.07"), src: "plan", fin: "white", z: F, h: 2.7 },
    { n: 8, level: 0, kind: "bath", name: t("name.bath"), info: t("info.08"), src: "plan", fin: "bathtile", z: F, h: 2.7, tile: "white" },
    { n: 9, level: 0, kind: "bath", name: t("name.bath"), info: t("info.09"), src: "plan", fin: "bathtile", z: F, h: 2.7, tile: "pink" },
    { n: 10, level: 0, kind: "bath", name: t("name.bath"), info: t("info.10"), src: "plan", fin: "bathtile", z: F, h: 2.7, tile: "turquoise" },
    // the middle row, under the old roof
    { n: 11, level: 0, kind: "bedroom", name: t("name.bedroom"), info: t("info.11"), src: "plan", fin: "calcareo", z: F, h: "gable", wainscot: true },
    { n: 12, level: 0, kind: "living", name: t("name.dining"), note: t("note.12"), info: t("info.12"), src: "plan", fin: "checker", z: F, h: "gable" },
    { n: 13, level: 0, kind: "bedroom", name: t("name.bedroom"), info: t("info.13"), src: "plan", fin: "calcareo", z: F, h: "gable", wainscot: true },
    { n: 14, level: 0, kind: "hall", name: t("name.corridor"), note: t("note.14"), info: t("info.14"), src: "plan", fin: "white", z: F, h: "gable", beams: true, lab: [-10.45, 10.2] },
    { n: 15, level: 0, kind: "bath", name: t("name.bath"), info: t("info.15"), src: "plan", fin: "bathtile", z: F, h: 2.6, tile: "beige" },
    { n: 34, level: 0, kind: "hall", name: t("name.passage"), info: t("info.34"), src: "plan", fin: "white", z: F, h: 2.7 },
    // kitchen, laundry and the way to the wing
    { n: 16, level: 0, kind: "service", name: t("name.kitchen"), info: t("info.16"), src: "plan", fin: "kitchen", z: F, h: 2.9, tile: "yellow" },
    { n: 17, level: 0, kind: "service", name: t("name.laundry"), info: t("info.17"), src: "plan", fin: "kitchen", z: F, h: 2.3 },
    { n: 18, level: 0, kind: "hall", name: t("name.passage"), info: t("info.18"), src: "plan", fin: "white", z: B, h: 2.45, lab: [-15.7, 3.3] },
    { n: 19, level: 0, kind: "bath", name: t("name.bath"), info: t("info.19"), src: "plan", fin: "bathtile", z: F, h: 2.4, tile: "cream" },
    { n: 20, level: 0, kind: "living", name: t("name.glazed"), note: t("note.20"), info: t("info.20"), src: "plan", fin: "white40", z: B, h: "vault", lab: [-14.3, 9.9] },
    // the guest wing along the south side
    { n: 21, level: 0, kind: "bedroom", name: t("name.guest"), info: t("info.21"), src: "plan", fin: "redtile", z: B, h: 2.55 },
    { n: 22, level: 0, kind: "bath", name: t("name.bath"), info: t("info.22"), src: "plan", fin: "bathtile", z: B, h: 2.55, tile: "white" },
    { n: 23, level: 0, kind: "service", name: t("name.store"), info: t("info.23"), src: "plan", fin: "white", z: B, h: 2.55, lab: [-19.3, 6.2] },
    { n: 24, level: 0, kind: "bedroom", name: t("name.guest"), info: t("info.24"), src: "plan", fin: "calcareo", z: B, h: 2.55, lab: [-22.2, 4.7] },
    { n: 25, level: 0, kind: "bedroom", name: t("name.guest"), info: t("info.25"), src: "plan", fin: "redtile", z: B, h: 2.55 },
    { n: 26, level: 0, kind: "bath", name: t("name.bath"), info: t("info.26"), src: "plan", fin: "bathtile", z: B, h: 2.55, tile: "beige" },
    // the apartment over the drive
    { n: 35, level: 1, kind: "hall", name: t("name.landing"), note: t("note.35"), info: t("info.35"), src: "plan", fin: "cream", z: Z.apt, h: 2.6 },
    { n: 27, level: 1, kind: "living", name: t("name.living"), note: t("note.27"), info: t("info.27"), src: "plan", fin: "cream", z: Z.apt, h: "mono" },
    { n: 28, level: 1, kind: "bath", name: t("name.ensuite"), info: t("info.28"), src: "plan", fin: "bathtile", z: Z.apt, h: "mono", tile: "white" },
    { n: 29, level: 1, kind: "bath", name: t("name.bath"), info: t("info.29"), src: "plan", fin: "bathtile", z: Z.apt, h: "mono", tile: "white" },
    { n: 30, level: 1, kind: "bedroom", name: t("name.bedroom"), note: t("note.30"), info: t("info.30"), src: "plan", fin: "cream", z: Z.apt, h: "mono" },
    { n: 31, level: 1, kind: "service", name: t("name.kitchen"), info: t("info.31"), src: "plan", fin: "cream", z: Z.apt, h: "mono", tile: "white" },
    { n: 32, level: 1, kind: "hall", name: t("name.corridor"), info: t("info.32"), src: "plan", fin: "cream", z: Z.apt, h: "mono", line: true, lab: [-9.9, 21.9] },
    // on the wing's roof
    { n: 33, level: 2, kind: "service", name: t("name.tower"), note: t("note.33"), info: t("info.33"), src: "plan", fin: "concrete", z: Z.terrace, h: 2.15 }
  ];

  /* Spaces without a number: the stair, covered outdoor areas, balconies and
     roof terraces. Their outlines are here; a few are read off the photos. */
  var spaces = [
    { id: "aptstair", level: 0, kind: "stair", name: t("space.aptstair"), note: t("space.aptstair.note"), info: t("info.aptstair"), src: "plan", fin: "white", z: 0, h: 5.6, enclosed: true, nolabel: true },
    { id: "drive", level: 0, kind: "covered", name: t("space.drive"), note: t("space.drive.note"), info: t("info.drive"), src: "plan", fin: "pavers", z: 0,
      poly: [[-0.74, 16.76], [-0.86, 20.17], [-13.56, 21.3], [-13.56, 16.76]] },
    { id: "galeria", level: 0, kind: "covered", name: t("space.galeria"), note: t("space.galeria.note"), info: t("info.galeria"), src: "plan", fin: "terracotta", z: 0.15,
      poly: [[-16.66, 7.15], [-16.66, 8.35], [-26.55, 8.35], [-26.55, 7.15]], outside: [-21.6, 8.75, "m"] },
    { id: "steelstair", level: 0, kind: "stair", name: t("space.steelstair"), info: t("info.steelstair"), src: "plan", z: 0,
      poly: [[-26.55, 4.65], [-26.55, 6.45], [-27.3, 6.45], [-27.3, 4.65]], treads: "y", outside: [-27.75, 6.7, "s"] },
    { id: "grill", level: 0, kind: "covered", name: t("space.grill"), note: t("space.grill.note"), info: t("info.grill"), src: "plan", fin: "gravel", z: 0,
      poly: [[-28.05, 2.9], [-28.05, 7.15], [-33.8, 7.15], [-33.8, 3.45]], lab: [-30.9, 5.2] },
    { id: "carport", level: 0, kind: "covered", name: t("space.carport"), note: t("space.carport.note"), info: t("info.carport"), src: "plan", fin: "gravel", z: 0,
      poly: [[-33.9, 3.85], [-33.5, 12.35], [-37.15, 12.6], [-37.6, 4.0]], lab: [-35.6, 8.2] },

    { id: "wbalcony", level: 1, kind: "balcony", name: t("space.balcony"), info: t("info.wbalcony"), src: "plan", fin: "cream", z: Z.apt,
      poly: [[-11.75, 17.07], [-11.75, 18.53], [-13.49, 18.53], [-13.49, 17.07]], outside: [-13.9, 17.8, "e"] },
    { id: "sbalcony", level: 1, kind: "balcony", name: t("space.balcony.street"), info: t("info.sbalcony"), src: "plan", fin: "cream", z: Z.apt,
      poly: [[-1.15, 16.9], [0.03, 16.9], [0.03, 20.1], [-1.15, 20.25]], outside: [0.5, 18.5, "s"] },

    { id: "terrace", level: 2, kind: "terrace", name: t("space.terrace"), note: t("space.terrace.note"), info: t("info.terrace"), src: "plan", fin: "terrace", z: Z.terrace,
      poly: [[-16.3, 1.82], [-16.3, 5.0], [-18.06, 5.25], [-18.06, 7.15], [-23.2, 7.15], [-23.2, 2.46]], lab: [-20.6, 4.8] },
    { id: "walkway", level: 2, kind: "terrace", name: t("space.walkway"), info: t("info.walkway"), src: "plan", fin: "terrace", z: Z.terrace,
      poly: [[-23.2, 2.46], [-23.2, 3.92], [-26.55, 3.92], [-26.55, 4.65], [-28.05, 4.65], [-28.05, 2.9]], outside: [-28.4, 3.8, "e"] }
  ];

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
    pavers: [[-11.86, 13.26], [-11.86, 16.76], [-13.56, 16.76], [-13.56, 21.3], [-17.3, 21.63], [-17.3, 13.26]],
    gravel: [[-27.4, 7.2], [-33.5, 7.2], [-33.45, 12.4], [-30.2, 12.2], [-27.4, 9.4]],
    tracks: [
      [[-17.3, 20.0], [-22.0, 18.8], [-28.0, 14.4], [-33.45, 11.7]],
      [[-17.3, 18.5], [-22.0, 17.3], [-27.5, 12.9], [-33.45, 9.9]]
    ],
    tree: { c: [-25.0, 19.0], r: 3.1 },
    statue: [-29.6, 20.9],
    bench: [-21.8, 20.4],
    hedge: [[-28.2, 2.75], [-37.5, 3.6]]      // the survey's "cerco verde" along the south line
  };

  /* Furniture, from the listing photos and the two walkthrough videos. at:
     [x, y] is the middle of the piece. rot turns it counterclockwise in
     degrees, 0 facing +y (a bed's foot, a chair's seat, a sofa's front).
     Colors are hex numbers. Baths are furnished from their rectangle
     [x1, y1, x2, y2] and the side their door is on. */
  var GREEN = 0x1f5c46, TEAL = 0x1d6b5a, LIME = 0x4f9a3a, WOOD = 0x6b4423, DARK = 0x3f2716, PINK = 0xd6336c, CHROME = 0xb8b8b8;
  var RATTAN = { frame: 0x8a5a2b, color: 0xc98a5a }, LOUIS = { frame: 0xf2efe6, color: 0xc88f98 };
  var furniture = [
    // 1 entrance hall: pink armchairs by the bedroom's door, tables along the wall
    { level: 0, type: "armchair", at: [-2.0, 5.6], rot: 270, frame: DARK, color: PINK },
    { level: 0, type: "armchair", at: [-2.0, 6.55], rot: 270, frame: DARK, color: PINK },
    { level: 0, type: "cafe", at: [-1.85, 10.4], rot: 0, cloth: 0x7f9a6a },
    { level: 0, type: "cafe", at: [-1.85, 11.9], rot: 0, cloth: 0x7f9a6a },
    { level: 0, type: "pendant", at: [-1.2, 7.2], h: 2.7, globe: true },
    { level: 0, type: "pendant", at: [-1.2, 11.1], h: 2.7, globe: true },
    // 4 sitting room: two Louis chairs and a lamp before the curtained window
    { level: 0, type: "armchair", at: [-3.05, 10.15], rot: 90, frame: LOUIS.frame, color: LOUIS.color },
    { level: 0, type: "armchair", at: [-3.05, 11.85], rot: 90, frame: LOUIS.frame, color: LOUIS.color },
    { level: 0, type: "side", at: [-2.95, 11.0], lamp: true },
    { level: 0, type: "curtain", a: [-2.68, 9.45], b: [-2.68, 12.55], h: 2.3, color: 0x8d8f94 },
    // 12 dining room: tables with mustard cloths, pink settees along the south wall
    { level: 0, type: "dining", at: [-6.3, 11.6], w: 0.8, d: 0.9, cloth: 0xc9a227, chairs: 2 },
    { level: 0, type: "dining", at: [-8.0, 11.6], w: 0.75, d: 0.9, cloth: 0xc9a227, chairs: 2 },
    { level: 0, type: "sofa", at: [-6.3, 9.32], rot: 0, w: 1.5, frame: LOUIS.frame, color: LOUIS.color },
    { level: 0, type: "sofa", at: [-8.05, 9.32], rot: 0, w: 1.3, frame: LOUIS.frame, color: LOUIS.color },
    { level: 0, type: "chandelier", at: [-7.15, 10.75], h: 3.1 },
    // 14 corridor: rattan sofas, the console with its mirror, pink armchairs at the far end
    { level: 0, type: "sofa", at: [-11.25, 7.6], rot: 270, w: 1.7, frame: RATTAN.frame, color: RATTAN.color },
    { level: 0, type: "armchair", at: [-11.2, 9.35], rot: 270, frame: RATTAN.frame, color: RATTAN.color },
    { level: 0, type: "console", at: [-10.45, 15.0], rot: 180 },
    { level: 0, type: "armchair", at: [-11.2, 12.35], rot: 270, frame: DARK, color: PINK },
    { level: 0, type: "armchair", at: [-10.5, 5.42], rot: 0, frame: DARK, color: PINK },
    { level: 0, type: "chandelier", at: [-10.3, 7.4], h: 2.9 },
    { level: 0, type: "chandelier", at: [-10.3, 12.6], h: 2.9 },
    // 2 bedroom: three beds, the built-in wardrobe
    { level: 0, type: "bed", at: [-0.9, 1.5], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-1.9, 1.52], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-2.85, 1.55], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "wardrobe", at: [-2.6, 4.33], rot: 180, w: 1.4 },
    // 3 bedroom: two iron beds, either side of the arch to its bath
    { level: 0, type: "bed", at: [-3.02, 5.98], rot: 0, w: 0.8, color: LIME, frame: CHROME },
    { level: 0, type: "bed", at: [-4.63, 5.98], rot: 0, w: 0.8, color: LIME, frame: CHROME },
    // 6 bedroom: the double bed and the big wardrobe
    { level: 0, type: "bed", at: [-4.2, 13.8], rot: 0, w: 1.4, color: TEAL, frame: DARK },
    { level: 0, type: "wardrobe", at: [-2.98, 13.6], rot: 90, w: 1.3 },
    // 11 and 13: three beds each, under the pine wainscot
    { level: 0, type: "bed", at: [-6.45, 5.55], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    { level: 0, type: "bed", at: [-6.45, 6.8], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    { level: 0, type: "bed", at: [-6.45, 8.05], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    { level: 0, type: "bed", at: [-6.45, 13.3], rot: 90, w: 0.9, color: GREEN },
    { level: 0, type: "bed", at: [-6.45, 14.5], rot: 90, w: 0.9, color: GREEN },
    { level: 0, type: "bed", at: [-6.45, 15.7], rot: 90, w: 0.9, color: GREEN },
    // 16 kitchen, 17 laundry
    { level: 0, type: "counter", at: [-11.85, 4.33], rot: 180, w: 2.3, cabinet: 0x6b3f22, sink: 0.3, stove: -0.75, upper: true },
    { level: 0, type: "fridge", at: [-10.85, 3.3], rot: 90 },
    { level: 0, type: "tub", at: [-14.35, 3.34], rot: 0 },
    // 20 glazed room: the reception desk before the bath's wall, sofas in the garden corner
    { level: 0, type: "desk", at: [-13.2, 6.98], rot: 0, w: 1.9, tufted: true },
    { level: 0, type: "sofa", at: [-16.05, 12.2], rot: 270, w: 1.5, frame: 0xe8e2d4, color: 0xf3eee2 },
    { level: 0, type: "coffee", at: [-15.05, 11.75], rot: 90, w: 0.9, d: 0.5 },
    { level: 0, type: "sofa", at: [-16.05, 8.4], rot: 270, w: 1.7, frame: 0x1c2740, color: 0x1f2c4d },
    { level: 0, type: "cafe", at: [-13.1, 9.3], wood: true },
    { level: 0, type: "cafe", at: [-14.75, 9.2], wood: true },
    { level: 0, type: "pendant", at: [-14.2, 8.4], h: 2.55 },
    { level: 0, type: "pendant", at: [-14.2, 11.3], h: 2.55 },
    // the guest wing
    { level: 0, type: "bed", at: [-17.85, 3.55], rot: 0, w: 1.4, color: TEAL, frame: DARK },
    { level: 0, type: "bed", at: [-21.95, 3.5], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-23.0, 3.6], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-24.7, 4.15], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    { level: 0, type: "bed", at: [-24.7, 5.4], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    // baths
    { level: 0, type: "bath", room: 5, rect: [-1.9, 14.7, -1.0, 16.45], door: "s" },
    { level: 0, type: "bath", room: 8, rect: [-7.7, 2.41, -5.41, 3.55], door: "e" },
    { level: 0, type: "bath", room: 9, rect: [-7.7, 3.71, -5.41, 4.81], door: "e" },
    { level: 0, type: "bath", room: 10, rect: [-9.0, 2.41, -7.9, 4.81], door: "n" },
    { level: 0, type: "bath", room: 15, rect: [-11.66, 15.55, -9.2, 16.45], door: "e" },
    { level: 0, type: "bath", room: 19, rect: [-14.5, 4.95, -12.05, 6.45], door: "e" },
    { level: 0, type: "bath", room: 22, rect: [-20.55, 2.25, -19.36, 4.1], door: "w" },
    { level: 0, type: "bath", room: 26, rect: [-27.85, 2.85, -26.55, 4.45], door: "e" },
    { level: 1, type: "bath", room: 28, rect: [-8.24, 17.07, -6.14, 18.59], door: "w" },
    { level: 1, type: "bath", room: 29, rect: [-8.24, 18.73, -6.14, 19.72], door: "n" },
    // outside: the grill's table, cars, the garden
    { level: 0, type: "dining", at: [-29.4, 5.6], w: 1.0, d: 0.7, chairs: 2, wood: true, metal: true },
    { level: 0, type: "car", at: [-35.6, 5.6], rot: 270, color: 0xf2f2f0 },
    { level: 0, type: "car", at: [-35.5, 8.6], rot: 270, color: 0x2b3a55 },
    { level: 0, type: "bench", at: [-21.8, 20.4], rot: 180 },
    { level: 0, type: "dining", at: [-20.4, 20.9], w: 0.8, round: true, chairs: 3, metal: true },
    { level: 0, type: "plant", at: [-16.95, 8.0] },
    { level: 0, type: "plant", at: [-26.9, 8.7] },
    { level: 0, type: "plant", at: [-17.0, 13.6] },
    { level: 0, type: "bush", at: [-17.2, 9.0] },
    { level: 0, type: "bush", at: [-17.2, 11.4] },
    { level: 0, type: "bush", at: [-18.6, 20.6] },
    { level: 0, type: "bush", at: [-26.6, 21.4] },
    { level: 0, type: "bush", at: [-33.9, 21.6] },
    { level: 0, type: "bush", at: [-35.8, 17.6] },
    // the apartment
    { level: 1, type: "wardrobe", at: [-2.1, 15.55], rot: 270, w: 1.2, pine: true },
    { level: 1, type: "daybed", at: [-4.35, 17.5], rot: 0, color: 0x4b7a3a },
    { level: 1, type: "daybed", at: [-5.55, 18.8], rot: 270, color: 0x4b7a3a },
    { level: 1, type: "dining", at: [-2.85, 19.3], w: 1.2, d: 0.8, chairs: 2, seat: 0xeadfc8, wood: true },
    { level: 1, type: "tv", at: [-3.3, 20.05], rot: 180 },
    { level: 1, type: "bed", at: [-10.2, 18.12], rot: 0, w: 1.4, color: "zebra", frame: 0x1c1c1c },
    { level: 1, type: "counter", at: [-12.97, 20.25], rot: 270, w: 1.7, cabinet: 0xf2f0ea, sink: -0.3, stove: 0.45, upper: true, top: 0x4a3f3f },
    { level: 1, type: "fridge", at: [-12.9, 19.1], rot: 270 },
    // 33 and the roof terrace
    { level: 2, type: "shelf", at: [-25.9, 6.72], rot: 180, w: 1.4, d: 0.35 },
    { level: 2, type: "dining", at: [-20.4, 4.7], w: 0.7, round: true, chairs: 2, metal: true }
  ];

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
  var neighbours = [
    { id: "059041", floors: 1, poly: [[-30.0,25.9],[-6.3,22.7],[-6.2,29.2],[-29.3,32.3]] },
    { id: "059024", floors: 1, poly: [[-32.8,38.2],[-29.9,37.8],[-7.2,34.7],[-7.2,47.8],[-32.9,51.1]] },
    { id: "059026", floors: 1, poly: [[-65.1,1.1],[-44.0,-1.8],[-43.5,4.0],[-45.1,4.3],[-65.1,7.0]] },
    { id: "063016", floors: 1, poly: [[49.9,33.4],[25.9,35.7],[25.4,13.0],[51.1,13.2],[50.8,17.9],[50.6,22.5]] },
    { id: "059027", floors: 1, poly: [[-64.6,-8.1],[-45.9,-10.4],[-45.4,-5.9],[-64.5,-3.3]] },
    { id: "063011", floors: 1, poly: [[16.9,-43.1],[28.8,-43.8],[31.7,-44.1],[39.1,-44.7],[39.7,-38.5],[17.0,-36.2]] },
    { id: "059022", floors: 1, poly: [[-32.3,63.9],[-32.3,66.9],[-41.0,68.0],[-40.8,70.5],[-40.7,73.4],[-46.3,74.1],[-56.1,75.2],[-53.5,66.6],[-44.1,65.3]] },
    { id: "059054", floors: 1, poly: [[-41.4,14.5],[-68.8,18.2],[-68.9,10.7],[-42.1,7.1]] },
    { id: "059028", floors: 1, poly: [[-65.6,-18.4],[-45.7,-20.9],[-45.2,-14.9],[-65.6,-12.4]] },
    { id: "059044", floors: 1, poly: [[-66.1,20.8],[-43.7,17.8],[-43.1,24.0],[-47.2,24.7],[-65.9,27.2]] },
    { id: "059036", floors: 1, poly: [[-38.7,-68.8],[-4.6,-73.1],[-4.6,-56.0],[-43.7,-50.6],[-44.8,-50.5],[-45.4,-56.6],[-37.2,-57.7]] },
    { id: "059046", floors: 1, poly: [[-46.0,35.1],[-68.5,38.2],[-68.5,30.8],[-46.5,27.7]] },
    { id: "059029", floors: 1, poly: [[-27.4,-17.5],[-10.3,-19.7],[-10.3,-6.7],[-21.1,-5.1],[-26.2,-4.4],[-26.6,-8.9],[-27.0,-12.8]] },
    { id: "063012", floors: 1, poly: [[51.3,-35.0],[58.1,-35.4],[58.2,-28.2],[58.2,-27.7],[41.1,-26.8],[24.3,-25.7],[24.2,-32.5],[43.9,-34.5],[50.6,-35.0]] },
    { id: "059020", floors: 1, poly: [[-25.6,74.5],[-5.8,77.2],[-5.8,79.2],[-25.1,81.5]] },
    { id: "059047", floors: 1, poly: [[-41.9,27.0],[-37.0,26.3],[-36.3,33.9],[-39.8,34.3],[-41.3,34.6]] },
    { id: "063010", floors: 1, poly: [[14.3,-55.2],[29.5,-56.2],[30.3,-47.2],[27.3,-47.0],[14.5,-46.3]] },
    { id: "059021", floors: 1, poly: [[-24.8,71.9],[-25.1,65.6],[-3.9,63.2],[-4.2,74.5]] },
    { id: "063015", floors: 1, poly: [[55.6,-14.0],[55.7,-9.1],[55.7,-4.8],[53.1,-4.8],[27.7,-5.0],[27.5,-16.5],[41.4,-17.4],[55.6,-18.1]] },
    { id: "059023", floors: 1, poly: [[-65.3,54.8],[-65.6,43.2],[-47.9,40.9],[-46.8,40.7],[-46.8,52.4]] },
    { id: "059030", floors: 1, poly: [[-55.6,-28.2],[-57.2,-40.8],[-53.6,-41.2],[-50.7,-41.6],[-48.2,-41.9],[-45.2,-42.2],[-44.0,-42.3],[-43.3,-42.5],[-18.3,-45.9],[-18.3,-32.9],[-37.9,-30.4]] },
    { id: "059019", floors: 1, poly: [[-25.6,83.8],[-3.7,81.2],[-4.0,89.9],[-25.7,92.3]] }
  ];
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
