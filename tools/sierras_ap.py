"""Argenprop en las sierras de Córdoba, pueblo por pueblo.

Mismo criterio que `sierras.py`: casas, hasta USD 260.000, en Punilla y
Calamuchita. Va a `.work/sierras_ap.json` y lo consume `build_sierras.py`.

**Acá no se puede validar contra `loc`.** En el resto del país la tarjeta de
Argenprop trae "Casa en Venta en Olivos, Vicente López" y con eso alcanza; en la
sierra ese campo **viene vacío**. El pueblo está en la dirección y en la URL
("casa-en-venta-en-villa-carlos-paz-..."), así que se valida contra esos dos.

Ojo con los barrios: "Alem 600, Los Manantiales" es Villa Carlos Paz pero no lo
dice en la dirección — por eso vale también la URL, que sí lleva el slug pedido.

Como siempre con Argenprop: una tanda por pueblo, sella solo el que trajo avisos,
arranca por el que menos tiene y **nunca dos instancias a la vez**.

    python tools/sierras_ap.py [--max 260000] [--only cosquin,tanti] [--deadline 1500]
"""
import json, os, sys, time, random, unicodedata

from argenprop import get, parse
from sierras import LOCS

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "sierras_ap.json")
PAGES = 5
DELAY = (7.0, 11.0)


def plain(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def url_for(slug, p, mx):
    u = f"https://www.argenprop.com/casas/venta/{slug}/hasta-{mx}-dolares"
    return u if p == 1 else f"{u}/pagina-{p}"


def main():
    mx = 260000
    if "--max" in sys.argv:
        mx = int(sys.argv[sys.argv.index("--max") + 1])
    deadline = None
    if "--deadline" in sys.argv:
        deadline = time.time() + float(sys.argv[sys.argv.index("--deadline") + 1])
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
        print("solo:", sorted(only), flush=True)

    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    stamp = data.setdefault("_fetched", {})
    pueblos = [(s, lab, val) for s, lab, val in LOCS if s != "villa-del-lago"]
    pueblos.sort(key=lambda x: len(data.get(x[0], [])))

    for slug, label, valle in pueblos:
        if only and slug not in only:
            continue
        if time.time() - stamp.get(slug, 0) < 24 * 3600:
            print(f"{slug}: cache — skip", flush=True); continue
        bucket = data.setdefault(slug, [])
        before = len(bucket)
        seen = {x["id"] for x in bucket}
        quiero = plain(label)
        quiero_slug = slug.replace("-", "")
        for p in range(1, PAGES + 1):
            if deadline and time.time() > deadline:
                print(f"{slug} p{p}: se acabó el tiempo, corto", flush=True); break
            h = get(url_for(slug, p, mx), deadline=deadline)
            if not h:
                print(f"{slug} p{p}: BLOQUEADO", flush=True); break
            rows = parse(h)
            if not rows:
                print(f"{slug} p{p}: sin avisos", flush=True); break
            added = wrong = 0
            for r in rows:
                # el pueblo está en la dirección o en el slug de la URL, no en `loc`
                donde = plain(r.get("addr", "")) + " " + plain(r.get("url", "")).replace("-", "")
                if quiero not in donde and quiero_slug not in donde:
                    wrong += 1
                    continue
                if r["id"] in seen or not (15000 <= r["price"] <= mx):
                    continue
                if r["amb"] and r["amb"] < 3:
                    continue
                if not r["img"] or not r["url"]:
                    continue
                r["loc"] = label
                r["valle"] = valle
                seen.add(r["id"])
                bucket.append(r)
                added += 1
            print(f"{slug} p{p}: +{added} (tot {len(bucket)}) fuera={wrong}", flush=True)
            json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
            if wrong >= 15:
                print(f"{slug}: fuera de pueblo, corto", flush=True); break
            if deadline and time.time() > deadline:
                break
            time.sleep(random.uniform(*DELAY))
        if len(bucket) > before:
            stamp[slug] = time.time()
        json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)

    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    tot = sum(len(v) for k, v in data.items() if not k.startswith("_"))
    con = {k: len(v) for k, v in data.items() if not k.startswith("_") and v}
    print("DONE", con, "TOTAL", tot, flush=True)


if __name__ == "__main__":
    main()
