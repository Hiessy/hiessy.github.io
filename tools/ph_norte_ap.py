"""Lo mismo que `ph_norte.py` pero en Argenprop: PH en la zona norte de CABA
con techo propio (por defecto USD 230.000).

Argenprop corta a las pocas páginas, así que va de a tandas: cachea por barrio,
solo sella el que trajo avisos y arranca por el que menos tiene. Correrlo de nuevo
sigue por donde quedó.

    python tools/ph_norte_ap.py [--max 230000]
"""
import json, os, sys, time, random

from argenprop import get, parse, keep as _keep

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "ph_norte_ap.json")
BARRIOS = ["colegiales", "nunez", "belgrano", "coghlan", "parque-chas"]
PAGES = 6
DELAY = (7.0, 11.0)


def url_for(slug, p, mx):
    u = f"https://www.argenprop.com/ph/venta/{slug}/hasta-{mx}-dolares"
    return u if p == 1 else f"{u}/pagina-{p}"


def main():
    mx = 230000
    if "--max" in sys.argv:
        mx = int(sys.argv[sys.argv.index("--max") + 1])
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    stamp = data.setdefault("_fetched", {})
    order = sorted(BARRIOS, key=lambda b: len(data.get(b, [])))
    for slug in order:
        if time.time() - stamp.get(slug, 0) < 24 * 3600:
            print(f"{slug}: cache — skip", flush=True); continue
        bucket = data.setdefault(slug, [])
        before = len(bucket)
        seen = {x["id"] for x in bucket}
        for p in range(1, PAGES + 1):
            h = get(url_for(slug, p, mx))
            if not h:
                print(f"{slug} p{p}: BLOQUEADO", flush=True); break
            rows = parse(h)
            if not rows:
                print(f"{slug} p{p}: sin avisos", flush=True); break
            added = 0
            for r in rows:
                if r["id"] in seen or r["price"] > mx or r["price"] < 15000:
                    continue
                if not r["img"] or not r["url"]:
                    continue
                if r["amb"] and r["amb"] < 3:
                    continue
                r["barrio_slug"] = slug
                seen.add(r["id"])
                bucket.append(r)
                added += 1
            print(f"{slug} p{p}: +{added} (tot {len(bucket)})", flush=True)
            json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
            time.sleep(random.uniform(*DELAY))
        if len(bucket) > before:
            stamp[slug] = time.time()
        json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("DONE", {k: len(v) for k, v in data.items() if not k.startswith("_")}, flush=True)


if __name__ == "__main__":
    main()
