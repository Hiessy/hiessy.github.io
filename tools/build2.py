"""Merge the original 192 curated listings with the new sweep and rewrite index.html's data array.

Row shape (unchanged prefix, two new trailing fields):
  0 region  1 img  2 slug  3 priceStr  4 priceNum  5 address
  6 specs   7 note 8 pick  9 caption  10 ambientes  11 dormitorios  12 jardín
  13 distribuidora eléctrica  14 fuente (Zonaprop / Argenprop)  15 lat  16 lng  17 m²
  18 terreno libre  19 rasgos mencionados (índices de FEATS)
"""
import json, os, re
from collections import Counter

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
REPO = r"C:\Users\Tincho\Documents\Proyects\hiessy.github.io"

# how many scraped listings to publish per region (the sweep found far more)
# Sin recorte: si un aviso cumple los filtros, va. El sampleo por zona escondía
# avisos que sí calificaban (p. ej. un PH de Núñez a 229.900).
CAP = {}
NO_CAP = 10 ** 9
AP_SHARE = 0.45      # cuánto de ese cupo puede aportar Argenprop, además de Zonaprop

# La página publica solo CABA zona norte (área de Edenor). El resto se sigue
# relevando y queda en `.work/`, pero no entra al HTML: eran 5.600 fichas de las
# cuales casi ninguna servía para la búsqueda actual.
# Para volver a publicar todo: ONLY = None
ONLY = {"reg": 3, "prov": "Edenor"}


def wanted(row):
    if not ONLY:
        return True
    return row[0] == ONLY["reg"] and row[13] == ONLY["prov"]


# Avisos verificados como dados de baja por `deadlinks.py` (Zonaprop contesta 410
# cuando el aviso se dio de baja). Lo que no está en el archivo se publica igual:
# no haber verificado un aviso no es motivo para esconderlo.
ZP_BASE = "https://www.zonaprop.com.ar/propiedades/clasificado/"


def load_dead():
    p = os.path.join(D, "alive.json")
    if not os.path.exists(p):
        return set()
    d = json.load(open(p, encoding="utf-8"))
    return {u for u, v in d.items() if not v.get("ok")}


def is_dead(url, dead):
    if not dead:
        return False
    return (url in dead) or (ZP_BASE + url in dead)

BLOCK = re.compile(r"corredor|matr[ií]cula|\bcpi\b|cucicba|cmcp|contacto\s*:|responsable|"
                   r"inmobiliaria|\bmls\b|ficha\s*brick|@|https?:|www\.", re.I)
GOOD = re.compile(r"lote|terreno|patio|jard|pileta|quincho|refac|recicl|apto cr|escritur|"
                  r"cochera|galer|parrilla|dormitorio|planta|fondo|amplio|luminos|balc|"
                  r"terraza|suite|gas natural|permuta|vista", re.I)
GARDEN = re.compile(r"jard[ií]n|jardines", re.I)

# --- Avisos ya vendidos o reservados -----------------------------------------
# Siguen publicados con un cartel al principio del título: "Reservado!! ph en 2
# plantas", "- Vendido - excelente ph en pb", "*RESERVADO*".
#
# Buscar la palabra suelta no sirve, casi todo lo que aparece es otra cosa:
#
#   "Todos los derechos reservados. Coldwell Banker"   <- pie de página legal
#   "un entorno mucho más reservado y silencioso"      <- adjetivo, es un elogio
#   "Naturaleza Preservada: el lote está atravesado"   <- ni siquiera es la palabra
#   "antigua chacra con lotes... Todos vendidos"       <- habla de otros lotes
#   "Complejo cerrado (90% vendido)"                   <- habla del complejo
#
# De 2.266 avisos de sierra, el patrón ingenuo marcaba 9 y los 9 eran falsos. Lo
# que distingue al cartel de verdad es la puntuación: va entre asteriscos, con
# signos de exclamación, o solo al principio y seguido de guión o dos puntos.
SOLD_MARK = re.compile(r"[*¡!]\s*(vendid|reservad)[oa]s?\b"
                       r"|\b(vendid|reservad)[oa]s?\s*[*!]", re.I)
SOLD_HEAD = re.compile(r"^[\s\-–*·]{0,4}(vendid|reservad)[oa]s?\b\s*[\-–:,*!]", re.I)


