/* Builds the whole scene: ground, garden, floors, ceilings, walls, railings, stairs, sign, grill. */
import * as THREE from "three";
import { CENTER, F, H, S, X, t } from "./core.js";
import { buildFurniture, solid } from "./furniture.js";
import { ball, bar, beam3, bx, byId, center, cy, flat, merge, place, rectPoly, slab, zAt } from "./geometry.js";
import { buildLabels } from "./labels.js";
import { M, TOP_SHADOW, mat, texMat } from "./materials.js";
import { buildOpenings } from "./openings.js";
import { buildRoofs } from "./roofs.js";
import { tex, texFor } from "./textures.js";
import { areaOf, buildWalls, clipRect, collider, sloped, wainscot, wallBox } from "./walls.js";

export function tree(x, y, size) {
  const g = new THREE.Group(), k = size || 1;
  cy(g, 0.12 * k, 0.2 * k, 2.4 * k, 0, 1.2 * k, 0, M.bark, 8);
  [[0, 2.9, 0, 1.4], [0.7, 2.6, 0.3, 1.0], [-0.6, 2.7, -0.3, 1.1]].forEach((s) => ball(g, s[3] * k, s[0] * k, s[1] * k, s[2] * k, M.leaf, 1));
  place(g, x, y, 0, 0);
}

