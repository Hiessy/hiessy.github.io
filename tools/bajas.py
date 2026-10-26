# -*- coding: utf-8 -*-
"""Publica `casas/bajas.json`: los avisos verificados como dados de baja.

Las páginas de búsqueda no necesitan esto —`build2.py` y compañía ya sacan los
muertos antes de escribir el HTML—, pero **Favoritos sí**. Esa página no tiene
dataset propio: arma su lista con lo que hay en `localStorage`, y lo que hay es
una copia de la fila del día en que se tocó el corazón. Si el aviso se cae
después, el favorito sigue ahí con su precio y su texto viejos y nadie se
entera hasta que uno hace clic y Zonaprop contesta 410.

Se publican sólo los **números de aviso**, no las URLs: son unos 2.000 y de esa
forma el archivo pesa una fracción. Cada portal numera distinto y el id se saca
igual del final de la URL:

    Zonaprop      ...-sin-expensas-60112402.html   -> 60112402
    Argenprop     ...-4-ambientes--19113993        -> 19113993
    MercadoLibre  MLA-3726473126-casa-...          -> 3726473126

    python tools/bajas.py
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALIVE = os.path.join(ROOT, ".work", "alive.json")
DST = os.path.join(ROOT, "casas", "bajas.json")

# el id va al final en los tres portales, con separadores distintos
RE_ID = re.compile(r"(?:MLA-?)?(\d{6,})(?:\.html)?$")


def id_de(url):
    u = (url or "").split("?")[0].rstrip("/")
    m = RE_ID.search(u)
    return m.group(1) if m else None


def main():
    if not os.path.exists(ALIVE):
        print("falta .work/alive.json")
        return 1
    d = json.load(io.open(ALIVE, encoding="utf-8"))
    ids, sin_id = set(), 0
    for url, v in d.items():
        if v.get("ok"):
            continue
        i = id_de(url)
        if i:
            ids.add(i)
        else:
            sin_id += 1
    salida = sorted(ids)
    io.open(DST, "w", encoding="utf-8", newline="").write(
        json.dumps(salida, separators=(",", ":")))
    print("escrito %s | %d bajas (%d sin id reconocible) | %.0f KB"
          % (DST, len(salida), sin_id, os.path.getsize(DST) / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
