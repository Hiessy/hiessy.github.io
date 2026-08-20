"""Argenprop para la página de zona norte (Bella Vista, San Miguel, Olivos, La Lucila,
Martínez), hasta USD 260.000.

Ojo con lo que **no** trae: en estas localidades las tarjetas de Argenprop no
declaran superficie total, solo cubierta — 0 de 40 en la muestra. Y las fichas
individuales, que sí la traen, están bloqueadas. O sea que estos avisos entran sin
dato de lote y no pueden pasar el filtro de terreno libre, que es el que ordena esa
página. Se los marca como tales en vez de dejarlos desaparecer sin explicación.

Como siempre con Argenprop: cachea por localidad, solo sella la que trajo avisos y
arranca por la que menos tiene. **No correr dos instancias a la vez.**

    python tools/gba_ap.py [--max 260000]
"""
import json, os, sys, time, random, unicodedata

from argenprop import get, parse

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "gba_ap.json")
PAGES = 6
DELAY = (7.0, 11.0)
TIPOS = ["casas", "ph"]

# (clave, etiqueta, slug, partido que tiene que aparecer en el título de la tarjeta)
ZONES = [
    # "bella-vista" a secas es la de Corrientes; "bella-vista-buenos-aires" devuelve
    # 91.000 avisos de todo el país. La buena es la que nombra el partido.
    ("bellavista", "Bella Vista", "bella-vista-san-miguel", "san miguel"),
    ("sanmiguel",  "San Miguel",  "san-miguel",  "san miguel"),
    ("olivos",     "Olivos",      "olivos",      "vicente lopez"),
    ("lalucila",   "La Lucila",   "la-lucila",   "vicente lopez"),
    ("martinez",   "Martínez",    "martinez",    "san isidro"),
]


def plain(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def url_for(tipo, slug, p, mx):
    u = f"https://www.argenprop.com/{tipo}/venta/{slug}/hasta-{mx}-dolares"
    return u if p == 1 else f"{u}/pagina-{p}"


def main():
    mx = 260000
    if "--max" in sys.argv:
        mx = int(sys.argv[sys.argv.index("--max") + 1])
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    stamp = data.setdefault("_fetched", {})
    order = sorted(ZONES, key=lambda z: len(data.get(z[0], [])))

    for key, label, slug, partido in order:
        if time.time() - stamp.get(key, 0) < 24 * 3600:
            print(f"{key}: cache — skip", flush=True); continue
        bucket = data.setdefault(key, [])
        before = len(bucket)
        seen = {x["id"] for x in bucket}
        for tipo in TIPOS:
            for p in range(1, PAGES + 1):
                h = get(url_for(tipo, slug, p, mx))
                if not h:
                    print(f"{key}/{tipo} p{p}: BLOQUEADO", flush=True); break
                rows = parse(h)
                if not rows:
                    print(f"{key}/{tipo} p{p}: sin avisos", flush=True); break
                added = wrong = 0
                for r in rows:
                    # el título dice "Casa en Venta en Olivos, Vicente López":
                    # así se descarta la Bella Vista de Corrientes y compañía
                    if partido not in plain(r.get("loc", "")):
                        wrong += 1
                        continue
                    if r["id"] in seen or not (15000 <= r["price"] <= mx):
                        continue
                    if r["amb"] and r["amb"] < 3:
                        continue
                    if not r["img"] or not r["url"]:
                        continue
                    r["zona"] = label
                    seen.add(r["id"])
                    bucket.append(r)
                    added += 1
                print(f"{key}/{tipo} p{p}: +{added} (tot {len(bucket)}) offzone={wrong}", flush=True)
                json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
                if wrong >= 15:
                    print(f"{key}/{tipo}: fuera de zona, corto", flush=True); break
                time.sleep(random.uniform(*DELAY))
        if len(bucket) > before:
            stamp[key] = time.time()
        json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)

    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    tot = sum(len(v) for k, v in data.items() if not k.startswith("_"))
    print("DONE", {k: len(v) for k, v in data.items() if not k.startswith("_")}, "TOTAL", tot, flush=True)


if __name__ == "__main__":
    main()
