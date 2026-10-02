"""Junta uno o más `favoritos.json` bajados del navegador con el del repo.

Los favoritos viven en `localStorage`, que es **por origen**: lo marcado en
`hiessy.github.io` y lo marcado en `localhost:8123` son dos cajones distintos, y
ninguno de los dos está en el repo. El puente es el botón "Bajar favoritos.json"
de la pestaña Favoritos: baja lo de ese navegador, y esto lo mezcla con lo que ya
haya versionado.

    python tools/merge_favoritos.py ~/Downloads/favoritos.json
    python tools/merge_favoritos.py a.json b.json --salida favoritos.json

La unión es por URL. Si un aviso aparece en los dos, gana el que tiene la fila
más completa y se conserva la **fecha más vieja**, que es cuando se marcó de
verdad: así el orden de la página (del más nuevo al más viejo) no se altera
porque el archivo haya pasado por otra computadora.
"""
import io, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, "favoritos.json")


def cargar(p):
    if not os.path.exists(p):
        return {}
    try:
        o = json.load(io.open(p, encoding="utf-8"))
    except Exception as e:
        sys.exit(f"{p}: no es JSON válido ({e})")
    if not isinstance(o, dict):
        sys.exit(f"{p}: se esperaba un objeto {{url: {{r, p, t}}}}")
    return o


def util(v):
    """Una entrada sirve si trae la fila entera; si no, no se puede dibujar."""
    return isinstance(v, dict) and isinstance(v.get("r"), list) and len(v["r"]) >= 20


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    salida = DST
    if "--salida" in sys.argv:
        salida = sys.argv[sys.argv.index("--salida") + 1]
    if not args:
        sys.exit(__doc__)

    base = cargar(salida)
    antes = len(base)
    nuevos = repetidos = malos = 0

    for p in args:
        for k, v in cargar(p).items():
            if not util(v):
                malos += 1
                continue
            if k in base:
                repetidos += 1
                # la fecha más vieja es la de cuando se marcó realmente
                v = dict(v, t=min(base[k].get("t", 0) or 0, v.get("t", 0) or 0)
                         or v.get("t", 0))
                # y entre dos filas, la que tenga más datos (coordenadas, lote)
                if sum(1 for x in base[k]["r"] if x) >= sum(1 for x in v["r"] if x):
                    v = dict(v, r=base[k]["r"])
            else:
                nuevos += 1
            base[k] = v

    json.dump(base, io.open(salida, "w", encoding="utf-8", newline=""),
              ensure_ascii=False, indent=1, sort_keys=True)
    print(f"{salida}: {antes} -> {len(base)} favoritos "
          f"({nuevos} nuevos, {repetidos} ya estaban"
          f"{f', {malos} descartados por venir incompletos' if malos else ''})")
    print("Falta commitearlo para que lo vean los demás navegadores.")


if __name__ == "__main__":
    main()
