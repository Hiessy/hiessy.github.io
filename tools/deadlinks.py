"""Verifica que los avisos publicados sigan vivos, y saca los vendidos/reservados.

Por qué hace falta: `scraped.json` solo acumula. Un aviso dado de baja se queda en
la caché para siempre y la página lo sigue mostrando con un link que no abre nada.
`refresh.py` lo resuelve purgando y volviendo a relevar, pero eso solo funciona
donde el barrido llega completo — y no dice nada del cartel de "reservado" que
muchas inmobiliarias ponen recién en la ficha y no en el listado.

Esto pide la ficha de cada aviso y guarda el resultado en `.work/alive.json`:

    {"<slug o url>": {"ok": true,  "t": 1725300000},
     "<slug o url>": {"ok": false, "t": ..., "por": "404"}}

`build2.py` lee ese archivo y descarta lo que esté en `false`. Lo que no fue
verificado todavía se publica igual: la ausencia de dato no es una baja.

    python tools/deadlinks.py                 # Zonaprop, tanda por defecto
    python tools/deadlinks.py --limit 400 --deadline 900
    python tools/deadlinks.py --fuente Argenprop --limit 20 --delay 20

**Argenprop bloquea las fichas mucho más duro que los listados** (deja pasar ~5 y
después corta). Para esa fuente conviene el camino barato: `caba_ap.py --purge`,
que se queda solo con lo que el portal sigue listando. Ver tools/README.md.
"""
import io, json, os, random, re, sys, time, urllib.error, urllib.request

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "alive.json")
PAGE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "index.html")

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
HDR = {"User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9",
       "Accept": "text/html,application/xhtml+xml"}

ZP = "https://www.zonaprop.com.ar/propiedades/clasificado/"

# Zonaprop contesta **410 Gone** cuando el aviso se dio de baja, y 404 si el slug
# nunca existió. Con eso alcanza: no hace falta leer el HTML.
MUERTO = {404, 410}

# NO buscar textos como "este aviso ya no está publicado" en el HTML. Esa frase
# está en la **tabla de traducciones** que la página trae siempre, viva o no
# (`avisoOffline: {title: 'Este aviso ya no está publicado'}`), así que matchea en
# el 100% de las fichas. La primera versión de este script hacía eso y dio 30 de
# 30 avisos "dados de baja", todos vivos. Las páginas pesan ~500 KB de HTML y JS:
# cualquier palabra que se busque ahí adentro va a aparecer por otro motivo.


def rows_publicados():
    t = io.open(PAGE, encoding="utf-8").read()
    i = t.index("const D=["); j = t.index("];", i)
    return json.loads(t[i + 8:j + 1])


def load():
    return json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}


def save(d):
    json.dump(d, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)


def url_de(row):
    u = row[2]
    return u if u.startswith("http") else ZP + u


def check(u, deadline=None):
    """'ok' | 'baja' (410) | '404' | 'bloqueado' (sin veredicto)."""
    for i in range(3):
        if deadline and time.time() > deadline:
            return "bloqueado"
        try:
            rq = urllib.request.Request(u, headers=HDR, method="HEAD")
            with urllib.request.urlopen(rq, timeout=30) as r:
                return "ok" if r.status < 400 else "bloqueado"
        except urllib.error.HTTPError as e:
            if e.code == 410:
                return "baja"
            if e.code == 404:
                return "404"
            if e.code in (403, 429):
                if deadline and time.time() + 20 * (i + 1) > deadline:
                    return "bloqueado"
                time.sleep(20 * (i + 1))
                continue
            return "bloqueado"
        except Exception:
            time.sleep(4)
    return "bloqueado"


def main():
    arg = lambda k, d: (type(d)(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d)
    limit = arg("--limit", 250)
    delay = arg("--delay", 1.4)
    fuente = arg("--fuente", "Zonaprop")
    deadline = time.time() + arg("--deadline", 1500.0)
    recheck = "--recheck" in sys.argv

    done = load()
    rows = [r for r in rows_publicados() if r[14] == fuente]
    pend = [r for r in rows if recheck or url_de(r) not in done]
    print(f"{fuente}: {len(rows)} publicados, {len(pend)} sin verificar, "
          f"reviso hasta {limit}", flush=True)

    tally = {}
    for n, r in enumerate(pend[:limit], 1):
        if time.time() > deadline:
            print("se acabó el tiempo, corto", flush=True); break
        u = url_de(r)
        st = check(u, deadline)
        tally[st] = tally.get(st, 0) + 1
        if st != "bloqueado":          # un bloqueo no es un veredicto: se reintenta
            done[u] = {"ok": st == "ok", "t": int(time.time()),
                       **({} if st == "ok" else {"por": st})}
        if st != "ok":
            print(f"  [{st}] {r[3]} · {r[5][:40]} · {u[-52:]}", flush=True)
        if n % 25 == 0:
            save(done)
            print(f"  ...{n}/{min(limit, len(pend))} {tally}", flush=True)
        time.sleep(delay + random.random() * 0.6)

    save(done)
    malos = sum(1 for v in done.values() if not v["ok"])
    print(f"DONE {tally} | cache {len(done)} verificados, {malos} para descartar",
          flush=True)


if __name__ == "__main__":
    main()
