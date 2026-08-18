"""PH en la zona norte de CABA con techo de precio propio (por defecto USD 230.000).

El barrido general (`scrape.py`) corta en 200.000, así que para un presupuesto mayor
hace falta volver a pedir. Usa el tipo `ph-venta-...` en vez de `casas-ph-venta-...`
para traer solo PH, y pagina por precio ascendente hasta cruzar el techo.

    python tools/ph_norte.py [--max 230000] [--barrios colegiales,nunez]
"""
import json, os, sys, time, random

from scrape import get, postings, parse, locpath

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "ph_norte.json")

BARRIOS = ["colegiales", "nunez", "belgrano", "coghlan", "parque-chas"]
MINP = 15000
PAGES = 9          # Zonaprop corta la paginación anónima acá


def url_for(slug, p, mx):
    base = f"ph-venta-{slug}-mas-de-3-ambientes-orden-precio-ascendente"
    u = f"https://www.zonaprop.com.ar/{base}.html"
    return u if p == 1 else f"https://www.zonaprop.com.ar/{base}-pagina-{p}.html"


def main():
    mx = 230000
    if "--max" in sys.argv:
        mx = int(sys.argv[sys.argv.index("--max") + 1])
    barrios = BARRIOS
    if "--barrios" in sys.argv:
        barrios = sys.argv[sys.argv.index("--barrios") + 1].split(",")

    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    for slug in barrios:
        bucket = data.setdefault(slug, [])
        seen = {x["id"] for x in bucket}
        for p in range(1, PAGES + 1):
            html = get(url_for(slug, p, mx))
            if not html:
                print(f"{slug} p{p}: FAIL", flush=True); break
            raws = postings(html)
            if not raws:
                print(f"{slug} p{p}: vacío", flush=True); break
            over = added = wrong = 0
            for raw in raws:
                if "capital federal" not in locpath(raw):
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
                r["barrio_slug"] = slug
                seen.add(r["id"])
                bucket.append(r)
                added += 1
            print(f"{slug} p{p}: +{added} (tot {len(bucket)}) over={over} offzone={wrong}", flush=True)
            json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
            if over >= 8:
                break
            time.sleep(1.1 + random.random() * 0.6)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    tot = sum(len(v) for v in data.values())
    print("DONE", {k: len(v) for k, v in data.items()}, "TOTAL", tot, flush=True)


if __name__ == "__main__":
    main()
