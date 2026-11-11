/* Ranch: every piece of furniture, from the listing photos and the two walkthrough videos. */
(function () {
  "use strict";
  window.HOUSE_PARTS = window.HOUSE_PARTS || {};
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
  HOUSE_PARTS.furniture = furniture;
})();
