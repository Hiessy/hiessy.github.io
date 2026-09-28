"""Arma el dataset de `sierras.html` a partir de `.work/sierras.json`.

Misma forma de fila que las otras dos páginas, con un cambio deliberado:

  0 valle(idx) 1 img 2 url 3 precioTxt 4 precio 5 dirección 6 specs 7 nota
  8 pick 9 pueblo 10 ambientes 11 dormitorios 12 jardín(texto) 13 **valle**
  14 fuente 15 lat 16 lng 17 m² cub 18 terreno libre 19 rasgos

El **valle** va en la columna 13 y la **fuente** en la 14, como en las otras dos
páginas. Antes el valle ocupaba la 14 porque acá todo salía de Zonaprop y el
filtro de fuente no filtraba nada; desde que hay avisos de Argenprop hace falta
poder distinguirlos, así que el valle se mudó a la 13 y el JS tiene su propio
filtro `data-v`.

El **terreno libre** (lote − cubierto) es el filtro que importa: en la sierra casi
todos los avisos declaran el lote (2.257 de 2.266), al revés de la zona norte,
donde Argenprop no lo publicaba nunca.
"""
import json, os, re
from collections import Counter

from build2 import note, geo, drop_far_coords, m2_of, feats_of, descartar, load_dead, is_dead
from dedupe import dedupe
from geocode import load_cache, coords_for
from sierras import LOCS, PUNILLA, CALAMUCHITA

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
SRC = os.path.join(D, "sierras.json")
OUT = os.path.join(D, "DS.js")

VALLES = [PUNILLA, CALAMUCHITA]
# los pueblos en el orden en que están en LOCS (norte a sur), sin repetir:
# `villa-del-lago` comparte etiqueta con Villa Carlos Paz
PUEBLOS = list(dict.fromkeys(label for _, label, _ in LOCS))


def specs(r):
    """El lote pesa tanto como lo cubierto, así que van los dos."""
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


# En la sierra muchas inmobiliarias cargan el título del aviso en el campo de
# dirección: "Casa en La Cumbre!!!! 2 Dormitorios con 5000 Metros de Terreno
# Propio!!! -gn-". Se muestra el pueblo en vez de eso. Solo se descarta lo que
# tiene lenguaje de venta o signos de exclamación: "Tucumán al 300, Barrio Villa
# Gloria" es larga pero es una dirección de verdad y se queda.
TITULO = re.compile(
    r"!!|\b(en venta|a la venta|venta de|dormitorios?|ambientes?|ideal|"
    r"oportunidad|excelente|hermosa|hermoso|bell[ií]sim|caser[oó]n|"
    r"apto\s+cr[eé]dito|financia)\b", re.I)


def es_titulo(a):
    return bool(a) and (len(a) > 80 or bool(TITULO.search(a)))


def main():
    src = json.load(open(SRC, encoding="utf-8"))
    rows, seen = [], set()
    fuera = {}
    # los dados de baja que encontró deadlinks.py (410 Gone)
    dead = load_dead()
    bajas = 0
    for key, bucket in src.items():
        if key.startswith("_"):
            continue
        for r in bucket:
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            if is_dead(r.get("url", ""), dead):
                bajas += 1
                continue
            motivo = descartar(r.get("d"), r.get("addr"))
            if motivo:
                fuera[motivo] = fuera.get(motivo, 0) + 1
                continue
            n = note(r.get("d", ""))
            if not n:
                continue
            pueblo = r.get("loc") or ""
            valle = r.get("valle") or PUNILLA
            # la dirección sola ("Los Álamos 300") no dice en qué pueblo está, y
            # en la sierra hay una calle San Martín por localidad
            addr = r.get("addr") or ""
            if es_titulo(addr):
                addr = ""
            addr = f"{addr}, {pueblo}" if addr else pueblo
            rows.append([VALLES.index(valle), r["img"], r["url"],
                         f"{r['price']:,}".replace(",", "."), r["price"],
                         addr, specs(r), n, 0, pueblo,
                         r.get("amb", 0), r.get("dorm", 0), r.get("gar", 0), valle,
                         "Zonaprop", *geo(r), m2_of(r), patio(r),
                         feats_of(r.get("d", ""))])

    # --- Argenprop. No publica coordenadas: se geocodifica la dirección.
    geo_cache = load_cache()
    ap = os.path.join(D, "sierras_ap.json")
    ap_n = 0
    if os.path.exists(ap):
        for key, bucket in json.load(open(ap, encoding="utf-8")).items():
            if key.startswith("_") or not isinstance(bucket, list):
                continue
            for r in bucket:
                if r["id"] in seen:
                    continue
                seen.add(r["id"])
                if is_dead(r.get("url", ""), dead):
                    bajas += 1
                    continue
                motivo = descartar(r.get("d"), r.get("addr"))
                if motivo:
                    fuera[motivo] = fuera.get(motivo, 0) + 1
                    continue
                n = note(r.get("d", ""))
                if not n:
                    continue
                pueblo = r.get("loc") or ""
                valle = r.get("valle") or PUNILLA
                addr = r.get("addr") or ""
                if es_titulo(addr):
                    addr = ""
                addr = f"{addr}, {pueblo}" if addr else pueblo
                rows.append([VALLES.index(valle), r["img"], r["url"],
                             f"{r['price']:,}".replace(",", "."), r["price"],
                             addr, specs(r), n, 0, pueblo,
                             r.get("amb", 0), r.get("dorm", 0), r.get("gar", 0), valle,
                             "Argenprop",
                             *coords_for(r.get("addr"), pueblo + ", Córdoba", geo_cache),
                             m2_of(r), patio(r), feats_of(r.get("d", ""))])
                ap_n += 1
    print("Argenprop:", ap_n)

    print("descartados:", fuera or "ninguno", "| dados de baja:", bajas)
    rows, dups = dedupe(rows)
    print("repetidos sacados", dups)
    rows.sort(key=lambda r: (r[0], r[4]))
    empty = [r for r in rows if not r[6].strip()]
    if empty:
        rows = [r for r in rows if r[6].strip()]
        print("descartados sin datos:", len(empty))
    small = [r for r in rows if 0 < r[10] < 3]
    if small:
        rows = [r for r in rows if not (0 < r[10] < 3)]
        print("descartados por tener 1-2 ambientes:", len(small))
    # Agrupado por **pueblo**, no por valle: Punilla mide ~100 km de norte a sur,
    # y comparando contra la mediana del valle se descartaban 999 coordenadas
    # buenas. Cada pueblo entra holgado en 12 km.
    far = drop_far_coords(rows, km=12, key=lambda r: r[9])

    print("avisos", len(rows), "| coordenadas descartadas por lejanía:", far)
    print("por valle", Counter(r[13] for r in rows),
          "| fuente", Counter(r[14] for r in rows))
    print("con coordenadas", sum(1 for r in rows if r[15] and r[16]))
    for th in (300, 600, 1000):
        print(f"  terreno libre >= {th} m²: {sum(1 for r in rows if r[18] >= th)}")
    top = Counter(r[9] for r in rows).most_common(8)
    print("pueblos con más avisos:", ", ".join(f"{k} {v}" for k, v in top))
    js = "const D=" + json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + ";"
    open(OUT, "w", encoding="utf-8").write(js)
    print("bytes", len(js.encode("utf-8")))


if __name__ == "__main__":
    main()
