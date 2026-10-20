# -*- coding: utf-8 -*-
"""El panel «Qué mirar» de `sierras.html`: CSS, markup y JS para inyectar.

`notas_favoritos.py` escribe a mano pros, contras y qué mirar para cada
favorito. Eso sirve para treinta avisos y no para tres mil: leer cada uno es
justamente el trabajo que no se puede automatizar.

Lo que **sí** se puede decir de los tres mil sale de los datos que la fila ya
tiene, y no es poco: el impuesto es una cuenta sobre el precio, y lo que el
aviso **no** declara es un dato en sí mismo. Sobre el relevamiento de hoy, el
53% de los avisos dispara al menos una advertencia real.

Se calcula **en el navegador, al abrir el panel**. Guardarlo en `notas.json`
habría llevado ese archivo de 48 KB a unos 4,4 MB —1,4 KB por aviso— y hay que
bajarlo entero para ver una sola ficha. Así la página no pesa un byte más.

Las notas escritas a mano siguen mandando: si el aviso está en `notas.json`,
se muestran sus pros y contras, y su «qué mirar» va primero, con lo calculado
abajo.
"""

CSS = """
/* --- panel «Qué mirar» --------------------------------------------------
   Hermano del de Filtros: mismo .drawer, mismo scrim, misma tecla Escape. */
.qbtn{display:block;width:100%;margin:7px 0 0;font:inherit;font-size:12px;
 text-align:left;padding:6px 9px;border:1px solid var(--line);background:var(--card);
 color:var(--mut);border-radius:7px;cursor:pointer}
.qbtn:hover{border-color:var(--acc);color:var(--ink)}
.qbtn .imp{float:right;color:var(--mut);font-variant-numeric:tabular-nums}
.qbtn .n{color:var(--acc);font-weight:600}
#ndraw .dbody{padding:14px 16px;overflow-y:auto}
#ndraw h4{margin:13px 0 2px;font-size:12px;letter-spacing:.04em;
 text-transform:uppercase;color:var(--mut)}
#ndraw h4:first-child{margin-top:0}
#ndraw ul{margin:3px 0 0;padding-left:18px}
#ndraw li{margin:3px 0;font-size:13.5px;line-height:1.5}
#ndraw .pro li::marker{content:'+  '}
#ndraw .con li::marker{content:'\\2013  '}
#ndraw .ojo li::marker{content:'!  '}
#ndraw .meta{color:var(--mut);font-size:12.2px;margin-top:14px;
 border-top:1px solid var(--line);padding-top:11px}
#ndraw .precio{font-size:15px;color:var(--ink);font-weight:600;margin:0 0 4px}
#ndraw .dir{margin:0 0 4px;font-size:13px}
#ndraw .ver{display:inline-block;margin-top:9px}
#ndraw .mano{color:var(--pick);font-size:11.5px;letter-spacing:.03em}
"""

MARKUP = (
    '<aside class="drawer" id="ndraw" aria-label="Qué mirar">\n'
    '<div class="dhead"><b id="ntit">Qué mirar</b>'
    '<button class="xbtn" id="nclose" aria-label="Cerrar">&#10005;</button></div>\n'
    '<div class="dbody" id="nbody"></div>\n</aside>')

