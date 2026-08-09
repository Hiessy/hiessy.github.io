# tools — relevamiento de Zonaprop

Scripts que arman el dataset de `index.html`. No corren en el sitio: se ejecutan
a mano y el resultado se pega en el array `const D=[...]` de `index.html`.

Requieren solo la stdlib de Python 3.11 (sin dependencias).

## Estado

Relevado y cacheado en `.work/scraped.json` (fuera de git): **4.537 avisos** de
casas y PH hasta USD 200.000, 3+ ambientes. La página publica 1.297 de ellos.

| Zona | Relevados | Publicados |
| --- | --- | --- |
| CABA (29 barrios) | 2.975 | 483 |
| Tigre (+ sublocalidades) | 849 | 265 |
| San Miguel · Bella Vista | 390 | 208 |
| Santa Rosa de Calamuchita | 141 | 149 |
| San Martín de los Andes | 111 | 113 |
| La Cumbre | 71 | 79 |

El recorte por zona lo define `CAP` en `build2.py`: entran **todos** los avisos de
4+ dormitorios (hasta el 60% del cupo) y el resto se samplea parejo por precio,
así no se pierden los grandes, que son los escasos. Los publicados por zona pueden
superar a los relevados porque incluyen los 192 originales.

## Caché

`.work/scraped.json` es la caché: guarda los avisos **y** un `_fetched` con el
timestamp del último barrido de cada slug. Correr los scripts de nuevo saltea todo
slug relevado hace menos de `MAX_AGE_H` (24 h) en vez de volver a pedirlo:

```bash
python tools/scrape.py
```

Para forzar el re-relevamiento igual:

```bash
python tools/scrape.py --force
```

## Pipeline

1. `scrape.py` — barrido principal. Ordena por precio ascendente y pagina hasta
   cruzar los USD 200.000. Lee el JSON de `window.__PRELOADED_STATE__`, no el HTML.
2. `scrape2.py` — Zonaprop corta la paginación anónima en **9 páginas (270 avisos)
   por consulta**. Tigre y San Miguel se topaban ahí (~USD 90.000), así que se
   re-relevan por sublocalidad. Cada aviso se valida contra la localidad padre
   esperada, porque un slug inválido cae a una búsqueda nacional en silencio.
3. `fetch_amb2.py` — **pendiente de correr.** Resuelve `ambientes` de los 62 avisos
   originales que el barrido no matcheó. Ojo: las fichas individuales no traen
   `__PRELOADED_STATE__`, y su `generalFeatures` tiene una categoría llamada
   literalmente "Ambientes" (Cocina, Comedor, Patio…) que no es el conteo. El dato
   real es `CFT1`. La primera versión (`fetch_amb.py`, descartada) usaba un regex
   de texto y devolvía números equivocados.
4. `build2.py` — mergea los 192 originales con el barrido, samplea por zona según
   `CAP` y escribe `.work/D.js`.

## Detalles que cuestan caro re-descubrir

- **Jardín** no viene como dato estructurado: en los resultados de listado
  `generalFeatures` llega vacío y `mainFeatures` solo trae superficie y ambientes.
  La bandera se deduce del texto completo del aviso, antes de truncarlo.
- **Ambientes** lo carga el publicador y a veces está mal (un aviso declara 40).
  Si es menor que los dormitorios o mayor a `AMB_MAX`, se marca desconocido en vez
  de inventar un valor. El filtro de la página es por dormitorios, que es confiable.
- En CABA no se muestra "jardín" en las notas, ni en las nuevas ni en las 192
  originales.
- **Distribuidora**: en CABA el límite Edenor/Edesur no sigue las comunas. La franja norte (Belgrano, Núñez, Saavedra, Coghlan, Villa Urquiza, Villa Pueyrredón,
  Colegiales, Chacarita, Villa Ortúzar, Palermo, Parque Chas, Agronomía) es Edenor;
  el centro, sur y **oeste** — Devoto, Villa del Parque, Monte Castro, La Paternal,
  Villa Crespo — es Edesur. El mapeo vive en `EDENOR_CABA` de `build2.py`. Las
  fuentes públicas se contradicen en el oeste; esto sigue el criterio confirmado
  por el dueño del sitio, no una fuente oficial del ENRE.

## Nota sobre los datos

Las notas de los avisos nuevos se resumen automáticamente de la descripción
publicada; las de los 192 originales son editoriales, igual que las ★ picks.
El filtro de bloqueo saca nombres y matrículas de corredores del texto.
