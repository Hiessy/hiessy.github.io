"""Vacía la caché de unos slugs para volver a relevarlos de cero.

`scrape.py` solo agrega: si un aviso se dio de baja, queda para siempre en
`scraped.json`. Para sacar los vencidos hay que borrar las filas de ese slug y
volver a pedirlo — que es lo que hace esto. Después correr `scrape.py`, que va a
re-relevar justo los slugs que quedaron sin sellar.

    python tools/refresh.py --edenor        # los 12 barrios de CABA que son Edenor
    python tools/refresh.py --slugs belgrano,nunez
    python tools/scrape.py
"""
import json, os, sys

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "scraped.json")

# Franja norte de CABA = área de Edenor (ver EDENOR_CABA en build2.py)
EDENOR = ["belgrano", "nunez", "saavedra", "coghlan", "villa-urquiza", "villa-pueyrredon",
          "colegiales", "chacarita", "villa-ortuzar", "palermo", "parque-chas", "agronomia"]


def main():
    if "--edenor" in sys.argv:
        slugs = EDENOR
    elif "--slugs" in sys.argv:
        slugs = sys.argv[sys.argv.index("--slugs") + 1].split(",")
    else:
        print(__doc__); return
    data = json.load(open(OUT, encoding="utf-8"))
    stamp = data.get("_fetched", {})
    dropped = 0
    for key, rows in data.items():
        if key.startswith("_"):
            continue
        before = len(rows)
        data[key] = [r for r in rows if r.get("slugzone") not in slugs]
        dropped += before - len(data[key])
    for s in slugs:
        stamp.pop(s, None)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"borrados {dropped} avisos de {len(slugs)} slugs; sellos limpiados")
    print("ahora: python tools/scrape.py")


if __name__ == "__main__":
    main()
