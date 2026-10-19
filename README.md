# hiessy.github.io

Sitio estático publicado con GitHub Pages en <https://hiessy.github.io>.

La raíz es una **página personal** ([`index.html`](index.html)): bilingüe, con un
juego al final y una lista de logros que son todos mentira a propósito. No tiene
nada que ver con lo de abajo y no se genera con ningún script.

La **búsqueda de casa** vive en [`casas/`](casas/), o sea
<https://hiessy.github.io/casas/>. GitHub Pages no da subdominios sobre
`github.io` —para `casas.hiessy.github.io` haría falta un dominio propio—, así
que es una subcarpeta.

## Contenido de `casas/`

La portada ([`casas/index.html`](casas/index.html)) presenta las tres búsquedas y
enlaza a cada una; es corta y no lleva dataset adentro, así entrar no significa
bajar un mega de avisos. Después hay una pestaña por búsqueda. Los números de
abajo son de un relevamiento viejo y cambian en cada barrido: los que valen son
los de la portada, que se recalculan solos.

### 1. CABA norte — [`caba-norte.html`](caba-norte.html)

**1.292** PH y casas de 3 ambientes o más hasta USD 260.000, en los doce barrios de
la franja **Edenor**: Villa Urquiza, Villa Pueyrredón, Palermo, Saavedra, Parque Chas,
Colegiales, Belgrano, Villa Ortúzar, Chacarita, Agronomía, Núñez y Coghlan. De Zonaprop
(1.164) y Argenprop (128); 1.252 con pin.

### 2. Zona norte con patio — [`gba-norte.html`](gba-norte.html)

**1.392** casas y PH hasta USD 260.000 en Olivos, San Miguel, Martínez, Bella Vista
y La Lucila, de Zonaprop y Argenprop. Acá
lo que manda es el **terreno libre** —superficie total menos cubierta, o sea el patio—
y el filtro arranca en 100 m²:

| Terreno libre | Avisos |
| --- | --- |
| 100 m²+ | 384 |
| 150 m²+ | 237 |
| 200 m²+ | 151 |

Se mide con los metros del aviso y no con la palabra "jardín": 167 avisos con más de
100 m² libres nunca la usan, y 279 que la usan tienen menos de 100.

**Los avisos de Argenprop no declaran lote** en estas localidades (solo superficie
cubierta), así que no pasan el filtro de terreno: se ven poniendo "Sin mínimo", y el
contador dice cuántos quedaron afuera por eso —293 en total, contando los de Zonaprop
que tampoco lo declaran—. Pin sí tienen: se geocodifica la dirección.

### 3. Sierras de Córdoba — [`sierras.html`](sierras.html)

**2.212 casas** —acá no hay PH— de 3 ambientes o más hasta USD 260.000, en los valles
de **Punilla** (1.735) y **Calamuchita** (477), repartidas en 35 pueblos. Sin la ciudad
de Córdoba y sin las Sierras Chicas. 1.861 con pin.

Los pueblos con más avisos son Villa Carlos Paz (367), Santa Rosa de Calamuchita (150),
La Falda (131), Santa María de Punilla (119) y Villa Parque Síquiman (119). El filtro
grande de esta página es el **valle**, y el de terreno usa umbrales de sierra:

| Terreno libre | Avisos |
| --- | --- |
| 300 m²+ | 1.475 |
| 600 m²+ | 873 |
| 1.000 m²+ | 404 |

Al contrario de la zona norte, acá el lote casi siempre está declarado: solo 195 avisos
no lo traen. **Villa Carlos Paz es el único pueblo recortado**, porque Zonaprop corta la
paginación anónima en 270 avisos por consulta; se completó pidiendo la lista al revés y
sumando el barrio Villa del Lago, que tiene búsqueda propia.

Las páginas 2 y 3 **se generan desde la primera** (`tools/make_gba.py` y
`tools/make_sierras.py`), así las tres comparten CSS y JS y no se van separando. Si se
toca `caba-norte.html`, correr los dos generadores de nuevo.

La portada va aparte (`tools/make_inicio.py`): no copia nada de las otras, pero **les
cuenta los avisos** para no tener números escritos a mano que envejecen.

**Los avisos vendidos o reservados se descartan** en las tres. Siguen publicados con un
cartel al principio del título (`*RESERVADO*`, `Reservado!!`, `- Vendido -`), y se
reconocen por la puntuación y no por la palabra: "todos los derechos reservados" y "un
entorno más reservado y silencioso" no son eso. Ver [tools/README.md](tools/README.md).

Las marcadas **★ pick** son las elegidas a mano; el resto sale del relevamiento
automático y la nota resume el texto del aviso.

Notas sobre los datos: `m² cub` son metros cubiertos y `m² lote` la superficie total.
Precios en dólares, como se publican en Argentina, y cambian rápido.

El resto del país (Tigre, Córdoba, San Martín de los Andes) y el centro, sur y oeste
de CABA se siguen relevando pero no se publican: están en `.work/` y vuelven con
`ONLY = None` en `build2.py`.

## Estructura