export function buildScene() {
  const scene = S.scene;
  S.lamps = [];

  // Ground around the lot, the lot itself, the sidewalks and the street.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat(0xa7b08c));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(CENTER.x, -0.03, -CENTER.y);
  ground.receiveShadow = true;
  scene.add(ground);
  S.static.add(flat(H.lot, texMat("grass"), 0.004));
  const e = H.OUT;
  const band = (o1, o2) => [[-40, o1], [-40, o2], [70, o2], [70, o1]]
    .map((q) => [H.streetX(q[0]) + q[1] * e[0], q[0] + q[1] * e[1]]);
  S.static.add(flat(band(0, 2.5), texMat("sidewalk"), 0.012));
  S.static.add(flat(band(2.5, 10.5), texMat("asphalt"), 0.008));
  S.static.add(flat(band(10.5, 13), texMat("sidewalk"), 0.012));
  [[2.38, 2.52], [10.48, 10.62]].forEach((c) => S.static.add(flat(band(c[0], c[1]), mat(0xe8e4da), 0.03)));

  // Neighbours: the cadastre's parcels around, each a block of render under a
  // tile or sheet roof (assets/model/house.js), solid to walk into.
  const RENDER = [0xf1ece2, 0xe9dfcf, 0xdcd3c3, 0xf4f1ea];
  const ROOFS = [0xa65f45, 0x8d969c, 0x9a5a40, 0x6f8796];
  H.neighbours.forEach((b, i) => {
    const h = b.floors === 2 ? 5.8 : 3.0;
    S.static.add(slab(b.poly, mat(RENDER[i % RENDER.length], { roughness: 0.9 }), h, h));
    S.static.add(slab(b.poly, mat(ROOFS[(i * 7) % ROOFS.length], { roughness: 0.75 }), h + 0.3, 0.3));
    b.poly.forEach((p, k) => {
      const q = b.poly[(k + 1) % b.poly.length];
      collider(p[0], p[1], q[0], q[1], 0, h + 0.3, 0.05);
    });
  });

  // Garden: gravel, pavers, wheel tracks, the hedge, the big tree and the statue.
  const G = H.garden;
  S.static.add(flat(G.gravel, texMat("gravel"), 0.02));
  S.static.add(flat(G.pavers, texMat("pavers"), 0.02));
  if (G.patio) S.static.add(flat(G.patio, texMat("brickpave"), 0.025));
  G.tracks.forEach((c) => {
    const curve = new THREE.CubicBezierCurve(...c.map((p) => new THREE.Vector2(p[0], p[1])));
    const pts = curve.getPoints(28);
    for (let i = 0; i < pts.length - 1; i++) {
      const m = bar(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 0.0, 0.035, 0.45, texMat("pavers"));
      if (m) { m.castShadow = false; S.static.add(m); }
    }
  });
  {
    const h = G.hedge, m = bar(h[0][0], h[0][1] + 0.4, h[1][0], h[1][1] + 0.4, 0, 1.7, 0.7, M.leaf2);
    if (m) S.static.add(m);
  }
  const big = new THREE.Group();
  cy(big, 0.22, 0.36, 3.0, 0, 1.5, 0, M.bark, 10);
  [[0, 3.6, 0, 2.4], [1.2, 3.2, 0.6, 1.8], [-1.1, 3.3, -0.5, 1.9], [0.3, 4.4, -0.8, 1.6]].forEach((s) => ball(big, s[3], s[0], s[1], s[2], M.leaf, 1));
  place(big, G.tree.c[0], G.tree.c[1], 0, 0);
  collider(G.tree.c[0] - 0.2, G.tree.c[1], G.tree.c[0] + 0.2, G.tree.c[1], 0, 3, 0.25);
  const statue = new THREE.Group();
  bx(statue, 0.5, 1.1, 0.5, 0, 0.55, 0, M.white);
  cy(statue, 0.12, 0.2, 0.75, 0, 1.48, 0, M.white, 12);
  ball(statue, 0.11, 0, 1.95, 0, M.white, 2);
  place(statue, G.statue[0], G.statue[1], 0, 0);
  solid(G.statue[0], G.statue[1], 0.5, 0.5, 0, 0);
  X.trees.forEach((tr) => tree(tr[0], tr[1], tr[2]));
  const post = new THREE.Group();
  cy(post, 0.06, 0.08, 6.5, 0, 3.25, 0, mat(0x55585b), 8);
  bx(post, 1.4, 0.06, 0.06, -0.7, 6.4, 0, mat(0x55585b));
  bx(post, 0.4, 0.12, 0.2, -1.35, 6.32, 0, M.glow);
  place(post, X.lamp[0], X.lamp[1], 0, 180);
  S.lamps.push([X.lamp[0] + 1.3, 6.1, -X.lamp[1], 22, 60]);

  // Floors at the survey's levels, each with its finish: on the ground floor
  // a block from the ground up, so a raised floor shows no gap at the doors.
  // Ceilings: flat where the room has its own height, else under the roof.
  const ceil = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, side: THREE.BackSide, emissive: 0xf6f4ee, emissiveIntensity: 0.18 });
  const woodCeil = new THREE.MeshStandardMaterial({ map: tex("boards"), side: THREE.BackSide, roughness: 0.8, emissive: 0x2a180c, emissiveIntensity: 0.25 });
  H.rooms.concat(H.spaces).forEach((r) => {
    const poly = H.polyOf(r);
    if (poly.length < 3) return;
    if (r.fin) S.static.add(slab(poly, texMat(r.fin), r.z + 0.004, r.level === 0 ? Math.max(0.03, r.z + 0.03) : 0.02));
    if (r.kind !== "stair") S.surfaces.push({ poly, h: r.z, level: r.level });
    if (!r.n) return;
    if (typeof r.h === "number") { S.static.add(flat(poly, ceil, r.z + r.h)); return; }
    if (r.h === "vault") return;                         // the vault itself is its ceiling
    H.tops.forEach((z) => {
      if (z.level !== r.level) return;
      const piece = clipRect(poly, z.rect);
      if (piece.length < 3 || Math.abs(areaOf(piece)) < 1e-3) return;
      S.static.add(sloped(piece, (x) => z.z + (z.g || 0) * (x - z.rect[0]) - 0.012, r.h === "mono" ? woodCeil : ceil));
    });
  });
  // the stair's own ground, and where you can stand on the stairs' level
  S.surfaces.push({ poly: H.polyOf(byId("aptstair")), h: 0, level: 0 });

  // Slabs: the apartment's floor over the drive with its beams, the landing's
  // over the bath, and the wing's roof, which is the terrace.
  S.static.add(slab(X.apartment.slab, mat(0xe9e5dc, TOP_SHADOW), H.Z.apt, 0.2));
  S.static.add(slab(H.polyOf(byId(35)), mat(0xe9e5dc, TOP_SHADOW), H.Z.apt, 0.15));
  [-1.3, -4.4, -7.6, -10.8, -13.4].forEach((x) => {
    const m = bar(x, 16.8, x, 20.3 + (-x) * 0.09, H.Z.apt - 0.5, H.Z.apt - 0.2, 0.2, M.wall);
    if (m) S.static.add(m);
  });
  const wing = H.roofs.filter((r) => r.id === "wing")[0];
  S.static.add(slab(wing.poly, mat(0xd9d3c7, TOP_SHADOW), wing.z + wing.t, wing.t));

  // Walls from the survey, the parapets on top of them, doors and windows.
  buildWalls();
  H.parapets.forEach((p) => {
    const k = p.inset || 0;
    const pa = [p.a[0] - e[0] * k, p.a[1] - e[1] * k], pb = [p.b[0] - e[0] * k, p.b[1] - e[1] * k];
    wallBox(pa, pb, p.t, p.z0, p.z1, p.z1);
    collider(pa[0], pa[1], pb[0], pb[1], p.z0, p.z1, p.t / 2);
  });
  buildOpenings();
  H.rooms.forEach((r) => {
    if (r.tile) wainscot(r, r.kind === "bath" ? 2.0 : 1.6, texMat("tile-" + r.tile, { side: THREE.DoubleSide }));
    if (r.wainscot) wainscot(r, 1.1, texMat("pine", { side: THREE.DoubleSide }));
  });
  // the hall's white joists and the beams under the corridor's sloping ceiling
  const hall = byId(1);
  for (let y = 5.5; y < 12.5; y += 0.85) {
    const m = bar(-2.41, y, H.streetX(y) - 0.32, y, hall.z + hall.h - 0.13, hall.z + hall.h, 0.07, M.trim);
    if (m) { m.castShadow = false; S.static.add(m); }
  }
  for (let y = 5.7; y < 15.2; y += 1.3) {
    beam3([-11.62, y, H.topAt(-11.62, y, 0) - 0.1], [-9.24, y, H.topAt(-9.24, y, 0) - 0.1], 0.07, 0.16, M.trim);
  }
  // the apartment's dark beams under its wooden ceiling, across the slope
  for (let x = -13.0; x < -1.3; x += 0.9) {
    const top = H.topAt(x, 18.5, 1) - 0.08;
    beam3([x, 17.0, top], [x, 20.2 - x * 0.09, top], 0.08, 0.15, mat(0x4a2c18, { roughness: 0.7 }));
  }
  // stone at the foot of the street front, by the apartment's door
  X.stone.forEach((r) => {
    const o = 0.03, a = [H.streetX(r[0]) + e[0] * o, r[0] + e[1] * o], b = [H.streetX(r[1]) + e[0] * o, r[1] + e[1] * o];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = bar(a[0], a[1], b[0], b[1], 0, 1.3, 0.05, new THREE.MeshStandardMaterial({ map: texFor("stone", len, 1.3), roughness: 0.95 }));
    if (m) S.static.add(m);
  });

  // Boundary walls: the 1.20 m one along the drive, garden height on the rest
  // of the north side and across the back. The house's own wall and the
  // hedge behind it close the south side.
  const L = H.lot, lw = X.lowWall;
  const fence = (a, b, h) => {
    const m = bar(a[0], a[1], b[0], b[1], 0, h, 0.2, M.fence);
    if (m) S.static.add(m);
    const cap = bar(a[0], a[1], b[0], b[1], h, h + 0.05, 0.26, mat(0xc7bfae));
    if (cap) S.static.add(cap);
    collider(a[0], a[1], b[0], b[1], 0, h, 0.1);
  };
  fence(lw[0], lw[1], 1.2);
  fence(lw[1], L[2], 1.8);
  fence(L[2], L[3], 1.8);
  fence(L[3], [-28.1, 2.66], 1.8);

  // Railings: balconies, the terrace (brown pattern over the galería), the
  // stair's steel one, and the galería's wooden balustrade with its gaps.
  H.railings.forEach((r) => {
    const a = r.a, b = r.b, base = F[r.level], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const add = (m) => { if (m) S.static.add(m); };
    if (r.glass) add(bar(a[0], a[1], b[0], b[1], base, base + 1.0, 0.025, M.glass));
    else if (r.deco) {
      add(bar(a[0], a[1], b[0], b[1], base, base + 0.95, 0.04, new THREE.MeshStandardMaterial({ map: texFor("deco", len, 1), alphaTest: 0.5, side: THREE.DoubleSide })));
      add(bar(a[0], a[1], b[0], b[1], base + 0.95, base + 1.02, 0.07, mat(0x7a4528)));
    } else {
      const m = r.steel ? M.black : M.trim, n = Math.max(1, Math.round(len / 0.45));
      add(bar(a[0], a[1], b[0], b[1], base + 0.95, base + 1.0, 0.05, m));
      add(bar(a[0], a[1], b[0], b[1], base + 0.45, base + 0.48, 0.03, m));
      for (let i = 0; i <= n; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.0, 0.035), m);
        p.position.set(a[0] + (b[0] - a[0]) * i / n, base + 0.5, -(a[1] + (b[1] - a[1]) * i / n));
        S.static.add(p);
      }
    }
    collider(a[0], a[1], b[0], b[1], base, base + 1.0, 0.05);
  });
  X.balusters.forEach((s) => {
    const a = s[0], b = s[1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = bar(a[0], a[1], b[0], b[1], 0.2, 1.1, 0.04, new THREE.MeshStandardMaterial({ map: texFor("balusters", len, 0.9), alphaTest: 0.5, side: THREE.DoubleSide }));
    if (m) S.static.add(m);
    collider(a[0], a[1], b[0], b[1], 0, 1.1, 0.04);
  });

  // Stairs: a tread for each riser along the stair's path, a stringer along
  // each straight run, open underneath so the way in passes below.
  H.ramps.forEach((r) => {
    r.segs = [];
    r.len = 0;
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i], b = r.path[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      r.segs.push({ a, b, len, s0: r.len });
      r.len += len;
    }
    const at = (s) => {
      const g = r.segs.filter((q) => s <= q.s0 + q.len + 1e-6)[0] || r.segs[r.segs.length - 1], u = (s - g.s0) / g.len;
      return { x: g.a[0] + (g.b[0] - g.a[0]) * u, y: g.a[1] + (g.b[1] - g.a[1]) * u, ang: Math.atan2(g.b[1] - g.a[1], g.b[0] - g.a[0]) };
    };
    const hAt = (s) => r.h1 + (r.h2 - r.h1) * s / r.len;
    const tread = r.steel ? mat(0x3a3a3a, { roughness: 0.6, metalness: 0.4 }) : mat(0x8a5a33, { roughness: 0.6 });
    const run = r.len / r.steps;
    for (let i = 0; i < r.steps; i++) {
      const p = at((i + 0.5) * run);
      const m = new THREE.Mesh(new THREE.BoxGeometry(run + 0.04, 0.04, r.w), tread);
      m.position.set(p.x, hAt((i + 1) * run) - 0.02, -p.y);
      m.rotation.y = p.ang;
      m.castShadow = true;
      m.receiveShadow = true;
      S.static.add(m);
    }
    r.segs.forEach((g) => {
      const ux = (g.b[0] - g.a[0]) / g.len, uy = (g.b[1] - g.a[1]) / g.len;
      [-1, 1].forEach((sd) => {
        const k = sd * r.w / 2, ox = -uy * k, oy = ux * k;
        beam3([g.a[0] + ox, g.a[1] + oy, hAt(g.s0) - 0.1], [g.b[0] + ox, g.b[1] + oy, hAt(g.s0 + g.len) - 0.1], 0.04, 0.2, tread);
      });
    });
    (r.rails || []).forEach((c) => collider(c[0], c[1], c[2], c[3], c[4], c[5], 0.03));
  });

  // Low steps outside the doors that lead down to the garden and the drive.
  X.steps.forEach((r) => S.static.add(slab(rectPoly(r), mat(0xc9bfae, { roughness: 0.85 }), r[4], r[4])));

  // The hostería's sign: a wooden post on the sidewalk with an arm and a
  // board that faces both ways along the street. Kept out of the merged
  // static meshes because its board has a painted face.
  {
    const g = new THREE.Group();
    const wood = mat(0x5a3a22, { roughness: 0.7 });
    bx(g, 0.1, 2.6, 0.1, 0, 1.3, 0, wood);
    bx(g, 1.1, 0.06, 0.06, 0.5, 2.52, 0, wood);
    const c = document.createElement("canvas");
    c.width = 512; c.height = 192;
    const k = c.getContext("2d");
    k.fillStyle = "#3b2a1c"; k.fillRect(0, 0, 512, 192);
    k.strokeStyle = "#d9c9a8"; k.lineWidth = 8; k.strokeRect(10, 10, 492, 172);
    k.fillStyle = "#f3ead8"; k.textAlign = "center";
    k.font = "italic bold 64px Georgia, serif"; k.fillText(t("walk.sign"), 256, 92);
    k.font = "bold 38px Georgia, serif"; k.fillText(t("walk.sign.sub"), 256, 152);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.03), [wood, wood, wood, wood, face, face]);
    board.position.set(0.55, 2.2, 0);
    board.castShadow = true;
    g.add(board);
    [0.2, 0.9].forEach((dx) => bx(g, 0.012, 0.1, 0.012, dx, 2.44, 0, M.black));
    g.position.set(X.sign[0], 0, -X.sign[1]);
    S.scene.add(g);
    collider(X.sign[0] - 0.08, X.sign[1], X.sign[0] + 0.08, X.sign[1], 0, 2.6, 0.06);
  }

  // The grill: brick block and chimney, against the south wall. The galería's
  // posts and its two lanterns. A brick chimney on the kitchen's roof.
  const grill = new THREE.Group();
  bx(grill, 1.5, 1.6, 0.7, 0, 0.8, 0, M.brick);
  bx(grill, 1.1, 0.5, 0.08, 0, 1.0, 0.33, M.black);
  bx(grill, 0.6, 1.9, 0.5, 0, 2.55, -0.05, M.brick);
  place(grill, X.grill[0], X.grill[1], 0, X.grill[2]);
  solid(X.grill[0], X.grill[1], 1.5, 0.7, X.grill[2], 0);
  X.posts.forEach((p) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.25, 0.1), M.trim);
    m.position.set(p[0], 1.27, -p[1]);
    m.castShadow = true;
    S.static.add(m);
    collider(p[0], p[1] - 0.01, p[0], p[1] + 0.01, 0, 2.3, 0.05);
  });
  [[-19.6, 7.24], [-24.3, 7.24]].forEach((p) => {
    const lantern = new THREE.Group();
    bx(lantern, 0.14, 0.24, 0.14, 0, 0, 0, M.black);
    bx(lantern, 0.1, 0.16, 0.1, 0, 0, 0, M.glow);
    lantern.position.set(p[0], 2.15, -(p[1] + 0.08));
    S.static.add(lantern);
    S.lamps.push([p[0], 2.1, -(p[1] + 0.5), 7, 10]);
  });
  const ch = new THREE.Group();
  bx(ch, 0.6, 1.5, 0.6, 0, 0.75, 0, M.brick);
  bx(ch, 0.72, 0.08, 0.72, 0, 1.54, 0, mat(0x8c8579));
  ch.position.set(X.chimney[0], H.Z.front + 3.1, -X.chimney[1]);
  S.static.add(ch);

  buildFurniture();
  // the lamps that come on at night: where the photos hang chandeliers and pendants
  H.furniture.forEach((p) => {
    if (p.type === "chandelier" || p.type === "pendant") S.lamps.push([p.at[0], zAt(p.at[0], p.at[1], p.level) + (p.h || 2.7) - 0.75, -p.at[1], 9, 13]);
  });
  S.lamps.push([-3.6, H.Z.apt + 2.5, -18.4, 9, 13], [-10.2, H.Z.apt + 2.3, -18.3, 7, 9], [-7.0, H.Z.front + 2.5, -6.9, 7, 8], [-7.0, H.Z.front + 2.5, -14.6, 7, 8]);

  // Roofs, which the walk shows and the overview hides by default.
  buildRoofs();

  scene.add(merge(S.static));
  S.static = null;
  scene.add(S.labels);
  buildLabels();
}
