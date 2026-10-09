# -*- coding: utf-8 -*-
"""Argenprop en la sierra, **por partido** y no pueblo por pueblo.

`sierras_ap.py` pide 36 consultas, una por pueblo. Argenprop corta después de
una docena de pedidos, así que la mitad de los pueblos nunca se llegaba a mirar.
Pero el portal indexa también por partido, y ahí está casi todo junto:

    /casas/venta/partido-de-punilla          44 páginas  (~880 casas)
    /casas/venta/partido-de-calamuchita      15 páginas  (~300 casas)

Dos consultas en vez de treinta y seis, con **más** stock del otro lado: hoy
tenemos 386 avisos de Argenprop en los dos valles. Y aparecen localidades que no
están en nuestra lista de pueblos —Molinari, Los Manantiales, Los Milagros—, que
pidiendo pueblo por pueblo no se podían encontrar nunca.

**Pensado para tener paciencia.** El bloqueo de Argenprop no es permanente: se
corta y afloja. Lo que no funciona es insistir rápido. Entonces:

- guarda el avance **página por página**, así una corrida cortada no se repite;
- si lo bloquean, espera y sigue en la misma página la próxima vez;
- la demora por defecto es larga y se puede alargar más con `--delay`.

Corriendo de a tandas cortas rinde poco; donde esto rinde es dejándolo correr
tranquilo un rato largo:

    python tools/ap_partido.py --delay 25 --deadline 7200

    python tools/ap_partido.py [--max 260000] [--solo punilla]
                               [--delay 18] [--deadline 1500] [--paginas 44]
"""
import json, os, random, sys, time, unicodedata

from argenprop import get, parse
from sierras import LOCS

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "sierras_ap.json")
AVANCE = os.path.join(D, "ap_partido.json")

PARTIDOS = [("punilla", "partido-de-punilla", "Punilla", 44),
            ("calamuchita", "partido-de-calamuchita", "Calamuchita", 15)]


def plain(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


# Los pueblos que ya conocemos, para mandar cada aviso a su bucket. Lo que no
# matchea igual se guarda: el pueblo sale de la cola de la dirección.
PUEBLOS = [(slug, label, valle) for slug, label, valle in LOCS]


def url_for(slug, p, mx):
    u = f"https://www.argenprop.com/casas/venta/{slug}/hasta-{mx}-dolares"
    return u if p == 1 else f"{u}/pagina-{p}"


def pueblo_de(r, valle):
    """(slug, label) del pueblo del aviso: por nombre conocido, o por dirección."""
    donde = plain(r.get("addr", "")) + " " + plain(r.get("url", "")).replace("-", " ")
    for slug, label, v in PUEBLOS:
        if v != valle:
            continue
        if plain(label) in donde or slug.replace("-", " ") in donde:
            return slug, label
    # Localidad desconocida: la dirección termina en ", Nombre del lugar".
    cola = (r.get("addr") or "").split(",")[-1].strip()
    if 3 <= len(cola) <= 34 and not any(ch.isdigit() for ch in cola):
        return "otros-" + plain(cola).replace(" ", "-"), cola.title()
    return "", ""


def main():
    arg = lambda k, d: (type(d)(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d)
    mx = arg("--max", 260000)
    demora = arg("--delay", 18.0)
    topes = arg("--paginas", 0)
    solo = arg("--solo", "")
    deadline = time.time() + arg("--deadline", 1500.0)

    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    stamp = data.setdefault("_fetched", {})
    avance = json.load(open(AVANCE, encoding="utf-8")) if os.path.exists(AVANCE) else {}
    vistos = {x["id"] for k, v in data.items() if not k.startswith("_") for x in v}

    nuevos = bloqueos = 0
    for clave, slug, valle, tope in PARTIDOS:
        if solo and clave != solo:
            continue
        desde = avance.get(clave, 0) + 1
        hasta = topes or tope
        if desde > hasta:
            print(f"{clave}: ya barrido hasta la página {hasta}", flush=True)
            continue
        print(f"{clave}: páginas {desde} a {hasta}", flush=True)
        for p in range(desde, hasta + 1):
            if time.time() > deadline:
                print("se acabó el tiempo, corto", flush=True)
                break
            h = get(url_for(slug, p, mx), tries=2, deadline=deadline)
            if not h:
                bloqueos += 1
                print(f"  {clave} p{p}: BLOQUEADO (sigo acá la próxima)", flush=True)
                break
            filas = parse(h)
            if not filas:
                print(f"  {clave} p{p}: sin avisos, fin del listado", flush=True)
                avance[clave] = hasta
                break
            add = 0
            for r in filas:
                if r["id"] in vistos or not (15000 <= (r.get("price") or 0) <= mx):
                    continue
                if r.get("amb") and r["amb"] < 3:
                    continue
                if not r.get("img") or not r.get("url"):
                    continue
                bslug, label = pueblo_de(r, valle)
                if not bslug:
                    continue
                r["loc"] = label
                r["valle"] = valle
                data.setdefault(bslug, []).append(r)
                vistos.add(r["id"])
                add += 1
            nuevos += add
            avance[clave] = p
            json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
            json.dump(avance, open(AVANCE, "w", encoding="utf-8"))
            print(f"  {clave} p{p}: +{add} nuevos (total {nuevos})", flush=True)
            time.sleep(demora + random.random() * 6)

    for clave, _, _, _ in PARTIDOS:
        if avance.get(clave):
            stamp[clave] = time.time()
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    tot = sum(len(v) for k, v in data.items() if not k.startswith("_"))
    print(f"DONE +{nuevos} nuevos · {bloqueos} bloqueos · {tot} avisos de Argenprop "
          f"en la sierra", flush=True)
    print("avance:", {k: avance.get(k, 0) for k, _, _, _ in PARTIDOS}, flush=True)


if __name__ == "__main__":
    main()
