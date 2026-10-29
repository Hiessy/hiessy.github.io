// Argenprop en la sierra, por partido, desde el panel del navegador.
//
// Pegar en la consola de una página de www.argenprop.com. Junta dos cosas:
//  - `window.__lotes`: las tarjetas, para `python tools/ap_browser.py`
//    (mismo `parse()` que urllib: no se reescribe la extracción acá);
//  - `window.__v`: los ids vistos y `completo`, para `python tools/ap_vivos.py`.
// Para bajarlo a disco ver "Del navegador al disco" en README.md.
//
// **Hasta dónde llega.** El 29/10 entraron 22 páginas seguidas a 3,5 s; la 23
// dio 405 y la siguiente visita, "Human Verification". Ahí se para: no se
// resuelven captchas ni se cambia nada para pasar. Sin barrido entero
// `ap_vivos.py` no da de baja nada, y está bien que así sea.

window.__flaco = function (a) {
  const at = ['idmoneda', 'montooperacion', 'ambientes', 'dormitorios']
    .map(n => `${n}="${(a.getAttribute(n) || '').replace(/"/g, '')}"`).join(' ');
  const q = s => { const e = a.querySelector(s); return e ? e.innerHTML.replace(/\s+/g, ' ').trim() : ''; };
  const i = a.querySelector('img');
  // carga diferida: salvo las dos primeras tarjetas, la foto está en data-src
  const foto = i ? (i.getAttribute('src') || i.getAttribute('data-src') || '') : '';
  const ok = /static-content/.test(foto) ? foto : '';
  return `<a href="${a.getAttribute('href')}" data-item-card="${a.getAttribute('data-item-card')}" ${at}>` +
    (ok ? `<img src="${ok}">` : '') +
    `<ul class="card__main-features">${q('.card__main-features')}</ul>` +
    `<p class="card__address">${q('.card__address')}</p>` +
    `<p class="card__title--primary">${q('.card__title--primary')}</p>` +
    `<p class="card__info ">${q('.card__info')}</p></a>`;
};

window.__lotes = [];
window.__v = { ids: [], paginas: [], completo: false, corte: null, totales: {} };
window.__fin = false;

window.__barrer = async function (clave, slug, desde, tope, pausa) {
  const v = window.__v; let anterior = null;
  for (let p = desde; p <= tope; p++) {
    let r, txt;
    try { r = await fetch(`/casas/venta/${slug}/dolares-hasta-260000?pagina-${p}`, { credentials: 'include' }); txt = await r.text(); }
    catch (e) { v.corte = clave + ' p' + p + ' ERR'; return false; }
    // Vivo es 200 y nada más. `r.ok` es true para el 202 vacío con que Argenprop
    // bloquea: así una vez se dio por entero un barrido de 100 avisos sobre 658.
    if (r.status !== 200 || txt.length < 2000) { v.corte = clave + ' p' + p + ' HTTP ' + r.status + ' cuerpo ' + txt.length; return false; }
    if (/confirm you are human|Human Verification/i.test(txt)) { v.corte = clave + ' p' + p + ' muro'; return false; }
    const doc = new DOMParser().parseFromString(txt, 'text/html');
    const cs = [...doc.querySelectorAll('a[data-item-card]')];
    const h1 = ((doc.querySelector('h1') || {}).textContent || '').trim();
    if (p === desde) v.totales[clave] = h1.slice(0, 70);
    // un final de verdad sigue teniendo el encabezado con el total
    if (!cs.length) {
      if (!h1) { v.corte = clave + ' p' + p + ' pagina vacia sin h1'; return false; }
      v.paginas.push([clave, p, 'fin']); return true;
    }
    const ids = cs.map(a => a.getAttribute('data-item-card'));
    // pasada la última página Argenprop repite la última en vez de dar vacío
    if (ids.join(',') === anterior) { v.paginas.push([clave, p, 'repite']); return true; }
    anterior = ids.join(',');
    v.ids.push(...ids);
    window.__lotes.push({ partido: clave, pagina: p, cards: cs.map(window.__flaco).join('\n') });
    v.paginas.push([clave, p, ids.length]);
    await new Promise(x => setTimeout(x, pausa));
  }
  v.corte = clave + ' llego al tope de ' + tope + ' sin ver el final'; return false;
};

// Para retomar un barrido cortado, empezar **dos páginas antes** del corte: si
// entre una tanda y otra se vendieron avisos, los de después del corte se corren
// para atrás, y sin esa superposición quedarían sin ver en las dos tandas.
window.__desde = window.__desde || { punilla: 1, calamuchita: 1 };

(async () => {
  const a = await window.__barrer('punilla', 'partido-de-punilla', window.__desde.punilla, 60, 5000);
  const b = a ? await window.__barrer('calamuchita', 'partido-de-calamuchita', window.__desde.calamuchita, 30, 5000) : false;
  window.__v.completo = a && b;
  window.__fin = true;
})();
