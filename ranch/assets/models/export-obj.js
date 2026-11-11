/* Wavefront OBJ + MTL export of a THREE.Group, with no extra library: every
   mesh becomes an object with its world transform applied, every material a
   newmtl with its color, opacity and a little shine. Units are meters, y up.
   toObj(group, name) returns { obj, mtl } as text. */
import * as THREE from "three";

export function toObj(root, name) {
  root.updateMatrixWorld(true);
  const mats = new Map();
  const lines = ["# " + name + " - ranch 3D catalog, meters, y up", "mtllib " + name + ".mtl"];
  let base = 1, n = 0;
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!mats.has(m.uuid)) {
      mats.set(m.uuid, { name: "m" + mats.size + "_" + (m.color ? m.color.getHexString() : "cccccc"), color: m.color || new THREE.Color(0xcccccc),
        opacity: m.transparent ? m.opacity : 1, metal: m.metalness || 0, rough: m.roughness === undefined ? 0.8 : m.roughness });
    }
    const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, idx = g.index;
    const w = o.matrixWorld, e = new THREE.Matrix3().getNormalMatrix(w).elements;
    lines.push("o " + name + "_" + (n++), "usemtl " + mats.get(m.uuid).name);
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(w); lines.push("v " + v.x.toFixed(4) + " " + v.y.toFixed(4) + " " + v.z.toFixed(4)); }
    if (nor) {
      for (let i = 0; i < nor.count; i++) {
        const x = nor.getX(i), y = nor.getY(i), z = nor.getZ(i);
        const X = e[0] * x + e[3] * y + e[6] * z, Y = e[1] * x + e[4] * y + e[7] * z, Z = e[2] * x + e[5] * y + e[8] * z, L = Math.hypot(X, Y, Z) || 1;
        lines.push("vn " + (X / L).toFixed(4) + " " + (Y / L).toFixed(4) + " " + (Z / L).toFixed(4));
      }
    }
    if (uv) for (let i = 0; i < uv.count; i++) lines.push("vt " + uv.getX(i).toFixed(4) + " " + uv.getY(i).toFixed(4));
    const f = (i) => (base + i) + (uv ? "/" + (base + i) : nor ? "/" : "") + (nor ? "/" + (base + i) : "");
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
      lines.push("f " + f(a) + " " + f(b) + " " + f(c));
    }
    base += pos.count;
  });
  const out = ["# materials of " + name];
  mats.forEach((m) => {
    const c = m.color.clone().convertLinearToSRGB(), s = (0.1 + 0.4 * m.metal).toFixed(2);
    out.push("newmtl " + m.name, "Kd " + c.r.toFixed(4) + " " + c.g.toFixed(4) + " " + c.b.toFixed(4), "Ks " + s + " " + s + " " + s,
      "Ns " + Math.round((1 - m.rough) * 200), "d " + m.opacity.toFixed(2), "");
  });
  return { obj: lines.join("\n") + "\n", mtl: out.join("\n") + "\n" };
}
