# tools — relevamiento de Zonaprop

Scripts que arman el dataset de `index.html`. No corren en el sitio: se ejecutan
a mano y el resultado se pega en el array `const D=[...]` de `index.html`.

Requieren solo la stdlib de Python 3.11 (sin dependencias).

## Estado

Techo de precio: **USD 260.000** (`MAXP` en `scrape.py` y `argenprop.py`).

La página publica **solo CABA zona norte (área de Edenor)**: 1.258 de los ~5.900
avisos relevados. El recorte es `ONLY` en `build2.py`; poniéndolo en `None` vuelve
a salir todo. Lo demás se sigue relevando y queda en `.work/` — no se borró nada,
solo dejó de entrar al HTML, que pasó de 1,8 MB a 0,42 MB.

Los barrios de la franja Edenor están en `EDENOR_CABA` (y `BARRIO_LABEL`, que además
agrupa "Palermo Soho" o "Belgrano R" con su barrio padre para que el filtro tenga
doce botones y no veinte).

## La segunda página

`gba-norte.html` (Bella Vista, San Miguel, Olivos, La Lucila, Martínez) no es un
archivo a mano: se genera desde `index.html`, así las dos comparten CSS y JS.

```bash
python tools/gba_norte.py --max 260000   # relevar
python tools/build_gba.py                # armar .work/DG.js
python tools/make_gba.py                 # escribir gba-norte.html
```

Ojo con los slugs: `bella-vista` es Bella Vista de **Corrientes** y `la-lucila`, La
Lucila de **Santa Fe**. Los del conurbano son `bella-vista-san-miguel` y
`la-lucila-vicente-lopez`. Y agregarle `-gba-norte` a un slug que no existe no falla:
devuelve la provincia entera, 37.000 avisos. Por eso cada aviso se valida contra el
partido esperado.

El umbral de outliers de coordenadas se pasa por parámetro: 60 km sirve para los
barrios de CABA, pero estas localidades miden ~6 km y con ese número se colaba un
aviso a 35 km que estiraba el mapa. Ahí va `km=8`.

### Argenprop en CABA, barrio por barrio (`caba_ap.py`)

El barrido viejo pedía `capital-federal` en una sola consulta y Argenprop corta a las
pocas páginas: de toda la ciudad entraban ~100 avisos y, después del recorte a la
franja Edenor, quedaban **17**. Pidiendo barrio por barrio cada uno tiene su cupo:
383 relevados, **256 publicados**.

Quedó `parque-chas` en 0 y `palermo` en 4 — bloqueos. No están sellados, así que
volver a correrlo los reintenta.

Los **monoambientes** se colaban: el slug escribe `-1-ambiente-` en **singular** y el
regex pedía `-ambientes` en plural, así que quedaban con "ambientes desconocidos" y
pasaban el filtro de 3+. Arreglado con `-(\d+)-ambientes?-`, y los JSON ya bajados se
repararon releyendo la URL. Son ~24 en CABA (ej. "Ceretti 3100, 26 m², 1 ambiente").

### Argenprop en la zona norte (`gba_ap.py`)

154 avisos, y con una limitación que conviene tener presente: **en estas localidades
las tarjetas de Argenprop no declaran superficie total**, solo cubierta (0 de 40 en la
muestra). Las fichas individuales sí la traen, pero están bloqueadas. Sin lote no pasan
el filtro de terreno libre — se los deja entrar igual, marcados, y el contador de la
página dice cuántos quedaron afuera por eso.

Mismo cuidado con los slugs: `bella-vista` es la de Corrientes y
`bella-vista-buenos-aires` devuelve 91.000 avisos de todo el país. La buena es
`bella-vista-san-miguel`. Cada aviso se valida contra el partido en el título.

## Refrescar avisos vencidos

`scrape.py` solo agrega: un aviso dado de baja queda para siempre en la caché.
Para sacarlos hay que borrar las filas de esos slugs y volver a pedirlos:

```bash
python tools/refresh.py --edenor    # los 12 barrios de CABA que son Edenor
python tools/scrape.py --only belgrano,saavedra,coghlan,colegiales,nunez
```

**Siempre pasar `--only` con los mismos slugs que se purgaron.** `refresh.py`
limpia unos pocos, pero `scrape.py` sin `--only` recorre igual sus 34 jobs: las 29
comunas de CABA más Tigre, San Miguel, Córdoba y Patagonia. Refrescar 12 barrios
así tardó 172 minutos, casi todos gastados en zonas que ni siquiera se publican.
Con `--only` los mismos 5 barrios se relevaron en 30 segundos. `caba_ap.py` y
`gba_ap.py` aceptan el mismo flag.

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

## Otras fuentes

