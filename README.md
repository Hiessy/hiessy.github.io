# hiessy.github.io

Sitio estático publicado con GitHub Pages en <https://hiessy.github.io>.

## Contenido

Dos búsquedas, una pestaña cada una:

### 1. CABA norte — [`index.html`](index.html)

**1.258** PH y casas de 3 ambientes o más hasta USD 260.000, en los doce barrios de
la franja **Edenor**: Villa Urquiza (277), Villa Pueyrredón (206), Palermo (199),
Saavedra (162), Parque Chas (84), Colegiales (70), Belgrano (58), Villa Ortúzar (53),
Chacarita (47), Agronomía (39), Núñez (38) y Coghlan (25). 118 con 4+ dormitorios,
394 arriba de 100 m².

### 2. Zona norte con patio — [`gba-norte.html`](gba-norte.html)

**1.403** casas y PH hasta USD 260.000 en Olivos (469), Martínez (326), San Miguel
(299), Bella Vista (283) y La Lucila (26). Acá lo que manda es el **terreno libre**
—superficie total menos cubierta, o sea el patio— y el filtro arranca en 100 m²:

| Terreno libre | Avisos |
| --- | --- |
| 100 m²+ | 399 |
| 150 m²+ | 247 |
| 200 m²+ | 157 |

Se mide con los metros del aviso y no con la palabra "jardín": 193 avisos con más de
100 m² libres nunca la usan, y 315 que la usan tienen menos de 100.

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
  afuera. Los avisos de Argenprop no tienen pin: el portal no publica coordenadas.
- `tools/` — scripts del relevamiento y la caché. Ver [tools/README.md](tools/README.md).

## Desarrollo

No hay build ni dependencias. Alcanza con abrir el archivo en el navegador:

```bash
start index.html
```

Cualquier cambio se publica al hacer push a `main`.