def sold(*textos):
    """True si algún texto del aviso lo declara vendido o reservado."""
    for t in textos:
        t = (t or "").strip()
        if t and (SOLD_MARK.search(t) or SOLD_HEAD.search(t)):
            return True
    return False

# ambientes is publisher-entered and sometimes wrong (one listing claims 40).
# Anything below the bedroom count or above this is treated as unknown, not guessed.
AMB_MAX = 12


def note(d, reg=None):
    t = re.sub(r"&[a-z]+;", " ", d or "")
    t = re.sub(r"\bu\$?s?d?\s*[\d.,]+", "", t, flags=re.I)
    t = re.sub(r"\bUSD\s*[\d.,]+", "", t, flags=re.I)
    t = re.sub(r"[|•*]+", ". ", t)
    t = re.sub(r"\s+", " ", t).replace(" ,", ",").replace(" .", ".").strip()
    parts = [s.strip() for s in re.split(r"(?<!\d)[.!?]\s+(?=[A-ZÁÉÍÓÚÑa-z])", t)]
    parts = [s for s in parts if len(s) >= 18 and not BLOCK.search(s)]
    # en CABA el "jardín" del aviso casi nunca es un jardín: no lo destacamos
    if reg == 3:
        parts = [s for s in parts if not GARDEN.search(s)]
    out = ""
    for s in parts:
        if len(out) + (1 if out else 0) + len(s) > 104:
            if out:
                break
            continue
        out = (out + " " + s).strip() if out else s
        if len(out) > 55 or not GOOD.search(s):
            break
    if not out:
        out = (parts[0] if parts else ("" if reg == 3 and GARDEN.search(t) else t))[:100]
    if reg == 3 and GARDEN.search(out):
        # drop just the garden clause; if nothing substantial is left, no note
        out = " ".join(f for f in re.split(r"\s*[,;·–-]\s*", out) if not GARDEN.search(f))
        if len(out.strip()) < 14:
            return ""
    out = re.sub(r"[\s,;.\-–]+$", "", out).strip()
    if len(out) > 104:
        out = re.sub(r"[\s,;.]+$", "", out[:101]) + "…"
    if not out:
        return ""
    return out[0].upper() + out[1:] + ("" if out[-1] in ".!…" else ".")


# Rasgos que mueven la decisión. Se detectan en el texto del aviso, así que
# "mencionado" es un dato y "no mencionado" NO es lo mismo que "no lo tiene":
# el vendedor pudo no escribirlo. La página lo dice con esas palabras.
FEATS = [
    ("terraza",  r"terraza"),
    ("balcón",   r"balc[oó]n"),
    ("patio",    r"\bpatio"),
    ("jardín",   r"jard[ií]n|parquizad"),
    ("cochera",  r"cochera|garage|garaje"),
    ("parrilla", r"parrilla|quincho"),
    ("pileta",   r"pileta|piscina"),
    ("crédito",  r"apto\s+cr[eé]dito"),
    ("a refaccionar", r"\b(a|para)\s+(refaccionar|reciclar|remodelar|reformar)"),
]
FEAT_RX = [(name, re.compile(pat, re.I)) for name, pat in FEATS]


def patio_of(r):
    """Terreno libre: total menos cubierto. En CABA casi nunca hay, pero cuando el
    aviso declara las dos superficies el dato sirve igual."""
    return max((r.get("tot") or 0) - (r.get("cub") or 0), 0)


def feats_of(text):
    """Índices de FEATS mencionados en el aviso. Se guardan como números para no
    repetir las mismas nueve palabras en 1.500 filas del HTML."""
    t = text or ""
    return [i for i, (_, rx) in enumerate(FEAT_RX) if rx.search(t)]


def specs(r):
    b = []
    if r.get("amb"):
        b.append(f"{r['amb']} amb")
    if r.get("dorm"):
        b.append(f"{r['dorm']} dorm")
    if r.get("cub"):
        b.append(f"{r['cub']} m² cub")
    elif r.get("tot"):
        b.append(f"{r['tot']} m² tot")
    if r.get("ban"):
        b.append(f"{r['ban']} baño" + ("s" if r["ban"] > 1 else ""))
    return " · ".join(b)


