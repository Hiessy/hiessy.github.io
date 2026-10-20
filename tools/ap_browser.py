# -*- coding: utf-8 -*-
"""Mete en `sierras_ap.json` lo que el navegador leyó de Argenprop.

`ap_partido.py` pide las páginas con `urllib` y Argenprop le contesta **202 con
el cuerpo vacío** casi siempre: no es un captcha ni un error, es un corte
silencioso. Pidiéndolas desde el panel del navegador —un navegador de verdad,
con su motor, sus cookies y su TLS— las páginas vienen enteras. No hay acá
ninguna IP rotada, ningún encabezado falsificado ni ningún captcha resuelto: es
el mismo pedido que hace cualquiera que abre el sitio.

El navegador manda los `<a data-item-card>` tal cual, y acá se usa el **mismo
`parse()`** de siempre. Reescribir la extracción en JavaScript habría duplicado
cosas que ya costaron: los m² con coma decimal, el slug `-1-ambiente-` en
singular, el filtro de moneda. Un solo parser, un solo lugar donde arreglarlo.

Entrada: `.work/ap_browser.json`, una lista de
    {"partido": "punilla", "pagina": 27, "cards": "<a …></a>\\n<a …></a>"}

    python tools/ap_browser.py [--entrada .work/ap_browser.json]
"""
import io
import json
import os
import sys

from argenprop import parse
from ap_partido import PARTIDOS, pueblo_de, OUT, AVANCE

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
MIN_PRECIO, MAX_PRECIO = 15000, 260000


def main():
    args = sys.argv[1:]
    ent = args[args.index("--entrada") + 1] if "--entrada" in args \
        else os.path.join(D, "ap_browser.json")
    lotes = json.load(io.open(ent, encoding="utf-8"))

    data = json.load(io.open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    avance = json.load(io.open(AVANCE, encoding="utf-8")) if os.path.exists(AVANCE) else {}
    vistos = {x["id"] for k, v in data.items() if not k.startswith("_") for x in v}
    valle_de = {c: v for c, _, v, _ in PARTIDOS}

    nuevos = 0
    fuera = {"precio": 0, "ambientes": 0, "sin_foto": 0, "sin_pueblo": 0, "repetido": 0}
    paginas = {}
    for lote in lotes:
        clave = lote["partido"]
        valle = valle_de.get(clave)
        if not valle:
            print("partido desconocido:", clave, file=sys.stderr)
            continue
        filas = parse(lote.get("cards") or "")
        add = 0
        for r in filas:
            if r["id"] in vistos:
                fuera["repetido"] += 1
                continue
            if not (MIN_PRECIO <= (r.get("price") or 0) <= MAX_PRECIO):
                fuera["precio"] += 1
                continue
            if r.get("amb") and r["amb"] < 3:
                fuera["ambientes"] += 1
                continue
            if not r.get("img") or not r.get("url"):
                fuera["sin_foto"] += 1
                continue
            bslug, label = pueblo_de(r, valle)
            if not bslug:
                fuera["sin_pueblo"] += 1
                continue
            r["loc"] = label
            r["valle"] = valle
            data.setdefault(bslug, []).append(r)
            vistos.add(r["id"])
            add += 1
        nuevos += add
        paginas.setdefault(clave, []).append(lote["pagina"])
        print("  %s p%s: %d tarjetas, +%d nuevos" % (clave, lote["pagina"], len(filas), add))

    # el avance queda en la página más alta que se llegó a leer de corrido
    for clave, ps in paginas.items():
        ps.sort()
        tope = avance.get(clave, 0)
        for p in ps:
            if p == tope + 1:
                tope = p
        avance[clave] = tope

    json.dump(data, io.open(OUT, "w", encoding="utf-8", newline=""), ensure_ascii=False)
    json.dump(avance, io.open(AVANCE, "w", encoding="utf-8", newline=""))
    tot = sum(len(v) for k, v in data.items() if not k.startswith("_"))
    print("+%d nuevos · descartados %s · %d avisos de Argenprop en la sierra"
          % (nuevos, {k: v for k, v in fuera.items() if v}, tot))
    print("avance:", {k: avance.get(k, 0) for k, _, _, _ in PARTIDOS})
    return 0


if __name__ == "__main__":
    sys.exit(main())
