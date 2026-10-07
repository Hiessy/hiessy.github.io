"""Genera `favoritos.html` a partir de `index.html`.

Cuarta pestaña. No tiene relevamiento propio: el dataset lo arma el navegador con
lo que uno marcó con el ♥ en las otras tres, que se guarda en `localStorage` bajo
una clave común a todo el sitio. Por eso acá `const D` no es una lista de avisos
sino el código que la lee.

Dos consecuencias de que los datos vivan en el navegador:

- **los pills de zona se arman solos**, porque dependen de lo que cada uno haya
  guardado y no se pueden escribir en el HTML;
- la página no se rearma cuando cambia un relevamiento. Lo guardado es una copia
  de la fila del día en que se marcó: si el aviso después se da de baja, acá
  sigue apareciendo. El pie lo avisa.

    python tools/make_favoritos.py
"""
import io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "index.html")
DST = os.path.join(ROOT, "favoritos.html")

# Ojo: no redeclarar `FAVK`, que index.html lo declara más abajo con `const` y
# dos declaraciones en el mismo scope rompen el script entero.
DATA = """const D=(()=>{
 let o={};
 try{o=JSON.parse(localStorage.getItem('hiessy:favoritos')||'{}')||{}}catch(e){}
 return Object.keys(o).sort((a,b)=>(o[b].t||0)-(o[a].t||0))
  .map(k=>o[k]&&o[k].r).filter(r=>Array.isArray(r)&&r.length>19);
})();
// Un pill por zona presente en lo guardado. Tiene que correr antes de que se
// enganchen los onclick de los pills, unas líneas más abajo.
(()=>{
 const todos=document.querySelector('.pill[data-b=""]');
 if(!todos)return;
 const zs=[...new Set(D.map(r=>r[9]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 todos.insertAdjacentHTML('afterend',zs.map(z=>
  `<button class="pill" data-b="${z.replace(/"/g,'&quot;')}">${z} <em></em></button>`).join(''));
})();"""


NOTAS_CSS = """
.notas{margin:0 14px 12px;font-size:12.6px;line-height:1.5}
.notas summary{cursor:pointer;color:var(--mut);padding:5px 0;list-style:none;
 display:flex;gap:7px;align-items:center;flex-wrap:wrap}
.notas summary::-webkit-details-marker{display:none}
.notas summary::before{content:'▸';font-size:11px;transition:transform .15s}
.notas[open] summary::before{transform:rotate(90deg)}
.notas .imp{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--mut)}
.notas ul{margin:3px 0 8px;padding-left:17px}
.notas li{margin:2px 0}
.notas .pro li::marker{content:'+  '}
.notas .con li::marker{content:'–  '}
.notas .ojo li::marker{content:'!  '}
.notas .ojo{color:var(--ink)}
.notas h4{margin:7px 0 1px;font-size:11.5px;text-transform:uppercase;
 letter-spacing:.055em;color:var(--mut);font-weight:600}
.notas b{font-weight:600}
.notas .serv{color:var(--mut);margin-top:6px}
.notas .baja{color:#b4472e;font-weight:600}
"""

# El marcado se arma en JS porque `notas.json` se carga en el navegador, igual
# que favoritos.json: así se puede corregir una nota sin regenerar la página.
NOTAS_JS = """
let NOTAS={};
const mdB=s=>E(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const listaN=(t,c,xs)=>xs&&xs.length
 ?`<h4>${t}</h4><ul class="${c}">${xs.map(x=>`<li>${mdB(x)}</li>`).join('')}</ul>`:'';
const SERVN={escuela:'escuela',salud:'salud',farmacia:'farmacia',
             super:'super',banco:'banco',policia:'policía'};
function servTxt(s){
 if(!s)return '';
 const p=Object.keys(SERVN).filter(k=>s[k]&&s[k].length)
  .map(k=>`${SERVN[k]} ${s[k][0][1]} km`);
 return p.length?`<p class="serv">Cerca: ${p.join(' · ')}</p>`:'';
}
function notaDe(r){
 const n=NOTAS[r[2]];
 if(!n)return '';
 const i=n.imp||{};
 const imp=i.anual_usd
  ?`<span class="imp">imp. USD ${i.anual_usd[0]}-${i.anual_usd[2]}/año · compra USD ${i.compra_usd.toLocaleString('es-AR')}</span>`
  :'';
 return `<details class="notas"><summary>Qué mirar${n.baja?' <span class="baja">· dado de baja</span>':''}${imp}</summary>
 ${listaN('A favor','pro',n.pros)}${listaN('En contra','con',n.contras)}${listaN('Preguntá','ojo',n.ojo)}
 ${servTxt(n.serv)}
 <p class="serv">El impuesto provincial se calcula sobre la <b>valuación fiscal</b>, no sobre el precio:
 el rango supone que es entre el 20% y el 50% del precio. El número real está en el cedulón, pediselo
 al vendedor. No incluye la tasa municipal, que en la sierra suele pesar más.</p>
 </details>`;
}
fetch('notas.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(o=>{
 if(!o)return;
 NOTAS=o;
 draw();          // ya se dibujó sin notas: se vuelve a dibujar con ellas
}).catch(()=>{});
"""


def rep(t, a, b, n=1):
    assert t.count(a) == n, (a[:70], t.count(a))
    return t.replace(a, b)


