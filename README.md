# hiessy.github.io

Sitio estático publicado con GitHub Pages en <https://hiessy.github.io>.

## Contenido

Dos búsquedas, una pestaña cada una:

### 1. CABA norte — [`index.html`](index.html)

**1.579** PH y casas de 3 ambientes o más hasta USD 260.000, en los doce barrios de
la franja **Edenor**: Villa Urquiza, Villa Pueyrredón, Palermo, Saavedra, Parque Chas,
Colegiales, Belgrano, Villa Ortúzar, Chacarita, Agronomía, Núñez y Coghlan. De Zonaprop
(1.268) y Argenprop (311).

### 2. Zona norte con patio — [`gba-norte.html`](gba-norte.html)

**1.591** casas y PH hasta USD 260.000 en Olivos (507), Martínez (344), Bella Vista
(338), San Miguel (327) y La Lucila (41), de Zonaprop (1.401) y Argenprop (190). Acá
lo que manda es el **terreno libre** —superficie total menos cubierta, o sea el patio—
y el filtro arranca en 100 m²:

| Terreno libre | Avisos |
| --- | --- |
| 100 m²+ | 399 |
| 150 m²+ | 247 |
| 200 m²+ | 157 |

Se mide con los metros del aviso y no con la palabra "jardín": 193 avisos con más de
100 m² libres nunca la usan, y 315 que la usan tienen menos de 100.

**Los 150 avisos de Argenprop no declaran lote** en estas localidades (solo superficie
cubierta), así que no pasan el filtro de terreno: se ven poniendo "Sin mínimo", y el
contador dice cuántos quedaron afuera por eso —350 en total, contando los de Zonaprop que
tampoco lo declaran. Pin sí tienen: 130 de 150, geocodificando la dirección.

La segunda página **se genera desde la primera** (`tools/make_gba.py`), así comparten
CSS y JS y no se van separando. Si se toca `index.html`, correr el generador de nuevo.


Las marcadas **★ pick** son las elegidas a mano; el resto sale del relevamiento
automático y la nota resume el texto del aviso.

Notas sobre los datos: `m² cub` son metros cubiertos y `m² lote` la superficie total.
Precios en dólares, como se publican en Argentina, y cambian rápido.

El resto del país (Tigre, Córdoba, San Martín de los Andes) y el centro, sur y oeste
de CABA se siguen relevando pero no se publican: están en `.work/` y vuelven con
`ONLY = None` en `build2.py`.

## Estructura

- `index.html` / `gba-norte.html` — páginas completas: markup, CSS y JS embebidos,
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

No hay build ni dependencias. Alcanza con abrir el archivo en el navegador:

```bash
start index.html
```

Cualquier cambio se publica al hacer push a `main`.