# Distribuidora eléctrica. En CABA la concesión se parte en dos y no sigue las
# comunas: la franja norte es Edenor y el resto (centro, sur y oeste) Edesur.
# Fuera de CABA: Tigre y San Miguel son Edenor; Córdoba EPEC y Neuquén EPEN.
EDENOR_CABA = {"belgrano", "nunez", "núñez", "saavedra", "coghlan", "villa urquiza",
               "villa pueyrredon", "villa pueyrredón", "colegiales", "chacarita",
               "villa ortuzar", "villa ortúzar", "palermo", "parque chas", "agronomia",
               "agronomía"}
PROV_BY_REG = {0: "EPEN", 1: "EPEC", 2: "EPEC", 4: "Edenor", 5: "Edenor"}


def provider(reg, loc):
    if reg != 3:
        return PROV_BY_REG.get(reg, "")
    l = (loc or "").strip().lower()
    # "Palermo Hollywood", "Belgrano R" etc. resolve to their parent barrio
    return "Edenor" if any(l == b or l.startswith(b + " ") for b in EDENOR_CABA) else "Edesur"


# Nombre lindo de cada barrio de la franja Edenor. "Palermo Soho" y "Belgrano R"
# se agrupan con el padre: como filtro, 20 etiquetas para 12 barrios no sirven.
BARRIO_LABEL = {"belgrano": "Belgrano", "nunez": "Núñez", "núñez": "Núñez",
                "saavedra": "Saavedra", "coghlan": "Coghlan",
                "villa urquiza": "Villa Urquiza", "villa pueyrredon": "Villa Pueyrredón",
                "villa pueyrredón": "Villa Pueyrredón", "colegiales": "Colegiales",
                "chacarita": "Chacarita", "villa ortuzar": "Villa Ortúzar",
                "villa ortúzar": "Villa Ortúzar", "palermo": "Palermo",
                "parque chas": "Parque Chas", "agronomia": "Agronomía",
                "agronomía": "Agronomía"}


def norm_barrio(loc):
    l = (loc or "").strip().lower()
    for k, label in BARRIO_LABEL.items():
        if l == k or l.startswith(k + " "):
            return label
    return ""


AP_BARRIO = re.compile(r"\ben\s+Venta\s+en\s+([^,]+?)(?:,|\s+en\s+|$)", re.I)


def ap_barrio(title):
    """'PH en Venta en Villa Crespo, Capital Federal' -> 'Villa Crespo'."""
    m = AP_BARRIO.search(title or "")
    return m.group(1).strip() if m else ""


from dedupe import dedupe        # pasada final: ver tools/dedupe.py


def dedupe_key(price, dorm, addr):
    a = re.sub(r"[^a-z0-9]", "", (addr or "").lower())[:14]
    return (price, dorm, a)


# Hay avisos geocodificados por el *nombre* de la calle en vez de la dirección:
# "MEXICO al 3200" cae en México, "Suiza 1237" en Suiza, "AV. RIVADAVIA 8686" en
# Rivadavia (Chubut) y "LA PAMPA 5100" en La Pampa. Uno trae lat == lng.
AR_BOX = (-56.0, -21.0, -74.0, -53.0)
OUTLIER_KM = 60          # ninguna de estas zonas es más grande que esto


def geo(r):
    lat, lng = r.get("lat") or 0, r.get("lng") or 0
    if not lat or not lng or lat == lng:
        return 0, 0
    s, n, w, e = AR_BOX
    return (lat, lng) if (s <= lat <= n and w <= lng <= e) else (0, 0)


