// MercadoLibre en la sierra, desde el panel del navegador.
//
// Pegar en la consola de una página de inmuebles.mercadolibre.com.ar (los pedidos
// van al mismo dominio, con las cookies del navegador). Lo que junta queda en
// `window.__ml`; para bajarlo a disco ver "Del navegador al disco" en README.md.
// Después: `python tools/ml_sierras.py`.
//
// Ojo con tres cosas que ya costaron:
//  - Los m² se leen con miles y coma decimal. `(\d+)\s*m²` en "1.200 m² totales"
//    agarraba 200.
//  - Pasado el final MercadoLibre puede repetir la última página: se corta
//    cuando una página trae los mismos ids que la anterior.
//  - Vivo es 200 y la URL final sin `account-verification`.

window.__ml = {}; window.__log = []; window.__fin = false; window.__ok = {};

window.__num = function (at, re) {
  const m = re.exec(at);
  if (!m) return 0;
  return parseInt(m[1].replace(/\./g, '').split(',')[0], 10) || 0;
};

window.__sacar = function (doc, valle) {
  return [...doc.querySelectorAll('li.ui-search-layout__item')].map(function (a) {
    const link = a.querySelector('a[href*="MLA-"]'); const href = link ? link.href : '';
    const mid = /MLA-?(\d+)/.exec(href);
    const img = a.querySelector('img');
    const foto = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';
    const mf = /D_NQ_NP_(?:2X_)?([A-Za-z0-9_-]+?)(?:-[VFO])?\.(?:webp|jpg)/.exec(foto);
    const sim = (a.querySelector('.andes-money-amount__currency-symbol') || {}).textContent || '';
    const num = ((a.querySelector('.andes-money-amount__fraction') || {}).textContent || '').replace(/\./g, '');
    const at = [...a.querySelectorAll('.poly-attributes_list__item')].map(e => e.textContent).join(' · ');
    const n = re => window.__num(at, re);
    return {
      id: mid ? mid[1] : '',
      u: href.split('?')[0].split('#')[0].split('/').pop().replace(/_JM.*$/, ''),
      img: mf ? mf[1] : '',
      // solo dólares: un precio en pesos queda en 0 y el conversor lo descarta
      p: sim.indexOf('US') >= 0 ? (parseInt(num, 10) || 0) : 0,
      valle: valle,
      t: ((a.querySelector('.poly-component__title') || {}).textContent || '').trim(),
      loc: ((a.querySelector('.poly-component__location') || {}).textContent || '').trim(),
      amb: n(/([\d.,]+)\s*ambs?\./), dorm: n(/([\d.,]+)\s*dormitorios?/),
      ban: n(/([\d.,]+)\s*baños?/), cub: n(/([\d.,]+)\s*m².{0,3}cubiert/), tot: n(/([\d.,]+)\s*m².{0,3}tot/)
    };
  });
};

window.__partido = async function (slug, valle, tope) {
  let anterior = null;
  const base = `/casas/venta/mas-de-3-dormitorios/cordoba/${slug}/_PriceRange_0USD-260000USD_HAS*GARDEN_242085_NoIndex_True`;
  for (let d = 0; d < tope; d += 48) {
    const u = d ? base.replace('/_PriceRange', '/_Desde_' + (d + 1) + '_PriceRange') : base;
    let r, txt;
    try { r = await fetch(u, { credentials: 'include' }); txt = await r.text(); }
    catch (e) { window.__log.push([slug, d, 'ERR']); return false; }
    if (r.status !== 200 || /account-verification/.test(r.url)) { window.__log.push([slug, d, 'HTTP ' + r.status]); return false; }
    const doc = new DOMParser().parseFromString(txt, 'text/html');
    const fs = window.__sacar(doc, valle).filter(x => x.id);
    if (!fs.length) { window.__log.push([slug, d, 'fin']); return true; }
    const ids = fs.map(x => x.id).join(',');
    if (ids === anterior) { window.__log.push([slug, d, 'repite']); return true; }
    anterior = ids;
    for (const x of fs) if (!window.__ml[x.id]) window.__ml[x.id] = x;
    window.__log.push([slug, d, fs.length]);
    await new Promise(x => setTimeout(x, 1300));
  }
  return true;
};

(async () => {
  window.__ok.punilla = await window.__partido('punilla', 'Punilla', 2000);
  window.__ok.calamuchita = await window.__partido('calamuchita', 'Calamuchita', 2000);
  window.__fin = true;
})();
