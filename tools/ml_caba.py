# -*- coding: utf-8 -*-
"""Pasa a nuestro formato lo que se sacó de MercadoLibre en el norte de CABA.

Tercera fuente para `caba-norte.html`, igual que `ml_sierras.py` lo es para la
sierra. Se busca barrio por barrio —los doce de la franja Edenor— con el filtro
de precio puesto en la propia página y el tipo `casas-ph`, que trae las dos
cosas que mira esta búsqueda.

**El filtro de ambientes de MercadoLibre no filtra.** Probado en Belgrano:

    sin filtro            109 resultados
    /1-ambiente           112
    /mas-de-3-ambientes   111
    /mas-de-5-ambientes   105

Pedir «1 ambiente» devuelve **más** avisos que no pedir nada, así que esos
tramos de la URL se ignoran del lado del portal. Por eso el barrido va sin
filtro de ambientes y el corte se hace acá, con lo que dice la tarjeta. Usar
ese filtro habría dado una lista que parece filtrada y no lo está.

**El filtro de barrio tampoco filtra, y eso es lo grave.** Pidiendo Belgrano
vuelven avisos de La Plata, de Rosario, de Flores, de Boedo y de San Cristobal.
Medido sobre las 1.353 tarjetas del barrido: **el barrio pedido aparece en la
ubicacion de apenas el 53%**, y hay nueve avisos que salen en las doce
busquedas. Publicar eso habria puesto casas de Rosario en una pagina que dice
"norte de CABA".

Asi que el barrio **sale de la tarjeta, nunca de la consulta**, y se exige que
diga Capital Federal y que el barrio sea uno de los doce. Es la misma regla que
`sierras.py` aplica desde siempre del lado de Zonaprop: validar cada aviso
contra la ubicacion que publica, porque el slug miente.

**Lo que la tarjeta muestra y lo que no.** Trae **o** ambientes **o**
dormitorios, casi siempre ambientes, así que de la mayoría no sabemos cuántos
dormitorios tienen. Se guarda 0, que en todo el sitio quiere decir «no hay
dato» y nunca cero.

    python tools/ml_caba.py
"""
import io
import json
import os
import re
import sys
import unicodedata
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, ".work", "ml_caba.json")
DST = os.path.join(ROOT, ".work", "ml_caba_rows.json")

MIN_PRECIO, MAX_PRECIO = 15000, 260000
MIN_AMB = 3

# El filtro de "venta" tampoco filtra: en el barrido entraron alquileres por
# noche a USD 75, salones de eventos a USD 600 y una residencia "ideal firmas
# de alta gama" a USD 18.000, que es un alquiler corporativo por mes. Es el
# tercer filtro del portal que no cumple, despues del de ambientes y el de
# barrio.
ALQUILER = re.compile(
    r"valor\s*por\s*noche|por\s*noche|p/noche|alquiler|temporari|"
    r"eventos?|salon|por\s*mes|mensual|diario", re.I)

# Y una red por precio: en estos barrios el metro cuadrado no baja de unos
# cientos de dolares. Un aviso de 594 m2 a USD 18.000 son 30 USD/m2, que no es
# una ganga sino otra cosa publicada en la seccion equivocada.
MIN_USD_M2 = 400

# slug de la búsqueda -> cómo lo escribe el resto del sitio
BARRIOS = {
    "belgrano": "Belgrano", "nunez": "Núñez", "saavedra": "Saavedra",
    "coghlan": "Coghlan", "villa-urquiza": "Villa Urquiza",
    "villa-pueyrredon": "Villa Pueyrredón", "colegiales": "Colegiales",
    "chacarita": "Chacarita", "villa-ortuzar": "Villa Ortúzar",
    "palermo": "Palermo", "parque-chas": "Parque Chas", "agronomia": "Agronomía",
}


def plain(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def main():
    rows = json.load(io.open(SRC, encoding="utf-8"))
    out, fuera, vistos = [], Counter(), set()
    for r in rows:
        rid = str(r.get("id") or "")
        if not rid or rid in vistos:
            fuera["repetido"] += 1
            continue
        precio = r.get("p") or 0
        if not (MIN_PRECIO <= precio <= MAX_PRECIO):
            fuera["precio"] += 1          # 0 = publicado en pesos
            continue
        titulo = r.get("t") or ""
        if ALQUILER.search(titulo):
            fuera["alquiler_o_evento"] += 1
            continue
        cub = r.get("cub") or 0
        if cub and precio / cub < MIN_USD_M2:
            fuera["usd_m2_imposible"] += 1
            continue
        amb = r.get("amb") or 0
        # El corte lo hacemos acá porque el del portal no funciona. Si la
        # tarjeta no dice ambientes, no se descarta: no saber no es saber que no.
        if amb and amb < MIN_AMB:
            fuera["pocos_ambientes"] += 1
            continue
        if not r.get("img") or not r.get("u"):
            fuera["sin_foto"] += 1
            continue
        # El barrio sale de lo que dice la tarjeta, no de la busqueda.
        loc_p = plain(r.get("loc") or "")
        if "capital federal" not in loc_p:
            fuera["fuera_de_caba"] += 1
            continue
        barrio = None
        for slug, nombre in BARRIOS.items():
            if plain(nombre) in loc_p:
                barrio = nombre
                break
        if not barrio:
            fuera["otro_barrio"] += 1
            continue
        vistos.add(rid)
        loc = (r.get("loc") or "").strip()
        addr = loc.split(",")[0].strip()
        if plain(addr) == plain(barrio) or len(addr) < 4:
            addr = barrio
        elif plain(barrio) not in plain(addr):
            addr = "%s, %s" % (addr, barrio)
        out.append({
            "id": "ml" + rid,
            "url": "https://casa.mercadolibre.com.ar/%s_JM" % r["u"],
            "img": "https://http2.mlstatic.com/D_NQ_NP_2X_%s.webp" % r["img"],
            "price": precio, "addr": addr, "loc": barrio,
            # tal cual lo dice la tarjeta; 0 es "no lo dice", nunca un supuesto
            "amb": amb, "dorm": r.get("dorm") or 0, "ban": r.get("ban") or 0,
            "cub": r.get("cub") or 0, "tot": r.get("tot") or 0,
            "d": (r.get("t") or "").strip(),
        })
    json.dump(out, io.open(DST, "w", encoding="utf-8", newline=""), ensure_ascii=False)
    print("%d leidos -> %d utilizables | descartados %s" % (len(rows), len(out), dict(fuera)))
    print("  declaran ambientes : %d" % sum(1 for r in out if r["amb"]))
    print("  declaran dormitorios: %d" % sum(1 for r in out if r["dorm"]))
    print("  declaran cubiertos : %d" % sum(1 for r in out if r["cub"]))
    print("por barrio:", dict(Counter(r["loc"] for r in out)))
    print("escrito", DST)
    return 0


if __name__ == "__main__":
    sys.exit(main())
