# hiessy.github.io

Sitio estático publicado con GitHub Pages en <https://hiessy.github.io>.

## Contenido

**Dónde comprar en Argentina con menos de USD 230.000** — una página única
([`index.html`](index.html)) con **5.648** casas y PH de 3 ambientes o más
relevados en **Zonaprop** (5.364) y **Argenprop** (284), en seis zonas:

| Zona | Avisos |
| --- | --- |
| CABA (29 barrios) | 3.706 |
| Tigre (+ sublocalidades) | 913 |
| San Miguel · Bella Vista | 396 |
| Santa Rosa de Calamuchita | 179 |
| San Martín de los Andes | 165 |
| La Cumbre | 101 |

De esos, **748 tienen 4 dormitorios o más**, **1.215 mencionan jardín o parque
propio** y **844 están arriba de los USD 200.000**. Cada tarjeta enlaza al aviso
original, dice de qué portal salió y aclara la distribuidora eléctrica: en CABA la
concesión se parte entre **Edenor** (franja norte) y **Edesur** (centro, sur y oeste).

No hay recorte: si un aviso cumple los filtros, aparece. Antes se publicaba una
muestra por zona y eso escondía avisos que sí calificaban.

Las marcadas **★ pick** (49) son las elegidas a mano al comparar relación
metros/precio, terreno o algún dato que cambia la ecuación; su nota es editorial.
El resto viene del relevamiento automático y la nota resume el texto del aviso.

Notas sobre los datos: `m² cub` son metros cubiertos y `m² tot` superficie total
del lote — algunos avisos solo declaran lo segundo. Precios en dólares, como se
publican en Argentina. Los precios y la disponibilidad cambian rápido.

## Estructura

- `index.html` — página completa: markup, CSS y JS embebidos, sin dependencias
  ni build. Filtros por zona, dormitorios (2 / 3 / 4+), con jardín, distribuidora
  eléctrica (Edenor / Edesur), fuente (Zonaprop / Argenprop) y solo picks. Se combinan entre sí y los contadores
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
