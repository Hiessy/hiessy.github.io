"""Arma el dataset de `gba-norte.html` a partir de `.work/gba_norte.json`.

Misma forma de fila que la página de CABA, más un campo al final:

  0 zona(idx) 1 img 2 url 3 precioTxt 4 precio 5 dirección 6 specs 7 nota
  8 pick 9 zona(label) 10 ambientes 11 dormitorios 12 jardín(texto) 13 —
  14 fuente 15 lat 16 lng 17 m² 18 terreno libre

El **terreno libre** (total − cubierto) es lo que decide si hay patio de verdad.
La bandera `jardín` sale del texto del aviso y no alcanza: 193 avisos con más de
100 m² libres no dicen "jardín", y 315 que sí lo dicen tienen menos de 100.
"""
import json, os
from collections import Counter

from build2 import note, geo, drop_far_coords, m2_of, feats_of
from dedupe import dedupe        # pasada final: ver tools/dedupe.py
from geocode import load_cache, coords_for

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
SRC = os.path.join(D, "gba_norte.json")
AP = os.path.join(D, "gba_ap.json")
OUT = os.path.join(D, "DG.js")

ZONES = ["Bella Vista", "San Miguel", "Olivos", "La Lucila", "Martínez"]


def specs_gba(r):
    """Acá el lote importa tanto como lo cubierto, así que van los dos."""
    b = []
    if r.get("amb"):
        b.append(f"{r['amb']} amb")
    if r.get("dorm"):
        b.append(f"{r['dorm']} dorm")
    if r.get("cub"):
        b.append(f"{r['cub']} m² cub")
    if r.get("tot"):
        b.append(f"{r['tot']} m² lote")
    if r.get("ban"):
        b.append(f"{r['ban']} baño" + ("s" if r["ban"] > 1 else ""))
    return " · ".join(b)


def patio(r):
    return max((r.get("tot") or 0) - (r.get("cub") or 0), 0)


def main():
    src = json.load(open(SRC, encoding="utf-8"))
    rows, seen = [], set()
    for bucket in src.values():
        for r in bucket:
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            n = note(r.get("d", ""))
            if not n:
                continue
            zona = r.get("zona") or ""
            rows.append([ZONES.index(zona) if zona in ZONES else 0,
                         r["img"], r["url"], f"{r['price']:,}".replace(",", "."), r["price"],
                         r.get("addr") or zona, specs_gba(r), n, 0, zona,
                         r.get("amb", 0), r.get("dorm", 0), r.get("gar", 0), "",
                         "Zonaprop", *geo(r), m2_of(r), patio(r),
                         feats_of(r.get("d", ""))])
    # --- Argenprop. Sin superficie total no hay dato de lote: entran con terreno 0,
    # que es "no declarado", no "sin patio". La página lo aclara en el contador.
    geo_cache = load_cache()
    ap_n = 0
    if os.path.exists(AP):
        for key, bucket in json.load(open(AP, encoding="utf-8")).items():
            if key.startswith("_"):
                continue
            for r in bucket:
                if r["id"] in seen:
                    continue
                seen.add(r["id"])
                n = note(r.get("d", ""))
                if not n:
                    continue
                zona = r.get("zona") or ""
                rows.append([ZONES.index(zona) if zona in ZONES else 0,
                             r["img"], r["url"], f"{r['price']:,}".replace(",", "."), r["price"],
                             r.get("addr") or zona, specs_gba(r), n, 0, zona,
                             r.get("amb", 0), r.get("dorm", 0), r.get("gar", 0), "",
                             "Argenprop",
                             *coords_for(r.get("addr"), r.get("loc"), geo_cache),
                             m2_of(r), patio(r), feats_of(r.get("d", ""))])
                ap_n += 1
    print("Argenprop:", ap_n, "(sin dato de lote:",
          sum(1 for r in rows if r[14] == "Argenprop" and not r[18]), ")")

    rows, dups = dedupe(rows)
    print("repetidos sacados", dups)
    rows.sort(key=lambda r: (r[0], r[4]))
    # sin ambientes, ni dormitorios, ni superficie no hay nada que evaluar
    empty = [r for r in rows if not r[6].strip()]
    if empty:
        rows = [r for r in rows if r[6].strip()]
        print("descartados sin datos:", len(empty))
    small = [r for r in rows if 0 < r[10] < 3]
    if small:
        rows = [r for r in rows if not (0 < r[10] < 3)]
        print("descartados por tener 1-2 ambientes:", len(small))
    # estas localidades miden ~6 km: 60 km dejaba pasar un aviso a 35
    far = drop_far_coords(rows, km=8)

    print("avisos", len(rows), "| coordenadas descartadas por lejanía:", far)
    print("por zona", Counter(r[9] for r in rows))
    for th in (100, 150, 200):
        print(f"  terreno libre >= {th} m²: {sum(1 for r in rows if r[18] >= th)}")
    print("con jardín en el texto:", sum(1 for r in rows if r[12]))
    js = "const D=" + json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + ";"
    open(OUT, "w", encoding="utf-8").write(js)
    print("bytes", len(js.encode("utf-8")))


if __name__ == "__main__":
    main()