def drop_far_coords(rows, km=None, key=lambda r: r[0]):
    """Saca las coordenadas que caen lejos del centro de su zona.

    La caja de Argentina no alcanza: un aviso de Floresta geocodificado en Chubut
    sigue estando en el país, pero rompe el encuadre del mapa de CABA. Se compara
    contra la *mediana* de la zona, que no se mueve por unos pocos outliers.

    `km` se ajusta al tamaño de la zona: los barrios de CABA entran en 60 km, pero
    localidades como Olivos o Martínez miden 6 km de punta a punta y con ese umbral
    se cuelan avisos a 35 km que estiran el mapa.

    `key` define qué es "la zona". Por defecto la región (columna 0), que sirve
    cuando todas las filas de una región están juntas. En las sierras no: el valle
    de Punilla mide ~100 km de norte a sur, así que agrupar por valle tiraba 999
    coordenadas buenas. Ahí se agrupa por pueblo.
    """
    km = km or OUTLIER_KM
    from statistics import median
    dropped = 0
    for reg in {key(r) for r in rows}:
        pts = [r for r in rows if key(r) == reg and r[15] and r[16]]
        if len(pts) < 5:
            continue
        clat, clng = median(r[15] for r in pts), median(r[16] for r in pts)
        for r in pts:
            dy = (r[15] - clat) * 111.0
            dx = (r[16] - clng) * 111.0 * 0.82      # cos(lat) a estas latitudes
            if (dx * dx + dy * dy) ** 0.5 > km:
                r[15] = r[16] = 0
                dropped += 1
    return dropped


# Argenprop no publica coordenadas: se sacan geocodificando la dirección.
try:
    from geocode import load_cache, coords_for
except Exception:                       # el geocodificador es opcional
    load_cache, coords_for = (lambda: {}), (lambda a, l, c: (0, 0))


def spread(rows, n):
    rows = sorted(rows, key=lambda r: r["price"])
    if len(rows) <= n:
        return rows
    step = len(rows) / n
    return [rows[int(i * step)] for i in range(n)]


def m2_of(r):
    """Los m² que se muestran en la ficha: cubiertos si están, si no los totales.
    Filtrar por otra cosa que la que se ve en la tarjeta sería confuso."""
    return int(r.get("cub") or r.get("tot") or 0)


M2_TXT = re.compile(r"([\d.]+)\s*m²")


def m2_from_specs(s):
    """Para las 192 originales, que solo tienen los m² dentro del texto."""
    m = M2_TXT.search(s or "")
    return int(m.group(1).replace(".", "")) if m else 0


def lid(slug):
    m = re.search(r"-(\d+)\.html$", slug)
    return m.group(1) if m else None


