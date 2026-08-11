"""Combina el relevamiento nuevo de Argenprop con el viejo, por zona.

El parser original tenía dos fallas: leía mal la superficie con coma decimal
("113,50 m² cubie." daba 50) y no leía los ambientes, que la tarjeta casi nunca
muestra pero el slug de la URL sí trae. Como volver a correr el scraper no
actualiza los avisos ya guardados, hay que re-relevar — y Argenprop corta cada
pocas páginas, así que se va llenando de a pasadas.

Mientras tanto, este script arma el archivo que consume `build2.py`: usa los datos
nuevos donde existan y cae al relevamiento viejo en las zonas que todavía no se
re-relevaron, reparando lo que se pueda sin volver a pedir la página:

  - `ambientes` se recupera del slug de la URL (está en ~90% de los avisos);
  - una superficie absurdamente chica para la cantidad de dormitorios es el bug
    del decimal, y se deja en 0 — mejor no mostrar nada que mostrar un número mal.
"""
import json, os, re

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
NEW = os.path.join(D, "argenprop.json")
OLD = os.path.join(D, "argenprop_v1.json")
OUT = os.path.join(D, "argenprop_merged.json")


def load(p):
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}


def repair(r):
    if not r.get("amb"):
        m = re.search(r"-(\d+)-ambientes", r.get("url", ""))
        if m:
            r["amb"] = int(m.group(1))
    cub = r.get("cub") or 0
    dorm = r.get("dorm") or 0
    # 2 dormitorios no entran en 25 m²: es el decimal mal parseado
    if cub and dorm >= 2 and cub < 12 * dorm:
        r["cub"] = 0
    return r


def apply_detail(r, det):
    """Los datos de la ficha individual mandan sobre los de la tarjeta."""
    d = det.get(r["id"])
    if not d:
        return r
    for k in ("ban", "amb", "dorm", "cub", "tot"):
        if d.get(k):
            r[k] = d[k]
    return r


def main():
    new, old = load(NEW), load(OLD)
    det = load(os.path.join(D, "ap_detail.json"))
    out, stats = {}, []
    zones = {k for k in list(new) + list(old) if not k.startswith("_")}
    for z in sorted(zones):
        # unión por id: el aviso re-relevado gana, el viejo completa la cobertura
        rows, seen = [], set()
        for r in new.get(z) or []:
            rows.append(apply_detail(dict(r), det))
            seen.add(r["id"])
        carried = 0
        for r in old.get(z) or []:
            if r["id"] in seen:
                continue
            rows.append(apply_detail(repair(dict(r)), det))
            carried += 1
        out[z] = rows
        stats.append(f"{z}: {len(rows)} ({len(seen)} re-relevados + {carried} del anterior)")
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("\n".join(stats))
    print(f"fichas individuales cacheadas: {len(det)}")
    tot = sum(len(v) for v in out.values())
    amb = sum(1 for v in out.values() for r in v if r.get("amb"))
    ban = sum(1 for v in out.values() for r in v if r.get("ban"))
    print(f"TOTAL {tot} | con ambientes {amb} | con baños {ban}")


if __name__ == "__main__":
    main()
