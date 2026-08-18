# hiessy.github.io

Sitio estático publicado con GitHub Pages en <https://hiessy.github.io>.

## Contenido

**PH y casas en la zona norte de CABA con menos de USD 260.000** — una página única
([`index.html`](index.html)) con **1.258** avisos de 3 ambientes o más, relevados en
Zonaprop (1.241) y Argenprop (17), en los doce barrios de la franja **Edenor**:

| Barrio | Avisos | | Barrio | Avisos |
| --- | --- | --- | --- | --- |
| Villa Urquiza | 277 | | Colegiales | 70 |
| Villa Pueyrredón | 206 | | Belgrano | 58 |
| Palermo | 199 | | Villa Ortúzar | 53 |
| Saavedra | 162 | | Chacarita | 47 |
| Parque Chas | 84 | | Agronomía | 39 |
| Núñez | 38 | | Coghlan | 25 |

De esos, **118 tienen 4 dormitorios o más**, **394 superan los 100 m²** y **250 están
arriba de los USD 230.000**. Precios de USD 73.500 a 260.000.

El resto del país (Tigre, San Miguel, Córdoba, San Martín de los Andes) y el centro,
sur y oeste de CABA **se siguen relevando pero no se publican**: son ~4.600 avisos que
no servían para esta búsqueda. Están en `.work/` y vuelven con una línea —
`ONLY = None` en `build2.py`.

Las marcadas **★ pick** (4 en esta franja) son las elegidas a mano; el resto sale del
relevamiento automático y la nota resume el texto del aviso.

Notas sobre los datos: `m² cub` son metros cubiertos y `m² tot` superficie total del
lote — algunos avisos solo declaran lo segundo. Precios en dólares, como se publican
en Argentina.

## Estructura

- `index.html` — página completa: markup, CSS y JS embebidos, sin dependencias
  ni build. Filtros por barrio, dormitorios (2 / 3 / 4+), con jardín, 100 m²+,
  fuente (Zonaprop / Argenprop) y solo picks. El de 100 m²+ usa los mismos metros que muestra la ficha: cubiertos si el
  aviso los declara, totales si no. Se combinan entre sí y los contadores
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
  afuera. Los avisos de Argenprop no tienen pin: el portal no publica coordenadas.
- `tools/` — scripts del relevamiento y la caché. Ver [tools/README.md](tools/README.md).

## Desarrollo

No hay build ni dependencias. Alcanza con abrir el archivo en el navegador:

```bash
start index.html
```

Cualquier cambio se publica al hacer push a `main`.
