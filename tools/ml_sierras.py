# -*- coding: utf-8 -*-
"""Pasa a nuestro formato lo que se sacó de MercadoLibre en la sierra.

**Acá no hay scraper.** La búsqueda se hizo a mano en el panel del navegador —
casas en venta hasta USD 260.000, con el filtro de *3 dormitorios o más* y el de
*Con jardín* puestos en la propia página — y lo que se ve en pantalla se leyó del
DOM y se mandó a `.work/ml_sierras.json`. Este archivo sólo convierte eso a las
columnas que usa `build_sierras.py`. Si hace falta repetirlo, se repite igual: a
mano, en el navegador. No hay nada que correr contra sus servidores.

Lo que el listado **sí** da: precio, título, localidad, ambientes, baños y metros
cubiertos. Lo que **no** da, y por eso falta:

- **dormitorios exactos**: se sabe que son 3 o más porque es el filtro que se
  aplicó, no porque lo diga la tarjeta. Se guarda 3 y la ficha no promete más.
- **superficie del terreno**: casi ninguna tarjeta la trae, así que el filtro de
  terreno libre los va a dejar afuera igual que a los de Argenprop.
- **coordenadas**: MercadoLibre no las publica en el listado; se geocodifica la
  localidad, que da el pueblo y no la puerta.

    python tools/ml_sierras.py
"""
import io, json, os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from sierras import LOCS

SRC = os.path.join(ROOT, ".work", "ml_sierras.json")
DST = os.path.join(ROOT, ".work", "ml_sierras_rows.json")

MIN_PRECIO = 15000


def plain(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


PUEBLOS = [(slug, label, valle) for slug, label, valle in LOCS]


def pueblo_de(loc, titulo):
    """El pueblo sale de la cadena de localidad: 'Calle, Barrio, Pueblo, Punilla, Córdoba'."""
    donde = plain(loc) + " " + plain(titulo)
    # el match más largo primero: "Villa Carlos Paz" antes que "Carlos Paz"
    for slug, label, valle in sorted(PUEBLOS, key=lambda x: -len(x[1])):
        if plain(label) in donde:
            return label, valle
    valle = "Calamuchita" if "calamuchita" in plain(loc) else "Punilla"
    return f"Otros · {valle}", valle


def main():
    rows = json.load(io.open(SRC, encoding="utf-8"))
    out, fuera = [], {"precio": 0, "sin pueblo": 0}
    for id_, slug, precio, titulo, loc, amb, ban, cub, img in rows:
        if not (MIN_PRECIO <= precio <= 260000):
            fuera["precio"] += 1
            continue
        pueblo, valle = pueblo_de(loc, titulo)
        # la dirección útil es lo que va antes de la cadena de localidades
        addr = loc.split(",")[0].strip()
        if plain(addr) == plain(pueblo) or len(addr) < 4:
            addr = pueblo
        elif pueblo not in addr:
            addr = f"{addr}, {pueblo}"
        out.append({
            "id": "ml" + id_,
            "url": f"https://casa.mercadolibre.com.ar/{slug}_JM",
            "img": f"https://http2.mlstatic.com/D_NQ_NP_2X_{img}.webp" if img else "",
            "price": precio, "addr": addr, "loc": pueblo, "valle": valle,
            "amb": amb or 0, "ban": ban or 0, "cub": cub or 0,
            # el filtro de la búsqueda garantiza 3 o más; la tarjeta no dice cuántos
            "dorm": 3,
            "d": titulo,
        })
    for r in out:
        if r["loc"].startswith("Otros"):
            fuera["sin pueblo"] += 1
    json.dump(out, io.open(DST, "w", encoding="utf-8", newline=""), ensure_ascii=False)
    from collections import Counter
    print(f"{len(rows)} leídos -> {len(out)} utilizables | descartados {fuera}")
    print("por valle:", dict(Counter(r["valle"] for r in out)))
    top = Counter(r["loc"] for r in out).most_common(8)
    print("pueblos:", ", ".join(f"{k} {v}" for k, v in top))
    print("escrito", DST)


if __name__ == "__main__":
    main()