def main():
    t = io.open(SRC, encoding="utf-8").read()

    lines = t.split("\n")
    i = [k for k, l in enumerate(lines) if l.startswith("const D=[[")][0]
    lines[i] = DATA
    t = "\n".join(lines)

    # pestaña activa
    t = rep(t, '<a href="index.html" class="tab on">CABA norte</a>',
               '<a href="index.html" class="tab">CABA norte</a>')
    t = rep(t, '<a href="favoritos.html" class="tab fav">Favoritos <em id="favn"></em></a>',
               '<a href="favoritos.html" class="tab fav on">Favoritos <em id="favn"></em></a>')

    # los pills de barrio los pone el JS: acá queda solo "Todos"
    old = re.search(r'<button class="pill on" data-b="">Todos <em></em></button>\n'
                    r'(?:<button class="pill" data-b="[^"]*">[^<]*<em></em></button>\n?)+', t)
    t = (t[:old.start()] + '<button class="pill on" data-b="">Todos <em></em></button>\n'
         + t[old.end():])

    # no hay picks editoriales en lo que uno guarda
    t, k = re.subn(r'<button class="pill gold" id="pk">',
                   '<button class="pill gold" id="pk" hidden>', t, count=1)
    assert k == 1, "no encontré el botón de picks"

    # Botón para bajar el archivo, al lado de "Quitar de favoritos".
    t = rep(t, '<button class="pill" id="clr" hidden>Limpiar selección</button>',
               '<button class="pill" id="clr" hidden>Limpiar selección</button>\n'
               '<button class="pill" id="fexp" title="Para commitearlo en el repo y '
               'que los favoritos se vean en el sitio publicado y en el teléfono">'
               'Bajar favoritos.json</button>')

    # `D` se arma de localStorage al cargar, así que lo que traiga `favSync()`
    # después no está en la lista. En las otras tres páginas alcanza con volver a
    # dibujar; acá hay que rehacer `D`, que es `const`. Una recarga, y una sola:
    # el flag de sesión evita el bucle si el archivo trae algo que no se guarda.
    t = rep(t, "initPrice();fitSticky();initMap();loadF();draw();favBadge();favSync();",
               "initPrice();fitSticky();initMap();loadF();draw();favBadge();\n"
               "document.getElementById('fexp').onclick=favExport;\n"
               "favSync().then(n=>{\n"
               " if(!n||sessionStorage.getItem('favrecarga'))return;\n"
               " try{sessionStorage.setItem('favrecarga','1')}catch(e){}\n"
               " location.reload();\n"
               "});")

    # --- notas por aviso: pros, contras, qué mirar e impuestos -------------
    # `notas.json` se arma con tools/notas_favoritos.py. Va en un bloque plegado
    # dentro de la ficha: la lista tiene que seguir leyéndose de un vistazo, y
    # treinta y tres fichas con diez renglones cada una no se leen.
    t = rep(t, "<p class=\"note\">${E(r[7])}</p>",
               "<p class=\"note\">${E(r[7])}</p>${notaDe(r)}")

    t = rep(t, "const card=r=>`<article class=\"card\"",
               NOTAS_JS + "\nconst card=r=>`<article class=\"card\"")

    t = rep(t, "</style>", NOTAS_CSS + "\n</style>")

    # textos
    t = rep(t, "<title>Búsqueda de propiedades · Argentina</title>",
               "<title>Favoritos · Argentina</title>")
    t = rep(t, '<h1>PH y casas en la zona norte de CABA<br>con menos de USD 260.000</h1>',
               '<h1>Favoritos<br>lo que fuimos marcando</h1>')
    t = re.sub(r'<meta name="description" content="[^"]*">',
               '<meta name="description" content="Los avisos marcados con el ♥ en las tres '
               'búsquedas.">', t, count=1)

    i, j = t.index('<p class="sub">'), t.index("</header>")
    t = t[:i] + '''<p class="sub">Los avisos marcados con el <b>♥</b> en CABA norte, zona norte
y sierras de Córdoba. Se guardan en este navegador: no viajan a ningún servidor y
no se ven desde otra computadora.</p>
''' + t[j:]

    i = t.index("<footer>"); j = t.index("</footer>")
    t = t[:i] + '''<footer>
<p>Esta página es una <b>copia del día en que marcaste cada aviso</b>: el precio y la
foto son los de ese momento y, si después se dio de baja, acá va a seguir apareciendo.
El link lleva al aviso original, que es lo que manda.</p>
<p><b>Para que se vean en el sitio publicado y en el teléfono</b>: "Bajar favoritos.json",
el archivo va a la raíz del repo y se commitea. Desde ahí lo levanta cualquier navegador.
Lo que marcás en <code>localhost</code> no se ve en el sitio publicado hasta que hacés eso:
son dos navegadores distintos para el navegador, aunque sea la misma página.</p>
<p>Se borran con el <b>♥</b> de la ficha o con "Quitar de favoritos" arriba del mapa.
Si limpiás los datos del navegador, se van los que no estén en el archivo.</p>
''' + t[j:]

    io.open(DST, "w", encoding="utf-8", newline="").write(t)
    print("escrito", DST, f"{os.path.getsize(DST)/1024:.0f} KB")


if __name__ == "__main__":
    main()
