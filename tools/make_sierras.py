"""Genera `sierras.html` a partir de `index.html`.

Tercera pestaña, mismo CSS y mismo JS que las otras dos. Lo que cambia:

- los pills de zona pasan a ser los **pueblos** de los dos valles;
- el filtro de **Fuente** se convierte en el de **Valle**, sin tocar el JS: la
  página filtra la columna 14 y `build_sierras.py` guarda ahí el valle en vez de
  la fuente, porque acá todo sale de Zonaprop y filtrar por fuente no filtraría
  nada;
- el botón de 100 m² cubiertos se cambia por el de **terreno libre**, con
  umbrales de sierra (300/600/1000 m²) en vez de los 100/150/200 del conurbano.

    python tools/build_sierras.py && python tools/make_sierras.py
"""
import datetime, io, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "index.html")
DST = os.path.join(ROOT, "sierras.html")
DATA = os.path.join(ROOT, ".work", "DS.js")

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def rep(t, a, b, n=1):
    assert t.count(a) == n, (a[:70], t.count(a))
    return t.replace(a, b)


def main():
    t = io.open(SRC, encoding="utf-8").read()
    data = io.open(DATA, encoding="utf-8").read().strip()
    rows = json.loads(data[len("const D="):].rstrip(";"))

    lines = t.split("\n")
    i = [k for k, l in enumerate(lines) if l.startswith("const D=[[")][0]
    lines[i] = data
    t = "\n".join(lines)

    # pestaña activa
    t = rep(t, '<a href="index.html" class="tab on">CABA norte</a>',
               '<a href="index.html" class="tab">CABA norte</a>')
    t = rep(t, '<a href="sierras.html" class="tab">Sierras de Córdoba</a>',
               '<a href="sierras.html" class="tab on">Sierras de Córdoba</a>')

    # pills de pueblo, en el orden en que aparecen en el dataset (norte a sur)
    pueblos = list(dict.fromkeys(r[9] for r in rows))
    old = re.search(r'<button class="pill on" data-b="">Todos <em></em></button>\n'
                    r'(?:<button class="pill" data-b="[^"]*">[^<]*<em></em></button>\n?)+', t)
    pills = '<button class="pill on" data-b="">Todos <em></em></button>\n' + "\n".join(
        f'<button class="pill" data-b="{p}">{p} <em></em></button>' for p in pueblos)
    t = t[:old.start()] + pills + "\n" + t[old.end():]

    # no hay picks editoriales en este relevamiento
    t, k = re.subn(r'<button class="pill gold" id="pk">',
                   '<button class="pill gold" id="pk" hidden>', t, count=1)
    assert k == 1, "no encontré el botón de picks"

    # Fuente -> Valle. La columna 14 trae el valle, así que los mismos botones
    # `data-s` que filtraban Zonaprop/Argenprop filtran Punilla/Calamuchita.
    t = rep(t, '<span class="lbl">Fuente</span>\n'
               '<button class="pill" data-s="Zonaprop">Zonaprop <em></em></button>\n'
               '<button class="pill" data-s="Argenprop">Argenprop <em></em></button>',
               '<span class="lbl">Valle</span>\n'
               '<button class="pill" data-s="Punilla">Punilla <em></em></button>\n'
               '<button class="pill" data-s="Calamuchita">Calamuchita <em></em></button>')

    # el metro cubierto no decide nada acá; el lote sí
    t = rep(t, '<button class="pill" id="m2">100 m²+ <em></em></button>',
'''<span class="sep"></span>
<span class="lbl">Terreno libre</span>
<button class="pill" data-t="300">300 m²+ <em></em></button>
<button class="pill" data-t="600">600 m²+ <em></em></button>
<button class="pill" data-t="1000">1000 m²+ <em></em></button>
<button class="pill on" data-t="0">Sin mínimo <em></em></button>
<button class="pill" id="m2" hidden>100 m²+ <em></em></button>''')

    # textos
    t = rep(t, "<title>Búsqueda de propiedades · Argentina</title>",
               "<title>Sierras de Córdoba · Argentina</title>")
    t = rep(t, '<h1>PH y casas en la zona norte de CABA<br>con menos de USD 260.000</h1>',
               '<h1>Casas en las sierras de Córdoba<br>Punilla y Calamuchita</h1>')
    t = re.sub(r'<meta name="description" content="[^"]*">',
               '<meta name="description" content="Casas hasta USD 260.000 en los valles de '
               'Punilla y Calamuchita, Córdoba.">', t, count=1)

    # los separadores de miles se arman de a uno: aplicar un .replace(",", ".")
    # sobre todo el bloque también se comía las comas de las oraciones
    mil = lambda v: f"{v:,}".replace(",", ".")
    n = mil(len(rows))
    puni = mil(sum(1 for r in rows if r[14] == "Punilla"))
    cala = mil(sum(1 for r in rows if r[14] == "Calamuchita"))
    lote = {k: mil(sum(1 for r in rows if r[18] >= k)) for k in (300, 600, 1000)}
    sinlote = mil(sum(1 for r in rows if not r[18]))
    hoy = datetime.date.today()

    i, j = t.index('<p class="sub">'), t.index("</header>")
    t = t[:i] + f'''<p class="sub">{n} casas de 3 ambientes o más, hasta USD 260.000, en los dos
valles serranos: <b>Punilla</b> ({puni}) y <b>Calamuchita</b> ({cala}).
Sin la ciudad de Córdoba y sin las Sierras Chicas. Tocá cualquier foto para abrir el
aviso original.</p>
<p class="sub"><b>Acá son casas, no PH.</b> Y a diferencia de las otras dos pestañas, casi
todos los avisos declaran el lote, así que el <b>terreno libre</b> —lote menos superficie
cubierta— sirve de verdad: {lote[300]} superan los 300 m², {lote[600]} los 600 y
{lote[1000]} pasan los 1.000. Quedan {sinlote} sin dato de lote, que no es lo mismo que
sin terreno.</p>
<p class="sub">Pasá el mouse por una ficha y se resalta su pin; hacé clic y el mapa se
centra ahí. El ✓ sobre la foto marca avisos para verlos solos en el mapa.</p>
<p class="sub"><b>Villa Carlos Paz es el único pueblo recortado.</b> Zonaprop corta la
paginación anónima en 270 avisos por consulta y ahí hay más que eso; se completó pidiendo
la lista al revés y sumando el barrio Villa del Lago, que tiene búsqueda propia. Los demás
pueblos entran enteros.</p>
''' + t[j:]

    i = t.index("<footer>"); j = t.index("</footer>")
    t = t[:i] + f'''<footer>
<p><b>Cómo leer esto.</b> <b>Terreno libre</b> es lote menos superficie cubierta: lo que
queda de patio, monte o fondo. Si el aviso no declara el lote queda en 0 y no pasa el
filtro — conviene mirarlo igual. Precios en dólares, como se publican en Argentina.</p>
<p><b>Antes de viajar a ver una:</b> preguntá por el <b>agua</b> (red, perforación o
cisterna) y por el <b>gas</b>, que en buena parte de los dos valles es envasado o de zeppelin
y no de red. Confirmá también si la calle es de tierra y cómo queda después de una lluvia
fuerte: en la sierra eso cambia el acceso más que la distancia.</p>
<p><b>Escritura:</b> en los loteos viejos de sierra abunda la posesión sin título perfecto.
Pedí el estado del dominio antes de señar.</p>
<p style="margin-top:18px">Relevado en {MESES[hoy.month - 1]} de {hoy.year} · datos de <a
class="tx" href="https://www.zonaprop.com.ar" target="_blank" rel="noopener">Zonaprop</a> ·
los precios y la disponibilidad cambian rápido, confirmá con la inmobiliaria antes de
viajar.</p>
''' + t[j:]

    io.open(DST, "w", encoding="utf-8", newline="").write(t)
    print("escrito", DST, f"{os.path.getsize(DST)/1048576:.2f} MB |",
          len(rows), "avisos |", len(pueblos), "pueblos")


if __name__ == "__main__":
    main()
