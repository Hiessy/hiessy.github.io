/* Ranch: everything the plan and the 3D walk draw, in meters.

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
    { n: 1, level: 0, kind: "living", name: t("name.sitting"), note: t("note.01"), info: t("info.01"), src: "confirmed", rect: [-5.0, 4.8, 0, 13.6], street: true, lab: [-4.7, 9.4, "s"] },
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

  /* Openings on the building line, as y ranges. The double glass door is the
     sitting room's main entrance (the owners: one of the three big "windows"
     is that door). */
  var facade = {
    0: { from: -0.1, to: 15.4,
         gate: { from: 15.4, to: 19.35, kind: "gate" },
         doors: [{ from: 0.1, to: 0.85, kind: "wood", name: t("facade.door") },
                 { from: 6.3, to: 8.5, kind: "double-glass", name: t("facade.entrance") },
                 { from: 14.0, to: 14.9, kind: "red", name: t("facade.aptdoor") }],
         windows: [[2.0, 3.8], [8.7, 10.9], [11.1, 13.3]],
         stone: [[13.35, 14.0], [14.9, 15.4]] },
    1: { from: 13.6, to: 19.4,
         doors: [{ from: 16.6, to: 18.6, kind: "slide-glass" }],
         windows: [[13.8, 14.6], [15.2, 16.2]] }
  };

  /* Door openings inside the house: a gap in the wall on x = c or y = c,
     between `from` and `to`. kind: wood, white (baths), glass, slide-glass
     or open (a doorway with no door); swing: the side it opens into, n s e w.
     Most are guesses; the plan doesn't draw them. */
  var doors = [
    { level: 0, y: 1.1, from: -4.2, to: -3.4, kind: "wood", swing: "n" },
    { level: 0, y: 1.1, from: -10.4, to: -9.6, kind: "wood", swing: "n" },
    { level: 0, x: -11.2, from: 0.0, to: 0.9, kind: "wood", swing: "w" },
    { level: 0, x: -13.1, from: 0.2, to: 1.0, kind: "wood", swing: "w" },
    { level: 0, y: 4.8, from: -12.6, to: -11.7, kind: "wood", swing: "n" },
    { level: 0, x: -16.6, from: 2.0, to: 2.8, kind: "white", swing: "w" },
    { level: 0, x: -16.6, from: 0.0, to: 0.8, kind: "white", swing: "w" },
    { level: 0, y: 3.4, from: -15.0, to: -14.0, kind: "wood", swing: "n" },
    { level: 0, x: -13.1, from: 6.5, to: 7.5, kind: "glass", swing: "w" },
    { level: 0, x: -19.4, from: 6.2, to: 7.2, kind: "glass", swing: "w" },
    { level: 0, y: 10.3, from: -15.6, to: -14.6, kind: "glass", swing: "n" },
    { level: 0, x: -5.0, from: 5.6, to: 9.6, kind: "open" },
    { level: 0, y: 10.3, from: -7.0, to: -6.2, kind: "wood", swing: "n" },
    { level: 0, y: 10.3, from: -10.5, to: -9.7, kind: "wood", swing: "n" },
    { level: 0, y: 13.2, from: -12.2, to: -11.5, kind: "white", swing: "n" },
    { level: 0, y: 15.4, from: -9.5, to: -8.7, kind: "wood", swing: "s" },
    { level: 0, y: 3.0, from: -6.0, to: -5.3, kind: "white", swing: "s" },
    { level: 0, y: 3.0, from: -7.9, to: -7.2, kind: "white", swing: "s" },
    { level: 0, x: -20.9, from: 2.0, to: 2.7, kind: "white", swing: "e" },
    { level: 0, y: 1.0, from: -26.9, to: -26.2, kind: "white", swing: "s" },
    { level: 0, y: 3.4, from: -22.7, to: -21.9, kind: "wood", swing: "s" },
    { level: 0, y: 3.4, from: -27.0, to: -26.2, kind: "wood", swing: "s" },
    { level: 1, x: -7.4, from: 13.6, to: 14.8, kind: "open" },
    { level: 1, x: -7.4, from: 15.6, to: 16.4, kind: "wood", swing: "e" },
    { level: 1, x: -7.4, from: 17.6, to: 18.4, kind: "white", swing: "w" },
    { level: 1, x: -10.4, from: 14.2, to: 15.8, kind: "open" },
    { level: 1, y: 17.2, from: -15.4, to: -14.4, kind: "open" },
    { level: 1, y: 17.2, from: -12.2, to: -11.4, kind: "white", swing: "n" },
    { level: 1, x: -16.2, from: 14.4, to: 16.4, kind: "slide-glass" },
    { level: 2, x: -24.0, from: 1.2, to: 2.0, kind: "wood", swing: "w" }
  ];

  /* Furniture, from the listing photos. at: [x, y] is the middle of the
     piece, set so its back touches the wall's face (walls are 15 cm thick and
     room edges run down their middle). rot turns it counterclockwise in
     degrees, 0 facing north (a bed's foot, a chair's seat, a sofa's front).
     Colors are hex numbers. Baths are furnished from their outline and the
     side their door is on. */
  var GREEN = 0x1f5c46, TEAL = 0x1d6b5a, WOOD = 0x6b4423, DARK = 0x3f2716;
  var furniture = [
    // 1 sitting room: rattan set, pink armchairs, mirror and console
    { level: 0, type: "sofa", at: [-4.48, 12.0], rot: 270, w: 1.9, frame: 0x8a5a2b, color: 0xd98c5f },
    { level: 0, type: "armchair", at: [-2.75, 11.0], rot: 90, frame: 0x8a5a2b, color: 0xd98c5f },
    { level: 0, type: "armchair", at: [-2.95, 12.85], rot: 110, frame: 0x8a5a2b, color: 0xd98c5f },
    { level: 0, type: "coffee", at: [-3.7, 12.0], rot: 90, w: 1.0, d: 0.55 },
    { level: 0, type: "console", at: [-3.4, 13.33], rot: 180 },
    { level: 0, type: "lamp", at: [-4.65, 13.2] },
    { level: 0, type: "closet", at: [-4.66, 10.3], rot: 270, w: 1.2 },
    { level: 0, type: "armchair", at: [-4.3, 5.3], rot: 0, frame: DARK, color: 0xd6336c },
    { level: 0, type: "armchair", at: [-3.1, 5.3], rot: 0, frame: DARK, color: 0xd6336c },
    { level: 0, type: "side", at: [-3.7, 5.15] },
    // 3 guest room: three singles, wardrobe
    { level: 0, type: "bed", at: [-12.6, 11.42], rot: 0, w: 0.9, color: GREEN },
    { level: 0, type: "bed", at: [-11.35, 11.42], rot: 0, w: 0.9, color: GREEN },
    { level: 0, type: "bed", at: [-8.6, 11.42], rot: 0, w: 0.9, color: GREEN },
    { level: 0, type: "nightstand", at: [-9.35, 10.58], rot: 0 },
    { level: 0, type: "wardrobe", at: [-8.36, 14.0], rot: 90, w: 1.2 },
    // 5 dining room: six tables with mustard cloths, sideboard, chandeliers
    { level: 0, type: "dining", at: [-11.0, 6.2], cloth: 0xc9a227 },
    { level: 0, type: "dining", at: [-11.0, 8.7], cloth: 0xc9a227 },
    { level: 0, type: "dining", at: [-8.6, 6.2], cloth: 0xc9a227 },
    { level: 0, type: "dining", at: [-8.6, 8.7], cloth: 0xc9a227 },
    { level: 0, type: "dining", at: [-6.3, 6.2], cloth: 0xc9a227 },
    { level: 0, type: "dining", at: [-6.3, 8.7], cloth: 0xc9a227 },
    { level: 0, type: "sideboard", at: [-12.3, 9.98], rot: 180, w: 1.4 },
    { level: 0, type: "chandelier", at: [-9.8, 7.45], h: 2.7 },
    { level: 0, type: "chandelier", at: [-7.4, 7.45], h: 2.7 },
    // 7 guest room on the street: three singles, terracotta floor
    { level: 0, type: "bed", at: [-4.3, 3.68], rot: 180, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-3.05, 3.68], rot: 180, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-1.8, 3.68], rot: 180, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "nightstand", at: [-3.67, 4.52], rot: 180, w: 0.3 },
    { level: 0, type: "nightstand", at: [-2.42, 4.52], rot: 180, w: 0.3 },
    { level: 0, type: "wardrobe", at: [-6.24, 3.9], rot: 270, w: 1.2 },
    // 9 guest room: double bed, wardrobe
    { level: 0, type: "bed", at: [-9.5, 3.68], rot: 180, w: 1.45, color: GREEN, frame: DARK },
    { level: 0, type: "nightstand", at: [-10.5, 4.52], rot: 180 },
    { level: 0, type: "nightstand", at: [-8.5, 4.52], rot: 180 },
    { level: 0, type: "wardrobe", at: [-10.84, 2.2], rot: 270, w: 1.2 },
    // 12 kitchen, 13 laundry, 14 pantry
    { level: 0, type: "counter", at: [-14.85, -0.37], rot: 0, w: 3.3, cabinet: 0x6b3f22, sink: 0.6, stove: -0.9 },
    { level: 0, type: "fridge", at: [-13.53, 2.98], rot: 180 },
    { level: 0, type: "heater", at: [-13.5, 2.1], rot: 90 },
    { level: 0, type: "dining", at: [-15.2, 1.6], w: 0.8, chairs: 2 },
    { level: 0, type: "washer", at: [-18.02, 3.02], rot: 180 },
    { level: 0, type: "tub", at: [-17.3, 3.07], rot: 180 },
    { level: 0, type: "shelf", at: [-18.0, -0.47], rot: 0, w: 2.6, d: 0.4 },
    { level: 0, type: "shelf", at: [-19.14, 2.3], rot: 270, w: 1.8, d: 0.35 },
    // 15 glazed room: reception desk, sofas, café tables
    { level: 0, type: "desk", at: [-13.52, 8.8], rot: 90, w: 1.6 },
    { level: 0, type: "sofa", at: [-17.4, 3.91], rot: 0, w: 2.0, frame: 0xe8e2d4, color: 0xf3eee2 },
    { level: 0, type: "sofa", at: [-18.9, 8.6], rot: 270, w: 1.9, frame: 0x6f6f6a, color: 0x8d8d88 },
    { level: 0, type: "coffee", at: [-17.4, 4.95], rot: 0, w: 1.0, d: 0.5 },
    { level: 0, type: "cafe", at: [-16.4, 9.3] },
    { level: 0, type: "cafe", at: [-14.8, 9.3] },
    { level: 0, type: "cafe", at: [-15.6, 5.0] },
    { level: 0, type: "pendant", at: [-17.0, 7.0], h: 3.1 },
    { level: 0, type: "pendant", at: [-15.0, 7.0], h: 3.1 },
    // 16 and 18 guest rooms on the galería
    { level: 0, type: "bed", at: [-22.85, 0.27], rot: 0, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "bed", at: [-21.3, 0.27], rot: 0, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "nightstand", at: [-22.07, -0.58], rot: 0, w: 0.4 },
    { level: 0, type: "wardrobe", at: [-19.76, 0.35], rot: 90, w: 1.2 },
    { level: 0, type: "bed", at: [-24.52, 0.0], rot: 90, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "bed", at: [-24.52, 1.25], rot: 90, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "bed", at: [-24.52, 2.5], rot: 90, w: 0.9, color: GREEN, frame: 0xb8b8b8 },
    { level: 0, type: "nightstand", at: [-23.67, 0.62], rot: 90, w: 0.3 },
    { level: 0, type: "nightstand", at: [-23.67, 1.87], rot: 90, w: 0.3 },
    // baths
    { level: 0, type: "bath", room: 4, door: "s" },
    { level: 0, type: "bath", room: 8, door: "n" },
    { level: 0, type: "bath", room: 10, door: "n" },
    { level: 0, type: "bath", room: 17, door: "w" },
    { level: 0, type: "bath", room: 19, door: "n" },
    { level: 1, type: "bath", room: 22, door: "s" },
    { level: 1, type: "bath", room: 24, door: "e" },
    // outside: galería, grill, carport, garden
    { level: 0, type: "dining", at: [-24.9, 4.35], w: 1.2, d: 0.7, chairs: 4, wood: true },
    { level: 0, type: "dining", at: [-21.0, 4.35], w: 1.2, d: 0.7, chairs: 4, wood: true },
    { level: 0, type: "dining", at: [-30.6, 1.6], w: 1.6, d: 0.8, chairs: 4, wood: true, metal: true },
    { level: 0, type: "counter", at: [-31.9, -0.8], rot: 0, w: 1.0, cabinet: 0xd9d4c8, sink: 0 },
    { level: 0, type: "car", at: [-35.6, 2.1], rot: 270, color: 0xf2f2f0 },
    { level: 0, type: "car", at: [-35.6, 4.75], rot: 270, color: 0x2b3a55 },
    { level: 0, type: "bench", at: [-25.4, 11.2], rot: 180 },
    { level: 0, type: "dining", at: [-23.9, 11.5], w: 0.8, round: true, chairs: 3, metal: true },
    { level: 0, type: "plant", at: [-19.7, 5.6] },
    { level: 0, type: "plant", at: [-27.15, 5.6] },
    { level: 0, type: "plant", at: [-13.4, 10.6] },
    { level: 0, type: "bush", at: [-20.1, 8.4] },
    { level: 0, type: "bush", at: [-20.2, 9.5] },
    { level: 0, type: "bush", at: [-36.5, 17.4] },
    { level: 0, type: "bush", at: [-29.5, 18.0] },
    { level: 0, type: "bush", at: [-21.5, 18.5] },
    { level: 0, type: "bush", at: [-27.0, 6.0] },
    // 20 to 25: the apartment
    { level: 1, type: "daybed", at: [-13.4, 14.13], rot: 0, color: 0x4b7a3a },
    { level: 1, type: "daybed", at: [-13.3, 16.67], rot: 180, color: 0x4b7a3a },
    { level: 1, type: "dining", at: [-15.0, 15.35], w: 0.8, d: 1.2, chairs: 4, seat: 0xeadfc8, wood: true },
    { level: 1, type: "tv", at: [-11.1, 13.9], rot: 0 },
    { level: 1, type: "lamp", at: [-15.9, 16.9] },
    { level: 1, type: "counter", at: [-14.2, 19.02], rot: 180, w: 2.4, cabinet: 0xf2f0ea, sink: -0.4, stove: 0.7 },
    { level: 1, type: "fridge", at: [-15.78, 18.98], rot: 180 },
    { level: 1, type: "heater", at: [-15.81, 17.9], rot: 270 },
    { level: 1, type: "wardrobe", at: [-8.9, 16.64], rot: 180, w: 1.2 },
    { level: 1, type: "bed", at: [-5.4, 18.28], rot: 180, w: 1.5, color: "zebra", frame: 0x1c1c1c },
    { level: 1, type: "nightstand", at: [-6.5, 19.12], rot: 180, color: 0x1c1c1c },
    { level: 1, type: "nightstand", at: [-4.3, 19.12], rot: 180, color: 0x1c1c1c },
    // 26 and the roof terrace
    { level: 2, type: "shelf", at: [-27.14, 1.7], rot: 270, w: 2.0, d: 0.35 },
    { level: 2, type: "dining", at: [-19.0, 1.4], w: 0.7, round: true, chairs: 2, metal: true }
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

  /* The neighbours' buildings, for the 3D view. Each parcel within about 70 m
     comes from the cadastre with its built area; the building is the parcel
     shrunk around its middle to that area, on one floor, or two when the
     built area nearly fills the lot. Walls and roofs follow what the photos
     show around the house: white and cream render, red tile or grey sheet. */
  var neighbours = [
    { id: "059041", floors: 1, poly: [[-34.1,20.2],[-10.2,21.2],[-11.3,27.6],[-34.6,26.6]] },
    { id: "059024", floors: 1, poly: [[-39.1,31.8],[-36.1,31.9],[-13.3,32.9],[-15.6,45.8],[-41.5,44.4]] },
    { id: "059026", floors: 1, poly: [[-64.3,-10.5],[-43.0,-9.6],[-43.5,-3.8],[-45.1,-3.8],[-65.3,-4.7]] },
    { id: "063016", floors: 1, poly: [[43.2,41.7],[19.1,39.7],[22.7,17.3],[47.9,22.1],[46.8,26.6],[45.8,31.1]] },
    { id: "059027", floors: 1, poly: [[-62.1,-19.5],[-43.3,-18.4],[-43.6,-13.9],[-62.9,-14.7]] },
    { id: "063011", floors: 1, poly: [[24.3,-39.4],[36.1,-38.0],[39.0,-37.8],[46.4,-37.0],[45.9,-30.8],[23.2,-32.6]] },
    { id: "059022", floors: 1, poly: [[-43.1,57.1],[-43.7,60.1],[-52.4,59.6],[-52.7,62.1],[-53.1,65.0],[-58.7,64.7],[-58.7,64.7],[-68.6,64.0],[-64.5,56.0],[-55.0,56.4]] },
    { id: "059054", floors: 1, poly: [[-43.3,6.9],[-70.9,5.7],[-69.7,-1.7],[-42.7,-0.5]] },
    { id: "059028", floors: 1, poly: [[-61.3,-29.8],[-41.3,-28.7],[-41.8,-22.7],[-62.3,-23.9]] },
    { id: "059044", floors: 1, poly: [[-68.7,8.7],[-46.2,9.7],[-46.7,16.0],[-50.8,15.9],[-69.7,15.0]] },
    { id: "059036", floors: 1, poly: [[-25.8,-74.6],[8.5,-72.7],[5.4,-55.9],[-34.0,-57.6],[-35.1,-57.7],[-34.6,-63.8],[-26.3,-63.4]] },
    { id: "059046", floors: 1, poly: [[-51.5,26.4],[-74.2,25.4],[-72.9,18.1],[-50.7,19.0]] },
    { id: "059029", floors: 1, poly: [[-23.9,-22.1],[-6.6,-21.2],[-8.9,-8.4],[-19.9,-8.8],[-25.0,-9.0],[-24.6,-13.5],[-24.3,-17.4]] },
    { id: "063012", floors: 1, poly: [[56.7,-25.3],[63.5,-24.5],[62.3,-17.4],[62.2,-16.9],[45.2,-19.1],[28.5,-21.0],[29.6,-27.7],[49.3,-26.2],[56.0,-25.4]] },
    { id: "059020", floors: 1, poly: [[-38.4,68.8],[-19.4,74.9],[-19.8,76.9],[-39.2,75.7]] },
    { id: "059047", floors: 1, poly: [[-46.0,19.1],[-41.1,19.3],[-41.7,26.9],[-45.3,26.7],[-46.8,26.7]] },
    { id: "063010", floors: 1, poly: [[23.9,-51.8],[39.0,-50.1],[38.2,-41.1],[35.2,-41.4],[22.5,-43.0]] },
    { id: "059021", floors: 1, poly: [[-37.2,66.3],[-36.4,60.1],[-15.1,61.5],[-17.4,72.6]] },
    { id: "063015", floors: 1, poly: [[57.2,-3.9],[56.4,0.9],[55.7,5.2],[53.1,4.7],[28.1,-0.0],[30.0,-11.3],[43.8,-9.8],[57.9,-7.9]] },
    { id: "059023", floors: 1, poly: [[-74.0,42.3],[-72.2,30.9],[-54.4,31.7],[-53.3,31.7],[-55.4,43.2]] },
    { id: "059030", floors: 1, poly: [[-49.7,-37.6],[-49.0,-50.3],[-45.4,-50.1],[-42.5,-50.0],[-40.0,-49.8],[-37.0,-49.6],[-35.8,-49.5],[-35.1,-49.5],[-9.9,-48.4],[-12.2,-35.6],[-31.9,-36.7]] },
    { id: "059019", floors: 1, poly: [[-40.1,77.9],[-18.1,79.2],[-19.9,87.8],[-41.7,86.3]] }
  ];

  /* Stairs as ramps: the height goes from h1 at `from` to h2 at `to` along
     `axis`, inside `across` on the other axis. The apartment's starts a
     meter in from its red street door, leaving room for the door to open. */
  var ramps = [
    { id: "aptstair", axis: "x", from: -3.5, to: -7.4, h1: 0, h2: FLOOR[1], across: [13.6, 14.8] },
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
