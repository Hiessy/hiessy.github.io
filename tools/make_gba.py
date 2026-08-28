"""Genera `gba-norte.html` a partir de `index.html`.

Las dos páginas comparten CSS y JS: en vez de mantener dos copias que se van
separando, esta se deriva de la otra cambiando solo lo que difiere — los datos,
los botones de zona, la fila de filtros y los textos. Si se toca `index.html`,
correr esto de nuevo y las dos quedan al día.

    python tools/build_gba.py && python tools/make_gba.py
"""
import io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "index.html")
DST = os.path.join(ROOT, "gba-norte.html")
DATA = os.path.join(ROOT, ".work", "DG.js")

ZONES = ["Bella Vista", "San Miguel", "Olivos", "La Lucila", "Martínez"]


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
    t = re.sub(r'<meta name="description" content="[^"]*">',
               '<meta name="description" content="Casas y PH con patio hasta USD 260.000 en '
               'Bella Vista, San Miguel, Olivos, La Lucila y Martínez.">', t, count=1)

    i, j = t.index('<p class="sub">'), t.index("</header>")
    t = t[:i] + '''<p class="sub">1.403 casas y PH de 3 ambientes o más, hasta USD 260.000, en
<b>Bella Vista</b>, <b>San Miguel</b>, <b>Olivos</b>, <b>La Lucila</b> y <b>Martínez</b>.
Tocá cualquier foto para abrir el aviso original.</p>
<p class="sub"><b>El filtro que importa acá es el terreno libre</b>: superficie total menos
cubierta, o sea el patio que queda. Arranca en 100 m² o más. Se mide con los metros del
aviso y no con la palabra "jardín", que engaña: 193 avisos con más de 100 m² libres nunca
la usan, y 315 que la usan tienen menos de 100.</p>
<p class="sub">Pasá el mouse por una ficha y se resalta su pin; hacé clic y el mapa se
centra ahí. El ✓ sobre la foto marca avisos para verlos solos en el mapa.</p>
<p class="sub"><b>Los avisos de Argenprop no declaran el lote</b> en estas localidades
—solo la superficie cubierta— así que no pasan el filtro de terreno: para verlos hay que
poner <b>Sin mínimo</b>. El contador avisa cuántos quedaron afuera por eso. Sí tienen pin:
Argenprop no publica coordenadas, pero sus direcciones se geocodifican contra
OpenStreetMap.</p>
''' + t[j:]

    # el pie es de la página de CABA
    i = t.index("<footer>"); j = t.index("</footer>")
    t = t[:i] + '''<footer>
<p><b>Cómo leer esto.</b> <b>Terreno libre</b> es superficie total menos cubierta: lo que
queda de patio, jardín o fondo. Si el aviso no declara la superficie total, el aviso queda
en 0 y no pasa el filtro — conviene mirarlo igual. `m² cub` son metros cubiertos.
Precios en dólares, como se publican en Argentina.</p>
<p><b>Antes de ofertar:</b> pedí el plano para verificar los metros y confirmá escritura.
En countries y barrios cerrados, preguntá las expensas antes que nada: cambian la cuota
mensual más que la hipoteca.</p>
<p><b>Electricidad:</b> Vicente López, San Isidro y San Miguel son área de <b>Edenor</b>,
igual que la franja de CABA de la otra pestaña.</p>
<p style="margin-top:18px">Relevado en agosto de 2026 · datos de <a class="tx"
href="https://www.zonaprop.com.ar" target="_blank" rel="noopener">Zonaprop</a> · los precios
y la disponibilidad cambian rápido, confirmá con la inmobiliaria antes de viajar.</p>
''' + t[j:]

    io.open(DST, "w", encoding="utf-8", newline="").write(t)
    print("escrito", DST, f"{os.path.getsize(DST)/1048576:.2f} MB")


if __name__ == "__main__":
    main()
