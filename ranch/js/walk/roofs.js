/* The roofs: the gable, flat slabs, the glazed room's vault, the apartment's mono-pitch. */
import * as THREE from "three";
import { H, S, X } from "./core.js";
import { bar, beam3, merge, quad, slab } from "./geometry.js";
import { M, TOP_SHADOW, mat } from "./materials.js";
import { tex } from "./textures.js";
import { wallBox } from "./walls.js";

export function buildRoofs() {
  const roofs = new THREE.Group();
  const sheet = (name) => new THREE.MeshStandardMaterial({ map: tex(name), roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
  const blue = sheet("metalblue"), metal = sheet("metal"), red = sheet("redsheet");
  const conc = mat(0xd6d0c4, TOP_SHADOW), wood = mat(0x6a4326, { roughness: 0.7 });
  const R = H.roof, Fz = H.Z.front, SKIN = 0.06;

  // The old house's gable: two slopes of blue sheet meeting on a ridge that
  // runs along the street, 8.45 m behind the building line, with fascia
  // boards along the eaves and the two ends.
  const main = H.roofs.filter((r) => r.id === "main")[0].rect;
  const zr = (x) => (x >= R.ridge ? Fz + 3.31 + (-2.6 - x) * R.gf : Fz + 4.6 - (R.ridge - x) * R.gr) + SKIN;
  const xf = main[2], xb = main[0], y1 = main[1], y2 = main[3];
  // the front slope stops short of the stair tower past `notch.y`
  const notch = H.roofs.filter((r) => r.id === "main")[0].notch || { y: y2, x: xf }, ny = notch.y, nx = notch.x;
  roofs.add(quad([[xf, y1, zr(xf)], [xf, ny, zr(xf)], [R.ridge, ny, zr(R.ridge)], [R.ridge, y1, zr(R.ridge)]], blue));
  if (ny < y2) {
    roofs.add(quad([[nx, ny, zr(nx)], [nx, y2, zr(nx)], [R.ridge, y2, zr(R.ridge)], [R.ridge, ny, zr(R.ridge)]], blue));
    roofs.add(quad([[xf, ny, zr(xf)], [xf, ny, zr(xf) - 0.22], [nx, ny, zr(nx) - 0.22], [nx, ny, zr(nx)]], M.trim));
  }
  roofs.add(quad([[R.ridge, y1, zr(R.ridge)], [R.ridge, y2, zr(R.ridge)], [xb, y2, zr(xb)], [xb, y1, zr(xb)]], blue));
  roofs.add(bar(R.ridge, y1, R.ridge, y2, zr(R.ridge) - 0.03, zr(R.ridge) + 0.05, 0.3, mat(0x7f95a8)));
  roofs.add(bar(xf, y1, xf, ny, zr(xf) - 0.22, zr(xf), 0.03, M.trim));
  if (ny < y2) roofs.add(bar(nx, ny, nx, y2, zr(nx) - 0.22, zr(nx), 0.03, M.trim));
  roofs.add(bar(xb, y1, xb, y2, zr(xb) - 0.22, zr(xb), 0.03, M.trim));
  [y1, y2].forEach((y) => {
    [[y === y1 ? xf : nx, R.ridge], [R.ridge, xb]].forEach((s) => {
      const b = beam3([s[0], y, zr(s[0]) - 0.11], [s[1], y, zr(s[1]) - 0.11], 0.03, 0.22, M.trim);
      if (b) { S.static.remove(b); roofs.add(b); }
    });
  });

  // Flat roofs: concrete slabs over the hall, the south strip, the kitchen
  // and the laundry (the wing's is the terrace, always there); light sheet
  // over the galería, the grill and the carport.
  H.roofs.forEach((r) => {
    if (r.kind === "slab" && !r.terrace) roofs.add(slab(r.poly, conc, r.z + r.t, r.t));
    if (r.kind === "sheet") roofs.add(slab(r.poly, metal, r.z + 0.05, 0.05));
    if (r.kind === "leanto") {
      const p = r.poly;
      roofs.add(quad([[p[0][0], p[0][1], r.z], [p[3][0], p[3][1], r.z], [p[2][0], p[2][1], r.z - r.drop], [p[1][0], p[1][1], r.z - r.drop]], metal));
    }
  });

  // The glazed room's vault: a shallow arch across the room, as the survey
  // draws it, white inside and out, on white ribs.
  const g = H.roofs.filter((r) => r.id === "glazed")[0].rect, n = 10, w = (-11.9 + 16.7) / n;
  const vm = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) {
    const xa = -16.7 + i * w, xc = xa + w, za = H.arch(Math.max(xa, -16.64)) + 0.012, zc = H.arch(Math.min(xc, -11.86)) + 0.012;
    roofs.add(quad([[xa, g[1], za], [xa, g[3], za], [xc, g[3], zc], [xc, g[1], zc]], vm));
    [5.02, 6.5, 7.9, 9.3, 10.7, 12.1, 13.22].forEach((y) => beam3([xa, y, za - 0.06], [xc, y, zc - 0.06], 0.06, 0.08, M.trim));
  }

  // The apartment's roof falls toward the back, with a parapet on the street
  // and a wooden board along its other edges; the landing's is a slab.
  const A = X.apartment.roof, za2 = (x) => H.Z.apt + 3.4 - (-1.2 - x) * R.mono + SKIN;
  roofs.add(quad(A.map((p) => [p[0], p[1], za2(p[0])]), red));
  roofs.add(bar(A[3][0], A[3][1], A[2][0], A[2][1], za2(A[3][0]) - 0.2, za2(A[3][0]), 0.04, wood));
  [[A[0], A[3]], [A[1], A[2]]].forEach((s) => {
    const b = beam3([s[0][0], s[0][1], za2(s[0][0]) - 0.1], [s[1][0], s[1][1], za2(s[1][0]) - 0.1], 0.04, 0.2, wood);
    if (b) { S.static.remove(b); roofs.add(b); }
  });
  wallBox([-1.1, 16.88], [-1.1, 20.22], 0.2, H.Z.apt + 3.35, X.apartment.parapet, X.apartment.parapet);
  roofs.add(slab(X.landingRoof, conc, H.Z.apt + 2.75, 0.15));
  wallBox([H.streetX(12.68) - 0.1, 12.68], [H.streetX(16.9) - 0.1, 16.9], 0.2, H.Z.apt + 2.6, H.Z.apt + 2.9, H.Z.apt + 2.9);

  // The room on the wing's roof, with its water tank on top; the other tanks
  // stand on the flat roofs.
  roofs.add(slab(X.tower.roof, conc, H.Z.terrace + 2.3, 0.15));
  const tank = (x, y, z, group) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.48, 1.0, 18), mat(0x2a2a2a, { roughness: 0.5 }));
    m.position.set(x, z + 0.5, -y);
    m.castShadow = true;
    group.add(m);
  };
  tank(X.tower.tank[0], X.tower.tank[1], H.Z.terrace + 2.3, roofs);
  X.tanks.forEach((p, i) => (i < 2 ? tank(p[0], p[1], Fz + 2.9, roofs) : tank(p[0], p[1], H.Z.terrace, S.static)));

  S.roofs = merge(roofs);
  S.world.add(S.roofs);

  // Every roof can be walked on: jump over a railing or a parapet and go
  // round the top of the house. hf gives a sloping roof's height.
  const rect = (r) => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
  const top = (poly, h, hf) => S.surfaces.push({ poly, h, hf, level: 2, roof: true });
  top(rect([main[0], main[1], xf, ny]), 0, (x) => zr(x));
  if (ny < y2) top(rect([main[0], ny, nx, main[3]]), 0, (x) => zr(x));
  top(rect(g), 0, (x) => H.arch(Math.max(-16.64, Math.min(-11.86, x))) + 0.012);
  top(A, 0, (x) => za2(x));
  top(X.landingRoof, H.Z.apt + 2.75);
  top(X.tower.roof, H.Z.terrace + 2.3);
  H.roofs.forEach((r) => {
    if (r.kind === "slab" && !r.terrace) top(r.poly, r.z + r.t);
    if (r.kind === "sheet") top(r.poly, r.z + 0.05);
    if (r.kind === "leanto") {
      const y0 = r.poly[0][1], y1 = r.poly[1][1];
      top(r.poly, 0, (x, y) => r.z - r.drop * Math.max(0, Math.min(1, (y - y0) / (y1 - y0))));
    }
  });
}
