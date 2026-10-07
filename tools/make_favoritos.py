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
/* El botón vive en la ficha; el contenido se abre en un panel que entra desde
   la derecha, el mismo que usa Filtros. Antes era un <details> dentro de la
   ficha: con treinta y tres avisos, abrir dos ya desarmaba la lista. */
.qbtn{display:flex;align-items:center;gap:8px;width:calc(100% - 28px);margin:0 14px 12px;
 padding:7px 11px;border:1px solid var(--line);border-radius:9px;background:none;
 color:var(--mut);font:inherit;font-size:12.4px;cursor:pointer;text-align:left}
.qbtn:hover{border-color:var(--acc);color:var(--ink)}
.qbtn .imp{margin-left:auto;font-variant-numeric:tabular-nums;white-space:nowrap}
.qbtn .baja{color:#b4472e;font-weight:600}
#ndraw .dbody{padding:14px 16px;font-size:13.2px;line-height:1.55}
#ndraw h4{margin:13px 0 2px;font-size:11.5px;text-transform:uppercase;
 letter-spacing:.055em;color:var(--mut);font-weight:600}
#ndraw h4:first-child{margin-top:0}
#ndraw ul{margin:3px 0 0;padding-left:18px}
#ndraw li{margin:3px 0}
#ndraw .pro li::marker{content:'+  '}
#ndraw .con li::marker{content:'\\2013  '}
#ndraw .ojo li::marker{content:'!  '}
#ndraw .meta{color:var(--mut);font-size:12.2px;margin-top:14px;
 border-top:1px solid var(--line);padding-top:11px}
#ndraw .precio{font-size:15px;color:var(--ink);font-weight:600}
#ndraw .baja{color:#b4472e;font-weight:600}
#ndraw .ver{display:inline-block;margin-top:9px}
"""

# El marcado se arma en JS porque `notas.json` se carga en el navegador, igual
# que favoritos.json: así se puede corregir una nota sin regenerar la página.
NOTAS_JS = """
let NOTAS={};
const mdB=s=>E(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const listaN=(t,c,xs)=>xs&&xs.length
 ?`<h4>${t}</h4><ul class="${c}">${xs.map(x=>`<li>${mdB(x)}</li>`).join('')}</ul>`:'';
const SERVN={escuela:'escuela',salud:'salud',farmacia:'farmacia',
             super:'super',banco:'banco',policia:'polic\u00eda'};
function servTxt(s){
 if(!s)return '';
 const p=Object.keys(SERVN).filter(k=>s[k]&&s[k].length)
  .map(k=>`${SERVN[k]} ${s[k][0][1]} km`);
 return p.length?`<p>Cerca: ${p.join(' \u00b7 ')}</p>`:'';
}
// Botón en la ficha. El resumen de impuestos va en el botón para no tener que
// abrir el panel sólo para verlo.
function notaDe(r){
 const n=NOTAS[r[2]];
 if(!n)return '';
 const i=n.imp||{};
 const imp=i.anual_usd?`<span class="imp">USD ${i.anual_usd[0]}-${i.anual_usd[2]}/a\u00f1o</span>`:'';
 return `<button class="qbtn" data-q="${E(r[2])}">Qu\u00e9 mirar${
  n.baja?' <span class="baja">\u00b7 dado de baja</span>':''}${imp}</button>`;
}
const ndraw=document.getElementById('ndraw');
function abrirNota(k){
 const n=NOTAS[k],r=rowByKey.get(k);
 if(!n||!r)return;
 document.getElementById('ntit').textContent=r[9]||'Qu\u00e9 mirar';
 const i=n.imp||{};
 document.getElementById('nbody').innerHTML=
  `<p class="precio">USD ${E(r[3])}${n.baja?' <span class="baja">\u00b7 el aviso ya no est\u00e1 publicado</span>':''}</p>
   <p>${E(r[5])}<br>${E(r[6]||'')}</p>
   ${listaN('A favor','pro',n.pros)}${listaN('En contra','con',n.contras)}${listaN('Pregunt\u00e1','ojo',n.ojo)}
   <div class="meta">${servTxt(n.serv)}
   <p>Impuesto provincial <b>USD ${i.anual_usd?i.anual_usd[0]+'-'+i.anual_usd[2]:'?'} por a\u00f1o</b>
   y <b>USD ${i.compra_usd?i.compra_usd.toLocaleString('es-AR'):'?'}</b> de gastos de compra (${i.compra_pct}%).
   Se calcula sobre la <b>valuaci\u00f3n fiscal</b>, no sobre el precio: el rango supone que es
   entre el 20% y el 50%. El n\u00famero real est\u00e1 en el cedul\u00f3n, pedi\u00b4selo al vendedor.
   No incluye la tasa municipal, que en la sierra suele pesar m\u00e1s.</p>
   <a class="tx ver" href="${abs(r[2])?r[2]:UP+r[2]}" target="_blank" rel="noopener">Ver el aviso \u2197</a></div>`;
 ndraw.classList.add('open');scr.hidden=false;document.body.classList.add('noscroll');
}
function cerrarNota(){
 ndraw.classList.remove('open');scr.hidden=true;document.body.classList.remove('noscroll');
}
document.getElementById('nclose').onclick=cerrarNota;
addEventListener('keydown',e=>{if(e.key==='Escape'&&ndraw.classList.contains('open'))cerrarNota()});
fetch('notas.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(o=>{
 if(!o)return;
 NOTAS=o;
 draw();          // ya se dibuj\u00f3 sin los botones: se vuelve a dibujar con ellos
}).catch(()=>{});
"""


POIS_CSS = """
/* Las capas del mapa se prenden de a una; apagadas no se dibuja nada, que con
   2.000 puntos encima de los avisos no se ve ninguno de los dos. */
