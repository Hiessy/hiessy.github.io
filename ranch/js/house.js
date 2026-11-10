/* Ranch: everything the plan and the 3D walk draw, in meters.

   The rooms come from the survey plan of August 2015 ("plano de transcripción
   y relevamiento", 1:100), read wall by wall. The axes follow the house, not
   the compass: y runs north along the López y Planes building line and x
   grows toward the street, so the lot reaches west into negative x and every
   wall is parallel to an axis. True north is NORTH degrees clockwise from +y.
   (0, 0) is the lot's south-east corner on the building line.

   Names are i18n keys, never text: `t()` returns the key untouched and is only
   there so `.claude/skills/i18n/revisar.py` sees which keys are in use.

   src says how sure each room is: "plan" (drawn on the survey), "photos",
   or a "guess". fin is the floor finish the 3D view paints. */
(function () {
  "use strict";
  var t = function (k) { return k; };

  /* The building line is the y axis itself. */
  var STREET = 0;
  function streetX(y) { return -STREET * y; }
  var NORTH = 10.24;          // degrees from +y to true north, clockwise
  var OUT = [1, 0];           // from the house out to the street

  /* The lot as the survey draws it (19.80 m of frontage). */
  var lot = [[0, 0], [0, 19.8], [-13.0, 21.0], [-36.7, 23.4], [-37.2, 3.0]];

  /* Levels: 0 ground, 1 the apartment over the drive, 2 the roof of the
     guest wing. FLOOR is the height of each level's floor. */
  var FLOOR = { 0: 0, 1: 2.9, 2: 2.8 };

  /* kind: bedroom, bath, living, service, hall, stair, covered, balcony,
           terrace, roof
     rect: [x1, y1, x2, y2]; poly replaces it for odd shapes
     street: the east side is the building line
     enclosed: a space that gets walls in 3D (rooms always do)
     lab: where the plan writes the name: [x, y, anchor], anchor s|m|e
     line: number, name and note on one line */
  var rooms = [
    // the front block, on the street
    { n: 1, level: 0, kind: "living", name: t("name.entrance"), note: t("note.01"), info: t("info.01"), src: "plan", fin: "calcareo", rect: [-2.2, 4.65, 0, 12.35], street: true },
    { n: 2, level: 0, kind: "bedroom", name: t("name.bedroom"), note: t("note.02"), info: t("info.02"), src: "plan", fin: "terracotta", poly: [[-5, 0.5], [0, 0.5], [0, 4.65], [-3.2, 4.65], [-3.2, 3.45], [-5, 3.45]], lab: [-2.3, 2.2, "m"] },
    { n: 3, level: 0, kind: "bedroom", name: t("name.bedroom"), info: t("info.03"), src: "plan", fin: "parquet", poly: [[-5, 3.45], [-3.2, 3.45], [-3.2, 4.65], [-2.2, 4.65], [-2.2, 7.95], [-5, 7.95]], lab: [-3.6, 6.3, "m"] },
    { n: 4, level: 0, kind: "living", name: t("name.sitting"), note: t("note.04"), info: t("info.04"), src: "plan", fin: "white", rect: [-5, 7.95, -2.2, 12.35] },
    { n: 5, level: 0, kind: "bath", name: t("name.bath"), info: t("info.05"), src: "plan", fin: "bathtile", rect: [-1.7, 14.25, 0, 16.15], street: true },
    { n: 6, level: 0, kind: "bedroom", name: t("name.bedroom"), note: t("note.06"), info: t("info.06"), src: "plan", fin: "parquet", poly: [[-5, 12.35], [-2.1, 12.35], [-2.1, 14.25], [-1.7, 14.25], [-1.7, 16.15], [-5, 16.15]], lab: [-3.4, 14.6, "m"] },
    // the middle row
    { n: 7, level: 0, kind: "service", name: t("name.store"), info: t("info.07"), src: "plan", fin: "white", rect: [-8.5, 0.9, -5, 2.2] },
    { n: 8, level: 0, kind: "bath", name: t("name.bath"), info: t("info.08"), src: "plan", fin: "bathtile", rect: [-7.2, 2.2, -5, 3.35] },
    { n: 9, level: 0, kind: "bath", name: t("name.bath"), info: t("info.09"), src: "plan", fin: "bathtile", rect: [-7.2, 3.35, -5, 4.65] },
    { n: 10, level: 0, kind: "bath", name: t("name.bath"), info: t("info.10"), src: "plan", fin: "bathtile", rect: [-8.5, 2.2, -7.2, 4.65] },
    { n: 11, level: 0, kind: "bedroom", name: t("name.bedroom"), info: t("info.11"), src: "plan", fin: "calcareo", rect: [-8.5, 4.65, -5, 8.75] },
    { n: 12, level: 0, kind: "living", name: t("name.dining"), note: t("note.12"), info: t("info.12"), src: "plan", fin: "checker", rect: [-8.5, 8.75, -5, 12.35] },
    { n: 13, level: 0, kind: "bedroom", name: t("name.bedroom"), info: t("info.13"), src: "plan", fin: "calcareo", rect: [-8.5, 12.35, -5, 16.15] },
    { n: 14, level: 0, kind: "hall", name: t("name.corridor"), info: t("info.14"), src: "plan", fin: "white", rect: [-11.15, 4.65, -8.5, 15.1], lab: [-9.85, 10.6, "m"] },
    { n: 15, level: 0, kind: "bath", name: t("name.bath"), info: t("info.15"), src: "guess", fin: "bathtile", rect: [-11.15, 15.1, -8.5, 16.15] },
    { n: 34, level: 0, kind: "hall", name: t("name.passage"), info: t("info.34"), src: "plan", fin: "white", rect: [-9.75, 1.0, -8.5, 4.65] },
    // kitchen, laundry and the way to the wing
    { n: 16, level: 0, kind: "service", name: t("name.kitchen"), info: t("info.16"), src: "plan", fin: "kitchen", rect: [-13.1, 1.0, -9.75, 4.65] },
    { n: 17, level: 0, kind: "service", name: t("name.laundry"), info: t("info.17"), src: "plan", fin: "kitchen", rect: [-14.25, 2.8, -13.1, 4.75] },
    { n: 18, level: 0, kind: "hall", name: t("name.passage"), info: t("info.18"), src: "plan", fin: "white", poly: [[-15.6, 1.3], [-13.1, 1.3], [-13.1, 2.8], [-14.25, 2.8], [-14.25, 4.75], [-15.6, 4.75]], lab: [-14.9, 2.6, "m"] },
    { n: 19, level: 0, kind: "bath", name: t("name.bath"), info: t("info.19"), src: "plan", fin: "bathtile", rect: [-13.7, 4.75, -11.15, 6.45] },
    { n: 20, level: 0, kind: "living", name: t("name.glazed"), note: t("note.20"), info: t("info.20"), src: "plan", fin: "white", poly: [[-16.0, 5.05], [-15.6, 5.05], [-15.6, 4.75], [-13.7, 4.75], [-13.7, 6.45], [-11.15, 6.45], [-11.15, 12.95], [-16.0, 12.95]], lab: [-13.6, 9.7, "m"] },
    // the guest wing along the south side
    { n: 21, level: 0, kind: "bedroom", name: t("name.guest"), info: t("info.21"), src: "plan", fin: "parquet", rect: [-19.0, 1.6, -15.6, 5.05] },
    { n: 22, level: 0, kind: "bath", name: t("name.bath"), info: t("info.22"), src: "plan", fin: "bathtile", rect: [-19.95, 2.05, -19.0, 4.0] },
    { n: 23, level: 0, kind: "service", name: t("name.store"), info: t("info.23"), src: "plan", fin: "white", poly: [[-19.95, 4.0], [-19.0, 4.0], [-19.0, 5.05], [-17.45, 5.05], [-17.45, 7.0], [-19.95, 7.0]], lab: [-18.6, 6.0, "m"] },
    { n: 24, level: 0, kind: "bedroom", name: t("name.guest"), info: t("info.24"), src: "plan", fin: "calcareo", rect: [-23.1, 2.2, -19.95, 7.0] },
    { n: 25, level: 0, kind: "bedroom", name: t("name.guest"), info: t("info.25"), src: "plan", fin: "parquet", rect: [-26.05, 2.5, -23.1, 7.0] },
    { n: 26, level: 0, kind: "bath", name: t("name.bath"), info: t("info.26"), src: "plan", fin: "bathtile", rect: [-27.35, 2.75, -26.05, 4.45] },
    // the apartment over the drive
    { n: 27, level: 1, kind: "living", name: t("name.living"), note: t("note.27"), info: t("info.27"), src: "plan", fin: "cream", rect: [-6.05, 16.15, 0, 20.0], street: true },
    { n: 28, level: 1, kind: "bath", name: t("name.ensuite"), info: t("info.28"), src: "plan", fin: "bathtile", rect: [-8.2, 16.15, -6.05, 17.85] },
    { n: 29, level: 1, kind: "bath", name: t("name.bath"), info: t("info.29"), src: "plan", fin: "bathtile", rect: [-8.2, 17.85, -6.05, 19.05] },
    { n: 30, level: 1, kind: "bedroom", name: t("name.bedroom"), note: t("note.30"), info: t("info.30"), src: "plan", fin: "cream", rect: [-11.0, 16.15, -8.2, 19.05] },
    { n: 31, level: 1, kind: "service", name: t("name.kitchen"), info: t("info.31"), src: "plan", fin: "cream", rect: [-13.1, 18.4, -11.0, 20.6] },
    { n: 32, level: 1, kind: "hall", name: t("name.corridor"), info: t("info.32"), src: "plan", fin: "cream", rect: [-11.0, 19.05, -6.05, 20.05], line: true, lab: [-10.8, 19.55, "s"] },
    // on the wing's roof
    { n: 35, level: 1, kind: "hall", name: t("name.landing"), note: t("note.35"), info: t("info.35"), src: "plan", fin: "cream", poly: [[-1.05, 13.3], [0, 13.3], [0, 16.15], [-2.1, 16.15], [-2.1, 14.25], [-1.05, 14.25]], lab: [-1.05, 15.2, "m"] },
    { n: 33, level: 2, kind: "service", name: t("name.tower"), note: t("note.33"), info: t("info.33"), src: "plan", fin: "concrete", rect: [-26.95, 3.5, -23.6, 6.05] }
  ];

  /* Spaces without a number: covered outdoor areas, stairs, balconies. */
  var spaces = [
    { id: "aptstair", level: 0, kind: "stair", name: t("space.aptstair"), note: t("space.aptstair.note"), info: t("info.aptstair"), src: "plan", fin: "white", rect: [-2.1, 12.35, 0, 14.25], street: true, enclosed: true, treads: "y" },
    { id: "drive", level: 0, kind: "covered", name: t("space.drive"), note: t("space.drive.note"), info: t("info.drive"), src: "plan", fin: "pavers", rect: [-13.0, 16.15, 0, 19.8], street: true },
    { id: "galeria", level: 0, kind: "covered", name: t("space.galeria"), note: t("space.galeria.note"), info: t("info.galeria"), src: "plan", fin: "terracotta", poly: [[-17.45, 5.05], [-16.0, 5.05], [-16.0, 7.85], [-26.05, 7.85], [-26.05, 7.0], [-17.45, 7.0]], outside: [-21.0, 8.3, "m"] },
    { id: "steelstair", level: 0, kind: "stair", name: t("space.steelstair"), info: t("info.steelstair"), src: "photos", rect: [-28.45, 4.4, -27.45, 7.2], treads: "y", outside: [-28.6, 7.6, "e"] },
    { id: "grill", level: 0, kind: "covered", name: t("space.grill"), note: t("space.grill.note"), info: t("info.grill"), src: "photos", fin: "gravel", rect: [-30.0, 3.2, -28.45, 7.4] },
    { id: "carport", level: 0, kind: "covered", name: t("space.carport"), note: t("space.carport.note"), info: t("info.carport"), src: "plan", fin: "gravel", poly: [[-30.0, 3.2], [-30.0, 7.4], [-33.0, 7.4], [-33.0, 12.5], [-36.9, 12.5], [-36.9, 3.4]], lab: [-34.9, 8.0, "m"] },

    { id: "stairwell", level: 1, kind: "stair", name: t("space.aptstair"), info: t("info.stairwell"), src: "plan", rect: [-2.1, 12.35, 0, 14.25], street: true, enclosed: true },
    { id: "wbalcony", level: 1, kind: "balcony", name: t("space.balcony"), info: t("info.wbalcony"), src: "plan", fin: "cream", rect: [-13.1, 16.15, -11.0, 18.4], outside: [-13.4, 17.4, "e"] },
    { id: "sbalcony", level: 1, kind: "balcony", name: t("space.balcony.street"), info: t("info.sbalcony"), src: "plan", fin: "cream", poly: [[0, 16.45], [0.9, 16.45], [0.9, 19.8], [0, 19.8]], outside: [1.2, 18.1, "s"] },

    { id: "terrace", level: 2, kind: "terrace", name: t("space.terrace"), note: t("space.terrace.note"), info: t("info.terrace"), src: "plan", fin: "terrace", rect: [-23.6, 2.6, -15.95, 7.0] },
    { id: "walkway", level: 2, kind: "terrace", name: t("space.walkway"), info: t("info.walkway"), src: "guess", fin: "terrace", poly: [[-28.45, 2.7], [-28.45, 4.4], [-27.45, 4.4], [-27.45, 7.0], [-23.6, 7.0], [-23.6, 6.05], [-26.95, 6.05], [-26.95, 2.7]], outside: [-27.7, 1.9, "s"] }
  ];

  /* Roofs one level down, for the upper plan and the 3D roofs. h is the
     height of the roof surface. The first is the main house's gable, the
     second the glazed room's vault; the rest are flat lean-tos. */
  var roofs = [
    { id: "main", name: t("roof.main"), rect: [-11.15, 0.4, 0, 12.35], street: true, h: 2.7 },
    { id: "glazed", name: t("roof.glazed"), rect: [-16.0, 4.75, -11.15, 12.95], h: 2.6, vault: true },
    { id: "front2", name: t("roof.front2"), poly: [[-11.15, 12.35], [-2.1, 12.35], [-2.1, 14.25], [-1.7, 14.25], [-1.7, 16.15], [-11.15, 16.15]], h: 2.7 },
    { id: "rear", name: t("roof.rear"), rect: [-16.0, 1.0, -11.15, 4.75], h: 2.6 },
    { id: "galeria", name: t("roof.galeria"), poly: [[-17.45, 5.05], [-16.0, 5.05], [-16.0, 7.85], [-26.05, 7.85], [-26.05, 7.0], [-17.45, 7.0]], h: 2.55 },
    { id: "grill", name: t("roof.grill"), rect: [-30.0, 3.2, -28.45, 7.4], h: 2.45 },
    { id: "carport", name: t("roof.carport"), poly: [[-30.0, 3.2], [-30.0, 7.4], [-33.0, 7.4], [-33.0, 12.5], [-36.9, 12.5], [-36.9, 3.4]], h: 2.45 }
  ];

  /* The rest of the 3D scene, so walk.js holds no coordinates:
     wing: the roof slab over the guest wing (the terrace's floor);
     apartment: the apartment's flat roof and ceiling;
     tower: the room on the wing's roof, with its water tank;
     posts: covered areas' posts; columns: piers along the drive;
     balusters: the galería's low railing; grill and chimney positions. */
  var extras = {
    wing: [-27.45, 1.6, -15.95, 7.0],
    landing: [-28.45, 2.7, -27.45, 4.4],   // top of the steel stair
    apartment: [-13.1, 12.35, 0, 20.6],
    tower: { rect: [-26.95, 3.5, -23.6, 6.05], tank: [-25.3, 4.8] },
    posts: [[-26.05, 7.8], [-23.5, 7.8], [-21.0, 7.8], [-18.5, 7.8], [-16.05, 7.8], [-30.0, 7.35], [-33.0, 7.35], [-33.0, 12.45], [-36.85, 12.45], [-29.95, 3.25]],
    columns: [-4.4, -7.4, -10.4, -12.9],
    balusters: [[-26.05, -22.0], [-21.0, -17.45]],
    balusterY: 7.85,
    grill: [-29.9, 5.4, 90],
    chimney: [-13.6, 3.2],
    lowWall: -13.0,             // the low wall along the drive ends here
    labels: { garden: [-24.0, 10.6], tracks: [-24.0, 15.9], gravel: [-31.5, 9.6] },
    map: { x0: -39.2, x1: 3.4, y0: -1.0, y1: 24.6 },
    center: { x: -18, y: 11 },
    trees: [[2.2, 4.0, 0.8], [2.2, 11.6, 0.75]],
    lamp: [2.4, 17.0],
    // the hostería's hanging sign on its post by the apartment door
    sign: [0.75, 14.4],
    // low steps outside the doors that lead out of the house, where the
    // survey marks the floor higher than the garden: [x1, y1, x2, y2, height]
    steps: [[-4.4, 16.15, -3.4, 16.5, 0.12], [-16.4, 6.25, -16.0, 7.35, 0.12], [-16.4, 9.55, -16.0, 10.65, 0.12],
            [-13.65, 12.95, -12.55, 13.3, 0.12], [-22.0, 7.85, -21.0, 8.25, 0.1], [-17.4, 7.85, -16.4, 8.25, 0.1]]
  };

  var garden = {
    gravel: [-33.0, 7.4, -30.0, 12.5],
    pavers: [-16.0, 12.95, -13.0, 16.15],
    tracks: [
      [[-13.0, 18.3], [-19.5, 16.6], [-27.0, 13.2], [-33.0, 11.4]],
      [[-13.0, 16.8], [-19.5, 15.1], [-26.5, 11.7], [-33.0, 9.6]]
    ],
    tree: { c: [-24.5, 18.6], r: 3.1 },
    statue: [-29.0, 20.6],
    bench: [-21.6, 19.9]
  };

  /* Openings on the building line, as y ranges, from the survey's table of
     openings and its street elevation: the bedroom window (V4), the main entrance
     (P2, a 1.40 m double door), two big hall windows (V2, V1), the
     apartment's street door (P1) and the vehicle gate. */
  var facade = {
    0: { from: 0, to: 16.15,
         gate: { from: 16.15, to: 19.8, kind: "gate" },
         doors: [{ from: 6.4, to: 7.8, kind: "double-glass", name: t("facade.entrance") },
                 { from: 12.8, to: 13.7, kind: "red", name: t("facade.aptdoor") }],
         windows: [[1.6, 3.2], [5.05, 6.2], [8.7, 10.6], [10.75, 12.25]],
         bars: [1.6, 3.2],
         stone: [[12.35, 12.8], [13.7, 16.15]] },
    1: { from: 12.35, to: 19.8,
         doors: [{ from: 16.8, to: 18.8, kind: "slide-glass" }],
         windows: [[12.7, 13.9], [14.6, 15.9]] }
  };

  /* Door openings inside the house: a gap in the wall on x = c or y = c,
     between `from` and `to`. kind: wood, white (baths), glass, slide-glass
     or open (a doorway with no door); swing: the side it opens into, n s e w
     (n is +y, e is +x, toward the street). Placed after the survey's door
     marks; which way each swings is read loosely. */
  var doors = [
    { level: 0, y: 4.65, from: -1.35, to: -0.45, kind: "wood", swing: "s" },
    { level: 0, x: -2.2, from: 8.35, to: 9.25, kind: "glass", swing: "w" },
    { level: 0, x: -5.0, from: 9.4, to: 12, kind: "open" },
    { level: 0, x: -5.0, from: 1.0, to: 1.9, kind: "wood", swing: "w" },
    { level: 0, x: -8.5, from: 1.0, to: 1.9, kind: "wood", swing: "w" },
    { level: 0, x: -5.0, from: 2.42, to: 3.33, kind: "white", swing: "w" },
    { level: 0, x: -5.0, from: 3.58, to: 4.48, kind: "white", swing: "w" },
    { level: 0, y: 4.65, from: -8.4, to: -7.5, kind: "white", swing: "s" },
    { level: 0, x: -8.5, from: 6.25, to: 7.15, kind: "wood", swing: "e" },
    { level: 0, x: -8.5, from: 10.4, to: 11.4, kind: "wood", swing: "e" },
    { level: 0, x: -8.5, from: 13.85, to: 14.75, kind: "wood", swing: "e" },
    { level: 0, y: 4.65, from: -9.55, to: -8.65, kind: "wood", swing: "s" },
    { level: 0, x: -9.75, from: 1.15, to: 2.05, kind: "wood", swing: "w" },
    { level: 0, x: -13.1, from: 3.65, to: 4.55, kind: "white", swing: "w" },
    { level: 0, x: -13.1, from: 1.35, to: 2.25, kind: "wood", swing: "w" },
    { level: 0, x: -11.15, from: 5, to: 5.9, kind: "white", swing: "w" },
    { level: 0, x: -16.0, from: 6.3, to: 7.3, kind: "glass", swing: "w" },
    { level: 0, x: -16.0, from: 9.6, to: 10.6, kind: "glass", swing: "w" },
    { level: 0, y: 12.95, from: -13.6, to: -12.6, kind: "glass", swing: "n" },
    { level: 0, y: 5.05, from: -17.35, to: -16.45, kind: "wood", swing: "s" },
    { level: 0, x: -19.95, from: 2.6, to: 3.5, kind: "white", swing: "e" },
    { level: 0, x: -17.45, from: 5.3, to: 6.2, kind: "wood", swing: "w" },
    { level: 0, y: 7.0, from: -20.95, to: -20.05, kind: "wood", swing: "s" },
    { level: 0, y: 7.0, from: -25.45, to: -24.55, kind: "wood", swing: "s" },
    { level: 0, x: -26.05, from: 3.2, to: 4.1, kind: "white", swing: "w" },
    { level: 0, y: 7.95, from: -3.6, to: -2.7, kind: "wood", swing: "s" },
    { level: 0, y: 16.15, from: -4.35, to: -3.45, kind: "wood", swing: "s" },
    { level: 0, y: 14.25, from: -1.0, to: -0.1, kind: "white", swing: "n" },
    { level: 0, x: -11.15, from: 10.15, to: 11.1, kind: "glass", swing: "w" },
    { level: 0, x: -8.5, from: 15.2, to: 16.1, kind: "white", swing: "e" },
    { level: 0, x: -15.6, from: 1.45, to: 2.45, kind: "open" },
    { level: 0, y: 4.75, from: -15.5, to: -14.6, kind: "glass", swing: "n" },
    { level: 1, y: 14.25, from: -2.1, to: 0, kind: "open" },
    { level: 1, y: 13.3, from: -1.05, to: 0, kind: "open" },
    { level: 1, x: -1.05, from: 13.3, to: 14.25, kind: "open" },
    { level: 1, y: 16.15, from: -1.55, to: -0.6, kind: "wood", swing: "n" },
    { level: 1, x: -6.05, from: 19.08, to: 20.0, kind: "open" },
    { level: 1, x: -8.2, from: 16.6, to: 17.5, kind: "white", swing: "w" },
    { level: 1, y: 19.05, from: -7.6, to: -6.7, kind: "white", swing: "n" },
    { level: 1, y: 19.05, from: -9.15, to: -8.25, kind: "wood", swing: "s" },
    { level: 1, x: -11.0, from: 19.1, to: 20.0, kind: "open" },
    { level: 1, x: -11.0, from: 16.25, to: 17.6, kind: "slide-glass" },
    { level: 2, x: -26.95, from: 3.75, to: 4.65, kind: "wood", swing: "e" }
  ];

  /* Furniture, from the listing photos and the two walkthrough videos. at:
     [x, y] is the middle of the piece, set so its back touches the wall's
     face (walls are 15 cm thick and room edges run down their middle). rot
     turns it counterclockwise in degrees, 0 facing +y (a bed's foot, a
     chair's seat, a sofa's front). Colors are hex numbers. Baths are
     furnished from their outline and the side their door is on. */
  var GREEN = 0x1f5c46, TEAL = 0x1d6b5a, WOOD = 0x6b4423, DARK = 0x3f2716, PINK = 0xd6336c;
  var furniture = [
    // 1 entrance hall: pink armchairs, café tables by the big windows
    { level: 0, type: "armchair", at: [-1.8, 6.4], rot: 270, frame: DARK, color: PINK },
    { level: 0, type: "armchair", at: [-1.8, 7.5], rot: 270, frame: DARK, color: PINK },
    { level: 0, type: "cafe", at: [-1.0, 9.95], rot: 90 },
    { level: 0, type: "cafe", at: [-1.0, 11.55], rot: 90 },
    // 4 sitting room
    { level: 0, type: "sofa", at: [-2.7, 10.6], rot: 90, w: 1.7, frame: 0x8a5a2b, color: 0xd98c5f },
    { level: 0, type: "coffee", at: [-3.65, 10.6], rot: 90, w: 1.0, d: 0.55 },
    { level: 0, type: "armchair", at: [-4.4, 8.5], rot: 0, frame: 0x8a5a2b, color: 0xd98c5f },
    // 12 dining room
    { level: 0, type: "dining", at: [-6.75, 10.55], w: 0.9, d: 1.4, cloth: 0xc9a227 },
    { level: 0, type: "chandelier", at: [-6.75, 10.55], h: 2.7 },
    // 14 corridor: the rattan sofas and chandeliers of the photos
    { level: 0, type: "sofa", at: [-10.85, 13.4], rot: 270, w: 1.7, frame: 0x8a5a2b, color: 0xc98a5a },
    { level: 0, type: "armchair", at: [-9.0, 12.6], rot: 90, frame: 0x8a5a2b, color: 0xc98a5a },
    { level: 0, type: "console", at: [-10.9, 7.0], rot: 270 },
    { level: 0, type: "chandelier", at: [-10.0, 7.0], h: 2.7 },
    { level: 0, type: "chandelier", at: [-10.0, 12.0], h: 2.7 },
    // bedrooms in the front block
    { level: 0, type: "bed", at: [-3.75, 1.575], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-2.35, 1.575], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "nightstand", at: [-3.05, 0.73], rot: 0, w: 0.3 },
    { level: 0, type: "bed", at: [-3.9, 6.2], rot: 270, w: 1.45, color: GREEN, frame: DARK },
    { level: 0, type: "nightstand", at: [-4.75, 7.35], rot: 270 },
    { level: 0, type: "bed", at: [-3.9, 13.55], rot: 270, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "bed", at: [-3.9, 14.75], rot: 270, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "nightstand", at: [-4.75, 12.75], rot: 270, w: 0.4 },
    { level: 0, type: "bed", at: [-6.08, 5.5], rot: 90, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "bed", at: [-6.08, 6.7], rot: 90, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "bed", at: [-6.08, 7.9], rot: 90, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "bed", at: [-6.08, 13.0], rot: 90, w: 0.9, color: GREEN },
    { level: 0, type: "bed", at: [-6.08, 14.25], rot: 90, w: 0.9, color: GREEN },
    { level: 0, type: "bed", at: [-6.08, 15.5], rot: 90, w: 0.9, color: GREEN },
    // 16 kitchen, 17 laundry
    { level: 0, type: "counter", at: [-11.4, 1.375], rot: 0, w: 1.8, cabinet: 0x6b3f22, sink: 0.45, stove: -0.5 },
    { level: 0, type: "fridge", at: [-10.1, 4.27], rot: 180 },
    { level: 0, type: "washer", at: [-13.6, 3.1], rot: 0 },
    { level: 0, type: "tub", at: [-14.0, 4.4], rot: 270 },
    // 20 glazed room: reception desk, sofas, breakfast tables
    { level: 0, type: "desk", at: [-11.6, 12.0], rot: 270, w: 1.6 },
    { level: 0, type: "sofa", at: [-15.5, 8.2], rot: 270, w: 2.0, frame: 0xe8e2d4, color: 0xf3eee2 },
    { level: 0, type: "sofa", at: [-14.6, 12.5], rot: 180, w: 1.9, frame: 0x6f6f6a, color: 0x8d8d88 },
    { level: 0, type: "coffee", at: [-14.6, 8.2], rot: 90, w: 1.0, d: 0.5 },
    { level: 0, type: "cafe", at: [-12.6, 7.6] },
    { level: 0, type: "cafe", at: [-12.6, 9.6] },
    { level: 0, type: "cafe", at: [-14.4, 10.6] },
    { level: 0, type: "pendant", at: [-13.6, 8.4], h: 3.0 },
    { level: 0, type: "pendant", at: [-13.6, 11.0], h: 3.0 },
    // the guest wing
    { level: 0, type: "bed", at: [-17.4, 2.68], rot: 0, w: 1.4, color: GREEN, frame: DARK },
    { level: 0, type: "nightstand", at: [-18.45, 1.93], rot: 0, w: 0.4 },
    { level: 0, type: "wardrobe", at: [-18.3, 4.74], rot: 180, w: 1.2 },
    { level: 0, type: "bed", at: [-22.55, 3.28], rot: 0, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "bed", at: [-21.45, 3.28], rot: 0, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "bed", at: [-24.9, 3.58], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-23.65, 3.58], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "nightstand", at: [-24.27, 2.73], rot: 0, w: 0.3 },
    // baths
    { level: 0, type: "bath", room: 5, door: "s" },
    { level: 0, type: "bath", room: 15, door: "e" },
    { level: 0, type: "bath", room: 8, door: "e" },
    { level: 0, type: "bath", room: 9, door: "e" },
    { level: 0, type: "bath", room: 10, door: "n" },
    { level: 0, type: "bath", room: 19, door: "e" },
    { level: 0, type: "bath", room: 22, door: "w" },
    { level: 0, type: "bath", room: 26, door: "e" },
    { level: 1, type: "bath", room: 28, door: "w" },
    { level: 1, type: "bath", room: 29, door: "n" },
    // outside: grill, carport, garden
    { level: 0, type: "dining", at: [-29.2, 6.3], w: 1.0, d: 0.7, chairs: 2, wood: true, metal: true },
    { level: 0, type: "car", at: [-35.0, 5.6], rot: 270, color: 0xf2f2f0 },
    { level: 0, type: "car", at: [-35.0, 8.8], rot: 270, color: 0x2b3a55 },
    { level: 0, type: "bench", at: [-21.6, 19.9], rot: 180 },
    { level: 0, type: "dining", at: [-20.3, 20.5], w: 0.8, round: true, chairs: 3, metal: true },
    { level: 0, type: "dining", at: [-17.9, 10.9], w: 1.2, d: 0.7, chairs: 4, wood: true },
    { level: 0, type: "plant", at: [-16.3, 7.6] },
    { level: 0, type: "plant", at: [-25.8, 8.2] },
    { level: 0, type: "plant", at: [-13.3, 12.6] },
    { level: 0, type: "bush", at: [-16.4, 8.6] },
    { level: 0, type: "bush", at: [-16.4, 10.0] },
    { level: 0, type: "bush", at: [-18.0, 20.0] },
    { level: 0, type: "bush", at: [-26.0, 21.0] },
    { level: 0, type: "bush", at: [-33.5, 21.8] },
    { level: 0, type: "bush", at: [-35.6, 18.0] },
    // the apartment
    // the apartment: nothing in the way between the stair, the balcony and
    // the hallway
    { level: 1, type: "daybed", at: [-3.0, 16.68], rot: 0, color: 0x4b7a3a },
    { level: 1, type: "dining", at: [-3.6, 18.9], w: 0.8, round: true, chairs: 2, seat: 0xeadfc8, wood: true },
    { level: 1, type: "tv", at: [-5.84, 17.3], rot: 270 },
    { level: 1, type: "lamp", at: [-0.35, 19.6] },
    { level: 1, type: "wardrobe", at: [-1.745, 15.2], rot: 270, w: 1.0 },
    { level: 1, type: "bed", at: [-9.55, 17.23], rot: 0, w: 1.3, color: "zebra", frame: 0x1c1c1c },
    { level: 1, type: "counter", at: [-12.25, 20.22], rot: 180, w: 1.6, cabinet: 0xf2f0ea, sink: -0.3, stove: 0.4 },
    { level: 1, type: "fridge", at: [-12.75, 18.8], rot: 270 },
    // 33 and the roof terrace
    { level: 2, type: "shelf", at: [-26.68, 5.45], rot: 270, w: 1.4, d: 0.35 },
    { level: 2, type: "dining", at: [-19.5, 4.4], w: 0.7, round: true, chairs: 2, metal: true }
  ];

  /* Walls that are glass: the glazed room's garden sides. */
  var glass = [
    { level: 0, x: -16.0, from: 5.05, to: 12.95 },
    { level: 0, y: 12.95, from: -16.0, to: -11.15 }
  ];

  /* Railings, 1 m high. `deco` is the brown patterned one over the galería. */
  var railings = [
    { level: 2, y: 7.0, from: -23.6, to: -15.95, deco: true },
    { level: 2, x: -15.95, from: 2.6, to: 7.0 },
    { level: 2, y: 7.0, from: -27.45, to: -23.6 },
    { level: 2, x: -28.45, from: 2.7, to: 4.4 },
    { level: 2, y: 2.7, from: -28.45, to: -26.95 },
    { level: 1, x: -13.1, from: 16.15, to: 18.4 },
    { level: 1, y: 16.15, from: -13.1, to: -11.0 },
    { level: 1, a: [0.9, 16.45], b: [0.9, 19.8], glass: true },
    { level: 1, a: [0, 16.45], b: [0.9, 16.45], glass: true },
    { level: 1, a: [0, 19.8], b: [0.9, 19.8], glass: true }
  ];

  /* The neighbours' buildings, for the 3D view. Each parcel within about 70 m
     comes from the cadastre with its built area; the building is the parcel
     shrunk around its middle to that area, on one floor, or two when the
     built area nearly fills the lot. Walls and roofs follow what the photos
     show around the house: white and cream render, red tile or grey sheet. */
  var neighbours = [
    { id: "059041", floors: 1, poly: [[-30.0,25.9],[-6.3,22.7],[-6.2,29.2],[-29.3,32.3]] },
    { id: "059024", floors: 1, poly: [[-32.8,38.2],[-29.9,37.8],[-7.2,34.7],[-7.2,47.8],[-32.9,51.1]] },
    { id: "059026", floors: 1, poly: [[-65.1,1.1],[-44.0,-1.8],[-43.5,4.0],[-45.1,4.3],[-65.1,7.0]] },
    { id: "063016", floors: 1, poly: [[49.9,33.4],[25.9,35.7],[25.4,13.0],[51.1,13.2],[50.8,17.9],[50.6,22.5]] },
    { id: "059027", floors: 1, poly: [[-64.6,-8.1],[-45.9,-10.4],[-45.4,-5.9],[-64.5,-3.3]] },
    { id: "063011", floors: 1, poly: [[16.9,-43.1],[28.8,-43.8],[31.7,-44.1],[39.1,-44.7],[39.7,-38.5],[17.0,-36.2]] },
    { id: "059022", floors: 1, poly: [[-32.3,63.9],[-32.3,66.9],[-41.0,68.0],[-40.8,70.5],[-40.7,73.4],[-46.3,74.1],[-46.3,74.1],[-56.1,75.2],[-53.5,66.6],[-44.1,65.3]] },
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

  /* Stairs as ramps: the height goes from h1 at `from` to h2 at `to` along
     `axis`, inside `across` on the other axis. The apartment's climbs in its
     winder in its box behind the red door, three quarters of a turn
     clockwise (spiral: centre c, from angle a0 through sweep degrees,
     angles counterclockwise from +x), out onto the landing over the bath; the steel one goes from the grill up
     to the walkway on the wing's roof. */
  var ramps = [
    { id: "aptstair", spiral: true, c: [-1.05, 13.3], newel: 0.12, box: [-2.1, 12.35, 0, 14.25], a0: 0, sweep: -270, h1: 0, h2: FLOOR[1] },
    { id: "steelstair", axis: "y", from: 7.2, to: 4.4, h1: 0, h2: FLOOR[2], across: [-28.45, -27.45] }
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
    NORTH: NORTH,
    OUT: OUT,
    streetX: streetX,
    lot: lot,
    FLOOR: FLOOR,
    rooms: rooms,
    spaces: spaces,
    roofs: roofs,
    extras: extras,
    garden: garden,
    neighbours: neighbours,
    facade: facade,
    doors: doors,
    furniture: furniture,
    glass: glass,
    railings: railings,
    ramps: ramps,
    polyOf: polyOf,
    idOf: idOf,
    /* Where the 3D walk starts: across the street, facing the house. */
    start: { x: 9.8, y: 9.0, yaw: Math.PI / 2 }
  };
})();
