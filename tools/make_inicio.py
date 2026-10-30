# -*- coding: utf-8 -*-
"""Genera `index.html`: la portada de hiessy.github.io.

Las tres páginas de avisos pesan entre 0,5 y 1,2 MB porque llevan el dataset
entero adentro. La portada no: es una página corta que sólo presenta las tres
búsquedas y enlaza a cada una. Entrar al sitio ya no significa bajar un mega de
avisos de CABA.

**Los números se leen de las páginas, no se escriben a mano.** Cada una guarda
su dataset en una línea `const D=[[...]]`, así que acá se cuenta de ahí y se
reparte por fuente (columna 14). Si un barrido agrega avisos, la portada se
rearma y los números acompañan. Escribirlos a mano era garantía de que
quedaran viejos, que es justo lo que pasó con los textos del pie durante
semanas.

`favoritos.html` no tiene dataset propio —lo levanta de localStorage y de
`favoritos.json`—, así que su número sale del archivo del repo, que es lo
único que se puede contar sin un navegador.

    python tools/make_inicio.py
"""
import datetime, io, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Las páginas publicadas viven en `casas/`; la raíz del sitio es la
# presentación personal y no tiene nada de esto.
SITIO = os.path.join(ROOT, "casas")
DST = os.path.join(SITIO, "index.html")
FAVJSON = os.path.join(SITIO, "favoritos.json")

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def mil(v):
    """1272 -> "1.272". El f-string da comas y acá los miles van con punto."""
    return f"{v:,}".replace(",", ".")


def leer(pag):
    """(cantidad de avisos, {fuente: cantidad}) de una de las páginas de avisos."""
    t = io.open(os.path.join(SITIO, pag), encoding="utf-8").read()
    linea = next(l for l in t.split("\n") if l.startswith("const D=[["))
    filas = json.loads(linea[len("const D="):].rstrip(";"))
    fuentes = {}
    for f in filas:
        # columna 14 = portal de origen. En sierras.html la 13 es el valle, pero
        # la 14 significa lo mismo en las tres.
        fuentes[f[14]] = fuentes.get(f[14], 0) + 1
    return len(filas), fuentes


RUTA = "route.html"


def leer_ruta():
    """Cuántas casas hay en el mapa de la Ruta 38, contadas del propio archivo.

    `route.html` es una página aparte y escrita a mano: no tiene el `const D=[[`
    de las otras tres, lleva su lista en un `var L = [{ id: 1, ... }]`. Se cuenta
    igual desde el archivo y no acá, para que al sumar o sacar una casa la
    portada acompañe sola. Si el archivo no está, la tarjeta no sale.
    """
    p = os.path.join(SITIO, RUTA)
    if not os.path.exists(p):
        return 0
    return len(re.findall(r"\{\s*id:\s*\d+\s*,", io.open(p, encoding="utf-8").read()))


# El orden es el de las pestañas, y el de la búsqueda: de la ciudad hacia afuera.
BUSQUEDAS = [
    ("caba-norte.html", "CABA norte",
     "Los doce barrios de la franja <b>Edenor</b>, al norte de la ciudad: "
     "Villa Urquiza, Coghlan, Saavedra, Núñez y alrededores. PH y casas de tres "
     "ambientes o más."),
    ("gba-norte.html", "Zona norte con patio",
     "El conurbano norte: Olivos, La Lucila, Florida, Martínez, San Fernando, "
     "Tigre, Bella Vista, San Miguel y Maschwitz. Acá el filtro que manda es el "
     "<b>terreno libre</b>, lote menos superficie cubierta."),
    ("sierras.html", "Sierras de Córdoba",
     "Los valles de <b>Punilla</b> y <b>Calamuchita</b>, sin la ciudad de Córdoba "
     "ni las Sierras Chicas. El mapa suma escuelas, hospitales y comercios, la "
     "producción agroecológica y el catastro minero de la provincia."),
]