- **Argenprop** (`argenprop.py`): anda, pero rinde poco. No expone JSON; los datos
  duros vienen en atributos del `<a>` de cada ficha. Detrás de CloudFront devuelve
  **202 con cuerpo vacío** —ni captcha ni error, un bloqueo mudo— después de una
  docena de pedidos, y con 7–11 s entre pedidos igual corta. Dos cosas lo vuelven
  utilizable: un slug solo se sella en la caché si trajo avisos, y cada corrida
  arranca por la zona con menos avisos. Sin eso las últimas zonas de la lista
  nunca llegaban a relevarse — Tigre quedó en cero tres corridas seguidas.
  **No correr dos instancias a la vez**: las dos escriben el mismo archivo y se
  pisan (una corrida dejó Calamuchita en 0 después de haber juntado 34).
- La tarjeta de Argenprop muestra **solo 3 features y rota cuáles**: a veces
  (m², dorm, antigüedad), a veces (m², dorm, baños). Por eso los baños aparecen en
  ~1 de cada 4 avisos: no es que el portal no los tenga —la ficha individual los
  trae— es que el listado no siempre los muestra. Los **ambientes** casi nunca
  están en la tarjeta pero sí en el slug de la URL (`-3-ambientes-`), de donde se
  leen.
- `ap_baths.py` pide la ficha individual para completar los baños que faltan
  (`<li title="Baños">`), y funciona — pero Argenprop **bloquea las fichas mucho
  más duro que los listados**: deja pasar ~5 y después corta desde el primer
  pedido, incluso con 26 s de espera entre uno y otro. No es cuestión de ritmo,
  es un bloqueo sostenido. Está hecho para correr de a tandas: cachea en
  `.work/ap_detail.json`, saltea lo resuelto y corta solo tras 6 bloqueos
  seguidos, así que correrlo cada tanto va completando.

```bash
python tools/ap_baths.py --limit 40 --delay 20
```
- La superficie viene con **coma decimal** (`113,50 m² cubie.`). Un `(\d+)` toma
  los decimales y no el número: daba 50 en vez de 113. Hay que cortar por la coma.
- `ap_merge.py` combina el relevamiento nuevo con el anterior por id (gana el
  nuevo) y repara lo que puede sin volver a pedir: ambientes desde la URL, y deja
  en 0 la superficie absurda para la cantidad de dormitorios.

