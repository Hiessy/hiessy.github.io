"""Genera `gba-norte.html` a partir de `index.html`.

Las dos páginas comparten CSS y JS: en vez de mantener dos copias que se van
separando, esta se deriva de la otra cambiando solo lo que difiere — los datos,
los botones de zona, la fila de filtros y los textos. Si se toca `index.html`,
correr esto de nuevo y las dos quedan al día.

    python tools/build_gba.py && python tools/make_gba.py
"""
import datetime, io, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "index.html")
DST = os.path.join(ROOT, "gba-norte.html")
DATA = os.path.join(ROOT, ".work", "DG.js")

ZONES = ["Bella Vista", "San Miguel", "Olivos", "La Lucila", "Martínez",
         "Ingeniero Maschwitz", "San Fernando", "Tigre"]

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def stats(data):
    """Los números que van en el texto, sacados del dataset y no a mano.

    Estaban escritos como constantes y quedaron viejos: el encabezado decía 1.403
    con 1.432 avisos publicados. Cualquier número que aparezca en la prosa se
    calcula acá, porque nadie se acuerda de actualizarlo después de un barrido.
    """
    rows = json.loads(data[len("const D="):].rstrip(";"))
    hoy = datetime.date.today()
    return {
        "n": f"{len(rows):,}".replace(",", "."),
        # el filtro se mide con los metros y no con la palabra "jardín": esto
        # muestra cuánto se equivocaría quien confiara en la palabra
        "muda": sum(1 for r in rows if r[18] >= 100 and not r[12]),
        "chica": sum(1 for r in rows if r[12] and r[18] < 100),
        "fecha": f"{MESES[hoy.month - 1]} de {hoy.year}",
    }


def rep(t, a, b, n=1):
    assert t.count(a) == n, (a[:70], t.count(a))
    return t.replace(a, b)


def main():
    t = io.open(SRC, encoding="utf-8").read()
    data = io.open(DATA, encoding="utf-8").read().strip()

    # datos
    lines = t.split("\n")
    i = [k for k, l in enumerate(lines) if l.startswith("const D=[[")][0]
    lines[i] = data
    t = "\n".join(lines)

    # pestaña activa
    t = rep(t, '<a href="index.html" class="tab on">CABA norte</a>',
               '<a href="index.html" class="tab">CABA norte</a>')
    t = rep(t, '<a href="gba-norte.html" class="tab">Zona norte con patio</a>',
               '<a href="gba-norte.html" class="tab on">Zona norte con patio</a>')

    # botones de zona
    old = re.search(r'<button class="pill on" data-b="">Todos <em></em></button>\n'
                    r'(?:<button class="pill" data-b="[^"]*">[^<]*<em></em></button>\n?)+', t)
    pills = '<button class="pill on" data-b="">Todas <em></em></button>\n' + "\n".join(
        f'<button class="pill" data-b="{z}">{z} <em></em></button>' for z in ZONES)
    t = t[:old.start()] + pills + "\n" + t[old.end():]

    # no hay picks editoriales en este relevamiento: el botón sobraría
    t, k = re.subn(r'<button class="pill gold" id="pk">',
                   '<button class="pill gold" id="pk" hidden>', t, count=1)
    assert k == 1, "no encontré el botón de picks"

    # fila de filtros: acá manda el terreno libre, y el m² cubierto no aporta
    t = rep(t, '<button class="pill" id="m2">100 m²+ <em></em></button>',
'''<span class="sep"></span>
<span class="lbl">Terreno libre</span>
<button class="pill on" data-t="100">100 m²+ <em></em></button>
<button class="pill" data-t="150">150 m²+ <em></em></button>
<button class="pill" data-t="200">200 m²+ <em></em></button>
<button class="pill" data-t="0">Sin mínimo <em></em></button>
<button class="pill" id="m2" hidden>100 m²+ <em></em></button>''')

    # arranca pidiendo patio: es el requisito de esta búsqueda
    t = rep(t, 'let bar="",pk=false,mq=false,fu="",ter=0,shown=0,view=[];',
               'let bar="",pk=false,mq=false,fu="",ter=100,shown=0,view=[];')

    # textos
    t = rep(t, "<title>Búsqueda de propiedades · Argentina</title>",
               "<title>Zona norte con patio · Argentina</title>")
    t = rep(t, '<h1>PH y casas en la zona norte de CABA<br>con menos de USD 260.000</h1>',
               '<h1>Casas y PH con patio<br>en la zona norte del conurbano</h1>')
    # la lista de localidades sale de ZONES y no escrita a mano: al sumar
    # Ingeniero Maschwitz, el encabezado y el meta se olvidaban de nombrarlo
    llano = ", ".join(ZONES[:-1]) + " y " + ZONES[-1]
    negrita = ", ".join(f"<b>{z}</b>" for z in ZONES[:-1]) + f" y <b>{ZONES[-1]}</b>"
    t = re.sub(r'<meta name="description" content="[^"]*">',
               f'<meta name="description" content="Casas y PH con patio hasta USD 260.000 en '
               f'{llano}.">', t, count=1)

    s = stats(data)
    i, j = t.index('<p class="sub">'), t.index("</header>")
    t = t[:i] + f'''<p class="sub">{s["n"]} casas y PH de 3 ambientes o más, hasta
USD 260.000, en {negrita}. El filtro que manda es el <b>terreno libre</b>: lote menos
superficie cubierta.</p>
''' + t[j:]

    # el pie es de la página de CABA
    i = t.index("<footer>"); j = t.index("</footer>")
    t = t[:i] + f'''<footer>
<p><b>Terreno libre</b> es lote menos superficie cubierta. Si el aviso no declara el lote
queda en 0 y no pasa el filtro — conviene mirarlo igual. Los avisos de <b>Argenprop</b> no
declaran lote acá: se ven poniendo <b>Sin mínimo</b>.</p>
<p style="margin-top:14px">Relevado en {s["fecha"]} · datos de <a
class="tx" href="https://www.zonaprop.com.ar" target="_blank" rel="noopener">Zonaprop</a> y <a
class="tx" href="https://www.argenprop.com" target="_blank" rel="noopener">Argenprop</a> ·
confirmá con la inmobiliaria antes de viajar.</p>
''' + t[j:]

    io.open(DST, "w", encoding="utf-8", newline="").write(t)
    print("escrito", DST, f"{os.path.getsize(DST)/1048576:.2f} MB")


if __name__ == "__main__":
    main()