def main():
    vendidos = 0
    dead = load_dead()
    bajas = 0
    print("avisos verificados dados de baja:", len(dead))
    ex = json.load(open(os.path.join(D, "existing.json"), encoding="utf-8"))
    sc = json.load(open(os.path.join(D, "scraped.json"), encoding="utf-8"))
    sc = {k: v for k, v in sc.items() if not k.startswith("_")}   # drop cache bookkeeping
    # amb_lookup2 parses the real CFT1 field; amb_lookup (v1) used a text regex
    # that latched onto the "Ambientes" feature *category* and is not trusted.
    lookup = {}
    p = os.path.join(D, "amb_lookup2.json")
    if os.path.exists(p):
        lookup = {k: v.get("amb", 0) for k, v in json.load(open(p)).items()}

    by_id = {}
    for rows in sc.values():
        for r in rows:
            by_id.setdefault(r["id"], r)

    # --- 1. extend the original rows with ambientes + dormitorios ---
    unresolved = []
    for row in ex:
        i = lid(row[2])
        md = re.search(r"(\d+)\s*dorm", row[6])
        dorm = int(md.group(1)) if md else 0
        amb = 0
        s = by_id.get(i)
        if s and s.get("amb"):
            amb = s["amb"]
        elif lookup.get(i):
            amb = int(lookup[i])
        if amb > AMB_MAX or (dorm and amb < dorm):
            amb = 0
        if not amb:
            unresolved.append(i)
        # garden: prefer the sweep's flag (full listing text); fall back to the note
        gar = s.get("gar", 0) if s else int(bool(GARDEN.search(row[7])))
        # same rule as the new rows: no "jardín" in CABA notes. These originals
        # were carried over verbatim, and a few say nothing else at all.
        if row[0] == 3 and GARDEN.search(row[7]):
            fixed = note(s.get("d", ""), 3) if s else ""
            if not fixed:
                fixed = " ".join(f for f in re.split(r"\s*[,;·–-]\s*", row[7])
                                 if not GARDEN.search(f)).strip(" .,;–-")
            row[7] = fixed or specs(s or {}) or row[6]
        row.append(amb)
        row.append(dorm)
        row.append(gar)
        row.append(provider(row[0], (s or {}).get('loc') or row[9]))
        row.append('Zonaprop')
        la, lo = geo(s or {})
        row.append(la)
        row.append(lo)
        row.append(m2_of(s) if s else m2_from_specs(row[6]))
        row.append(patio_of(s or {}))
        row.append(feats_of((s or {}).get('d', '') or row[7]))

    # --- 2. new listings, sampled evenly across each region's price range ---
    have = {lid(r[2]) for r in ex}
    per = {}
    for rows in sc.values():
        for r in rows:
            if r["id"] in have:
                continue
            per.setdefault(r["reg"], {})[r["id"]] = r

    new = []
    for reg, d in per.items():
        cap = CAP.get(reg, NO_CAP)
        rows = list(d.values())
        # keep every 4+ bedroom listing (up to 60% of the region) — these are the
        # scarce ones and the whole point of the second sweep
        big = [r for r in rows if r["dorm"] >= 4]
        small = [r for r in rows if r["dorm"] < 4]
        big = spread(big, int(cap * 0.6))
        picked = big + spread(small, max(cap - len(big), 0))
        for r in picked:
            if is_dead(r.get("url", ""), dead):
                bajas += 1
                continue
            if sold(r.get("d"), r.get("addr")):
                vendidos += 1
                continue
            n = note(r.get("d", ""), reg)
            if not n:
                continue
            amb = r.get("amb", 0)
            if amb > AMB_MAX or (r.get("dorm") and amb < r["dorm"]):
                amb = 0          # publisher error -> unknown rather than a wrong bucket
            new.append([reg, r["img"], r["url"], f"{r['price']:,}".replace(",", "."),
                        r["price"], r.get("addr") or r.get("loc") or "", specs(r), n, 0,
                        r.get("loc") or "", amb, r.get("dorm", 0), r.get("gar", 0),
                        provider(reg, r.get("loc")), 'Zonaprop',
                        *geo(r), m2_of(r), patio_of(r), feats_of(r.get('d', ''))])

    # --- 3. Argenprop, como segunda fuente ---
    geo_cache = load_cache()
    ap_rows = []
    app = os.path.join(D, "argenprop_merged.json")
    if os.path.exists(app):
        ap = json.load(open(app, encoding="utf-8"))
        # no repetir un aviso que ya tenemos por Zonaprop
        seen_key = {dedupe_key(r[4], r[11], r[5]) for r in ex + new}
        for key, rows in ap.items():
            if key.startswith("_"):
                continue
            byreg = {}
            for r in rows:
                byreg.setdefault(r["reg"], []).append(r)
            for reg, rr in byreg.items():
                cap = int(CAP.get(reg, NO_CAP) * AP_SHARE)
                big = spread([x for x in rr if x["dorm"] >= 4], int(cap * 0.6))
                small = spread([x for x in rr if x["dorm"] < 4], max(cap - len(big), 0))
                for r in big + small:
                    bar = ap_barrio(r.get("loc", ""))
                    k = dedupe_key(r["price"], r.get("dorm", 0), r.get("addr", ""))
                    if k in seen_key:
                        continue
                    seen_key.add(k)
                    if is_dead(r.get("url", ""), dead):
                        bajas += 1
                        continue
                    if sold(r.get("d"), r.get("addr")):
                        vendidos += 1
                        continue
                    n = note(r.get("d", ""), reg)
                    if not n:
                        continue
                    ap_rows.append([reg, r["img"], r["url"],
                                    f"{r['price']:,}".replace(",", "."), r["price"],
                                    r.get("addr") or bar, specs(r), n, 0, bar,
                                    r.get("amb", 0), r.get("dorm", 0),
                                    int(bool(GARDEN.search(r.get("d", "")))),
                                    # Argenprop no publica coordenadas en el listado
                                    provider(reg, bar), 'Argenprop',
                                    *coords_for(r.get("addr"), r.get("loc"), geo_cache),
                                    m2_of(r), patio_of(r), feats_of(r.get("d", ""))])

    # --- Argenprop pedido barrio por barrio (caba_ap.py). El barrido general de
    # `capital-federal` traía ~100 avisos de toda la ciudad; por barrio entran muchos más.
    cap = os.path.join(D, "caba_ap.json")
    if os.path.exists(cap):
        n_before = len(ap_rows)
        have_ap = {r[2] for r in ap_rows}
        for key, bucket in json.load(open(cap, encoding="utf-8")).items():
            if key.startswith("_"):
                continue
            for r in bucket:
                if r["url"] in have_ap:
                    continue
                k = dedupe_key(r["price"], r.get("dorm", 0), r.get("addr", ""))
                if k in seen_key:
                    continue
                seen_key.add(k)
                have_ap.add(r["url"])
                if is_dead(r.get("url", ""), dead):
                    bajas += 1
                    continue
                if sold(r.get("d"), r.get("addr")):
                    vendidos += 1
                    continue
                n = note(r.get("d", ""), 3)
                if not n:
                    continue
                bar = r.get("barrio") or ""
                ap_rows.append([3, r["img"], r["url"], f"{r['price']:,}".replace(",", "."),
                                r["price"], r.get("addr") or bar, specs(r), n, 0, bar,
                                r.get("amb", 0), r.get("dorm", 0),
                                int(bool(GARDEN.search(r.get("d", "")))),
                                provider(3, bar), "Argenprop",
                                *coords_for(r.get("addr"), r.get("loc"), geo_cache),
                                m2_of(r), patio_of(r), feats_of(r.get("d", ""))])
        print("Argenprop por barrio: +", len(ap_rows) - n_before)

    print("vendidos/reservados descartados:", vendidos)
    print("dados de baja descartados:", bajas)
    allrows = ex + new + ap_rows
    allrows, dups = dedupe(allrows)
    print("repetidos sacados", dups)
    allrows.sort(key=lambda r: (r[0], r[4]))
    print("existing", len(ex), "unresolved amb", len(unresolved))
    print("new", len(new), "total", len(allrows))
    print("by region", Counter(r[0] for r in allrows))
    print("amb dist", Counter(r[10] for r in allrows))
    print("4+ dorm", sum(1 for r in allrows if r[11] >= 4),
          "| con jardín", sum(1 for r in allrows if r[12]))
    print("picks", sum(1 for r in allrows if r[8]))
    print("fuente", Counter(r[14] for r in allrows))
    print("con coordenadas", sum(1 for r in allrows if r[15] and r[16]))
    print("con m²", sum(1 for r in allrows if r[17]), "| >=100 m²", sum(1 for r in allrows if r[17] >= 100))
    from collections import Counter as _C
    fc = _C(FEATS[i][0] for r in allrows for i in r[19])
    print("rasgos:", dict(fc.most_common()))
    print("CABA distribuidora", Counter(r[13] for r in allrows if r[0] == 3))

    # etiqueta de barrio homogénea: la del barrido si está, si no la del propio row
    for r in allrows:
        b = norm_barrio((by_id.get(lid(r[2])) or {}).get("loc") or "") or norm_barrio(r[9])
        if b:
            r[9] = b
    if ONLY:
        before = len(allrows)
        allrows = [r for r in allrows if wanted(r)]
        print(f"recorte a {ONLY}: {len(allrows)} de {before}")
    # La búsqueda es de 3 ambientes para arriba. Un aviso con ambientes
    # *declarados* por debajo de eso no entra; con 0 es "no declarado" y se deja
    # pasar, porque el filtro de la página es por dormitorios.
    # sin ambientes, ni dormitorios, ni superficie no hay nada que evaluar
    empty = [r for r in allrows if not r[6].strip()]
    if empty:
        allrows = [r for r in allrows if r[6].strip()]
        print("descartados sin datos:", len(empty))
    small = [r for r in allrows if 0 < r[10] < 3]
    if small:
        allrows = [r for r in allrows if not (0 < r[10] < 3)]
        print("descartados por tener 1-2 ambientes:", len(small))
    far = drop_far_coords(allrows)
    print("coordenadas descartadas por lejanía:", far)
    js = "const D=" + json.dumps(allrows, ensure_ascii=False, separators=(",", ":")) + ";"
    open(os.path.join(D, "D.js"), "w", encoding="utf-8").write(js)
    print("data bytes", len(js.encode("utf-8")))
    json.dump(unresolved, open(os.path.join(D, "unresolved.json"), "w"))


if __name__ == "__main__":
    main()