- **Mercado Libre** (`meli.py`): el scraping redirige a `gz/account-verification`
  (su frontend de "suspicious traffic"), así que la única vía es la API con OAuth.
  `meli.py` implementa el flujo completo —authorization code, refresh automático,
  credenciales en `.work/meli_secrets.json` (fuera de git)— y un `--probe` que dice
  qué endpoints contesta el token.

  **Pero probablemente no alcance.** Sin token hay dos 403 distintos, y la diferencia
  importa:

  | Endpoint | Respuesta sin token |
  | --- | --- |
  | `/categories/MLA1459` | 200, abierto |
  | `/sites/MLA`, `/items/{id}` | 403 `PolicyAgent: UNAUTHORIZED` — falta token |
  | `/sites/MLA/search` | 403 `{"message":"forbidden"}` — bloqueo de política |

  Los que solo piden auth lo dicen con `PolicyAgent`. La búsqueda contesta un
  "forbidden" pelado, que es lo que reportan otros proyectos desde que Mercado Libre
  cerró la búsqueda general a terceros.

  **DESCARTADO — no hace falta seguir probando.** El formulario de alta de la app
  (agosto 2026) lo deja claro: los permisos que se pueden pedir son todos de
  **vendedor sobre su propia cuenta** — Usuarios ("consultar y actualizar la cuenta
  registrada"), Publicación y sincronización ("las publicaciones de la tienda"),
  Publicidad, Facturación, Métricas, Promociones, Ventas y envíos. Los "Tópicos"
  (Orders, Items, Prices, Catalog…) son avisos webhook sobre *tus* publicaciones.
  **No existe un permiso de lectura del marketplace ajeno.** No es que falte
  configurar algo: la API es de integración para vendedores, no de consulta pública.
  Ni siquiera aparecen los scopes `read` / `offline_access` que documentaba la versión
  vieja.

  `meli.py` queda en el repo por si algún día reabren la búsqueda: tiene el flujo
  OAuth entero y `--probe` para confirmarlo en una llamada.

## Geocodificar direcciones (`geocode.py`)

Argenprop no publica coordenadas en el listado (sí en la ficha, que está bloqueada),
pero sí la dirección. Se resuelve contra **Nominatim** (OpenStreetMap): gratis, sin
API key y sin cuenta, a cambio de **1 pedido por segundo** y un User-Agent que
identifique la app. Google Geocoding haría lo mismo pero pide key y facturación.

```bash
python tools/geocode.py
```

La caché (`.work/geocode.json`) es **permanente**: una dirección no cambia de lugar,
así que se pide una sola vez. 545 de 788 resueltas; los pines caen a 0–0,6 km de la
mediana de Zonaprop del mismo barrio, o sea que la calle y la altura pegan.

Dos cosas que hay que hacerle a la dirección antes de preguntar:

- `"Cabildo al 3000, Piso PB"` → `"Cabildo 3000"`. Nominatim no entiende el "al" de
  altura aproximada, ni los sufijos de piso o entrecalles.
- Las abreviaturas de calle no resuelven: `"Int. Arricau"` no, `"Intendente Arricau"`
  sí. La expansión se hace **palabra por palabra y no con regex** — un `` mal
  escapado se guarda como un backspace literal (0x08) y el patrón deja de matchear
  sin avisar. Ya pasó una vez.

Cada respuesta se valida contra la caja de su zona: si la dirección cae en otra
ciudad, se descarta en vez de poner un pin en cualquier lado.

## Rasgos del aviso (terraza, patio, cochera…)

Salen de buscar palabras en la descripción (`FEATS` en `build2.py`), porque el listado
de Zonaprop **no trae amenities**: `generalFeatures` viene vacío y `mainFeatures` solo
tiene superficie y ambientes.

Por eso la descripción se guarda hasta **1.600 caracteres y no 400**. Con 400, el 95%
quedaba cortada y "no menciona terraza" solo significaba "la cortamos antes": subir el
tope llevó la detección de terraza del 39% al 64% y la de balcón del 14% al 26%. Aun
así ~50% sigue tocando el tope, así que **la ausencia de una palabra no prueba nada** y
la página lo dice con todas las letras.

> Cuidado con los `` en estos regex. Escribirlos desde un heredoc de shell los
> convierte en un **backspace literal (0x08)** y el patrón deja de matchear sin avisar
> — pasó tres veces en este proyecto. Editar el archivo directamente, o construir la
> barra con `chr(92)`.

## Avisos repetidos (`dedupe.py`)

El mismo inmueble aparece dos veces por dos motivos distintos: se publica en
Zonaprop **y** en Argenprop, y además la misma inmobiliaria lo repite dentro de un
mismo portal con otro `postingId` y otra foto. Ningún barrido puede ver al otro,
así que la única pasada que los ve juntos corre al final de `build2.py` y
`build_gba.py`, sobre las filas ya fusionadas.

Se agrupa por **precio + dirección normalizada**: sin acentos, cortando en
`, Piso/PB/UF/Depto`, cortando en `entre`, y sacando el "al" de `Quesada al 3500`.
El `dedupe_key` anterior — precio, dormitorios y `addr[:14]` en crudo — dejaba
pasar **192 repetidos en CABA y 216 en zona norte**, porque truncaba a 14
caracteres sin normalizar nada: `Quesada al 350` y `Quesada 3548` no se parecían.

Dos salvaguardas contra borrar propiedades reales:

- Direcciones de menos de 6 caracteres útiles (`Belgrano`, `s/d`) **no** agrupan.
- Si dos filas del mismo grupo declaran superficies que difieren en más de 40 m²,
  se quedan las dos: son dos unidades del mismo edificio al mismo precio, no un
  repetido. Sobre los datos actuales esto rescató 1 de 161 grupos.

La fila perdedora no se descarta entera: primero le cede a la ganadora lo que a
esta le falta — coordenadas, m², terreno, ambientes, dormitorios — y los rasgos se
unen. Un aviso de Argenprop sin geocodificar se queda con las coordenadas que
Zonaprop sí publica, y cada portal recorta la descripción en distinto lugar, así
que la unión de rasgos detecta más que cualquiera de los dos por separado.

## Detalles que cuestan caro re-descubrir

- El **slider de precio** va en una fila propia (`.row3`) que **no** se desliza de
  costado. Las otras filas de filtros sí lo hacen en pantallas chicas, y adentro de un
  contenedor con `overflow-x:auto` arrastrar el thumb en touch es imposible: el gesto
  se lo lleva el scroll. Son dos `<input type="range">` superpuestos con
  `pointer-events:none` en el input y `auto` en el thumb — sin eso, el de arriba tapa
  al de abajo y solo se puede mover uno.

- **Coordenadas mal geocodificadas**: algunos avisos se ubican por el *nombre* de
  la calle y no por la dirección. "MEXICO al 3200" cae en México, "Suiza 1237" en
  Suiza, "AV. RIVADAVIA 8686" (Floresta) en Rivadavia, Chubut, y "LA PAMPA 5100"
  (Parque Chas) en La Pampa; uno trae `lat == lng`. Con 5 de esos el mapa arrancaba
  en zoom 1 sobre el Atlántico. `build2.py` filtra dos veces: caja de Argentina y
  después distancia a la **mediana de la zona** (`OUTLIER_KM`, 60 km) — la mediana
  no se corre por unos pocos outliers. Descarta 14 coordenadas; esos avisos quedan
  sin pin, no se les inventa una ubicación.
- **Coordenadas**: vienen en el listado de Zonaprop
  (`postingLocation.postingGeolocation.geolocation`), en prácticamente todos los
  avisos. Argenprop no las publica en el listado, así que sus avisos no tienen pin.
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
