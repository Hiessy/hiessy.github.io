"""Arma el dataset de `gba-norte.html` a partir de `.work/gba_norte.json`.

Misma forma de fila que la página de CABA, más un campo al final:

  0 zona(idx) 1 img 2 url 3 precioTxt 4 precio 5 dirección 6 specs 7 nota
  8 pick 9 zona(label) 10 ambientes 11 dormitorios 12 jardín(texto) 13 —
  14 fuente 15 lat 16 lng 17 m² 18 terreno libre

El **terreno libre** (total − cubierto) es lo que decide si hay patio de verdad.
La bandera `jardín` sale del texto del aviso y no alcanza: 193 avisos con más de
100 m² libres no dicen "jardín", y 315 que sí lo dicen tienen menos de 100.
"""
import json, math, os
from collections import Counter

from build2 import note, geo, drop_far_coords, m2_of, feats_of, descartar
from dedupe import dedupe        # pasada final: ver tools/dedupe.py
from geocode import load_cache, coords_for

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
SRC = os.path.join(D, "gba_norte.json")
AP = os.path.join(D, "gba_ap.json")
OUT = os.path.join(D, "DG.js")

ZONES = ["Bella Vista", "San Miguel", "Olivos", "La Lucila", "Martínez",
         "Ingeniero Maschwitz", "San Fernando", "Tigre"]


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


# --- San Fernando: solo la franja costera ------------------------------------
# El partido es grande y se estira tierra adentro hasta 7,3 km del río, pasando
# Virreyes y la Panamericana. Lo que interesa es la costa y sus alrededores, así
# que se mide la distancia a la ribera y se corta en COSTA_KM.
#
# La costa va del límite con Tigre, por el puerto de San Fernando, al límite con
# San Isidro. Tres tramos alcanzan: la ribera es casi recta en este partido.
COSTA_SF = [(-34.4210, -58.5920), (-34.4380, -58.5560),
            (-34.4470, -58.5380), (-34.4600, -58.5180)]
COSTA_KM = 3.0          # la mediana está a 1,3 km; a 3 km entran 271 de 317
KY = 111.0
KX = 111.0 * math.cos(math.radians(-34.45))


def _dist_segmento(p, a, b):
    px, py = (p[1] - a[1]) * KX, (p[0] - a[0]) * KY
    bx, by = (b[1] - a[1]) * KX, (b[0] - a[0]) * KY
    largo = bx * bx + by * by
    t = 0.0 if largo == 0 else max(0.0, min(1.0, (px * bx + py * by) / largo))
    return math.hypot(px - bx * t, py - by * t)


def km_a_la_costa(lat, lng):
    return min(_dist_segmento((lat, lng), COSTA_SF[i], COSTA_SF[i + 1])
               for i in range(len(COSTA_SF) - 1))


def lejos_de_la_costa(row):
    """True si es de San Fernando y quedó tierra adentro.

    Sin coordenadas devuelve False: no haber podido ubicarlo no prueba que esté
    lejos, y es el mismo criterio que se usa con los links sin verificar.
    """
    if row[9] != "San Fernando" or not (row[15] and row[16]):
        return False
    return km_a_la_costa(row[15], row[16]) > COSTA_KM


def main():
    src = json.load(open(SRC, encoding="utf-8"))
    rows, seen = [], set()
    fuera = {}
    for bucket in src.values():
        for r in bucket:
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            motivo = descartar(r.get("d"), r.get("addr"))
            if motivo:
                fuera[motivo] = fuera.get(motivo, 0) + 1
                continue
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
                motivo = descartar(r.get("d"), r.get("addr"))
                if motivo:
                    fuera[motivo] = fuera.get(motivo, 0) + 1
                    continue
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

    print("descartados:", fuera or "ninguno")
    afuera = [r for r in rows if lejos_de_la_costa(r)]
    if afuera:
        rows = [r for r in rows if not lejos_de_la_costa(r)]
        print(f"San Fernando tierra adentro (>{COSTA_KM:.0f} km de la costa): {len(afuera)}")

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
    # Olivos o Martínez miden ~6 km y 60 km dejaba pasar un aviso a 35. Pero
    # **Tigre es un partido entero**, de Don Torcuato a Dique Luján: sus pines
    # llegan a 8,4 km de la mediana y con `km=8` se recortaban los propios. 14 km
    # cubre Tigre sin dejar entrar los que se van de provincia.
    far = drop_far_coords(rows, km=14)

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