.maphead{flex-wrap:wrap;row-gap:7px}
.maphead .brk{flex-basis:100%;height:0;margin:0}
.maphead .mapnote{flex:1 1 100%}
.pleg{font-size:11.6px;color:var(--mut);margin:0 0 9px;display:flex;
 gap:11px;flex-wrap:wrap;align-items:center}
.pleg[hidden]{display:none}
.pleg i{font-style:normal;display:inline-flex;align-items:center;gap:4px}
/* Los avisos son marrón y dorado. Los servicios van en **frío** —azules,
   violetas, verdes, cian— para que no se confundan: el comercio estaba en
   #8a6a2b, que es el marrón de las casas con otro nombre. */
.pleg i::before{content:attr(data-i);width:15px;height:15px;border-radius:50%;
 border:1.5px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.22);color:#fff;
 font-size:9.5px;font-weight:700;line-height:15px;text-align:center;flex:none}
.pleg .escuela::before{background:#2563eb}
.pleg .salud::before{background:#dc2626}
.pleg .farmacia::before{background:#0d9488}
.pleg .super::before{background:#7c3aed}
.pleg .banco::before{background:#0891b2}
.pleg .seguridad::before{background:#4338ca}
.pleg .verde::before{background:#15803d}
.pleg .riesgo::before{background:#be123c}
.pleg .cantera::before{background:#ea580c}
.pleg .mina::before{background:#a21caf}
.pleg .planta::before{background:#9f1239}
.pleg .aviso{width:100%;margin:1px 0 0;opacity:.85;line-height:1.45}
/* la chapita de cada punto en el mapa, misma letra y mismo color que la leyenda */
.poi span{display:block;width:18px;height:18px;border-radius:50%;color:#fff;
 font:700 10.5px/18px system-ui,sans-serif;text-align:center;
 border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)}

/* "Mapa grande": el mapa se lleva dos tercios y las fichas pasan a una columna
   angosta. Con 33 fichas al lado, mirar el mapa era mirar una ventanita. */
.layout.ancho{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
.layout.ancho #map{height:calc(100vh - var(--stick) - 56px)}
@media(max-width:1000px){.layout.ancho{grid-template-columns:1fr}}
"""

# Los puntos viven en `pois.json` y los carga el navegador, igual que las notas.
POIS_JS = """
let POIS=null,capas={};
// Frío para los servicios, que los avisos son marrón y dorado. Cada categoría
// lleva además una **letra**: con ocho colores juntos, el color solo no alcanza,
// y encima del satélite se pierde.
const PCOL={escuela:'#2563eb',salud:'#dc2626',farmacia:'#0d9488',super:'#7c3aed',
            banco:'#0891b2',seguridad:'#4338ca',verde:'#15803d',riesgo:'#be123c',
            cantera:'#ea580c',mina:'#a21caf',planta:'#9f1239'};
// La C era "comercio" y ahora es "cantera", que es lo que uno busca en un mapa
// de sierra; el comercio pasa a S de super.
const PINI={escuela:'E',salud:'H',farmacia:'F',super:'S',banco:'B',
            seguridad:'P',verde:'V',riesgo:'I',
            cantera:'C',mina:'M',planta:'T'};
const PGRUPO={serv:['escuela','salud','farmacia','super','banco','seguridad'],
              verde:['verde'],riesgo:['riesgo']};
function marcasDe(g){
 const cats=PGRUPO[g]||[];
 const pts=Object.values(POIS).filter(p=>cats.includes(p.c));
 const marks=pts.map(p=>{
  const m=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'poi',
   html:`<span style="background:${PCOL[p.c]||'#666'}">${PINI[p.c]||'?'}</span>`,
   iconSize:[18,18],iconAnchor:[9,9]})});
  // Dos links y a propósito distintos. **Por nombre** es el que importa: Google
  // busca por su cuenta y te muestra dónde lo ubica él, que es la forma de
  // contrastar lo que dice OpenStreetMap en vez de repetirlo. **Por coordenada**
  // queda como segundo, para cuando el nombre es ambiguo o no aparece y hay que
  // mirar qué hay físicamente en el punto.
  const gmN=`https://www.google.com/maps/search/?api=1&query=`+
   encodeURIComponent(`${p.n}, Córdoba, Argentina`);
  const gmC=`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  m.bindPopup(`<b>${E(p.n)}</b><br>${E(PNOM[p.c]||p.c)}<br>
   <a href="${gmN}" target="_blank" rel="noopener">buscarlo en Google ↗</a><br>
   <a class="tx" href="${gmC}" target="_blank" rel="noopener">ver este punto en el mapa ↗</a>`);
  return m;
 });
 return marks;
}
// Las capas **se superponen**: cada botón prende y apaga la suya y pueden estar
// las tres juntas, que es como se mira de verdad —si hay escuela cerca importa
// al mismo tiempo que si hay una cantera—. Arrancan todas prendidas y se van
// apagando, y la elección se recuerda.
const CAPASK='hiessy:capas';
let capasOn=new Set(['serv','verde','riesgo']);
try{const g=localStorage.getItem(CAPASK);if(g!==null)capasOn=new Set(g?g.split(','):[])}catch(e){}
// --- catastro minero de la provincia (IDECOR) -----------------------------
// Dato oficial, no "lo que alguien mapeó con nombre". Va dentro de la capa
// Industria junto a lo de OpenStreetMap, con los polígonos dibujados: una
// cantera es un área, y saber que tenés el borde a 300 m no es lo mismo que
// saber que hay un punto en algún lado del pueblo.
let MINERIA=null;
const MNOM={cantera:'cantera',mina:'mina',planta:'planta de trituración o corte',
            cateo:'área de cateo o pertenencia minera'};
function marcasMineria(){
 if(!MINERIA)return [];
 const out=[];
 (MINERIA.areas||[]).forEach(a=>{
  (a.g||[]).forEach(anillo=>{
   const p=L.polygon(anillo,{color:PCOL[a.c]||'#ea580c',weight:1.5,
    fillOpacity:a.c==='cateo'?.06:.15,
    dashArray:a.c==='cateo'?'5,4':null});
   p.bindPopup(popMineria(a));
   out.push(p);
  });
 });
 (MINERIA.puntos||[]).forEach(p=>{
  const m=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'poi',
   html:`<span style="background:${PCOL[p.c]||'#ea580c'}">${PINI[p.c]||'C'}</span>`,
   iconSize:[18,18],iconAnchor:[9,9]})});
  m.bindPopup(popMineria(p));
  out.push(m);
 });
 return out;
}
function popMineria(r){
 const g=`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`;
 return `<b>${E(r.n||MNOM[r.c]||'sin nombre')}</b><br>${E(MNOM[r.c]||r.c)}
  ${r.t?'<br>'+E(r.t):''}${r.m?'<br>'+E(r.m):''}
  ${r.eia?'<br>expediente ambiental '+E(r.eia):''}
  <br><i>catastro minero de la provincia</i>
  <br><a href="${g}" target="_blank" rel="noopener">ver este punto en el mapa ↗</a>`;
}

function dibujarCapas(){
 Object.values(capas).forEach(l=>l.remove());
 capas={};
 if(POIS)capasOn.forEach(g=>{capas[g]=L.layerGroup(marcasDe(g)).addTo(map)});
 if(capasOn.has('riesgo'))capas.min=L.layerGroup(marcasMineria()).addTo(map);
 document.querySelectorAll('[data-cap]').forEach(x=>
  x.classList.toggle('on',capasOn.has(x.dataset.cap)));
 legenda();
 try{localStorage.setItem(CAPASK,[...capasOn].join(','))}catch(e){}
}
// La leyenda se arma con las categorías de la capa prendida y nada más: listar
// las ocho siempre ocupaba cuatro renglones de los que siete sobraban.
const PNOM={escuela:'escuela',salud:'salud',farmacia:'farmacia',super:'comercio',
            banco:'banco',seguridad:'policía y bomberos',
            verde:'vivero, granja, reserva',riesgo:'fábrica, basural, acopio',
            cantera:'cantera',mina:'mina',planta:'planta de trituración'};
const AVISO='<b>Canteras, minas, plantas y áreas de cateo salen del catastro minero '+
 'de la provincia</b> (IDECOR): es el registro oficial, con razón social y expediente. '+
 'El resto sale de OpenStreetMap, donde sólo aparece lo que alguien mapeó con nombre. '+
 'Si un campo usa agroquímicos no está registrado en ningún lado y no se puede mostrar.';
function legenda(){
 const el=document.getElementById('pleg');
 const cats=[];
 ['serv','verde','riesgo'].forEach(g=>{if(capasOn.has(g))cats.push(...(PGRUPO[g]||[]))});
 if(capasOn.has('riesgo'))cats.push('cantera','mina','planta');
 if(!cats.length||!POIS){el.hidden=true;return}
 let n=Object.values(POIS).filter(p=>cats.includes(p.c)).length;
 if(capasOn.has('riesgo')&&MINERIA)n+=(MINERIA.puntos||[]).length+(MINERIA.areas||[]).length;
 el.innerHTML=cats.map(c=>`<i class="${c}" data-i="${PINI[c]}">${PNOM[c]}</i>`).join('')+
  `<span class="aviso"><b>${n}</b> puntos en el mapa. ${AVISO}</span>`;
 el.hidden=false;
}
document.querySelectorAll('[data-cap]').forEach(b=>b.onclick=()=>{
 const g=b.dataset.cap;
 capasOn.has(g)?capasOn.delete(g):capasOn.add(g);
 dibujarCapas();
});

// Ancho del mapa. Se recuerda, como los filtros: el que lo quiere grande lo
// quiere grande siempre. invalidateSize porque Leaflet no se entera solo de que
// su contenedor cambió de tamaño y deja el mapa cortado.
const LAY=document.querySelector('.layout'),ANCHOK='hiessy:mapaancho';
function anchoMapa(on){
 LAY.classList.toggle('ancho',on);
 const b=document.getElementById('mbig');
 b.classList.toggle('on',on);
 b.textContent=on?'Mapa normal':'Mapa grande';
 try{localStorage.setItem(ANCHOK,on?'1':'')}catch(e){}
 if(map)setTimeout(()=>{map.invalidateSize();drawPins();dibujarCapas()},230);
}
document.getElementById('mbig').onclick=()=>anchoMapa(!LAY.classList.contains('ancho'));
try{if(localStorage.getItem(ANCHOK))anchoMapa(true)}catch(e){}

Promise.all([
 fetch('pois.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
 fetch('mineria.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
]).then(([p,m])=>{POIS=p||null;MINERIA=m||null;dibujarCapas()});
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

    # Los dos botones de favoritos **salen de la barra del mapa** y se van a la
    # de arriba: ahí arriba hay lugar, y en la del mapa competían con las capas
    # hasta dejarla en cinco renglones de botones y el mapa abajo de todo.
    t = rep(t, '<button class="pill" id="clr" hidden>Limpiar selección</button>\n', '')
    t = rep(t, '<span class="cnt" id="cnt"></span>',
               '<span class="cnt" id="cnt"></span>\n'
               '<button class="pill" id="clr" hidden>Limpiar selección</button>\n'
               '<button class="pill" id="fexp" title="Baja lo marcado en este navegador '
               'para commitearlo en el repo y que se vea también en el sitio publicado y '
               'en el teléfono">Bajar JSON</button>')

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

    # El panel de notas, hermano del de Filtros: mismo .drawer, mismo scrim,
    # misma tecla Escape. Se agrega al lado del otro, no adentro.
    t = rep(t,
        '<div class="dfoot"><button class="pill wide" id="fdone">Ver avisos</button></div>\n</aside>',
        '<div class="dfoot"><button class="pill wide" id="fdone">Ver avisos</button></div>\n</aside>\n'
        '<aside class="drawer" id="ndraw" aria-label="Qué mirar">\n'
        '<div class="dhead"><b id="ntit">Qué mirar</b>'
        '<button class="xbtn" id="nclose" aria-label="Cerrar">&#10005;</button></div>\n'
        '<div class="dbody" id="nbody"></div>\n</aside>')

    # El clic en el botón de la ficha abre el panel y **no** sigue hasta el
    # zoom al mapa, que es lo que hace un clic en cualquier otra parte.
    t = rep(t,
        " g.onclick=e=>{\n  const b=e.target.closest('.pickbtn');",
        " g.onclick=e=>{\n"
        "  const q=e.target.closest('.qbtn');\n"
        "  if(q){e.preventDefault();abrirNota(q.dataset.q);return}\n"
        "  const b=e.target.closest('.pickbtn');")

    # el scrim cierra los dos paneles
    t = rep(t, "scr.onclick=closeF;", "scr.onclick=()=>{closeF();cerrarNota()};")

    # --- capas de puntos de interés en el mapa -----------------------------
    # `.maphead` es un flex **sin wrap**: ocho botones y una leyenda ahí adentro
    # dejaban la leyenda en una columna de 80 px y el texto se derramaba encima
    # de las fichas. Las capas van en su propia fila (`.brk` fuerza el salto) y
    # la leyenda, afuera del maphead y sólo cuando hay una capa prendida.
    t = rep(t, '<button class="pill" id="sat">Satélite</button>',
               '<button class="pill" id="sat">Satélite</button>\n'
               '<button class="pill" id="mbig">Mapa grande</button>\n'
               '<span class="brk"></span><span class="lbl">Cerca</span>\n'
               '<button class="pill" id="cserv" data-cap="serv">Servicios</button>\n'
               '<button class="pill" id="cverde" data-cap="verde">Producción</button>\n'
               '<button class="pill" id="criesgo" data-cap="riesgo">Industria</button>\n'
               '<span class="brk"></span>')
    t = rep(t, '<span class="mapnote" id="mapn"></span></div>',
               '<span class="mapnote" id="mapn"></span></div>\n'
               '<p class="pleg" id="pleg" hidden></p>')
    t = rep(t, "</style>", POIS_CSS + "\n</style>")
    t = rep(t, "document.getElementById('sat').onclick=toggleSat;",
               POIS_JS + "\ndocument.getElementById('sat').onclick=toggleSat;")

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
