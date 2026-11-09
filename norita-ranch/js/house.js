/* Norita Ranch: everything the plan and the 3D walk draw, in meters.

   x grows to the east and y to the north. (0, 0) is the lot's south-east corner,
   on the López y Planes building line. The lot outline is the Córdoba cadastre's
   (parcel 23-01-29-11-04-059-053); the buildings come from the satellite view,
   Street View, the listing photos and the owners' own corrections. Nothing here
   was measured on site.

   Names are i18n keys, never text: `t()` returns the key untouched and is only
   there so `.claude/skills/i18n/revisar.py` sees which keys are in use.

   src says how sure each room is: "confirmed" by the owners, seen in "photos",
   or a "guess". */
(function () {
  "use strict";
  var t = function (k) { return k; };

  /* The building line is not north-south: it drifts this many meters west for
     every meter north. Rooms on the street take their east side from it. */
  var STREET = 0.1807;
  function streetX(y) { return -STREET * y; }

  var lot = [[0, 0], [-3.577, 19.795], [-40.247, 18.225], [-39.477, 8.153],
             [-38.741, -1.459], [-35.886, -1.330], [-24.507, -0.858]];

  /* Levels: 0 ground, 1 the apartment over the drive, 2 the roof terrace.
     FLOOR is the height of each level's floor. */
  var FLOOR = { 0: 0, 1: 2.9, 2: 2.8 };

  /* kind: bedroom, bath, living, service, hall, stair, covered, balcony,
           terrace, roof
     rect: [x1, y1, x2, y2]; poly replaces it for odd shapes
     street: the east side follows the building line
     inner: a bath drawn inside its room
     enclosed: a space that gets walls in 3D (rooms always do)
     lab: where the plan writes the name: [x, y, anchor], anchor s|m|e
     line: number, name and note on one line */
  var rooms = [
    { n: 1, level: 0, kind: "living", name: t("name.sitting"), note: t("note.01"), info: t("info.01"), src: "photos", rect: [-5.0, 4.8, 0, 13.6], street: true, lab: [-4.7, 6.7, "s"] },
    { n: 2, level: 0, kind: "hall", name: t("name.unknown"), note: t("note.02"), info: t("info.02"), src: "guess", rect: [-8.0, 10.3, -5.0, 13.6] },
    { n: 3, level: 0, kind: "bedroom", name: t("name.guest"), note: t("note.03"), info: t("info.03"), src: "confirmed", rect: [-13.1, 10.3, -8.0, 15.4], lab: [-8.3, 11.4, "e"] },
    { n: 4, level: 0, kind: "bath", name: t("name.bath"), info: t("info.04"), src: "guess", rect: [-13.1, 13.2, -11.3, 15.4], inner: true },
    { n: 5, level: 0, kind: "living", name: t("name.dining"), note: t("note.05"), info: t("info.05"), src: "photos", rect: [-13.1, 4.8, -5.0, 10.3] },
    { n: 6, level: 0, kind: "hall", name: t("name.hallway"), note: t("note.06"), info: t("info.06"), src: "confirmed", rect: [-11.2, -0.1, 0, 1.1], street: true, lab: [-10.9, 0.5, "s"], line: true },
    { n: 7, level: 0, kind: "bedroom", name: t("name.guest"), note: t("note.07"), info: t("info.07"), src: "confirmed", rect: [-6.6, 1.1, 0, 4.8], street: true, lab: [-2.8, 3.3, "m"] },
    { n: 8, level: 0, kind: "bath", name: t("name.bath"), info: t("info.08"), src: "guess", rect: [-6.6, 1.1, -4.8, 3.0], inner: true },
    { n: 9, level: 0, kind: "bedroom", name: t("name.guest"), note: t("note.09"), info: t("info.09"), src: "confirmed", rect: [-11.2, 1.1, -6.6, 4.8], lab: [-10.9, 3.6, "s"] },
    { n: 10, level: 0, kind: "bath", name: t("name.bath"), info: t("info.10"), src: "guess", rect: [-8.4, 1.1, -6.6, 3.0], inner: true },
    { n: 11, level: 0, kind: "hall", name: t("name.hall"), note: t("note.11"), info: t("info.11"), src: "confirmed", rect: [-13.1, -0.3, -11.2, 4.8] },
    { n: 12, level: 0, kind: "service", name: t("name.kitchen"), info: t("info.12"), src: "confirmed", rect: [-16.6, -0.75, -13.1, 3.4] },
    { n: 13, level: 0, kind: "service", name: t("name.laundry"), info: t("info.13"), src: "confirmed", rect: [-18.4, 1.3, -16.6, 3.4] },
    { n: 14, level: 0, kind: "service", name: t("name.pantry"), info: t("info.14"), src: "confirmed", poly: [[-19.4, -0.75], [-16.6, -0.75], [-16.6, 1.3], [-18.4, 1.3], [-18.4, 3.4], [-19.4, 3.4]], lab: [-18.0, 0.27, "m"] },
    { n: 15, level: 0, kind: "living", name: t("name.glazed"), note: t("note.15"), info: t("info.15"), src: "photos", rect: [-19.4, 3.4, -13.1, 10.3] },
    { n: 16, level: 0, kind: "bedroom", name: t("name.guest"), note: t("note.09"), info: t("info.16"), src: "photos", rect: [-23.4, -0.85, -19.4, 3.4], lab: [-23.1, 0.5, "s"] },
    { n: 17, level: 0, kind: "bath", name: t("name.bath"), info: t("info.17"), src: "guess", rect: [-20.9, 1.5, -19.4, 3.4], inner: true },
    { n: 18, level: 0, kind: "bedroom", name: t("name.guest"), note: t("note.09"), info: t("info.18"), src: "photos", rect: [-27.4, -0.95, -23.4, 3.4], lab: [-23.7, 2.3, "e"] },
    { n: 19, level: 0, kind: "bath", name: t("name.bath"), info: t("info.19"), src: "guess", rect: [-27.4, -0.95, -25.8, 1.0], inner: true },

    { n: 20, level: 1, kind: "living", name: t("name.living"), note: t("note.20"), info: t("info.20"), src: "photos", rect: [-16.2, 13.6, -10.4, 17.2] },
    { n: 21, level: 1, kind: "service", name: t("name.kitchen"), note: t("note.21"), info: t("info.21"), src: "guess", rect: [-16.2, 17.2, -12.8, 19.4] },
    { n: 22, level: 1, kind: "bath", name: t("name.bath"), info: t("info.22"), src: "guess", rect: [-12.8, 17.2, -10.4, 19.4] },
    { n: 23, level: 1, kind: "hall", name: t("name.landing"), note: t("note.23"), info: t("info.23"), src: "photos", rect: [-10.4, 13.6, -7.4, 17.0] },
    { n: 24, level: 1, kind: "bath", name: t("name.ensuite"), info: t("info.24"), src: "guess", rect: [-10.4, 17.0, -7.4, 19.4] },
    { n: 25, level: 1, kind: "bedroom", name: t("name.bedroom"), note: t("note.25"), info: t("info.25"), src: "photos", rect: [-7.4, 14.8, 0, 19.4], street: true, lab: [-4.9, 17.1, "m"] },

    { n: 26, level: 2, kind: "service", name: t("name.tower"), note: t("note.26"), info: t("info.26"), src: "guess", rect: [-27.4, 0.0, -24.0, 3.4] }
  ];

  /* Spaces without a number: covered outdoor areas, stairs, balconies. */
  var spaces = [
    { id: "drive", level: 0, kind: "covered", name: t("space.drive"), note: t("space.drive.note"), info: t("info.drive"), src: "photos", rect: [-16.2, 15.4, 0, 19.35], street: true },
    { id: "aptstair", level: 0, kind: "stair", name: t("space.aptstair"), note: t("space.aptstair.note"), info: t("info.aptstair"), src: "photos", rect: [-8.0, 13.6, 0, 15.4], street: true, enclosed: true, lab: [-7.7, 14.5, "s"], treads: "x" },
    { id: "patio", level: 0, kind: "covered", name: t("space.patio"), info: t("info.patio"), src: "guess", rect: [-16.2, 13.6, -13.1, 15.4] },
    { id: "galeria", level: 0, kind: "covered", name: t("space.galeria"), note: t("space.galeria.note"), info: t("info.galeria"), src: "photos", rect: [-27.4, 3.4, -19.4, 5.3] },
    { id: "steelstair", level: 0, kind: "stair", name: t("space.steelstair"), info: t("info.steelstair"), src: "photos", rect: [-28.4, 0.0, -27.4, 2.8], treads: "y", outside: [-28.6, 3.25, "e"] },
    { id: "grill", level: 0, kind: "covered", name: t("space.grill"), note: t("space.grill.note"), info: t("info.grill"), src: "photos", rect: [-32.8, -1.15, -28.4, 2.8] },
    { id: "carport", level: 0, kind: "covered", name: t("space.carport"), note: t("space.carport.note"), info: t("info.carport"), src: "photos", rect: [-37.9, 0.2, -33.1, 7.5] },

    { id: "stairwell", level: 1, kind: "stair", name: t("space.stair"), info: t("info.stairwell"), src: "photos", rect: [-7.4, 13.6, 0, 14.8], street: true, enclosed: true, lab: [-7.1, 14.2, "s"], line: true, treads: "x" },
    { id: "wbalcony", level: 1, kind: "balcony", name: t("space.balcony"), info: t("info.wbalcony"), src: "photos", rect: [-17.1, 14.0, -16.2, 16.8], outside: [-17.35, 15.4, "e"] },
    { id: "sbalcony", level: 1, kind: "balcony", name: t("space.balcony.street"), info: t("info.sbalcony"), src: "photos", poly: [[streetX(16.4), 16.4], [streetX(16.4) + 0.915, 16.4], [streetX(19.4) + 0.915, 19.4], [streetX(19.4), 19.4]], outside: [-1.3, 20.1, "s"] },

    { id: "terrace", level: 2, kind: "terrace", name: t("space.terrace"), note: t("space.terrace.note"), info: t("info.terrace"), src: "photos", rect: [-24.0, -0.8, -15.0, 3.4] },
    { id: "walkway", level: 2, kind: "terrace", name: t("space.walkway"), info: t("info.walkway"), src: "guess", rect: [-28.4, -0.95, -24.0, 0.0], line: true },
    { id: "roofstrip", level: 2, kind: "roof", name: t("roof.plain"), info: t("info.roofstrip"), src: "guess", rect: [-15.0, -0.75, -13.1, 3.4] }
  ];

  /* Roofs one level down, for the upper plan and the 3D roofs. h is the
     height of the roof surface. */
  var roofs = [
    { id: "main", name: t("roof.main"), rect: [-13.1, -0.2, 0, 13.6], street: true, h: 2.7 },
    { id: "glazed", name: t("roof.glazed"), rect: [-19.4, 3.4, -13.1, 10.3], h: 2.6, vault: true },
    { id: "galeria", name: t("roof.galeria"), rect: [-27.4, 3.4, -19.4, 5.3], h: 2.55 },
    { id: "grill", name: t("roof.grill"), rect: [-32.8, -1.15, -28.4, 2.8], h: 2.45 },
    { id: "carport", name: t("roof.carport"), rect: [-37.9, 0.2, -33.1, 7.5], h: 2.45 }
  ];

  var garden = {
    gravel: [-37.9, 2.8, -27.0, 9.0],
    pavers: [-16.2, 10.3, -13.1, 13.6],
    tracks: [
      [[-16.2, 18.2], [-18.5, 17.3], [-20.57, 10.07], [-28.07, 7.07]],
      [[-16.2, 16.6], [-18.5, 15.7], [-19.43, 8.93], [-26.93, 5.93]]
    ],
    tree: { c: [-31.5, 11.8], r: 3.3 },
    statue: [-27.8, 13.4],
    bench: [-25.4, 11.2]
  };

  /* Openings on the building line, as y ranges. */
  var facade = {
    0: { from: 0, to: 15.4, gate: [15.4, 19.35],
         doors: [[0.1, 0.85], [14.0, 14.9]],
         windows: [[2.0, 3.8], [6.3, 8.5], [8.7, 10.9], [11.1, 13.3]] },
    1: { from: 13.6, to: 19.4,
         doors: [[16.6, 18.6]],
         windows: [[13.8, 14.6], [15.2, 16.2]] }
  };

  /* Door openings inside the house: a gap in the wall on x = c or y = c,
     between `from` and `to`. Most are guesses; the plan doesn't draw them. */
  var doors = [
    { level: 0, y: 1.1, from: -4.2, to: -3.4 },
    { level: 0, y: 1.1, from: -10.4, to: -9.6 },
    { level: 0, x: -11.2, from: 0.0, to: 0.9 },
    { level: 0, x: -13.1, from: 0.2, to: 1.0 },
    { level: 0, y: 4.8, from: -12.6, to: -11.7 },
    { level: 0, x: -16.6, from: 2.0, to: 2.8 },
    { level: 0, x: -16.6, from: 0.0, to: 0.8 },
    { level: 0, y: 3.4, from: -15.0, to: -14.0 },
    { level: 0, x: -13.1, from: 6.5, to: 7.5 },
    { level: 0, x: -19.4, from: 6.2, to: 7.2 },
    { level: 0, y: 10.3, from: -15.6, to: -14.6 },
    { level: 0, x: -5.0, from: 5.6, to: 9.6 },
    { level: 0, y: 10.3, from: -7.0, to: -6.2 },
    { level: 0, y: 10.3, from: -10.5, to: -9.7 },
    { level: 0, y: 13.2, from: -12.5, to: -11.8 },
    { level: 0, y: 15.4, from: -9.5, to: -8.7 },
    { level: 0, y: 3.0, from: -6.0, to: -5.3 },
    { level: 0, y: 3.0, from: -7.9, to: -7.2 },
    { level: 0, x: -20.9, from: 2.0, to: 2.7 },
    { level: 0, y: 1.0, from: -26.9, to: -26.2 },
    { level: 0, y: 3.4, from: -22.7, to: -21.9 },
    { level: 0, y: 3.4, from: -27.0, to: -26.2 },
    { level: 1, x: -7.4, from: 13.6, to: 14.8 },
    { level: 1, x: -7.4, from: 15.6, to: 16.4 },
    { level: 1, x: -7.4, from: 17.6, to: 18.4 },
    { level: 1, x: -10.4, from: 14.2, to: 15.8 },
    { level: 1, y: 17.2, from: -15.4, to: -14.4 },
    { level: 1, y: 17.2, from: -12.2, to: -11.4 },
    { level: 1, x: -16.2, from: 14.4, to: 16.4 },
    { level: 2, x: -24.0, from: 1.2, to: 2.0 }
  ];

  /* Walls that are glass: the glazed room's north and west sides. */
  var glass = [
    { level: 0, x: -19.4, from: 3.4, to: 10.3 },
    { level: 0, y: 10.3, from: -19.4, to: -13.1 }
  ];

  /* Railings, 1 m high. `deco` is the brown patterned one over the galería. */
  var railings = [
    { level: 2, y: 3.4, from: -24.0, to: -15.0, deco: true },
    { level: 2, x: -15.0, from: -0.8, to: 3.4 },
    { level: 2, a: [-28.4, -0.95], b: [-15.0, -0.62] },
    { level: 2, x: -28.4, from: -0.95, to: 0.0 },
    { level: 1, x: -17.1, from: 14.0, to: 16.8 },
    { level: 1, y: 14.0, from: -17.1, to: -16.2 },
    { level: 1, y: 16.8, from: -17.1, to: -16.2 },
    { level: 1, a: [streetX(16.4) + 0.915, 16.4], b: [streetX(19.4) + 0.915, 19.4], glass: true },
    { level: 1, a: [streetX(16.4), 16.4], b: [streetX(16.4) + 0.915, 16.4], glass: true },
    { level: 1, a: [streetX(19.4), 19.4], b: [streetX(19.4) + 0.915, 19.4], glass: true }
  ];

  /* Stairs as ramps: the height goes from h1 at `from` to h2 at `to` along
     `axis`, inside `across` on the other axis. */
  var ramps = [
    { id: "aptstair", axis: "x", from: -2.6, to: -7.4, h1: 0, h2: FLOOR[1], across: [13.6, 14.8] },
    { id: "steelstair", axis: "y", from: 2.8, to: 0.0, h1: 0, h2: FLOOR[2], across: [-28.4, -27.4] }
  ];

  function rectPoly(s) {
    var r = s.rect, x1 = r[0], y1 = r[1], x2 = r[2], y2 = r[3];
    if (s.street) return [[x1, y1], [streetX(y1), y1], [streetX(y2), y2], [x1, y2]];
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  }
  function polyOf(s) { return s.poly || rectPoly(s); }
  function idOf(s) { return s.n ? String(s.n) : s.id; }

  window.HOUSE = {
    STREET: STREET,
    streetX: streetX,
    lot: lot,
    FLOOR: FLOOR,
    rooms: rooms,
    spaces: spaces,
    roofs: roofs,
    garden: garden,
    facade: facade,
    doors: doors,
    glass: glass,
    railings: railings,
    ramps: ramps,
    polyOf: polyOf,
    idOf: idOf,
    /* Where the 3D walk starts: across the street, facing the house. */
    start: { x: 9.8, y: 9.0, yaw: Math.PI / 2 }
  };
})();
