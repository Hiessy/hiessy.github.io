# -*- coding: utf-8 -*-
"""Pasa a nuestro formato lo que se sacó de MercadoLibre en la sierra.

La búsqueda se hizo en el panel del navegador con los filtros de la propia
página —casas en venta hasta USD 260.000, *3 dormitorios o más*, *Con jardín*,
Punilla y Calamuchita— y se leyó del DOM lo que la tarjeta muestra.

**Lo que la tarjeta muestra y lo que no.** De 457 avisos:

    m² cubiertos        435   (95%)
    ambientes           393   (86%)
    dormitorios          64   (14%)
    superficie total     22   (5%)

Las tarjetas traen **o** ambientes **o** dormitorios, casi siempre ambientes, y
el lote casi nunca. Así que de la gran mayoría **no sabemos cuántos dormitorios
tienen ni cuánto mide el terreno**, y acá se guarda 0, que es como el resto del
sitio dice "no hay dato".

La primera versión de este archivo ponía `dorm = 3` en los 457 porque el filtro
de la búsqueda garantiza tres o más. Eso es inventar: una casa de cinco
dormitorios quedaba anotada como de tres, y el filtro de dormitorios de la
página pasaba a mentir sobre 367 avisos. El conjunto sí está filtrado por 3 o
más —eso lo hizo MercadoLibre, no nosotros— pero el número de cada aviso no lo
sabemos, y el pie de la página lo aclara.

    python tools/ml_sierras.py
"""
import io, json, os, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from sierras import LOCS

SRC = os.path.join(ROOT, ".work", "ml_sierras.json")
DST = os.path.join(ROOT, ".work", "ml_sierras_rows.json")
MIN_PRECIO = 15000


def plain(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


PUEBLOS = sorted([(slug, label, valle) for slug, label, valle in LOCS],
                 key=lambda x: -len(x[1]))          # el match más largo primero


def pueblo_de(loc, titulo):
    donde = plain(loc) + " " + plain(titulo)
    for _, label, valle in PUEBLOS:
        if plain(label) in donde:
            return label, valle
    valle = "Calamuchita" if "calamuchita" in plain(loc) else "Punilla"
    return f"Otros · {valle}", valle


def main():
    rows = json.load(io.open(SRC, encoding="utf-8"))
    out, fuera = [], {"precio": 0}
    for r in rows:
        precio = r.get("p") or 0
        if not (MIN_PRECIO <= precio <= 260000):
            fuera["precio"] += 1
            continue
        loc, titulo = r.get("loc") or "", r.get("t") or ""
        pueblo, valle = pueblo_de(loc, titulo)
        addr = loc.split(",")[0].strip()
        if plain(addr) == plain(pueblo) or len(addr) < 4:
            addr = pueblo
        elif pueblo not in addr:
            addr = f"{addr}, {pueblo}"
        out.append({
            "id": "ml" + str(r.get("id")),
            "url": f"https://casa.mercadolibre.com.ar/{r.get('u')}_JM",
            "img": (f"https://http2.mlstatic.com/D_NQ_NP_2X_{r['img']}.webp"
                    if r.get("img") else ""),
            "price": precio, "addr": addr, "loc": pueblo, "valle": valle,
            # tal cual lo dice la tarjeta; 0 es "no lo dice", nunca un supuesto
            "amb": r.get("amb") or 0,
            "dorm": r.get("dorm") or 0,
            "ban": r.get("ban") or 0,
            "cub": r.get("cub") or 0,
            "tot": r.get("tot") or 0,
            "d": titulo,
        })
    json.dump(out, io.open(DST, "w", encoding="utf-8", newline=""), ensure_ascii=False)
    from collections import Counter
    print(f"{len(rows)} leídos -> {len(out)} utilizables | descartados {fuera}")
    print(f"  declaran dormitorios: {sum(1 for r in out if r['dorm'])}")
    print(f"  declaran lote       : {sum(1 for r in out if r['tot'])}")
    print("por valle:", dict(Counter(r["valle"] for r in out)))
    print("escrito", DST)


if __name__ == "__main__":
    main()
