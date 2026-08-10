# hiessy.github.io

Sitio estático publicado con GitHub Pages en <https://hiessy.github.io>.

## Contenido

**Dónde comprar en Argentina con menos de USD 200.000** — una página única
([`index.html`](index.html)) con 1.572 casas y PH de 3 ambientes o más relevados
en **Zonaprop** (1.297) y **Argenprop** (275) en agosto de 2026, en seis zonas:

| Zona | Avisos |
| --- | --- |
| CABA (29 barrios) | 584 |
| Tigre (+ sublocalidades) | 340 |
| San Miguel · Bella Vista | 258 |
| Santa Rosa de Calamuchita | 168 |
| San Martín de los Andes | 129 |
| La Cumbre | 93 |

De esos, **516 tienen 4 dormitorios o más** y **413 mencionan jardín o parque
propio**. Cada tarjeta enlaza al aviso original, dice de qué portal salió y aclara la distribuidora
eléctrica: en CABA la concesión se parte entre **Edenor** (franja norte, 95
avisos) y **Edesur** (centro, sur y oeste, 388).

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
- `tools/` — scripts del relevamiento y la caché. Ver [tools/README.md](tools/README.md).

## Desarrollo

No hay build ni dependencias. Alcanza con abrir el archivo en el navegador:

```bash
start index.html
```

Cualquier cambio se publica al hacer push a `main`.
