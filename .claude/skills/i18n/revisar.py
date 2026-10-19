# -*- coding: utf-8 -*-
"""Control de las traducciones: que no falte ni sobre ninguna clave.

Compara lo que el HTML pide contra lo que define cada archivo de `i18n/`, y los
archivos entre sí. Informa tres cosas distintas:

  FALTA      el HTML la usa y ningún idioma la define -> hueco en blanco
  INCOMPLETA está en un idioma y falta en otro        -> hueco en ese idioma
  HUÉRFANA   está definida y no la usa nadie          -> sobró de un texto viejo

Sale con 1 si hay algo de las dos primeras, así sirve en un hook o antes de
commitear. Las huérfanas no hacen fallar: molestan, pero no rompen nada.

    python .claude/skills/i18n/revisar.py
"""
import io
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
I18N = os.path.join(RAIZ, "i18n")

# `data-i18n="clave"` y `data-i18n-attr="attr=clave;otro=clave2"`
RE_CONT = re.compile(r'data-i18n="([^"]+)"')
RE_ATTR = re.compile(r'data-i18n-attr="([^"]+)"')
# Las claves que pide el JavaScript. Además de `I18N.t("x")` valen los atajos
# `t("x")` y `fmt("x", ...)`, que es como las pide `js/shell.js`: ahí hay
# decenas de mensajes y escribir `I18N.t` en cada uno no se sostiene. El `\b`
# evita que enganche `split(`, `sort(` o `filter(`, que también terminan en
# "t(". Sin esto el control daba catorce huérfanas que sí se estaban usando.
RE_JS = re.compile(r'(?:\bI18N\.t|\bfmt|\bt)\(\s*["\']([^"\']+)["\']')


def sin_comentarios(txt, nombre):
    """Saca los comentarios antes de buscar claves.

    `js/i18n.js` documenta cómo se marca el HTML y el ejemplo trae un
    `data-i18n="x"` de mentira. Sin esto, el ejemplo contaba como uso real y el
    control pedía traducir una clave llamada «x».
    """
    if nombre.endswith(".html"):
        return re.sub(r"<!--.*?-->", "", txt, flags=re.S)
    txt = re.sub(r"/\*.*?\*/", "", txt, flags=re.S)
    return re.sub(r"(?m)^\s*//.*$", "", txt)


def claves_pedidas():
    """Todas las claves que el sitio usa, con el archivo donde aparecen."""
    pedidas = {}
    # Se comparan **tramos** de la ruta y no subcadenas: el repo se llama
    # `hiessy.github.io`, que contiene ".git", así que un `".git" in base`
    # descartaba el proyecto entero y daba cero claves usadas.
    saltar = {".git", ".work", ".idea", "node_modules", "__pycache__"}
    for base, _, archivos in os.walk(RAIZ):
        tramos = set(os.path.relpath(base, RAIZ).split(os.sep))
        if tramos & saltar:
            continue
        for nombre in archivos:
            if not nombre.endswith((".html", ".js")):
                continue
            ruta = os.path.join(base, nombre)
            rel = os.path.relpath(ruta, RAIZ)
            txt = sin_comentarios(io.open(ruta, encoding="utf-8").read(), nombre)
            encontradas = RE_CONT.findall(txt) + RE_JS.findall(txt)
            for grupo in RE_ATTR.findall(txt):
                for par in grupo.split(";"):
                    if "=" in par:
                        encontradas.append(par.split("=", 1)[1].strip())
            for k in encontradas:
                pedidas.setdefault(k, set()).add(rel)
    return pedidas


def main():
    if not os.path.isdir(I18N):
        print("no existe la carpeta i18n/", file=sys.stderr)
        return 1
    idiomas = {}
    for nombre in sorted(os.listdir(I18N)):
        if nombre.endswith(".json"):
            cod = nombre[:-5]
            try:
                idiomas[cod] = json.load(io.open(os.path.join(I18N, nombre), encoding="utf-8"))
            except ValueError as e:
                print("ROTO      i18n/%s: %s" % (nombre, e))
                return 1
    if not idiomas:
        print("no hay ningún archivo en i18n/", file=sys.stderr)
        return 1

    pedidas = claves_pedidas()
    todas = set()
    for d in idiomas.values():
        todas |= set(d)

    problemas = 0

    for k in sorted(pedidas):
        if k not in todas:
            problemas += 1
            print("FALTA      %-22s  la usa %s" % (k, ", ".join(sorted(pedidas[k]))))

    for k in sorted(todas):
        sin = [c for c in idiomas if k not in idiomas[c]]
        if sin and k in todas:
            problemas += 1
            print("INCOMPLETA %-22s  no está en: %s" % (k, ", ".join(sorted(sin))))

    huerfanas = sorted(todas - set(pedidas))
    for k in huerfanas:
        print("HUÉRFANA   %-22s  no la usa nadie" % k)

    print("")
    print("idiomas: %s" % ", ".join("%s (%d)" % (c, len(d)) for c, d in sorted(idiomas.items())))
    print("claves usadas por el sitio: %d" % len(pedidas))
    if problemas:
        print("%d problema(s)" % problemas)
        return 1
    print("sin faltantes" + (" · %d huérfana(s)" % len(huerfanas) if huerfanas else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
