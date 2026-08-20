"""Segundo relevamiento: casas y PH con jardín en el norte del conurbano.

Bella Vista, San Miguel, Olivos, La Lucila y Martínez, hasta USD 260.000.
Va a un archivo aparte (`.work/gba_norte.json`) y alimenta `gba-norte.html`;
no se mezcla con el relevamiento de CABA.

Dos trampas con los slugs:

  * `bella-vista` es Bella Vista de **Corrientes** y `la-lucila`, La Lucila de
    **Santa Fe**. Los del conurbano son `bella-vista-san-miguel` y
    `la-lucila-vicente-lopez`.
  * Agregarle `-gba-norte` a un slug que no existe no falla: devuelve la provincia
    entera (37.000 avisos). Por eso cada aviso se valida contra el partido esperado.

Se piden casas y PH por separado: Zonaprop corta en 9 páginas por consulta, así que
dos consultas por localidad duplican el techo de avisos que se pueden traer.

    python tools/gba_norte.py [--max 260000]
"""
import json, os, sys, time, random, unicodedata

from scrape import get, postings, parse, locpath

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "gba_norte.json")

MINP = 15000
PAGES = 9                      # tope de paginación anónima de Zonaprop
TIPOS = ["casas", "ph"]

# (clave, etiqueta, slug, partido esperado en la ruta de ubicación)
ZONES = [
    ("bellavista", "Bella Vista", "bella-vista-san-miguel", "san miguel"),
    ("sanmiguel",  "San Miguel",  "san-miguel",             "san miguel"),
    ("olivos",     "Olivos",      "olivos",                 "vicente lopez"),
    ("lalucila",   "La Lucila",   "la-lucila-vicente-lopez", "vicente lopez"),
    ("martinez",   "Martínez",    "martinez",               "san isidro"),
]


def plain(s):
    """Sin acentos y en minúsculas, para comparar rutas de ubicación."""
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def url_for(tipo, slug, p):
    base = f"{tipo}-venta-{slug}-mas-de-3-ambientes-orden-precio-ascendente"
    return (f"https://www.zonaprop.com.ar/{base}.html" if p == 1
            else f"https://www.zonaprop.com.ar/{base}-pagina-{p}.html")


def main():
    mx = 260000
    if "--max" in sys.argv:
        mx = int(sys.argv[sys.argv.index("--max") + 1])
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}

    for key, label, slug, partido in ZONES:
        bucket = data.setdefault(key, [])
        seen = {x["id"] for x in bucket}
        for tipo in TIPOS:
            for p in range(1, PAGES + 1):
                html = get(url_for(tipo, slug, p))
                if not html:
                    print(f"{key}/{tipo} p{p}: FAIL", flush=True); break
                raws = postings(html)
                if not raws:
                    print(f"{key}/{tipo} p{p}: vacío", flush=True); break
                over = added = wrong = 0
                for raw in raws:
                    if partido not in plain(locpath(raw)):
                        wrong += 1
                        continue
                    r = parse(raw)
                    if r["price"] > mx:
                        over += 1
                    if not r["id"] or r["id"] in seen:
                        continue
                    if not (MINP <= r["price"] <= mx):
                        continue
                    if r["amb"] and r["amb"] < 3:
                        continue
                    if not r["img"] or not r["url"] or "alquiler" in r["url"]:
                        continue
                    r["zona"] = label
                    r["zkey"] = key
                    seen.add(r["id"])
                    bucket.append(r)
                    added += 1
                print(f"{key}/{tipo} p{p}: +{added} (tot {len(bucket)}) over={over} offzone={wrong}",
                      flush=True)
                json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
                if wrong >= 25:
                    print(f"{key}/{tipo}: slug fuera de zona, corto", flush=True); break
                if over >= 8:
                    break
                time.sleep(1.1 + random.random() * 0.6)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    tot = sum(len(v) for v in data.values())
    print("DONE", {k: len(v) for k, v in data.items()}, "TOTAL", tot, flush=True)


if __name__ == "__main__":
    main()
