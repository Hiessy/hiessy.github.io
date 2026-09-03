"""Saca avisos repetidos, ya fusionadas todas las fuentes.

Por qué acá y no en cada scraper: el mismo inmueble se publica en Zonaprop y en
Argenprop a la vez, y la misma inmobiliaria lo repite dentro de un solo portal
(otro `postingId`, otra foto, mismo precio y misma dirección). Ninguno de los dos
barridos puede ver al otro, así que la única pasada que los ve a todos juntos es
esta, sobre las filas ya armadas.

El `dedupe_key` viejo (precio, dormitorios, `addr[:14]` crudo) dejaba pasar 192
repetidos en CABA y 216 en zona norte porque cortaba a 14 caracteres sin sacar
acentos ni el "al" de "Quesada al 3500", así que "Quesada al 350" y "Quesada 3548"
no se parecían en nada.

Al agrupar no se tira la fila perdedora: primero se le sacan los datos que a la
ganadora le faltan (coordenadas, m², terreno, ambientes, rasgos). Un aviso de
Argenprop sin geocodificar puede quedarse con las coordenadas que Zonaprop sí
publica, y los rasgos se unen porque cada portal recorta la descripción distinto.
"""
import re
import unicodedata

# Índices de la fila (ver README): 4 precio, 5 dirección, 10 ambientes,
# 11 dormitorios, 12 jardín, 15/16 lat/lng, 17 m², 18 terreno, 19 rasgos.
PRICE, ADDR, AMB, DORM, GAR, LAT, LNG, M2, TER, FEAT = 4, 5, 10, 11, 12, 15, 16, 17, 18, 19


def plain(s):
    """Dirección comparable: sin acentos, sin piso/UF, sin 'entre', sin 'al'."""
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.split(r",\s*(?:piso|pb|uf|depto|dto)", s)[0]     # "Colodrero 2900, Piso 3"
    s = re.split(r"\bentre\b", s)[0]                        # "Blanco Encalada entre X e Y"
    s = re.sub(r"\bal\s+(\d)", r"\1", s)                    # "Quesada al 3500"
    return re.sub(r"[^a-z0-9]", "", s)


def key(r):
    """Dos avisos son el mismo si coinciden precio y dirección normalizada.

    No se agrupa por (precio, barrio, m²) sin dirección: en un barrio hay PHs
    distintos con el mismo precio y la misma superficie, y ahí se borrarían
    propiedades reales en vez de repetidos.
    """
    a = plain(r[ADDR])
    if len(a) < 6:          # "Belgrano", "s/d": no alcanza para afirmar que es el mismo
        return None
    if not any(c.isdigit() for c in a):
        # Sin altura no se puede afirmar que sean el mismo inmueble. Importa en
        # las sierras, donde 253 avisos traen el título del aviso en el campo de
        # dirección y se los reemplaza por el nombre del pueblo: sin esta
        # condición, dos casas distintas de Cosquín al mismo precio se fusionaban.
        return None
    return (r[PRICE], a)


def score(r):
    """Cuál de las repetidas se queda: la que más información trae."""
    return (1 if (r[LAT] and r[LNG]) else 0,
            1 if r[M2] else 0,
            len(r[FEAT] or []),
            1 if r[AMB] else 0,
            len(r[6] or ""))


def dedupe(rows):
    """Devuelve (filas_sin_repetidos, cuántas se sacaron)."""
    groups, order = {}, []
    for r in rows:
        k = key(r)
        if k is None:
            order.append(("solo", r))
            continue
        if k not in groups:
            groups[k] = []
            order.append(("grupo", k))
        groups[k].append(r)

    out, dropped = [], 0
    for kind, val in order:
        if kind == "solo":
            out.append(val)
            continue
        g = groups[val]
        if len(g) == 1:
            out.append(g[0])
            continue
        # Misma dirección y mismo precio pero 40 m² de diferencia no es un
        # repetido: son dos unidades del mismo edificio publicadas al mismo valor.
        # Por eso el grupo se subdivide en cúmulos por superficie en vez de
        # comparar todo contra una sola fila: en Arias 3200 había dos avisos de
        # 64 m² y uno de 114, y midiendo solo contra el de 114 los dos de 64
        # quedaban sueltos, repetidos entre sí.
        clusters = []
        for r in sorted(g, key=score, reverse=True):
            for c in clusters:
                if not (r[M2] and c[0][M2] and abs(r[M2] - c[0][M2]) > 40):
                    c.append(r)
                    break
            else:
                clusters.append([r])
        for c in clusters:
            best, rest = c[0], c[1:]
            for r in rest:
                if not (best[LAT] and best[LNG]) and r[LAT] and r[LNG]:
                    best[LAT], best[LNG] = r[LAT], r[LNG]
                for i in (M2, TER, AMB, DORM):
                    if not best[i] and r[i]:
                        best[i] = r[i]
                if r[GAR]:
                    best[GAR] = 1
                if r[FEAT]:
                    best[FEAT] = sorted(set(best[FEAT] or []) | set(r[FEAT]))
            out.append(best)
            dropped += len(rest)
    return out, dropped
