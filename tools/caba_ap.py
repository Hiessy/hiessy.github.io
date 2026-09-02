"""Argenprop en CABA, barrio por barrio (la franja Edenor), hasta USD 260.000.

Por qué existe: el barrido anterior pedía `capital-federal` de una sola consulta y
Argenprop corta a las pocas páginas, así que de toda la ciudad entraban ~100 avisos y
después del recorte a la franja norte quedaban 17. Pidiendo cada barrio por separado
cada uno tiene su propio cupo.

Como siempre con Argenprop: cachea por barrio, solo sella el que trajo avisos y
arranca por el que menos tiene. **No correr dos instancias a la vez.**

    python tools/caba_ap.py [--max 260000]
"""
import json, os, sys, time, random, unicodedata

from argenprop import get, parse

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "caba_ap.json")
PAGES = 6
DELAY = (7.0, 11.0)
TIPOS = ["casas", "ph"]

# slug de Argenprop -> etiqueta que usa la página (la misma de BARRIO_LABEL)
BARRIOS = [
    ("villa-urquiza",    "Villa Urquiza"),
    ("villa-pueyrredon", "Villa Pueyrredón"),
    ("palermo",          "Palermo"),
    ("saavedra",         "Saavedra"),
    ("parque-chas",      "Parque Chas"),
    ("colegiales",       "Colegiales"),
    ("belgrano",         "Belgrano"),
    ("villa-ortuzar",    "Villa Ortúzar"),
    ("chacarita",        "Chacarita"),
    ("agronomia",        "Agronomía"),
    ("nunez",            "Núñez"),
    ("coghlan",          "Coghlan"),
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
    order = sorted(BARRIOS, key=lambda b: len(data.get(b[0], [])))
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
        print("solo:", sorted(only), flush=True)

    for slug, label in order:
        if only and slug not in only:
            continue
        if time.time() - stamp.get(slug, 0) < 24 * 3600:
            print(f"{slug}: cache — skip", flush=True); continue
        bucket = data.setdefault(slug, [])
        before = len(bucket)
        seen = {x["id"] for x in bucket}
        want = plain(label)
        for tipo in TIPOS:
            for p in range(1, PAGES + 1):
                h = get(url_for(tipo, slug, p, mx))
                if not h:
                    print(f"{slug}/{tipo} p{p}: BLOQUEADO", flush=True); break
                rows = parse(h)
                if not rows:
                    print(f"{slug}/{tipo} p{p}: sin avisos", flush=True); break
                added = wrong = 0
                for r in rows:
                    # el título trae "PH en Venta en Villa Urquiza, CABA"
                    if want not in plain(r.get("loc", "")):
                        wrong += 1
                        continue
                    if r["id"] in seen or not (15000 <= r["price"] <= mx):
                        continue
                    if r["amb"] and r["amb"] < 3:
                        continue
                    if not r["img"] or not r["url"]:
                        continue
                    r["barrio"] = label
                    seen.add(r["id"])
                    bucket.append(r)
                    added += 1
                print(f"{slug}/{tipo} p{p}: +{added} (tot {len(bucket)}) offzone={wrong}", flush=True)
                json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
                if wrong >= 15:
                    print(f"{slug}/{tipo}: fuera de barrio, corto", flush=True); break
                time.sleep(random.uniform(*DELAY))
        if len(bucket) > before:
            stamp[slug] = time.time()
        json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)

    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    tot = sum(len(v) for k, v in data.items() if not k.startswith("_"))
    print("DONE", {k: len(v) for k, v in data.items() if not k.startswith("_")}, "TOTAL", tot, flush=True)


if __name__ == "__main__":
    main()
