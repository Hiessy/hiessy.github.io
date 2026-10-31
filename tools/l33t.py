# -*- coding: utf-8 -*-
"""Genera `i18n/l33t.json` a partir de `i18n/en.json`.

El l33t es inglés con otro alfabeto, así que no se escribe a mano: se deriva
del inglés y se regenera cada vez que ese cambia. Escribir 65 cadenas a mano
garantizaba que quedaran desfasadas al primer retoque del texto original.

**Cada letra tiene varias formas, no una sola.** La tabla de la Wikipedia da un
montón de variantes por letra —la `a` es `4`, `@`, `/\\`, `^`— y la gracia está
justamente en que no salga siempre la misma. Un mapa fijo de uno a uno da un
texto monótono, que se lee como una sustitución de cifrado y no como l33t. Acá
cada aparición elige entre las variantes de esa letra, y además **no se
convierten todas**: hay una probabilidad por carácter, así quedan letras sin
tocar y el texto se sigue leyendo.

De la tabla se eligieron las variantes **cuasi-homoglifas** y cortas (`4 @ 3 1
! 0 5 $ 7 +`) y quedaron afuera las barrocas (`/\\/\\` por `m`, `|\\|` por `n`),
que son correctas pero vuelven el texto ilegible.

**Es determinista.** El azar se siembra con la clave, así regenerar dos veces
da exactamente lo mismo y el diff no se llena de ruido.

Hay también un puñado de palabras hechas: las clásicas de la tabla (`h4x0r`,
`j00`, `pwn3d`, `1337`, `n00b`, `gr8`, `b4`) y algunas nuestras, armadas con
las mismas reglas de la jerga —`-cks` a `-x`, la `-s` final a `-z`— para cosas
que dice esta página: `r0llb4x`, `d0x`, `5k1llz`, `bu1ldz`.

**Los comandos nunca se convierten.** La pantalla de ayuda y la bienvenida
dicen qué hay que tipear, y la tabla de `shell.js` tiene los nombres de verdad:
en l33t salían `l5`, `5h4256` y `[-l -4]`, o sea una ayuda que mandaba a usar
comandos y opciones que no existen. Lo mismo con `iptables`, que es un comando
aunque acá aparezca en medio de una frase.

    python tools/l33t.py
"""
import collections
import hashlib
import io
import json
import os
import random
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, "i18n", "en.json")
DESTINO = os.path.join(RAIZ, "i18n", "l33t.json")

# Variantes por letra. La primera va repetida para que aparezca más: así el
# texto tiene una forma dominante y las otras asoman de a ratos.
ALFABETO = {
    "a": ["4", "4", "4", "@"],
    "b": ["8", "8", "6"],
    # Ojo con `<`, `>` y `&`: la tabla los ofrece (`<` por c, `><` por x, `&`
    # por e) pero estas cadenas se insertan con innerHTML, así que un `<` suelto
    # abre una etiqueta y se come el texto que sigue. Quedan afuera; el control
    # del final se asegura de que no vuelvan a colarse.
    "c": ["c", "c", "("],
    "e": ["3", "3", "3", "3"],
    "f": ["f", "ph"],
    "g": ["9", "6", "g"],
    "h": ["h", "h", "#"],
    "i": ["1", "1", "!", "|"],
    "k": ["k", "k", "|("],
    "l": ["1", "l", "|_", "7"],
    "o": ["0", "0", "0", "()"],
    "r": ["r", "r", "|2"],
    "s": ["5", "5", "$", "z"],
    "t": ["7", "t", "+"],
    "u": ["u", "u", "(_)"],
    "v": ["v", "\\/"],
    "w": ["w", "vv", "\\/\\/"],
    "x": ["x", "x", "}{"],
    "y": ["y", "`/"],
    "z": ["z", "2"],
}
PROBABILIDAD = 0.78          # cuántas de las letras convertibles se convierten

# La tabla misma se revisa acá, no sólo el resultado: `<`, `>` y `&` tienen
# sentido en HTML y estas cadenas entran por innerHTML. Ya pasó con `<` por c,
# `><` por x y `|<` por k, que abrían una etiqueta y se comían el texto que
# seguía. Mejor que reviente al importar y no en la página.
for _letra, _vs in ALFABETO.items():
    for _v in _vs:
        assert not set(_v) & set("<>&"), (
            "variante %r de %r tiene un caracter con sentido en HTML" % (_v, _letra))

# Palabras hechas: las de la tabla y algunas nuestras, con las mismas reglas.
PALABRAS = [
    (r"\bhackers?\b", "h4x0rz"),
    (r"\bhack(ed|ing)?\b", "h4x"),
    (r"\byou\b", "j00"),
    (r"\byour\b", "j00r"),
    (r"\belite\b", "1337"),
    (r"\bowned\b", "pwn3d"),
    (r"\bnewbies?\b", "n00bz"),
    (r"\bgreat\b", "gr8"),
    (r"\blater\b", "l8r"),
    (r"\bbefore\b", "b4"),
    (r"\brocks\b", "r0xx0r"),
    (r"\bsucks\b", "5uxx0r"),
    # nuestras: -cks a -x, -s final a -z
    (r"\brollbacks\b", "r0llb4x"),
    (r"\bdocumentation\b", "d0x"),
    (r"\bdocs\b", "d0x"),
    (r"\bskills?\b", "5k1llz"),
    (r"\bbuilds?\b", "bu1ldz"),
    (r"\bquestions\b", "qu35t10nz"),
]

