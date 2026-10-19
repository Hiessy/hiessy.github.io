---
name: i18n
description: Traducir y mantener los textos del sitio. Usala cuando haya que agregar, cambiar o traducir cualquier texto visible, sumar un idioma nuevo, o revisar que las traducciones estén completas. También cuando aparezca texto escrito a mano dentro de un .html o un .js.
---

# Textos e idiomas

Ningún texto visible se escribe en el HTML ni en el JS. Todo vive en
`i18n/<idioma>.json` y el markup sólo nombra la clave que le toca.

```
i18n/es.json          castellano (idioma por defecto)
i18n/en.json          inglés
js/i18n.js            el cargador: busca el JSON y lo aplica al DOM
.claude/skills/i18n/revisar.py   control de claves
```

## La regla

**Si se ve en pantalla, va en `i18n/`.** Vale también para los `aria-label`, el
`<title>`, el `content` del `<meta name="description">` y cualquier cadena que
el JS dibuje a mano.

El motivo: antes cada elemento llevaba los dos idiomas encima
(`data-es="Hola" data-en="Hello"`). Con dos idiomas se banca; con tres no. Cada
texto nuevo hay que tocarlo en el markup, cada idioma nuevo multiplica los
atributos de todos los elementos, y no existe forma de saber si falta una
traducción salvo leer la página entera en cada idioma.

## Cómo se marca en el HTML

```html
<p data-i18n="pie.nota"></p>                          <!-- contenido -->
<meta data-i18n-attr="content=meta.descripcion">      <!-- un atributo -->
<canvas data-i18n-attr="aria-label=juego.aria"></canvas>
<button data-i18n="juego.salto"
        data-i18n-attr="aria-label=juego.salto"></button>   <!-- los dos -->
```

Varios atributos van separados por `;`: `data-i18n-attr="title=x.t;aria-label=x.a"`.

El elemento se deja **vacío**. Lo llena `js/i18n.js` al cargar.

## Desde el JavaScript

```js
I18N.t("juego.empezar")      // el texto en el idioma actual
I18N.idioma                  // "es" | "en"
I18N.listo                   // false hasta que llegó el JSON
document.addEventListener("idioma", redibujar);   // cambió el idioma
```

Lo que se dibuja a mano (un canvas, por ejemplo) tiene que mirar `I18N.listo`
antes de pedir textos: los JSON llegan por `fetch`, o sea después del primer
dibujo, y sin esa guarda se ve el nombre crudo de la clave por un instante.

## Agregar un texto

1. La clave en **todos** los archivos de `i18n/`, no sólo en el que estás
   mirando.
2. `data-i18n="la.clave"` en el elemento, vacío.
3. `python .claude/skills/i18n/revisar.py`

## Agregar un idioma

1. Copiar `i18n/es.json` a `i18n/<cod>.json` y traducirlo entero.
2. Sumar `{ cod: "<cod>", et: "XX", nom: "Nombre" }` a `IDIOMAS`, arriba de
   `js/i18n.js`. Los botones se arman solos a partir de esa lista.
3. `python .claude/skills/i18n/revisar.py`

No hay que tocar el HTML.

## Nombres de clave

`seccion.cosa`, en minúsculas y en castellano, que es el idioma de todo el
código del repo. Las listas numeradas van con dos dígitos (`logros.01`), para
que ordenen bien solas.

## Lo que se puede poner adentro

Las cadenas admiten HTML simple —`<b>`, `<code>`, `<span class="arg">`— porque
se insertan con `innerHTML`. Es seguro **porque son archivos del propio repo**:
no hay texto de usuarios dando vueltas. Si alguna vez entra texto de afuera,
esto pasa a `textContent` y el HTML sale de las cadenas.

## Control

```bash
python .claude/skills/i18n/revisar.py
```

Compara las claves que pide el HTML contra las que hay en cada JSON, y los JSON
entre sí. Avisa de tres cosas:

- claves que el HTML usa y **ningún** JSON define (queda un hueco en blanco);
- claves que están en un idioma y faltan en otro;
- claves definidas que **no usa nadie** (quedaron de un texto que se borró).

Devuelve 1 si falta algo, así sirve en un hook o antes de un commit.

## Al abrir el archivo directo

`fetch` no puede leer `i18n/*.json` desde `file://`, así que la portada
necesita servirse por HTTP:

```bash
python -m http.server 8123
```

Si los textos no cargan, la página lo dice arriba de todo en vez de quedar en
blanco sin explicación.
