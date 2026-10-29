// ¿Siguen publicados estos avisos de MercadoLibre?
//
// Pegar en la consola de una ficha **viva** de casa.mercadolibre.com.ar: los
// pedidos tienen que salir del mismo dominio. Completar `RUTAS` con
// "/MLA-123-slug_JM". El resultado queda en `window.__ver` ({id: veredicto}).
//
// **MercadoLibre no contesta 404.** Una ficha dada de baja redirige a una
// búsqueda parecida en inmuebles.mercadolibre.com.ar (`#redirectedFromVip=...`),
// así que mirando solo el código de estado todo da 200 y todo parece vivo. Con
// `redirect: 'manual'` la redirección se ve como `opaqueredirect`. Un id
// inventado redirige igual que uno dado de baja.
//
// Hay un caso que también redirige y está vivo: al aviso le cambiaron el
// slug. Para eso se sigue el salto y se mira si cae en el mismo número.

const RUTAS = [];

window.__ver = {}; window.__verFin = false;
(async () => {
  for (const p of RUTAS) {
    const id = /MLA-(\d+)/.exec(p)[1];
    let v;
    try {
      const r = await fetch(p, { credentials: 'include', redirect: 'manual' });
      if (r.status === 200) v = 'vivo';
      else if (r.type === 'opaqueredirect') {
        // seguirlo: si cruza a otro subdominio el navegador lo corta por CORS,
        // y eso es la búsqueda a la que manda una ficha dada de baja
        try {
          const f = await fetch(p, { credentials: 'include' });
          v = (f.url.indexOf('MLA-' + id) >= 0 && f.status === 200) ? 'vivo-movido' : 'redirige';
        } catch (e) { v = 'redirige'; }
      } else v = 'HTTP ' + r.status;
    } catch (e) { v = 'ERR'; }
    window.__ver[id] = v;
    await new Promise(x => setTimeout(x, 1200));
  }
  window.__verFin = true;
})();
