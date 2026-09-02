"""Mete `.work/D.js` en `index.html` y actualiza los números del texto.

Este paso se venía haciendo a mano y por eso el encabezado quedó viejo: decía
"1.258 casas y PH" con 1.366 publicadas, y el pie seguía diciendo "relevado en
agosto" en septiembre. Cualquier número o fecha que aparezca en la prosa se
calcula desde el dataset, que es el único que sabe la verdad.

`make_gba.py` hace lo mismo del lado de la zona norte.

    python tools/build2.py && python tools/inject.py && python tools/make_gba.py
"""
import datetime, io, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "index.html")
DATA = os.path.join(ROOT, ".work", "D.js")

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def main():
    data = io.open(DATA, encoding="utf-8").read().strip()
    rows = json.loads(data[len("const D="):].rstrip(";"))
    t = io.open(PAGE, encoding="utf-8").read()

    lines = t.split("\n")
    i = [k for k, l in enumerate(lines) if l.startswith("const D=[[")][0]
    lines[i] = data
    t = "\n".join(lines)

    n = f"{len(rows):,}".replace(",", ".")
    t, k = re.subn(r'(<p class="sub">)[\d.]+( casas y PH de 3 ambientes)',
                   rf"\g<1>{n}\g<2>", t, count=1)
    assert k == 1, "no encontré el conteo del encabezado"

    hoy = datetime.date.today()
    t, k = re.subn(r"Relevado en \w+ de \d{4}",
                   f"Relevado en {MESES[hoy.month - 1]} de {hoy.year}", t, count=1)
    assert k == 1, "no encontré la fecha del pie"

    io.open(PAGE, "w", encoding="utf-8", newline="").write(t)
    fuentes = {}
    for r in rows:
        fuentes[r[14]] = fuentes.get(r[14], 0) + 1
    print(f"index.html: {n} avisos", fuentes,
          "| con pin", sum(1 for r in rows if r[15] and r[16]))


if __name__ == "__main__":
    main()
