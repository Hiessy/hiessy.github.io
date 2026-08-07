# tools — relevamiento de Zonaprop

Scripts que arman el dataset de `index.html`. No corren en el sitio: se ejecutan
a mano y el resultado se pega en el array `const D=[...]` de `index.html`.

Requieren solo la stdlib de Python 3.11 (sin dependencias).

## Estado al 6 de agosto de 2026

El filtro por **dormitorios** ya está publicado (commit `f86da45`). Lo que quedó
a medio camino es el dataset ampliado a **3+ ambientes** y el cambio del filtro
de dormitorios a ambientes.

Relevado y guardado en `.work/scraped.json` (fuera de git, 2 MB): **2.863 avisos**
de casas y PH hasta USD 200.000, 3+ ambientes, en las seis zonas.

| Zona | Avisos | Rango |
| --- | --- | --- |
| CABA (16 barrios norte/oeste) | 1.298 | 67.900 – 200.000 |
| Tigre (+ sublocalidades) | 856 | 30.000 – 200.000 |
| San Miguel · Bella Vista | 389 | 28.000 – 200.000 |
| Santa Rosa de Calamuchita | 140 | 32.000 – 200.000 |
| San Martín de los Andes | 111 | 45.000 – 200.000 |
| La Cumbre | 69 | 50.000 – 200.000 |

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

## Lo que falta

- Correr `fetch_amb2.py` y re-correr `build2.py` con `amb_lookup2.json`.
- Marcar como desconocido (`0`) los `ambientes` implausibles — hay ~11 avisos con
  `amb < dorm` o valores absurdos (uno dice 40 ambientes). Son errores de carga
  del publicador, no del parseo: la fuente misma trae el dato mal.
- Reemplazar el array `D` de `index.html` y pasar el filtro de dormitorios a
  ambientes (3 / 4 / 5 / 6+).
- Render incremental ("Ver más"): con ~970 fichas conviene no pintar todo de una.
- Actualizar los textos: el header dice 192 propiedades, y `REG[3]` dice
  "CABA Norte" cuando ahora incluye barrios del oeste.

## Nota sobre los datos

Las notas de los avisos nuevos se resumen automáticamente de la descripción
publicada; las de los 192 originales son editoriales, igual que las ★ picks.
El filtro de bloqueo saca nombres y matrículas de corredores del texto.
