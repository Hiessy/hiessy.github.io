/* Shared state of the 3D view: the house data, constants, translation helpers and the one state object `S`. */


export const H = window.HOUSE;

export const F = H.FLOOR;

export const WALL_T = 0.15;

export const DOOR_H = 2.05;

/* The walk shows the house bigger than the survey draws it: K times wider
   and deeper, KZ times higher, so rooms and doors are easy to move through.
   Everything is still worked out in the survey's meters (walls, furniture
   positions, collisions, the minimap); the whole model is stretched when it
   is drawn (S.world), and furniture, plants and the visitor keep their true
   size inside it. So the visitor's measures below are divided by the
   stretch: a 1.55 m eye height is 1.55 / KZ survey meters. */
export const K = 1.4, KZ = 1.25;

export const EYE = 1.55 / KZ, BODY = 1.7 / KZ, RADIUS = 0.2 / K, STEP = 0.45, GRAVITY = 9.8 / KZ;

export const REACH = 3.2;

export const CENTER = H.extras.center;

export const X = H.extras;

export const DEG = Math.PI / 180;

/* Where each level's walls start: the ground, the apartment's slab, the wing's. */
export const BASE = { 0: 0, 1: H.Z.apt - 0.2, 2: H.Z.terrace - 0.15 };

export function t(k) { return window.I18N && window.I18N.listo ? window.I18N.t(k) : ""; }

export function plain(s) {
  return String(s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

export const $ = (id) => document.getElementById(id);

export const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

export const S = {};