# Ojo con las llaves: este bloque se inserta tal cual, no pasa por format().
JS = r"""
// --- Qué mirar -----------------------------------------------------------
// Lo escrito a mano está en notas.json y son unos pocos. Para el resto se
// calcula acá, al abrir el panel: el impuesto sale del precio y las
// advertencias salen de lo que el aviso NO declara, que es un dato en sí
// mismo. Nada de esto se guarda: en un archivo serían 4,4 MB para bajar antes
// de ver una ficha.
let NOTAS={}, POIS=null;

// Escala del inmobiliario provincial 2026 (Ley 11090, art. 6), la misma que
// usa notas_favoritos.py. El dólar queda fijo acá: mueve el resultado, así
// que conviene que se vea y no que se esconda en una cuenta.
const USD_OF=1545, MIN_IMP=16875, PCT_COMPRA=.005+.02+.03*1.21;
const ESCALA=[[0,41e6,0,.156],[41e6,63e6,63960,.230],[63e6,90e6,114560,.353],
 [90e6,124e6,209870,.451],[124e6,198e6,363210,.551],[198e6,307e6,770950,.624],
 [307e6,762e6,1451110,.720],[762e6,1738e6,4727110,.800],
 [1738e6,Infinity,12535110,.850]];
function inmobiliario(ars){
 for(const [d,h,fijo,al] of ESCALA)
  if(ars<=h)return Math.max(fijo+(ars-d)*al/100,MIN_IMP);
 return MIN_IMP;
}
// La base del impuesto es la **valuación fiscal**, que no se publica. Por eso
// va un rango sobre tres supuestos y el panel dice de dónde sale el número
// verdadero, que es el cedulón.
function impuestos(usd){
 const ars=usd*USD_OF;
 return {anual:[.20,.35,.50].map(p=>Math.round(inmobiliario(ars*p)/USD_OF)),
         compra:Math.round(usd*PCT_COMPRA), pct:+(PCT_COMPRA*100).toFixed(1)};
}

// Mediana por pueblo, para saber cuándo un precio se sale de lo normal.
const MEDIANA=(()=>{
 const por={};
 for(const r of D)(por[r[9]]=por[r[9]]||[]).push(r[4]);
 const m={};
 for(const k in por){const v=por[k].sort((a,b)=>a-b);
  m[k]=v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;}
 return m;
})();

// Las reglas. Cada una mira un dato concreto de la fila y dice qué preguntar;
// ninguna adivina. El orden es el de lo que más cambia una decisión.
function reglas(r){
 const o=[];
 const declaraLote=/m² lote/.test(r[6]||'');
 if(!declaraLote)
  o.push('El aviso <b>no declara la superficie del terreno</b>. Pedila por escrito antes de viajar: sin ese número no se sabe si hay parque.');
 else if(!(r[18]||0))
  o.push('Declara el lote pero <b>no sobra terreno</b>: lo cubierto ocupa todo. Si buscás jardín, preguntá qué queda libre.');
 if(r[14]==='MercadoLibre'&&!r[11])
  o.push('La tarjeta de MercadoLibre <b>no dice cuántos dormitorios</b> tiene; el cero de la ficha es «sin dato». Confirmalo en el aviso.');
 if(!r[15])
  o.push('El aviso <b>no publica ubicación</b>, así que no tiene pin en el mapa. Preguntá la dirección exacta.');
 else if(r[20]===2)
  o.push('El pin es el <b>centro del pueblo</b>, no la casa: el aviso no da la dirección. Puede estar a varios kilómetros.');
 else if(r[20]===1)
  o.push('El pin sale de <b>la calle sin altura</b>: está en la cuadra correcta, no en la casa.');
 const med=MEDIANA[r[9]];
 if(med&&r[4]<med*.55)
  o.push(`Está <b>muy por debajo</b> de la mediana del pueblo (USD ${Math.round(med).toLocaleString('es-AR')}). Suele ser el título: en los loteos viejos de sierra abunda la posesión sin escritura. Pedí la matrícula.`);
 return o;
}

const SERVN={escuela:'escuela',salud:'salud',farmacia:'farmacia',
             super:'super',banco:'banco',seguridad:'policía'};
function cerca(r){
 if(!POIS||!r[15])return '';
 const R=6371, rad=x=>x*Math.PI/180;
 const d=(a,b,c,e)=>{const x=rad(c-a),y=rad(e-b);
  const s=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));};
 const mejor={};
 for(const p of POIS){
  if(!SERVN[p.c]||!p.lat)continue;
  const km=d(r[15],r[16],p.lat,p.lng);
  if(mejor[p.c]===undefined||km<mejor[p.c])mejor[p.c]=km;
 }
 const ps=Object.keys(SERVN).filter(k=>mejor[k]!==undefined)
  .map(k=>`${SERVN[k]} ${mejor[k].toFixed(1)} km`);
 return ps.length?`<p>Lo más cerca: ${ps.join(' · ')}</p>`:'';
}

const mdB=s=>s.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const listaN=(t,c,xs)=>xs&&xs.length
 ?`<h4>${t}</h4><ul class="${c}">${xs.map(x=>`<li>${mdB(x)}</li>`).join('')}</ul>`:'';

// El botón de la ficha. El impuesto va ahí para no tener que abrir el panel
// sólo para verlo.
function notaDe(r){
 if(!r[4])return '';
 const i=impuestos(r[4]);
 const n=reglas(r).length+((NOTAS[r[2]]||{}).ojo||[]).length;
 return `<button class="qbtn" data-q="${E(r[2])}">Qué mirar${
  n?` <span class="n">${n}</span>`:''}<span class="imp">USD ${i.anual[0]}–${i.anual[2]}/año</span></button>`;
}

const ndraw=document.getElementById('ndraw');
let abierta=null;
function abrirNota(k){
 const r=rowByKey.get(k); if(!r)return;
 abierta=k;
 const n=NOTAS[k]||{}, i=impuestos(r[4]||0);
 // lo escrito a mano primero, y debajo lo que sale de los datos
 const ojo=[...(n.ojo||[]), ...reglas(r)];
 document.getElementById('ntit').textContent=r[9]||'Qué mirar';
 document.getElementById('nbody').innerHTML=
  `<p class="precio">USD ${E(r[3])}</p>
   <p class="dir">${E(r[5])}${r[6]?'<br>'+E(r[6]):''}</p>
   ${n.pros?'<p class="mano">Notas escritas a mano</p>':''}
   ${listaN('A favor','pro',n.pros)}${listaN('En contra','con',n.contras)}
   ${listaN('Qué mirar','ojo',ojo)}
   <div class="meta">${cerca(r)}
   <p>Impuesto provincial <b>USD ${i.anual[0]}–${i.anual[2]} por año</b> y
   <b>USD ${i.compra.toLocaleString('es-AR')}</b> de gastos de compra (${i.pct}%).
   Se calcula sobre la <b>valuación fiscal</b>, no sobre el precio: el rango supone
   que es entre el 20% y el 50%. El número real está en el cedulón, pedíselo al
   vendedor. No incluye la tasa municipal, que en la sierra suele pesar más.</p>
   <p>Antes de viajar preguntá también por el <b>agua</b> (red, perforación o
   cisterna) y por el <b>gas</b>, que en buena parte de los dos valles es envasado.</p>
   <a class="tx ver" href="${E(r[2])}" target="_blank" rel="noopener">Ver el aviso ↗</a></div>`;
 ndraw.classList.add('open');scr.hidden=false;document.body.classList.add('noscroll');
}
function cerrarNota(){
 abierta=null;
 ndraw.classList.remove('open');scr.hidden=true;document.body.classList.remove('noscroll');
}
document.getElementById('nclose').onclick=cerrarNota;
addEventListener('keydown',e=>{if(e.key==='Escape'&&ndraw.classList.contains('open'))cerrarNota()});

// Las notas a mano y los puntos de interés se piden una sola vez y recién
// cuando hacen falta: pesan 48 y 113 KB, y la mayoría de las visitas no abre
// ningún panel.
let pedido=false;
function traerExtras(){
 if(pedido)return Promise.resolve();
 pedido=true;
 return Promise.all([
  fetch('notas.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
  fetch('pois.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
 ]).then(([n,p])=>{
  if(n)NOTAS=n;
  // pois.json viene como objeto indexado por "lat,lng", no como lista
  if(p)POIS=Array.isArray(p)?p:Object.values(p);
  draw();        // se redibuja para que los botones cuenten lo de notas.json
  // El primer panel se abre antes de que llegue el fetch, así que sale sin
  // distancias. Si quedó abierto, se vuelve a pintar ya con los datos.
  if(abierta)abrirNota(abierta);
 });
}
"""