CSS = """*{box-sizing:border-box}
:root{--bg:#faf8f5;--ink:#1c1a17;--mut:#6f675d;--line:#e5ded4;--acc:#8a5a2b;--pick:#b8862f;--card:#fff}
@media(prefers-color-scheme:dark){:root{--bg:#141311;--ink:#f0ece6;--mut:#9c948a;--line:#2c2926;--acc:#d9a066;--pick:#e0b05a;--card:#1c1a18}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
header{max-width:1220px;margin:0 auto;padding:48px 20px 8px;position:relative}
.sello{position:absolute;top:18px;right:20px;font-size:10.5px;color:var(--mut);
 opacity:.5;letter-spacing:.02em;white-space:nowrap}
.sello:hover{opacity:.9}
@media(max-width:620px){.sello{position:static;display:block;margin:0 0 10px;opacity:.55}}
h1{font-size:clamp(28px,5vw,44px);line-height:1.1;margin:0 0 14px;letter-spacing:-.02em}
.sub{color:var(--mut);max-width:64ch;margin:0}
.tabs{max-width:1220px;margin:0 auto;padding:20px 20px 0;display:flex;gap:8px}
.tab{font-size:13.5px;padding:8px 15px;border:1px solid var(--line);border-radius:999px;
 text-decoration:none;color:var(--mut);background:var(--card);white-space:nowrap}
.tab:hover{border-color:var(--acc);color:var(--ink)}
.tab.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.tab.fav em{font-style:normal;font-variant-numeric:tabular-nums;color:var(--pick)}
.tab.fav em:not(:empty){margin-left:5px;font-weight:600}
@media(max-width:720px){.tabs{padding:14px 16px 0;overflow-x:auto;scrollbar-width:none}
 .tabs::-webkit-scrollbar{display:none}}
main{max-width:1220px;margin:0 auto;padding:30px 20px 10px}
/* El total, grande y arriba: es el dato que contesta "¿cuánto hay acá?" */
.tot{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
 padding-bottom:26px;margin-bottom:30px;border-bottom:1px solid var(--line)}
/* `>b` y no `b`: los nombres de los portales van en <b> dentro del <span> y con
   el selector suelto salían a 56px cada uno. */
.tot>b{font-size:clamp(34px,7vw,56px);line-height:1;letter-spacing:-.03em;
 font-variant-numeric:tabular-nums;font-weight:680}
.tot span{color:var(--mut);font-size:14px;max-width:46ch}
.tot span b{color:var(--ink);font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
/* Cada búsqueda es una tarjeta-enlace entera: el blanco también es clickeable. */
.cd{display:flex;flex-direction:column;gap:9px;padding:22px 21px 20px;
 background:var(--card);border:1px solid var(--line);border-radius:14px;
 text-decoration:none;color:var(--ink);transition:border-color .15s,transform .15s}
.cd:hover{border-color:var(--acc);transform:translateY(-2px)}
.cd .n{font-variant-numeric:tabular-nums;font-size:30px;line-height:1;
 letter-spacing:-.02em;font-weight:680;color:var(--acc)}
.cd h2{margin:0;font-size:17.5px;letter-spacing:-.01em}
.cd p{margin:0;font-size:13.5px;color:var(--mut);line-height:1.5}
.cd p b{color:var(--ink);font-weight:600}
.cd .fu{margin-top:auto;padding-top:11px;display:flex;gap:6px;flex-wrap:wrap}
.cd .fu i{font-style:normal;font-size:11px;color:var(--mut);padding:3px 8px;
 border:1px solid var(--line);border-radius:999px;white-space:nowrap}
/* La tarjeta de favoritos no es una búsqueda: va en dorado y sin fuentes. */
.cd.fav .n{color:var(--pick)}
.como{max-width:1220px;margin:0 auto;padding:40px 20px 0}
.como h3{font-size:13px;color:var(--mut);letter-spacing:.06em;text-transform:uppercase;
 margin:0 0 14px;font-weight:600}
.como ul{margin:0;padding:0;list-style:none;display:grid;
 grid-template-columns:repeat(auto-fit,minmax(248px,1fr));gap:16px 26px}
.como li{font-size:13.5px;color:var(--mut);line-height:1.55;
 padding-left:14px;border-left:2px solid var(--line)}
.como li b{color:var(--ink);font-weight:600}
footer{max-width:1220px;margin:48px auto 0;padding:26px 20px 70px;color:var(--mut);
 font-size:13px;line-height:1.65;border-top:1px solid var(--line)}
footer p{margin:0 0 10px;max-width:72ch}
footer b{color:var(--ink)} a.tx{color:var(--acc)}
@media(max-width:720px){
 header{padding:26px 16px 4px}
 .sub{font-size:14.5px}
 main{padding:22px 16px 6px}
 .como{padding:30px 16px 0}
 footer{padding:22px 16px 56px}
}"""


