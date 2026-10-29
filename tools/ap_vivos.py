# -*- coding: utf-8 -*-
"""Da de baja los avisos de Argenprop que ya no aparecen en su propia búsqueda.

Argenprop no deja verificar ficha por ficha: contesta **202 con el cuerpo
vacío** después de media docena de pedidos y el corte alcanza también a las
páginas de resultados. Da igual el ritmo y da igual si se pide con urllib o
desde el navegador. Así que sus 658 avisos quedaban sin verificar mientras las
otras dos fuentes se limpiaban.

Lo que sí entra —y es como se relevan— son las **páginas de resultados por
partido**: 25 pedidos en vez de 658. Y ahí está la respuesta: si un aviso
estaba en esa búsqueda y ya no está, se fue.

**Qué significa exactamente «se fue».** Puede ser que lo dieran de baja, o que
le cambiaran el precio por encima de los 260.000, o que lo movieran de
categoría. Para esta página las tres cosas quieren decir lo mismo: dejó de ser
una casa de tres ambientes o más, hasta 260.000, en Punilla o Calamuchita. Se
anota con el motivo `fuera-del-barrido` y no como un 410, que sería afirmar
algo que no se comprobó.

**Sólo corre si el barrido entró entero.** Una página bloqueada se ve igual
que una página sin resultados, y tomarla por buena daría veinte avisos muertos
de una. Por eso el archivo de entrada trae `completo: true` y, si falta, esto
no toca nada.

    python tools/ap_vivos.py [--entrada .work/ap_vivos.json] [--aplicar]

Sin `--aplicar` sólo informa, que es como conviene mirarlo la primera vez.
"""
import io
import json
import os
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, ".work")
SITIO = os.path.join(ROOT, "casas")
ALIVE = os.path.join(W, "alive.json")


def ids_publicados():
    """{id: url} de los avisos de Argenprop que hoy muestra sierras.html."""
    t = io.open(os.path.join(SITIO, "sierras.html"), encoding="utf-8").read()
    linea = next(l for l in t.split("\n") if l.startswith("const D=[["))
    filas = json.loads(linea[len("const D="):].rstrip(";"))
    out = {}
    for r in filas:
        if r[14] != "Argenprop":
            continue
        m = re.search(r"--(\d+)$", r[2])
        if m:
            out[m.group(1)] = r[2]
    return out


def main():
    args = sys.argv[1:]
    ent = args[args.index("--entrada") + 1] if "--entrada" in args \
        else os.path.join(W, "ap_vivos.json")
    aplicar = "--aplicar" in args

    if not os.path.exists(ent):
        print("falta %s: hay que correr el barrido desde el navegador primero" % ent)
        return 1
    d = json.load(io.open(ent, encoding="utf-8"))
    if not d.get("completo"):
        print("el barrido no entró entero (completo=false). No se toca nada:")
        print("una página bloqueada se ve igual que una sin resultados.")
        return 1

    vivos = set(str(x) for x in d.get("ids", []))
    paginas = d.get("paginas", "?")
    pub = ids_publicados()
    faltan = {i: u for i, u in pub.items() if i not in vivos}

    # Segunda red, independiente del `completo` que trae el barrido. La primera
    # ya falló una vez: el navegador daba por buena una página con 202 y cuerpo
    # vacío porque `response.ok` es true para cualquier 2xx, y el barrido se
    # declaró entero con 100 avisos de 658. Aplicar eso habría dado de baja 558
    # vivos. Si lo que se cae pasa de un quinto, no se toca nada sin que alguien
    # lo mire: una purga así es siempre un bloqueo, no una semana de ventas.
    TOPE = 0.20
    if pub and len(faltan) > len(pub) * TOPE:
        print("barrido: %s paginas, %d avisos en los resultados" % (paginas, len(vivos)))
        print("publicados: %d | se caerian: %d (%.0f%%)"
              % (len(pub), len(faltan), 100.0 * len(faltan) / len(pub)))
        print("\nSe cae mas del %.0f%%. Eso no es rotacion de avisos, es un bloqueo"
              % (TOPE * 100))
        print("a mitad del barrido. No se toca nada; conviene repetirlo mas tarde.")
        return 1

    print("barrido: %s páginas, %d avisos en los resultados" % (paginas, len(vivos)))
    print("publicados en sierras.html: %d de Argenprop" % len(pub))
    print("ya no están en la búsqueda: %d" % len(faltan))
    if pub:
        print("  (%.0f%% de los de Argenprop)" % (100.0 * len(faltan) / len(pub)))

    if not aplicar:
        for i, u in list(faltan.items())[:10]:
            print("   ", u[-62:])
        if len(faltan) > 10:
            print("    ... y %d más" % (len(faltan) - 10))
        print("\nasí quedó sólo informado. Con --aplicar se escriben en alive.json")
        return 0

    alive = json.load(io.open(ALIVE, encoding="utf-8")) if os.path.exists(ALIVE) else {}
    ahora = int(time.time())
    for i, u in faltan.items():
        alive[u] = {"ok": False, "t": ahora, "por": "fuera-del-barrido"}
    # los que sí están se marcan vivos y con fecha de hoy
    for i, u in pub.items():
        if i in vivos:
            alive[u] = {"ok": True, "t": ahora}
    json.dump(alive, io.open(ALIVE, "w", encoding="utf-8", newline=""), ensure_ascii=False)
    print("\nalive.json actualizado: %d de baja, %d confirmados vivos"
          % (len(faltan), len(pub) - len(faltan)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
