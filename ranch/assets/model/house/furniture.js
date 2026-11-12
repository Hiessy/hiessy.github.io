/* Ranch: every piece of furniture, what hangs on the walls and what grows in the garden,
   from the listing photos and the two walkthrough videos. */
(function () {
  "use strict";
  window.HOUSE_PARTS = window.HOUSE_PARTS || {};
  /* at: [x, y] is the middle of the piece. rot turns it counterclockwise in
     degrees, 0 facing +y (a bed's foot, a chair's seat, a sofa's front), 90
     facing -x, 180 facing -y, 270 facing +x. A wall piece (picture, mirror,
     sconce...) sits with `at` on the wall's face and looks the way rot says;
     `up` is the height of its middle. Curtains and garden rows run from a to
     b. `soft: true` lets you walk through a piece. Colors are hex numbers.

     Baths: rect [x1, y1, x2, y2]; wall is the side the fixtures stand
     against, shower the end the shower is at; fix lists them from the shower
     on (bidet, toilet, basin unless said); basin [x, y, rot] puts the basin
     elsewhere; curtain is the shower curtain's pattern (none: a walk-in
     shower); color tints the fixtures. */
  var GREEN = 0x1f5c46, TEAL = 0x1d6b5a, LIME = 0x4f9a3a, WOOD = 0x6b4423, DARK = 0x3f2716, PINK = 0xd6336c, CHROME = 0xb8b8b8;
  var RATTAN = { frame: 0x8a5a2b, style: "rattan", fabric: "floral" }, LOUIS = { frame: 0xf2efe6, color: 0xc88f98, style: "louis" };
  var GREY = 0x6f7377, BOTTLE = 0x1f4a3a, RED = 0xc8202a, MUSTARD = 0xc9a227, BLACK = 0x1c1c1c;
  var IRON = 0x1c1f1d;
  var furniture = [
    // 1 entrance hall: pink armchairs with a small table between them, two
    // tables with white cloths and bentwood chairs, white glass pendants
    { level: 0, type: "armchair", at: [-2.0, 5.45], rot: 270, frame: DARK, color: PINK, style: "cushion" },
    { level: 0, type: "armchair", at: [-2.0, 6.75], rot: 270, frame: DARK, color: PINK, style: "cushion" },
    { level: 0, type: "side", at: [-2.2, 6.1], w: 0.4, vase: "dried", vaseColor: 0x8a5a3a },
    { level: 0, type: "cafe", at: [-1.85, 10.4], rot: 0, seat: 0x9a8a2a },
    { level: 0, type: "cafe", at: [-1.85, 11.9], rot: 0, seat: 0x9a8a2a, vase: "yellow" },
    { level: 0, type: "pendant", at: [-1.2, 7.2], h: 2.7, globe: true },
    { level: 0, type: "pendant", at: [-1.2, 11.1], h: 2.7, globe: true },
    { level: 0, type: "picture", at: [-2.25, 4.83], rot: 0, w: 0.24, h: 0.32, up: 1.55, art: "figure", frame: BLACK },
    { level: 0, type: "picture", at: [-1.9, 4.83], rot: 0, w: 0.24, h: 0.32, up: 1.45, art: "figure", frame: BLACK },
    { level: 0, type: "picture", at: [-2.48, 7.95], rot: 270, w: 0.4, h: 0.5, art: "print" },
    { level: 0, type: "picture", at: [-1.5, 12.58], rot: 180, w: 0.3, h: 0.4, up: 1.7, art: "flowers" },
    // 4 sitting room: two Louis chairs and a lamp before the curtained window
    { level: 0, type: "armchair", at: [-3.05, 10.15], rot: 90, frame: LOUIS.frame, color: LOUIS.color, style: "louis" },
    { level: 0, type: "armchair", at: [-3.05, 11.85], rot: 90, frame: LOUIS.frame, color: LOUIS.color, style: "louis" },
    { level: 0, type: "side", at: [-2.95, 11.0], lamp: true },
    { level: 0, type: "curtain", a: [-2.68, 9.45], b: [-2.68, 12.55], h: 2.3, color: 0x8d8f94 },
    // 12 dining room: tables with mustard cloths and carved chairs, pink
    // settees along the south wall, the octagonal mirror, the white chandelier
    { level: 0, type: "dining", at: [-6.3, 11.6], w: 0.8, d: 0.9, cloth: MUSTARD, chairs: 2, style: "carved", vase: "dried", vaseColor: 0x8a6a3c },
    { level: 0, type: "dining", at: [-8.0, 11.6], w: 0.75, d: 0.9, cloth: MUSTARD, chairs: 2, style: "carved", vase: "dried", vaseColor: 0x8a6a3c },
    { level: 0, type: "sofa", at: [-6.3, 9.32], rot: 0, w: 1.5, frame: LOUIS.frame, color: LOUIS.color, style: "louis" },
    { level: 0, type: "sofa", at: [-8.05, 9.32], rot: 0, w: 1.3, frame: LOUIS.frame, color: LOUIS.color, style: "louis" },
    { level: 0, type: "side", at: [-7.225, 9.15], w: 0.3, vase: "yellow", vaseColor: 0x2a3f9a },
    { level: 0, type: "chandelier", at: [-7.15, 10.75], h: 3.1, white: true },
    { level: 0, type: "mirror", at: [-6.3, 8.93], rot: 0, shape: "octagon", w: 0.75, h: 0.75, up: 1.75, frame: 0x4a2c18 },
    { level: 0, type: "mirror", at: [-8.0, 12.57], rot: 180, w: 0.75, h: 0.5, up: 1.7, frame: 0xf2efe6 },
    { level: 0, type: "picture", at: [-9.03, 9.18], rot: 270, w: 0.4, h: 0.52, up: 1.75, art: "portrait" },
    { level: 0, type: "picture", at: [-9.03, 12.02], rot: 270, w: 0.6, h: 0.5, up: 1.75, art: "landscape", frame: 0x5a6a4a },
    { level: 0, type: "sconce", at: [-7.6, 8.93], rot: 0, up: 1.9 },
    { level: 0, type: "aircon", at: [-5.29, 10.75], rot: 90, up: 2.6 },
    { level: 0, type: "fan", at: [-8.8, 12.3], rot: 315 },
    // 14 corridor: the rattan set with flowered cushions, dark chairs along
    // the wall, the console with its mirror, pink armchairs, pictures and wall lamps
    { level: 0, type: "sofa", at: [-11.25, 7.6], rot: 270, w: 1.7, frame: RATTAN.frame, style: "rattan", fabric: "floral" },
    { level: 0, type: "armchair", at: [-11.2, 9.35], rot: 270, frame: RATTAN.frame, style: "rattan", fabric: "floral" },
    { level: 0, type: "console", at: [-10.45, 15.0], rot: 180 },
    { level: 0, type: "armchair", at: [-11.2, 12.35], rot: 270, frame: DARK, color: PINK, style: "cushion" },
    { level: 0, type: "side", at: [-11.5, 11.72], w: 0.36, vase: "dried", lamp: true },
    { level: 0, type: "armchair", at: [-10.5, 5.42], rot: 0, frame: DARK, color: PINK, style: "cushion" },
    { level: 0, type: "seat", at: [-9.38, 8.75], rot: 90, style: "carved" },
    { level: 0, type: "seat", at: [-9.38, 12.3], rot: 90, style: "carved" },
    { level: 0, type: "chandelier", at: [-10.3, 7.4], h: 2.9 },
    { level: 0, type: "chandelier", at: [-10.3, 12.6], h: 2.9 },
    { level: 0, type: "picture", at: [-9.09, 8.2], rot: 90, w: 0.45, h: 0.55, up: 1.8, art: "print", frame: 0xf2efe6 },
    { level: 0, type: "picture", at: [-9.09, 12.9], rot: 90, w: 0.5, h: 0.4, up: 1.8, art: "sunset", frame: 0xf2efe6 },
    { level: 0, type: "sconce", at: [-9.09, 7.75], rot: 90 },
    { level: 0, type: "sconce", at: [-9.09, 11.85], rot: 90 },
    { level: 0, type: "picture", at: [-10.9, 4.88], rot: 0, w: 0.42, h: 0.52, up: 1.7, art: "portrait" },
    { level: 0, type: "picture", at: [-11.73, 9.4], rot: 270, w: 0.4, h: 0.4, up: 1.8, art: "landscape" },
    { level: 0, type: "extinguisher", at: [-9.2, 4.88], rot: 0 },
    { level: 0, type: "curtain", a: [-11.66, 6.5], b: [-11.66, 8.7], h: 2.25, sheer: true },
    { level: 0, type: "curtain", a: [-11.66, 13.15], b: [-11.66, 15.2], h: 2.25, sheer: true },
    // 2 bedroom: three beds with carved boards, the built-in wardrobe
    { level: 0, type: "bed", at: [-0.9, 1.5], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-1.9, 1.52], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-2.85, 1.55], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "wardrobe", at: [-2.6, 4.33], rot: 180, w: 1.4 },
    { level: 0, type: "curtain", a: [-0.42, 1.6], b: [-0.42, 3.4], h: 2.2, sheer: true, style: "pair" },
    // 3 bedroom: two iron beds, either side of the arch to its bath
    { level: 0, type: "bed", at: [-3.02, 5.98], rot: 0, w: 0.8, color: LIME, frame: CHROME },
    { level: 0, type: "bed", at: [-4.63, 5.98], rot: 0, w: 0.8, color: LIME, frame: CHROME },
    { level: 0, type: "picture", at: [-3.02, 4.91], rot: 0, w: 0.4, h: 0.5, up: 1.75, art: "figure" },
    { level: 0, type: "picture", at: [-4.63, 4.91], rot: 0, w: 0.4, h: 0.5, up: 1.75, art: "portrait" },
    { level: 0, type: "pendant", at: [-3.85, 6.6], h: 2.9, ball: true },
    { level: 0, type: "curtain", a: [-2.57, 5.7], b: [-2.57, 7.4], h: 2.25, color: BOTTLE },
    // 6 bedroom: the double bed, the mirrored wardrobe, the big painting
    { level: 0, type: "bed", at: [-4.2, 13.8], rot: 0, w: 1.4, color: TEAL, frame: DARK },
    { level: 0, type: "wardrobe", at: [-2.98, 13.6], rot: 90, w: 1.3, mirror: true },
    { level: 0, type: "picture", at: [-4.2, 12.79], rot: 0, w: 1.1, h: 0.55, up: 1.85, art: "landscape" },
    // 11 and 13: three beds each, small tables with a lamp between them
    { level: 0, type: "bed", at: [-6.45, 5.55], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    { level: 0, type: "bed", at: [-6.45, 6.8], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    { level: 0, type: "bed", at: [-6.45, 8.05], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    { level: 0, type: "nightstand", at: [-5.63, 6.175], rot: 90, w: 0.26 },
    { level: 0, type: "nightstand", at: [-5.63, 7.425], rot: 90, w: 0.26, lamp: false },
    { level: 0, type: "picture", at: [-5.44, 6.8], rot: 90, w: 0.32, h: 0.42, up: 1.8, art: "print", frame: 0xf2efe6 },
    { level: 0, type: "bed", at: [-6.45, 13.3], rot: 90, w: 0.9, color: GREEN },
    { level: 0, type: "bed", at: [-6.45, 14.5], rot: 90, w: 0.9, color: GREEN },
    { level: 0, type: "bed", at: [-6.45, 15.7], rot: 90, w: 0.9, color: GREEN },
    { level: 0, type: "nightstand", at: [-5.63, 13.9], rot: 90, w: 0.22 },
    { level: 0, type: "picture", at: [-5.44, 14.5], rot: 90, w: 0.5, h: 0.42, up: 1.85, art: "flowers", frame: 0x8a5a2b },
    { level: 0, type: "curtain", a: [-8.1, 16.5], b: [-7.7, 16.5], h: 2.2, color: BOTTLE },
    // 16 kitchen: brown units under yellow tiles, the steel water heater, a green bin; 17 laundry
    { level: 0, type: "counter", at: [-11.85, 4.33], rot: 180, w: 2.3, cabinet: 0x5f3030, sink: 0.3, stove: -0.75, stoveColor: 0xe9e2cf, upper: true, kettle: 0.75 },
    { level: 0, type: "boiler", at: [-10.62, 4.63], rot: 180, up: 1.5 },
    { level: 0, type: "geyser", at: [-12.3, 4.63], rot: 180, up: 2.35 },
    { level: 0, type: "fridge", at: [-10.85, 3.3], rot: 90 },
    { level: 0, type: "bin", at: [-10.62, 3.86] },
    { level: 0, type: "tub", at: [-14.35, 3.34], rot: 0 },
    // 20 glazed room: the reception desk before the bath's wall, sofas in the
    // garden corner, director chairs, grey curtains tied at the waist all round
    { level: 0, type: "desk", at: [-13.2, 6.98], rot: 0, w: 1.9, tufted: true },
    { level: 0, type: "sofa", at: [-16.05, 12.2], rot: 270, w: 1.5, frame: 0x5a3a22, color: 0xf3eee2, style: "wood" },
    { level: 0, type: "coffee", at: [-15.05, 11.75], rot: 90, w: 0.9, d: 0.5 },
    { level: 0, type: "sofa", at: [-16.05, 8.4], rot: 270, w: 1.7, frame: 0x1c2740, color: 0xe9e6dc },
    { level: 0, type: "seat", at: [-14.95, 10.7], rot: 0, style: "director", color: GREY },
    { level: 0, type: "seat", at: [-14.3, 11.75], rot: 90, style: "director", color: GREY },
    { level: 0, type: "cafe", at: [-13.1, 9.3], wood: true, vase: "pink" },
    { level: 0, type: "cafe", at: [-14.75, 9.2], wood: true, style2: "director" },
    { level: 0, type: "pendant", at: [-14.2, 8.4], h: 2.75, macrame: true },
    { level: 0, type: "pendant", at: [-14.2, 11.3], h: 2.75, macrame: true },
    { level: 0, type: "curtain", a: [-16.45, 13.04], b: [-14.72, 13.04], h: 2.42, color: GREY, style: "tied" },
    { level: 0, type: "curtain", a: [-12.92, 13.04], b: [-11.92, 13.04], h: 2.42, color: GREY, style: "tied" },
    { level: 0, type: "curtain", a: [-16.44, 7.28], b: [-16.44, 9.56], h: 2.42, color: GREY, style: "tied" },
    { level: 0, type: "curtain", a: [-16.44, 10.76], b: [-16.44, 13.0], h: 2.42, color: GREY, style: "tied" },
    { level: 0, type: "curtain", a: [-16.44, 5.2], b: [-16.44, 6.06], h: 2.42, color: GREY, style: "tied" },
    { level: 0, type: "picture", at: [-11.79, 9.1], rot: 90, w: 0.7, h: 0.6, up: 1.8, art: "figure", frame: 0x5a3a22 },
    { level: 0, type: "wallheater", at: [-11.79, 12.4], rot: 90 },
    { level: 0, type: "extinguisher", at: [-11.79, 7.5], rot: 90 },
    // the guest wing
    { level: 0, type: "bed", at: [-17.85, 3.55], rot: 0, w: 1.4, color: TEAL, frame: DARK },
    { level: 0, type: "picture", at: [-19.13, 3.6], rot: 270, w: 0.5, h: 0.4, up: 1.7, art: "sunset" },
    { level: 0, type: "bed", at: [-21.95, 3.5], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "bed", at: [-23.0, 3.6], rot: 0, w: 0.9, color: TEAL, frame: WOOD },
    { level: 0, type: "picture", at: [-23.48, 5.7], rot: 270, w: 0.45, h: 0.38, up: 1.7, art: "landscape" },
    { level: 0, type: "bed", at: [-24.7, 4.15], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    { level: 0, type: "bed", at: [-24.7, 5.4], rot: 90, w: 0.9, color: GREEN, frame: CHROME },
    { level: 0, type: "nightstand", at: [-23.88, 4.775], rot: 90, w: 0.26 },
    { level: 0, type: "picture", at: [-23.69, 4.775], rot: 90, w: 0.36, h: 0.3, up: 1.8, art: "print", frame: 0xf2efe6 },
    // baths: every one has its bidet beside the toilet
    { level: 0, type: "bath", room: 5, rect: [-1.91, 14.7, -0.93, 16.61], wall: "e", shower: "n", fix: ["toilet", "basin"], curtain: "plain" },
    { level: 0, type: "bath", room: 8, rect: [-7.61, 2.41, -5.26, 3.55], wall: "s", shower: "w", curtain: "fish" },
    { level: 0, type: "bath", room: 9, rect: [-7.61, 3.71, -5.26, 4.81], wall: "s", shower: "w", curtain: "dots", vanity: true, mirror: "oval" },
    { level: 0, type: "bath", room: 10, rect: [-8.91, 2.41, -7.81, 4.88], wall: "e", shower: "s", curtain: "trees", color: 0x7fb89a },
    { level: 0, type: "bath", room: 15, rect: [-11.76, 15.41, -9.06, 16.46], wall: "s", shower: "w", curtain: "plain" },
    { level: 0, type: "bath", room: 19, rect: [-14.26, 4.95, -11.76, 6.53], wall: "s", shower: "w", fix: ["toilet", "bidet"], basin: [-12.3, 6.27, 180] },
    { level: 0, type: "bath", room: 22, rect: [-20.63, 2.15, -19.36, 4.18], wall: "e", shower: "s", fix: ["bidet", "toilet"], basin: [-20.37, 2.62, 270], curtain: "fish" },
    { level: 0, type: "bath", room: 26, rect: [-27.81, 2.79, -26.43, 4.54], wall: "w", shower: "s", fix: ["toilet", "bidet"], basin: [-26.75, 3.05, 0] },
    { level: 1, type: "bath", room: 28, rect: [-8.32, 16.98, -6.14, 18.59], wall: "e", shower: "s", sh: 0.72, fix: ["bidet", "toilet"], basin: [-7.3, 18.33, 180], curtain: "plain" },
    { level: 1, type: "bath", room: 29, rect: [-8.24, 18.73, -6.14, 19.86], wall: "s", shower: "w", curtain: "plain" },
    // the grill: its table, a plastic chair, a lantern on the wall
    { level: 0, type: "dining", at: [-29.4, 5.6], w: 1.0, d: 0.7, chairs: 2, wood: true, style: "garden" },
    { level: 0, type: "seat", at: [-29.6, 3.9], rot: 0, style: "plastic", soft: true },
    { level: 0, type: "car", at: [-35.6, 5.6], rot: 270, color: 0xf2f2f0 },
    { level: 0, type: "car", at: [-35.5, 8.6], rot: 270, color: 0x2b3a55 },
    // the lawn north of the tracks: the white bench, black slatted chairs
    // round a white table, the post covered in ivy with flowers round its foot
    { level: 0, type: "bench", at: [-21.8, 20.4], rot: 180 },
    { level: 0, type: "dining", at: [-20.4, 20.9], w: 0.8, round: true, chairs: 3, metal: true },
    { level: 0, type: "seat", at: [-28.3, 19.4], rot: 250, style: "garden", color: IRON },
    { level: 0, type: "seat", at: [-27.9, 18.3], rot: 290, style: "garden", color: IRON },
    { level: 0, type: "seat", at: [-28.9, 18.0], rot: 320, style: "garden", color: IRON },
    { level: 0, type: "ivypost", at: [-31.2, 17.6] },
    { level: 0, type: "ring", a: [-31.2, 17.6], r: 1.0, colors: [0xe8861c, 0xf0b030] },
    { level: 0, type: "rail", a: [-33.2, 14.6], b: [-29.6, 15.9] },
    { level: 0, type: "bush", at: [-18.6, 20.6] },
    { level: 0, type: "bush", at: [-26.6, 21.4] },
    { level: 0, type: "bush", at: [-33.9, 21.6] },
    { level: 0, type: "bush", at: [-35.8, 17.6] },
    { level: 0, type: "flowerbed", a: [-22.9, 22.2], b: [-25.6, 22.45], colors: [0xd8323a, 0xf2f0e6, 0xe58aa8], wide: 0.3 },
    { level: 0, type: "flowerbed", a: [-29.0, 22.3], b: [-32.6, 22.6], colors: [0xe8c23a, 0xe58aa8, 0x8a6fc0], wide: 0.3 },
    { level: 0, type: "hedge", a: [-36.2, 22.6], b: [-36.75, 13.4], h: 2.4, t: 0.9 },
    { level: 0, type: "bamboo", at: [-31.6, 2.6] },
    { level: 0, type: "bamboo", at: [-33.0, 2.75], seed: 5 },
    // by the glazed room: irises and stepping stones on the drive's side,
    // lavender under the corridor's window, clipped box and a brick patio on
    // the garden's side
    { level: 0, type: "irisbed", a: [-17.1, 14.15], b: [-14.95, 14.0], wide: 0.5 },
    { level: 0, type: "irisbed", a: [-12.75, 13.85], b: [-12.75, 14.4], wide: 0.3, step: 0.28 },
    { level: 0, type: "stones", a: [-13.8, 13.95], b: [-13.8, 14.5], step: 0.5 },
    { level: 0, type: "lavender", a: [-12.2, 13.6], b: [-12.2, 16.5] },
    { level: 0, type: "boxwood", at: [-18.55, 9.3] },
    { level: 0, type: "boxwood", at: [-18.55, 11.6], size: 1.1 },
    { level: 0, type: "boxwood", at: [-18.55, 12.7] },
    { level: 0, type: "urn", at: [-17.0, 12.85], plant: true },
    { level: 0, type: "urn", at: [-17.05, 8.75], size: 1.2, flowers: [0xe8861c, 0xd8323a] },
    { level: 0, type: "stones", a: [-18.9, 10.45], b: [-26.6, 10.9], step: 0.7 },
    // in front of the galeria: red shrubs, the yellow clump, pots on its floor, the frog
    { level: 0, type: "shrub", at: [-19.3, 9.05], color: 0x9a3a32, size: 0.9 },
    { level: 0, type: "daylily", at: [-22.6, 9.15] },
    { level: 0, type: "daylily", at: [-23.4, 9.3], seed: 4 },
    { level: 0, type: "shrub", at: [-24.4, 9.1], size: 0.8, flowers: [0xf2f0e6] },
    { level: 0, type: "shrub", at: [-26.9, 8.9], color: 0x9a3a32, size: 0.8 },
    { level: 0, type: "pot", at: [-19.9, 8.12], flowers: [0xd8323a], soft: true },
    { level: 0, type: "pot", at: [-23.4, 8.12], flowers: [0xe58aa8, 0xf2f0e6], seed: 2, soft: true },
    { level: 0, type: "frog", at: [-26.3, 7.45], rot: 0 },
    { level: 0, type: "mirror", at: [-19.8, 7.14], rot: 0, shape: "oval", w: 0.3, h: 0.42, up: 1.6, frame: BLACK },
    // on the sidewalk, along the kerb
    { level: 0, type: "lavender", a: [2.1, 5.6], b: [2.1, 10.6], step: 0.7 },
    { level: 0, type: "flowerbed", a: [2.1, 12.9], b: [2.1, 14.4], colors: [0xe8c23a, 0xf2f0e6], step: 0.5 },
    // the apartment
    { level: 1, type: "wardrobe", at: [-2.1, 15.55], rot: 270, w: 1.2, pine: true },
    { level: 1, type: "flowers", at: [-0.98, 15.0], kind: "dried", scale: 1.7, vase: 0x2a4a2a },
    { level: 1, type: "daybed", at: [-4.35, 17.5], rot: 0, color: 0x4b7a3a },
    { level: 1, type: "daybed", at: [-5.55, 18.8], rot: 270, color: 0x4b7a3a },
    { level: 1, type: "side", at: [-5.74, 17.33], w: 0.34, lamp: true, marble: false },
    { level: 1, type: "dining", at: [-2.85, 19.3], w: 1.2, d: 0.8, chairs: 2, seat: 0xeadfc8, wood: true, glass: true },
    { level: 1, type: "tv", at: [-2.9, 20.02], rot: 180 },
    { level: 1, type: "hutch", at: [-3.85, 20.17], rot: 175, w: 0.8 },
    { level: 1, type: "picture", at: [-1.75, 20.2], rot: 175, w: 0.6, h: 0.75, up: 1.75, art: "flowers" },
    { level: 1, type: "bed", at: [-10.2, 18.12], rot: 0, w: 1.4, color: "zebra", frame: BLACK },
    { level: 1, type: "nightstand", at: [-11.15, 17.25], rot: 0, color: BLACK, lamp: false },
    { level: 1, type: "nightstand", at: [-9.25, 17.25], rot: 0, color: BLACK },
    { level: 1, type: "curtain", a: [-11.3, 17.06], b: [-10.5, 17.06], h: 2.15, z0: 0.95, sheer: true },
    { level: 1, type: "counter", at: [-12.97, 20.25], rot: 270, w: 1.7, cabinet: 0xf2f0ea, sink: -0.3, stove: 0.45, top: 0x8a8380, splash: false, kettle: -0.72 },
    { level: 1, type: "fridge", at: [-12.9, 19.1], rot: 270 },
    { level: 1, type: "wallcabinet", at: [-12.45, 21.13], rot: 175, w: 1.2 },
    { level: 1, type: "curtain", a: [-13.3, 19.3], b: [-13.3, 21.2], h: 2.15, color: RED, style: "pair" },
    { level: 1, type: "curtain", a: [-12.55, 18.73], b: [-11.85, 18.73], h: 2.15, z0: 0.95, color: RED },
    // 33 and the roof terrace
    { level: 2, type: "shelf", at: [-25.9, 6.72], rot: 180, w: 1.4, d: 0.35 },
    { level: 2, type: "dining", at: [-20.4, 4.7], w: 0.7, round: true, chairs: 2, metal: true },
    { level: 2, type: "urn", at: [-18.5, 6.7], plant: true }
  ];
  HOUSE_PARTS.furniture = furniture;
})();
