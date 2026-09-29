"""Genera `sierras.html` a partir de `index.html`.

Tercera pestaña, mismo CSS y mismo JS que las otras dos. Lo que cambia:

- los pills de zona pasan a ser los **pueblos** de los dos valles;
- se suma un filtro de **Valle** (`data-v`, columna 13) además del de Fuente:
  antes el valle ocupaba el lugar de la fuente porque todo salía de Zonaprop, y
  desde que hay avisos de Argenprop en la sierra hacen falta los dos;
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

    # El **valle** es un filtro propio (`data-v`, columna 13) y la fuente se queda
    # donde estaba. Antes el valle ocupaba el lugar de la fuente, porque acá todo
    # salía de Zonaprop; desde que hay avisos de Argenprop hacen falta los dos.
    t = rep(t, '<span class="lbl">Fuente</span>',
               '<span class="lbl">Valle</span>\n'
               '<button class="pill" data-v="Punilla">Punilla <em></em></button>\n'
               '<button class="pill" data-v="Calamuchita">Calamuchita <em></em></button>\n'
               '<span class="sep"></span>\n'
               '<span class="lbl">Fuente</span>')

    # el metro cubierto no decide nada acá; el lote sí
    t = rep(t, '<button class="pill" id="m2">100 m²+ <em></em></button>',
'''<span class="sep"></span>
<span class="lbl">Terreno libre</span>
<button class="pill" data-t="300">300 m²+ <em></em></button>
<button class="pill" data-t="600">600 m²+ <em></em></button>
<button class="pill" data-t="1000">1000 m²+ <em></em></button>
<button class="pill on" data-t="0">Sin mínimo <em></em></button>
<button class="pill" id="m2" hidden>100 m²+ <em></em></button>''')

    # **Lote no declarado no es lote chico.** Argenprop no publica superficie
    # total en la sierra: sus 267 avisos traen terreno 0. Con el filtro original
    # (`>= ter`) cualquier mínimo de terreno los borraba a todos de una, la
    # fuente marcaba 0 y parecía que el relevamiento nunca los había traído.
    # Pasó dos veces. Acá el mínimo deja pasar lo que no declara lote y la ficha
    # lo aclara; el contador dice cuántos son. En las otras dos páginas el
    # filtro sigue igual, que ahí Zonaprop declara el lote casi siempre.
    t = rep(t, "okT=r=>!ter||(r[18]||0)>=ter,",
               "okT=r=>!ter||!(r[18]||0)||r[18]>=ter,   // sin lote declarado = no sabemos, no descarta")
    t = rep(t, "n('t',r=>!v||(r[18]||0)>=v)",
               "n('t',r=>!v||!(r[18]||0)||r[18]>=v)")
    t = rep(t, ''' // con un mínimo de terreno activo, los avisos sin lote declarado quedan afuera.
 // Decirlo: si no, parecen no existir (son casi todos los de Argenprop).''',
''' // Los avisos sin lote declarado entran igual cuando hay un mínimo puesto
 // (ver okT). Decir cuántos son, para que el número no engañe en el otro sentido.''')
    t = rep(t, " const mudos=ter?D.filter(r=>okR(r)&&okD(r)&&okG(r)&&okF(r)&&okV(r)"
               "&&okM(r)&&okPr(r)&&(!pk||r[8])&&!(r[18]||0)).length:0;\n"
               " cnt.textContent=base+(mudos?` · ${mudos} sin lote declarado`:'');",
               " const mudos=ter?view.filter(r=>!(r[18]||0)).length:0;\n"
               " cnt.textContent=base+(mudos?` · incluye ${mudos} sin lote declarado`:'');")

    # y que se vea en la ficha cuál es cuál
    t = rep(t, "<p class=\"src\">${E(r[9])}${r[14]?' · '+E(r[14]):''}</p>",
               "<p class=\"src\">${E(r[9])}${r[14]?' · '+E(r[14]):''}"
               "${ter&&!(r[18]||0)?' · <b>lote no declarado</b>':''}</p>")

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
    puni = mil(sum(1 for r in rows if r[13] == "Punilla"))
    cala = mil(sum(1 for r in rows if r[13] == "Calamuchita"))
    lote = {k: mil(sum(1 for r in rows if r[18] >= k)) for k in (300, 600, 1000)}
    sinlote = mil(sum(1 for r in rows if not r[18]))
    ap = mil(sum(1 for r in rows if r[14] == "Argenprop"))
    hoy = datetime.date.today()

    i, j = t.index('<p class="sub">'), t.index("</header>")
    t = t[:i] + f'''<p class="sub">{n} casas de 3 ambientes o más, hasta USD 260.000,
en los valles de <b>Punilla</b> ({puni}) y <b>Calamuchita</b> ({cala}). Sin la ciudad de
Córdoba ni las Sierras Chicas.</p>
''' + t[j:]

    i = t.index("<footer>"); j = t.index("</footer>")
    t = t[:i] + f'''<footer>
<p><b>{sinlote} avisos no declaran el lote</b> —Argenprop no publica superficie total acá, así
que son casi todos sus {ap}—. Con un mínimo de terreno puesto entran igual, marcados en la
ficha: que el portal no lo diga no quiere decir que el lote sea chico.</p>
<p><b>Terreno libre</b> es lote menos superficie cubierta. Antes de viajar preguntá por el
<b>agua</b> (red, perforación o cisterna), por el <b>gas</b> —en buena parte de los dos valles
es envasado— y por el estado del dominio: en los loteos viejos de sierra abunda la posesión
sin título perfecto.</p>
<p style="margin-top:14px">Relevado en {MESES[hoy.month - 1]} de {hoy.year} · datos de <a
class="tx" href="https://www.zonaprop.com.ar" target="_blank" rel="noopener">Zonaprop</a> ·
confirmá con la inmobiliaria antes de viajar.</p>
''' + t[j:]

    io.open(DST, "w", encoding="utf-8", newline="").write(t)
    print("escrito", DST, f"{os.path.getsize(DST)/1048576:.2f} MB |",
          len(rows), "avisos |", len(pueblos), "pueblos")


if __name__ == "__main__":
    main()
