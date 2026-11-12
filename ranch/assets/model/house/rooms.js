/* Ranch: the numbered rooms and the unnumbered spaces (stair, drive, galería, balconies, terraces): names, finishes, heights.
   Loaded before house.js, which calls HOUSE_PARTS.rooms(context). */
(function () {
  "use strict";
  window.HOUSE_PARTS = window.HOUSE_PARTS || {};
  HOUSE_PARTS.rooms = function (c) {
    var t = c.t, Z = c.Z, F = c.F, B = c.B;
    /* kind: bedroom, bath, living, service, hall, stair, covered, balcony,
             terrace, roof
       z: the floor's height; h: the ceiling above it ("gable", "vault" and
          "mono" follow a roof, see `tops`)
       fin: the floor finish the 3D view paints; wall: the wall colour
       src: how sure it is: "plan" (drawn on the survey), "photos", "guess"
       lab: where the plan writes the name [x, y]; line: all on one line */
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
      { n: 10, level: 0, kind: "bath", name: t("name.bath"), info: t("info.10"), src: "plan", fin: "bathdark", z: F, h: 2.7, tile: "turquoise" },
      // the middle row, under the old roof
      { n: 11, level: 0, kind: "bedroom", name: t("name.bedroom"), info: t("info.11"), src: "plan", fin: "calcareo", z: F, h: "gable" },
      { n: 12, level: 0, kind: "living", name: t("name.dining"), note: t("note.12"), info: t("info.12"), src: "plan", fin: "checker", z: F, h: "gable" },
      { n: 13, level: 0, kind: "bedroom", name: t("name.bedroom"), info: t("info.13"), src: "plan", fin: "calcareo", z: F, h: "gable", wainscot: true },
      { n: 14, level: 0, kind: "hall", name: t("name.corridor"), note: t("note.14"), info: t("info.14"), src: "plan", fin: "whitegrid", z: F, h: "gable", beams: true, lab: [-10.45, 10.2] },
      { n: 15, level: 0, kind: "bath", name: t("name.bath"), info: t("info.15"), src: "plan", fin: "bathbeige", z: F, h: 2.6, tile: "beige" },
      { n: 34, level: 0, kind: "hall", name: t("name.passage"), info: t("info.34"), src: "plan", fin: "whitegrid", z: F, h: 2.7 },
      // kitchen, laundry and the way to the wing
      { n: 16, level: 0, kind: "service", name: t("name.kitchen"), info: t("info.16"), src: "plan", fin: "terrazzo", z: F, h: 2.9, tile: "yellow" },
      { n: 17, level: 0, kind: "service", name: t("name.laundry"), info: t("info.17"), src: "plan", fin: "terrazzo", z: F, h: 2.3 },
      { n: 18, level: 0, kind: "hall", name: t("name.passage"), info: t("info.18"), src: "plan", fin: "white", z: B, h: 2.45, lab: [-15.7, 3.3] },
      { n: 19, level: 0, kind: "bath", name: t("name.bath"), info: t("info.19"), src: "plan", fin: "bathcream", z: F, h: 2.4, tile: "cream" },
      { n: 20, level: 0, kind: "living", name: t("name.glazed"), note: t("note.20"), info: t("info.20"), src: "plan", fin: "white40", z: B, h: "vault", lab: [-14.3, 9.9] },
      // the guest wing along the south side
      { n: 21, level: 0, kind: "bedroom", name: t("name.guest"), info: t("info.21"), src: "plan", fin: "redtile", z: B, h: 2.55 },
      { n: 22, level: 0, kind: "bath", name: t("name.bath"), info: t("info.22"), src: "plan", fin: "bathtile", z: B, h: 2.55, tile: "white" },
      { n: 23, level: 0, kind: "service", name: t("name.store"), info: t("info.23"), src: "plan", fin: "white", z: B, h: 2.55, lab: [-19.3, 6.2] },
      { n: 24, level: 0, kind: "bedroom", name: t("name.guest"), info: t("info.24"), src: "plan", fin: "calcareo", z: B, h: 2.55, lab: [-22.2, 4.7] },
      { n: 25, level: 0, kind: "bedroom", name: t("name.guest"), info: t("info.25"), src: "plan", fin: "redtile", z: B, h: 2.55 },
      { n: 26, level: 0, kind: "bath", name: t("name.bath"), info: t("info.26"), src: "plan", fin: "bathbeige", z: B, h: 2.55, tile: "beige" },
      // the apartment over the drive
      { n: 35, level: 1, kind: "hall", name: t("name.landing"), note: t("note.35"), info: t("info.35"), src: "plan", fin: "cream", z: Z.apt, h: 2.6 },
      { n: 27, level: 1, kind: "living", name: t("name.living"), note: t("note.27"), info: t("info.27"), src: "plan", fin: "cream", z: Z.apt, h: "mono" },
      { n: 28, level: 1, kind: "bath", name: t("name.ensuite"), info: t("info.28"), src: "plan", fin: "cream", z: Z.apt, h: "mono", tile: "white" },
      { n: 29, level: 1, kind: "bath", name: t("name.bath"), info: t("info.29"), src: "plan", fin: "cream", z: Z.apt, h: "mono", tile: "white" },
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
      { id: "galeria", level: 0, kind: "covered", name: t("space.galeria"), note: t("space.galeria.note"), info: t("info.galeria"), src: "plan", fin: "galeria", z: 0.15,
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
    return { rooms: rooms, spaces: spaces };
  };
})();
