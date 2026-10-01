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

Sirve para las dos fuentes. Argenprop bloquea los **GET** de las fichas (deja
pasar ~5 y corta), pero no los HEAD, que es lo único que se pide acá. Su purga
por barrio (`caba_ap.py --purge`) no reemplaza esto: cuando el barrido se
bloquea a mitad no purga ese barrio, para no borrar lo que no llegó a ver.
"""
import io, json, os, random, re, sys, time, urllib.error, urllib.request

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "alive.json")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

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


def rows_publicados(pagina):
    t = io.open(os.path.join(ROOT, pagina), encoding="utf-8").read()
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
    """'ok' | 'baja' (410) | '404' | 'bloqueado' (sin veredicto).

    **Vivo es 200 y nada más.** Argenprop bloquea contestando *202* con cuerpo
    vacío: no es un error, no hay captcha, no hay redirección. Con la condición
    vieja (`status < 400`) ese bloqueo entraba como "ok" y el barrido informaba
    199 de 199 avisos vivos cuando en realidad no había mirado ninguno; tres que
    dan 410 pedidos de a uno figuraban vivos dentro de la tanda. Un bloqueo
    tiene que quedar sin veredicto para que se reintente, nunca como vivo.
    """
    for i in range(3):
        if deadline and time.time() > deadline:
            return "bloqueado"
        try:
            rq = urllib.request.Request(u, headers=HDR, method="HEAD")
            with urllib.request.urlopen(rq, timeout=30) as r:
                if r.status == 200:
                    return "ok"
                if deadline and time.time() + 25 * (i + 1) > deadline:
                    return "bloqueado"
                time.sleep(25 * (i + 1))    # 202: esperar a que afloje
                continue
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

    # `--url`: verificar un aviso suelto, para cuando uno se cruza con un link
    # que no abre y quiere saber si es él o es la página.
    if "--url" in sys.argv:
        u = sys.argv[sys.argv.index("--url") + 1]
        if not u.startswith("http"):
            u = ZP + u
        # `--vendido`: el aviso está vivo pero la propiedad ya se vendió. No hay
        # forma de detectarlo desde afuera —200, sin 410, sin campo de estado y
        # sin decirlo en el texto— así que se anota a mano y no se publica más.
        if "--vendido" in sys.argv:
            slug = u.rsplit("/", 1)[-1]
            ex = os.path.join(os.path.dirname(os.path.abspath(__file__)), "excluidos.txt")
            ya = io.open(ex, encoding="utf-8").read() if os.path.exists(ex) else ""
            if slug in ya:
                print("ya estaba en excluidos.txt")
            else:
                with io.open(ex, "a", encoding="utf-8") as f:
                    f.write(slug + "\n")
                print("anotado en excluidos.txt; sale en el próximo build")
            return
        estado = check(u)
        print({"ok": "VIVO", "baja": "DADO DE BAJA (410)",
               "404": "NO EXISTE (404)",
               "bloqueado": "sin veredicto: bloqueado o error"}[estado])
        if estado in ("baja", "404"):
            d = load()
            d[u] = {"ok": False, "t": int(time.time()), "por": estado}
            save(d)
            print("anotado en alive.json; sale en el próximo build")
        return
    limit = arg("--limit", 250)
    delay = arg("--delay", 1.4)
    # `--page`: deadlinks miraba solo index.html, así que los avisos de la zona
    # norte y de las sierras nunca se verificaban. Son tres páginas.
    pagina = arg("--page", "index.html")
    # Sin `--fuente` se revisan todas las filas. Importa en sierras.html, donde la
    # columna 14 guarda el valle y no el portal: pidiendo "Zonaprop" no
    # coincidía ninguna y el barrido no hacía nada, sin avisar.
    fuente = arg("--fuente", "")
    deadline = time.time() + arg("--deadline", 1500.0)
    recheck = "--recheck" in sys.argv

    done = load()
    rows = [r for r in rows_publicados(pagina) if not fuente or r[14] == fuente]
    # Argenprop **sí** se puede verificar acá. Lo que bloquea son los GET de las
    # fichas (deja pasar ~5 y corta); el HEAD que usa check() no le molesta:
    # 14 avisos seguidos con 2 s de pausa dieron 14 veredictos y ningún bloqueo.
    # Hace falta porque su purga por barrio no alcanza: si el barrido se bloquea
    # a mitad, caba_ap.py no purga ese barrio para no borrar lo que no llegó a
    # ver, y los avisos dados de baja se quedan publicados. En la última corrida
    # se bloquearon los 12 barrios, así que no se purgó ninguno.
    pend = [r for r in rows if recheck or url_de(r) not in done]
    # **Primero Zonaprop.** Un URL de Argenprop bloqueado cuesta hasta 150 s de
    # espera, así que un lote con muchos se come el presupuesto entero y deja sin
    # revisar los de Zonaprop, que contestan siempre. En sierras pasó: 41
    # bloqueos gastaron los 90 minutos y quedaron 206 sin mirar.
    pend.sort(key=lambda r: "argenprop" in r[2])
    print(f"{pagina} ({fuente or 'todas las fuentes'}): {len(rows)} publicados, "
          f"{len(pend)} sin verificar, reviso hasta {limit}", flush=True)

    tally = {}
    seguidos = 0        # bloqueos consecutivos
    for n, r in enumerate(pend[:limit], 1):
        if time.time() > deadline:
            print("se acabó el tiempo, corto", flush=True); break
        # Si el portal viene bloqueando sin parar, no es un aviso puntual: es que
        # hoy no nos quiere. Seguir insistiendo solo gasta el reloj.
        if seguidos >= 8:
            print(f"  {seguidos} bloqueos seguidos: el portal está cortando, "
                  f"dejo el resto para otra corrida", flush=True)
            break
        u = url_de(r)
        st = check(u, deadline)
        tally[st] = tally.get(st, 0) + 1
        seguidos = seguidos + 1 if st == "bloqueado" else 0
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