# Nombres de comando, opciones y archivos que la ayuda manda a escribir.
COMANDOS = ("sh ls cd pwd tree cat wc mkdir touch echo cp mv rm sha256 fnv "
            "whoami date history clear help iptables").split()
ARCHIVOS = ["logros.txt", "achievements.txt", "README", "crypto.subtle",
            "janitor-joe", "sorting-lab"]

# Lo que no se toca nunca: marcado, entidades, los marcadores `{0}`, los
# archivos que la ayuda nombra, `iptables` y las opciones de una letra.
_BASE = (r"<[^>]*>"
         r"|&[a-zA-Z]+;|&#\d+;"
         r"|\{\d+\}"
         r"|" + r"|".join(re.escape(a) for a in ARCHIVOS) +
         r"|\biptables\b"
         r"|(?<![A-Za-z])-[A-Za-z]\b")
INTOCABLE = re.compile("(" + _BASE + ")")

# Y en las claves `sh.*`, además, los nombres de comando. Sólo ahí: varios son
# también palabras corrientes —«to date», «help», «clear»— y protegerlos en
# todo el archivo dejaba «No r0llb4x t0 date», con una palabra sin convertir en
# medio de la frase. El \b evita que «cat» pegue dentro de «located».
INTOCABLE_SH = re.compile(
    "(" + _BASE + r"|\b(?:" + r"|".join(COMANDOS) + r")\b)")

SALTAR = re.compile(r"^nums\.\d+\.valor$")


def leet(txt, semilla, es_shell=False):
    """Convierte el texto visible y deja el marcado intacto."""
    rng = random.Random(hashlib.md5(semilla.encode("utf-8")).hexdigest())
    patron_fijo = INTOCABLE_SH if es_shell else INTOCABLE
    salida = []
    for trozo in patron_fijo.split(txt):
        if not trozo:
            continue
        if patron_fijo.fullmatch(trozo):
            salida.append(trozo)
            continue
        # Las palabras hechas se guardan aparte y vuelven al final: si se
        # dejaban en el texto, el mapa de letras las volvía a pisar y `r0llb4x`
        # terminaba en `r0llb4><`, que es justo lo que no se quería.
        guardadas = []

        def guardar(r):
            guardadas.append(r)
            return "\x01%d\x01" % (len(guardadas) - 1)

        for patron, reemplazo in PALABRAS:
            trozo = re.sub(patron, lambda m, r=reemplazo: guardar(r),
                           trozo, flags=re.I)
        hecho = []
        for c in trozo:
            v = ALFABETO.get(c.lower())
            if not v:
                hecho.append(c)
                continue
            # Se tira el dado siempre, use o no la variante: así el resultado
            # depende sólo de la semilla y no de qué letras tocaron antes.
            elegida = rng.choice(v)
            if rng.random() < PROBABILIDAD:
                hecho.append(elegida.upper() if c.isupper() and elegida.isalpha()
                             else elegida)
            else:
                hecho.append(c)
        texto = "".join(hecho)
        texto = re.sub(r"\x01(\d+)\x01",
                       lambda m: guardadas[int(m.group(1))], texto)
        salida.append(texto)
    return "".join(salida)


def main():
    en = json.load(io.open(ORIGEN, encoding="utf-8"),
                   object_pairs_hook=collections.OrderedDict)
    out = collections.OrderedDict()
    for k, v in en.items():
        # Contexto de comando: la shell entera y los encabezados `*.cmd`, que
        # son justamente nombres de comando en pantalla (`whoami`, `cat`,
        # `./janitor-joe`). Un comando no se escribe en l33t.
        manda = k.startswith("sh.") or k.endswith(".cmd")
        out[k] = v if SALTAR.match(k) else leet(v, k, manda)
    # Control: el marcado de cada cadena tiene que salir idéntico al del
    # inglés. Es la red contra elegir como variante de una letra un carácter
    # con sentido en HTML, que no se nota hasta que la página se rompe.
    marcas = lambda s: re.findall(r"<[^>]*>|&[a-zA-Z]+;|&#\d+;|\{\d+\}", s)
    for k in en:
        if marcas(en[k]) != marcas(out[k]):
            raise SystemExit(
                "l33t: la clave %r quedo con marcado distinto\n  en  : %s\n  l33t: %s"
                % (k, marcas(en[k]), marcas(out[k])))
    sueltos = [k for k in out if re.search(r"[<>&]", out[k])
               and not marcas(out[k])]
    if sueltos:
        raise SystemExit("l33t: hay < > o & sueltos en %s" % sueltos[:5])

    io.open(DESTINO, "w", encoding="utf-8", newline="").write(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print("escrito %s - %d claves" % (DESTINO, len(out)))
    for k in ("cabecera.nombre", "cabecera.rol", "juego.titulo",
              "sh.err.noexiste", "nums.03.valor"):
        if k in out:
            print("  %-18s %s" % (k, out[k][:76]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
