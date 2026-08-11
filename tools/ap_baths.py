"""Completa baños (y lo que falte) pidiendo la ficha individual de Argenprop.

El listado muestra solo 3 features por tarjeta y rota cuáles, así que los baños
aparecen en ~1 de cada 4 avisos. La ficha individual sí los trae, en bloques
`<li title="Baños"><p class="strong">1 baño</p></li>`.

Es un pedido por aviso contra el mismo CloudFront que corta cada pocas páginas,
así que está pensado para correr de a tandas: todo lo que resuelve queda cacheado
en `.work/ap_detail.json` y una corrida nueva sigue por donde quedó. Los que
devuelven bloqueo no se cachean; los 404 sí, como "no existe", para no reintentarlos.

    python tools/ap_baths.py [--limit N]
"""
import json, os, re, sys, time, random, html

from argenprop import get

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
MERGED = os.path.join(D, "argenprop_merged.json")
CACHE = os.path.join(D, "ap_detail.json")
DELAY = (6.0, 9.0)          # se puede subir con --delay N (evitar el bloqueo sale más
                            # barato que aguantarlo: cada corte cuesta ~2 min de backoff)

FEAT = re.compile(r'<li title="([^"]+)">.*?<p class="strong">\s*(.*?)\s*</p>', re.S)


def num(s):
    m = re.search(r"([\d.,]+)", s or "")
    return int(re.split(r"[.,]", m.group(1))[0]) if m else 0


def features(page):
    out = {}
    for k, v in FEAT.findall(page):
        out[html.unescape(k).strip().lower()] = html.unescape(re.sub(r"<[^>]+>", "", v)).strip()
    return out


def detail(page):
    f = features(page)
    get_ = lambda *keys: next((f[k] for k in keys if k in f), "")
    return {
        "ban": num(get_("baños", "banos", "baño")),
        "amb": num(get_("ambientes")),
        "dorm": num(get_("dormitorios", "habitaciones")),
        "cub": num(get_("superficie cubierta", "sup. cubierta")),
        "tot": num(get_("superficie total", "superficie del terreno")),
    }


def main():
    global DELAY
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    if "--delay" in sys.argv:
        d = float(sys.argv[sys.argv.index("--delay") + 1])
        DELAY = (d, d * 1.4)
    merged = json.load(open(MERGED, encoding="utf-8"))
    cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}

    todo = []
    for rows in merged.values():
        for r in rows:
            if not r.get("ban") and r["id"] not in cache:
                todo.append(r)
    print(f"faltan baños: {len(todo)} | ya resueltos: {len(cache)}", flush=True)
    if limit:
        todo = todo[:limit]

    ok = blocked = 0
    for n, r in enumerate(todo, 1):
        page = get(r["url"], tries=2)
        if not page:
            blocked += 1
            print(f"{n}/{len(todo)} {r['id']}: bloqueado", flush=True)
            if blocked >= 6:
                print("demasiados bloqueos seguidos, cortando", flush=True)
                break
            continue
        blocked = 0
        cache[r["id"]] = detail(page)
        ok += 1
        if ok % 10 == 0:
            json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
            print(f"{n}/{len(todo)} resueltos {ok} (con baño {sum(1 for v in cache.values() if v['ban'])})",
                  flush=True)
        time.sleep(random.uniform(*DELAY))

    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"DONE +{ok} | cache {len(cache)} | con baño {sum(1 for v in cache.values() if v['ban'])}",
          flush=True)


if __name__ == "__main__":
    main()
