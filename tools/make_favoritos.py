"""Genera `favoritos.html` a partir de `index.html`.

Cuarta pestaña. No tiene relevamiento propio: el dataset lo arma el navegador con
lo que uno marcó con el ♥ en las otras tres, que se guarda en `localStorage` bajo
una clave común a todo el sitio. Por eso acá `const D` no es una lista de avisos
sino el código que la lee.

Dos consecuencias de que los datos vivan en el navegador:

- **los pills de zona se arman solos**, porque dependen de lo que cada uno haya
  guardado y no se pueden escribir en el HTML;
- la página no se rearma cuando cambia un relevamiento. Lo guardado es una copia
  de la fila del día en que se marcó: si el aviso después se da de baja, acá
  sigue apareciendo. El pie lo avisa.

    python tools/make_favoritos.py
"""
import io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "index.html")
DST = os.path.join(ROOT, "favoritos.html")

# Ojo: no redeclarar `FAVK`, que index.html lo declara más abajo con `const` y
# dos declaraciones en el mismo scope rompen el script entero.
DATA = """const D=(()=>{
 let o={};
 try{o=JSON.parse(localStorage.getItem('hiessy:favoritos')||'{}')||{}}catch(e){}
 return Object.keys(o).sort((a,b)=>(o[b].t||0)-(o[a].t||0))
  .map(k=>o[k]&&o[k].r).filter(r=>Array.isArray(r)&&r.length>19);
})();
// Un pill por zona presente en lo guardado. Tiene que correr antes de que se
// enganchen los onclick de los pills, unas líneas más abajo.
(()=>{
 const todos=document.querySelector('.pill[data-b=""]');
 if(!todos)return;
 const zs=[...new Set(D.map(r=>r[9]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 todos.insertAdjacentHTML('afterend',zs.map(z=>
  `<button class="pill" data-b="${z.replace(/"/g,'&quot;')}">${z} <em></em></button>`).join(''));
})();"""


def rep(t, a, b, n=1):
    assert t.count(a) == n, (a[:70], t.count(a))
    return t.replace(a, b)


def main():
    t = io.open(SRC, encoding="utf-8").read()

    lines = t.split("\n")
    i = [k for k, l in enumerate(lines) if l.startswith("const D=[[")][0]
    lines[i] = DATA
    t = "\n".join(lines)

    # pestaña activa
    t = rep(t, '<a href="index.html" class="tab on">CABA norte</a>',
               '<a href="index.html" class="tab">CABA norte</a>')
    t = rep(t, '<a href="favoritos.html" class="tab fav">Favoritos <em id="favn"></em></a>',
               '<a href="favoritos.html" class="tab fav on">Favoritos <em id="favn"></em></a>')

    # los pills de barrio los pone el JS: acá queda solo "Todos"
    old = re.search(r'<button class="pill on" data-b="">Todos <em></em></button>\n'
                    r'(?:<button class="pill" data-b="[^"]*">[^<]*<em></em></button>\n?)+', t)
    t = (t[:old.start()] + '<button class="pill on" data-b="">Todos <em></em></button>\n'
         + t[old.end():])

    # no hay picks editoriales en lo que uno guarda
    t, k = re.subn(r'<button class="pill gold" id="pk">',
                   '<button class="pill gold" id="pk" hidden>', t, count=1)
    assert k == 1, "no encontré el botón de picks"

    # textos
    t = rep(t, "<title>Búsqueda de propiedades · Argentina</title>",
               "<title>Favoritos · Argentina</title>")
    t = rep(t, '<h1>PH y casas en la zona norte de CABA<br>con menos de USD 260.000</h1>',
               '<h1>Favoritos<br>lo que fuimos marcando</h1>')
    t = re.sub(r'<meta name="description" content="[^"]*">',
               '<meta name="description" content="Los avisos marcados con el ♥ en las tres '
               'búsquedas.">', t, count=1)

    i, j = t.index('<p class="sub">'), t.index("</header>")
    t = t[:i] + '''<p class="sub">Los avisos marcados con el <b>♥</b> en CABA norte, zona norte
y sierras de Córdoba. Se guardan en este navegador: no viajan a ningún servidor y
no se ven desde otra computadora.</p>
''' + t[j:]

    i = t.index("<footer>"); j = t.index("</footer>")
    t = t[:i] + '''<footer>
<p>Esta página es una <b>copia del día en que marcaste cada aviso</b>: el precio y la
foto son los de ese momento y, si después se dio de baja, acá va a seguir apareciendo.
El link lleva al aviso original, que es lo que manda.</p>
<p>Se borran con el <b>♥</b> de la ficha o con "Quitar de favoritos" arriba del mapa.
Si limpiás los datos del navegador, se van con todo lo demás.</p>
''' + t[j:]

    io.open(DST, "w", encoding="utf-8", newline="").write(t)
    print("escrito", DST, f"{os.path.getsize(DST)/1024:.0f} KB")


if __name__ == "__main__":
    main()
