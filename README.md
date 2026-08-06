# hiessy.github.io

Sitio estático publicado con GitHub Pages en <https://hiessy.github.io>.

## Contenido

**Dónde comprar en Argentina con menos de USD 200.000** — una página única
([`index.html`](index.html)) con 192 propiedades relevadas en Zonaprop en agosto
de 2026, repartidas en seis zonas:

| Zona | Avisos |
| --- | --- |
| San Martín de los Andes | 25 |
| La Cumbre (Córdoba) | 41 |
| Santa Rosa de Calamuchita | 49 |
| CABA Norte | 24 |
| Tigre | 25 |
| San Miguel · Bella Vista | 28 |

Cada tarjeta enlaza al aviso original en Zonaprop. Las marcadas **★ pick** (49 en
total) son las destacadas al comparar relación metros/precio, terreno o algún
dato que cambia la ecuación.

Notas sobre los datos: los m² que muestra Zonaprop son de **terreno**, no de
superficie cubierta; los cubiertos se aclaran en la nota cuando el aviso los
declaraba. Precios en dólares, como se publican en Argentina. Los precios y la
disponibilidad cambian rápido — conviene confirmar con la inmobiliaria.

## Estructura

- `index.html` — página completa: markup, CSS y JS embebidos, sin dependencias
  ni build. Incluye filtro por zona, por cantidad de dormitorios (3 / 4 / 5+),
  filtro de picks y orden por precio. Los tres filtros se combinan y los
  contadores de cada botón se recalculan según lo que esté seleccionado.

## Desarrollo

No hay build ni dependencias. Alcanza con abrir el archivo en el navegador:

```bash
start index.html
```

Cualquier cambio se publica al hacer push a `main`.