def main():
    tot, fuentes_tot = 0, {}
    tarjetas = []
    for pag, titulo, blurb in BUSQUEDAS:
        n, fuentes = leer(pag)
        tot += n
        for k, v in fuentes.items():
            fuentes_tot[k] = fuentes_tot.get(k, 0) + v
        chips = "".join(f"<i>{k} {mil(v)}</i>"
                        for k, v in sorted(fuentes.items(), key=lambda x: -x[1]))
        tarjetas.append(
            f'<a class="cd" href="{pag}">\n'
            f' <span class="n">{mil(n)}</span>\n'
            f' <h2>{titulo}</h2>\n'
            f' <p>{blurb}</p>\n'
            f' <span class="fu">{chips}</span>\n'
            f'</a>')

    # favoritos.html no tiene dataset: se cuenta lo que viaja en el repo
    try:
        fav = len(json.load(io.open(FAVJSON, encoding="utf-8")))
    except Exception:
        fav = 0
    tarjetas.append(
        f'<a class="cd fav" href="favoritos.html">\n'
        f' <span class="n">{mil(fav)}</span>\n'
        f' <h2>Favoritos</h2>\n'
        f' <p>Lo marcado con el ♥ en cualquiera de las tres búsquedas, con las notas '
        f'de cada casa y una estimación de impuestos. Se guarda en este navegador; '
        f'los {mil(fav)} de acá son los que viajan con el sitio.</p>\n'
        f'</a>')

    # El mapa de la ruta no es una búsqueda sino una selección ya hecha, así que
    # va después de favoritos y sin chips de fuente.
    n_ruta = leer_ruta()
    if n_ruta:
        tarjetas.append(
            f'<a class="cd ruta" href="{RUTA}">\n'
            f' <span class="n">{n_ruta}</span>\n'
            f' <h2>Ruta 38</h2>\n'
            f' <p>Las casas de <b>Punilla</b> que quedaron en pie después de filtrar, '
            f'puestas sobre la ruta en orden de norte a sur: de Capilla del Monte a '
            f'Tala Huasi. Para ver cuánto hay entre una y otra antes de armar el viaje.</p>\n'
            f'</a>')

    fuentes_txt = ", ".join(f"<b>{k}</b> ({mil(v)})" for k, v in
                            sorted(fuentes_tot.items(), key=lambda x: -x[1]))
    hoy = datetime.date.today()
    ahora = datetime.datetime.now()

    html = f"""<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Búsqueda de casa · Argentina</title>
<meta name="description" content="{mil(tot)} casas y PH hasta USD 260.000 en el norte de CABA, el conurbano norte y las sierras de Córdoba, relevados en Zonaprop, Argenprop y MercadoLibre.">
<style>
{CSS}
</style></head><body>
<nav class="tabs">
 <a href="index.html" class="tab on">Inicio</a>
 <a href="caba-norte.html" class="tab">CABA norte</a>
 <a href="gba-norte.html" class="tab">Zona norte con patio</a>
 <a href="sierras.html" class="tab">Sierras de Córdoba</a>
 <a href="favoritos.html" class="tab fav">Favoritos <em id="favn"></em></a>
 <a href="{RUTA}" class="tab">Ruta 38</a>
</nav>
<header>
<span class="sello" title="Cuándo se armó esta portada">{ahora:%d/%m/%Y %H:%M}</span>
<h1>Tres zonas,<br>una búsqueda de casa</h1>
<p class="sub">Casas y PH de tres ambientes o más, hasta USD 260.000, en el norte de
CABA, el conurbano norte y las sierras de Córdoba. Todo relevado de los portales,
sacados los repetidos y los avisos dados de baja, y puesto en un mapa.</p>
</header>
<main>
<div class="tot">
 <b>{mil(tot)}</b>
 <span>avisos en pie hoy, de {fuentes_txt}.</span>
</div>
<div class="grid">
{chr(10).join(tarjetas)}
</div>
</main>
<section class="como">
<h3>Cómo está hecho</h3>
<ul>
<li><b>Un aviso, una vez.</b> El mismo inmueble suele estar publicado en dos o tres
portales con precios distintos. Se detectan y se deja uno solo.</li>
<li><b>Lo dado de baja se saca.</b> Cada tanto se revisan los enlaces publicados: lo
que el portal contesta como caído sale de la página, así no quedan avisos fantasma.</li>
<li><b>Cero no es cero.</b> Cuando la tarjeta del portal no dice los dormitorios o el
lote, acá figura en cero y el pie de cada página aclara cuántos son. No se completa a
ojo lo que el aviso no declara.</li>
<li><b>Todo en el mapa.</b> Las direcciones sin coordenadas se geocodifican; el pin
distingue si salió de la altura exacta, de la calle o del centro del pueblo.</li>
</ul>
</section>
<footer>
<p>Esto es una búsqueda propia, no un portal ni una inmobiliaria: no hay nada en venta
acá. Los avisos son de <a class="tx" href="https://www.zonaprop.com.ar" target="_blank"
rel="noopener">Zonaprop</a>, <a class="tx" href="https://www.argenprop.com"
target="_blank" rel="noopener">Argenprop</a> y <a class="tx"
href="https://www.mercadolibre.com.ar" target="_blank" rel="noopener">MercadoLibre</a>,
y cada ficha enlaza al original. <b>Confirmá precio y disponibilidad con la
inmobiliaria antes de viajar</b>: entre un barrido y el siguiente las cosas se venden.</p>
<p>Relevado en {MESES[hoy.month - 1]} de {hoy.year} · portada armada el
{ahora:%d/%m/%Y} a las {ahora:%H:%M} · el código que arma todo esto está en <a
class="tx" href="https://github.com/hiessy/hiessy.github.io" target="_blank"
rel="noopener">GitHub</a>.</p>
</footer>
<script src="/js/visits.js" defer></script>
</body></html>
"""
    io.open(DST, "w", encoding="utf-8", newline="").write(html)
    print("escrito", DST, f"{os.path.getsize(DST)/1024:.1f} KB |",
          mil(tot), "avisos |", len(BUSQUEDAS), "búsquedas |", fav, "favoritos")


if __name__ == "__main__":
    main()
