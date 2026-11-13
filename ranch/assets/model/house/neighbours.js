/* Ranch: the buildings around the lot.

   The near ones (`rect`) were traced in the plan's own axes from aerial
   imagery laid over the cadastre (IDECOR, the lot matched to half a meter),
   and their heights, roofs and colours read off Street View (2026) and the
   listing photos. rect: [x1, y1, x2, y2] in meters (x toward the street, y
   along it); h: the eaves above the ground; roof: gable, hip, flat or shed;
   axis: the direction of the ridge (x or y); rise: ridge above the eaves;
   low: the side a shed roof falls to (n, s, e, w; e is toward the street);
   wall and top: colours of the walls and of the roof.
   Extras: `tower` (a round turret with a dome), `pool`, `fence` (a wall
   along a line).

   The farther ones (`poly`) are the cadastre's parcels, each shrunk round
   its middle to its built area, worked out along the street (house.js turns
   them onto the walls). */
(function () {
  "use strict";
  window.HOUSE_PARTS = window.HOUSE_PARTS || {};
  var WHITE = 0xf3f0e8, CREAM = 0xebe3d3, TILE = 0xb85a34, GREEN = 0x2f5b45;
  var traced = [
    // north: the long tiled house along our boundary, sheds behind the white
    // two-storey house on the street
    { id: "n-tiles-w", rect: [-41, 24, -26, 31], h: 2.9, roof: "hip", axis: "x", rise: 1.6, wall: CREAM, top: 0xb4552f },
    { id: "n-tiles-e", rect: [-26, 25.5, -13, 31], h: 2.9, roof: "gable", axis: "x", rise: 1.5, wall: CREAM, top: TILE },
    { id: "n-rust", rect: [-21.5, 32, -13, 43], h: 3.0, roof: "shed", low: "w", rise: 0.6, wall: CREAM, top: 0x7a3a2c },
    { id: "n-grey", rect: [-13, 32, -6.5, 41], h: 3.0, roof: "shed", low: "w", rise: 0.5, wall: CREAM, top: 0x9aa3aa },
    { id: "n-street", rect: [-6.5, 31, -1, 44], h: 5.9, roof: "hip", axis: "y", rise: 1.0, wall: WHITE, top: TILE },
    { id: "n-back", rect: [-36, 33, -26, 42], h: 2.9, roof: "flat", wall: WHITE, top: 0xdedbd2 },
    // south: the low white house with stone on the street, a shed, and past
    // them the house with the turret
    { id: "s-house", rect: [-12, -21, -4.5, -5], h: 3.4, roof: "shed", low: "w", rise: 0.5, wall: WHITE, top: 0xb9bdbf, stone: true },
    { id: "s-front", rect: [-4.5, -20, -0.6, -5], h: 3.4, roof: "shed", low: "e", rise: 0.9, wall: WHITE, top: TILE, stone: true },
    { id: "s-shed", rect: [-24.5, -5, -20, -0.5], h: 2.5, roof: "flat", wall: WHITE, top: 0xe7e4dc },
    { id: "s-turret-house", rect: [-21, -42, -4, -31], h: 3.2, roof: "hip", axis: "x", rise: 1.8, wall: WHITE, top: 0xc5643c },
    { id: "s-turret", tower: [-5.5, -32.5], r: 1.6, h: 7.5, wall: WHITE, top: 0xc06a48 },
    // across the street: the hostería's green sheet roofs, its steep gable
    // with the timber end facing the street, the pool, the brick wall
    { id: "e-long", rect: [13.5, 4, 21, 31], h: 3.0, roof: "gable", axis: "y", rise: 2.2, wall: CREAM, top: GREEN },
    { id: "e-aframe", rect: [13.5, 7, 24, 15], h: 3.2, roof: "gable", axis: "x", rise: 5.0, wall: 0x6b4a32, top: GREEN },
    { id: "e-north", rect: [13.5, 31, 25, 44], h: 3.2, roof: "gable", axis: "x", rise: 2.6, wall: CREAM, top: GREEN },
    { id: "e-pool", pool: [25, 18, 30.5, 28] },
    { id: "e-wall", fence: [[13, -24], [13, 48]], h: 1.9, wall: 0xb4774f },
    { id: "e-south", rect: [37, -24, 48, -15], h: 5.8, roof: "flat", wall: WHITE, top: 0xdcd8cf },
    { id: "e-dark", rect: [22, -30, 37, -25], h: 3.0, roof: "shed", low: "s", rise: 0.5, wall: WHITE, top: 0x1d2a4a },
    { id: "e-ne", rect: [48, 4, 56, 26], h: 3.0, roof: "gable", axis: "y", rise: 1.8, wall: CREAM, top: GREEN },
    // behind: the slate and the big grey sheet roofs on the next street, white
    // flat houses, a tiled one
    { id: "w-slate", rect: [-68, 15, -47, 21], h: 3.2, roof: "shed", low: "n", rise: 0.5, wall: WHITE, top: 0x2e3440 },
    { id: "w-grey", rect: [-62, 5, -38.2, 14.5], h: 4.5, roof: "gable", axis: "x", rise: 1.2, wall: CREAM, top: 0x8e9aa8 },
    { id: "w-white", rect: [-66, 25, -50, 34], h: 3.0, roof: "flat", wall: WHITE, top: 0xe4e1d8 },
    { id: "w-white2", rect: [-48, 26, -42, 33], h: 3.0, roof: "flat", wall: WHITE, top: 0xe4e1d8 },
    { id: "w-tiles", rect: [-67, -6, -50, 1], h: 3.0, roof: "hip", axis: "x", rise: 1.6, wall: WHITE, top: 0xc0603a },
    { id: "w-white3", rect: [-67, -12, -55, -6.5], h: 3.0, roof: "flat", wall: WHITE, top: 0xe4e1d8 }
  ];
  var far = [
    { id: "063011", floors: 1, poly: [[16.9,-43.1],[28.8,-43.8],[31.7,-44.1],[39.1,-44.7],[39.7,-38.5],[17.0,-36.2]] },
    { id: "059022", floors: 1, poly: [[-32.3,63.9],[-32.3,66.9],[-41.0,68.0],[-40.8,70.5],[-40.7,73.4],[-46.3,74.1],[-56.1,75.2],[-53.5,66.6],[-44.1,65.3]] },
    { id: "059028", floors: 1, poly: [[-65.6,-18.4],[-45.7,-20.9],[-45.2,-14.9],[-65.6,-12.4]] },
    { id: "059036", floors: 1, poly: [[-38.7,-68.8],[-4.6,-73.1],[-4.6,-56.0],[-43.7,-50.6],[-44.8,-50.5],[-45.4,-56.6],[-37.2,-57.7]] },
    { id: "059020", floors: 1, poly: [[-25.6,74.5],[-5.8,77.2],[-5.8,79.2],[-25.1,81.5]] },
    { id: "063010", floors: 1, poly: [[14.3,-55.2],[29.5,-56.2],[30.3,-47.2],[27.3,-47.0],[14.5,-46.3]] },
    { id: "059021", floors: 1, poly: [[-24.8,71.9],[-25.1,65.6],[-3.9,63.2],[-4.2,74.5]] },
    { id: "059023", floors: 1, poly: [[-65.3,54.8],[-65.6,43.2],[-47.9,40.9],[-46.8,40.7],[-46.8,52.4]] },
    { id: "059030", floors: 1, poly: [[-55.6,-28.2],[-57.2,-40.8],[-53.6,-41.2],[-50.7,-41.6],[-48.2,-41.9],[-45.2,-42.2],[-44.0,-42.3],[-43.3,-42.5],[-18.3,-45.9],[-18.3,-32.9],[-37.9,-30.4]] },
    { id: "059019", floors: 1, poly: [[-25.6,83.8],[-3.7,81.2],[-4.0,89.9],[-25.7,92.3]] }
  ];
  HOUSE_PARTS.neighbours = traced.concat(far);
})();