- `index.html` — página personal. **Sólo estructura**: ni un texto visible, ni
  estilos, ni lógica adentro.
  - `css/portada.css` — los estilos.
  - `js/i18n.js` — carga `i18n/<idioma>.json` y lo aplica a todo lo que tenga
    `data-i18n`. Los botones de idioma salen de su lista `IDIOMAS`.
  - `js/janitor-joe.js` — el juego del final.
  - `i18n/es.json`, `i18n/en.json` — **todos** los textos visibles, incluidos
    el `<title>`, la descripción y los `aria-label`.

  Sumar un idioma es un JSON nuevo y una línea en `IDIOMAS`; el HTML no se
  toca. Antes cada elemento llevaba los dos idiomas encima (`data-es`,
  `data-en`), que anda con dos y se cae con tres. Hay un control:

  ```bash
  python .claude/skills/i18n/revisar.py
  ```

  Compara las claves que pide el sitio contra las que define cada idioma y
  marca las que faltan, las que están en un idioma y no en otro y las que no
  usa nadie. Sale con 1 si falta algo. La guía está en
  [`.claude/skills/i18n/SKILL.md`](.claude/skills/i18n/SKILL.md).
- `casas/index.html` — portada de la búsqueda: las tres con sus números y un
  enlace a cada una. 8 KB, sin dataset. La genera `tools/make_inicio.py`.
- `casas/caba-norte.html` / `casas/gba-norte.html` / `casas/sierras.html` — páginas completas: markup, CSS
  y JS embebidos,
  sin dependencias ni build. Filtros por barrio o localidad, dormitorios (2 / 3 / 4+),
  jardín, superficie y fuente; la de CABA suma "solo picks" y la de zona norte, el
  terreno libre.
- **Pines de Argenprop por geocodificación**: el portal no publica coordenadas en el
  listado, pero sí la dirección. `tools/geocode.py` la resuelve contra **Nominatim**
  (OpenStreetMap): gratis, sin API key y sin cuenta. 545 de 788 direcciones resueltas;
  los pines caen a 0–0,6 km de la mediana de Zonaprop del mismo barrio.
- **Rasgos del aviso al pasar el mouse**: sobre la foto aparecen terraza, balcón,
  patio, jardín, cochera y pileta. **Lleno = lo menciona el aviso; punteado = no lo
  menciona, que no es lo mismo que no tenerlo.** Se detectan en el texto publicado, y
  la mitad de las descripciones vienen cortadas por el propio portal, así que la
  ausencia no prueba nada. En celular se muestran siempre, porque no hay hover.
- **Dormitorios con multiselección**: los botones se acumulan (2 + 4+ muestra las dos
  cosas), "Todos" limpia. Cada contador sigue mostrando su propio grupo, así que se ve
  cuánto suma cada uno antes de tildarlo.
- **Exterior**: Terraza, Balcón y Jardín, también multiselección. Tildar varios muestra
  los avisos que tienen **alguna** de las tres, no las tres juntas — la intersección da
  12 avisos en CABA y 27 en zona norte, así que como filtro no serviría. Sale de los
  mismos rasgos del texto que las chapitas de la ficha, con la misma advertencia: que
  no lo mencione no prueba que no lo tenga.
- **Slider de precio** de dos manijas, en su propia fila. Los topes salen de los datos
  de cada página (73.000–260.000 en CABA, 28.000–260.000 en zona norte), así que no hay
  números hardcodeados. Si se cruzan las manijas, la menor manda como piso. Se combinan entre sí y los contadores
  de cada botón se recalculan según lo que esté seleccionado. Las fichas se pintan
  de a 120 con un botón "Ver más".
  Responsive: hasta 1000 px las filas de filtros se deslizan de costado en lugar
  de apilarse, así la barra pegada arriba no se come la pantalla; una columna
  abajo de 430 px.
- **Mapa** fijo a la izquierda (queda quieto mientras el listado scrollea) y las
  fichas en una sola columna a la derecha. Abajo de 1000 px se apilan.
  Muestra un pin por aviso sobre el resultado filtrado completo, no solo las 120
  fichas pintadas. Pasar el mouse por una ficha agranda su pin y al revés también.
- **Selector por ficha**: el ✓ sobre la foto marca avisos y el mapa pasa a mostrar
  solo los marcados; sin nada marcado muestra todo. "Limpiar selección" vuelve atrás.
  El ✓ se ve apagado en los avisos sin coordenadas, que no pueden tener pin.
- **Clic en la ficha** (en cualquier lado menos la foto, que abre el aviso, y el ✓)
  centra el mapa en esa propiedad y abre su globo. En pantallas apiladas además
  scrollea hasta el mapa.
- Leaflet desde CDN y tiles de CARTO/OpenStreetMap son lo único que la página pide
  afuera, y no consumen ninguna cuota: son tiles públicos que baja el navegador.
- `tools/` — scripts del relevamiento y la caché. Ver [tools/README.md](tools/README.md).

## Desarrollo

Todo el relevamiento y la reconstrucción de las tres páginas se corre con un solo
comando:

```bash
python tools/run_all.py          # todo
python tools/run_all.py --pages  # solo rearmar las páginas, sin tocar la red
```

Cada etapa tiene timeout, así que ninguna cuelga la corrida, y al final dice qué
falló y cómo reintentarlo. Detalles en [tools/README.md](tools/README.md).

La página en sí no tiene build ni dependencias. Alcanza con abrir el archivo en el navegador:

Las páginas de `casas/` se abren directo con doble clic. **La portada no**: sus
textos se piden con `fetch` y el navegador no lo permite sobre `file://`, así
que necesita servirse por HTTP. Si no, la propia página lo avisa arriba de todo.

```bash
python -m http.server 8123      # después, http://localhost:8123
start casas\index.html          # la búsqueda de casa sí abre sola
```

Cualquier cambio se publica al hacer push a `main`.
