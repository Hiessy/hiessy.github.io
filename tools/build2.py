"""Merge the original 192 curated listings with the new sweep and rewrite index.html's data array.

Row shape (unchanged prefix, two new trailing fields):
  0 region  1 img  2 slug  3 priceStr  4 priceNum  5 address
  6 specs   7 note 8 pick  9 caption  10 ambientes  11 dormitorios  12 jardín
  13 distribuidora eléctrica  14 fuente (Zonaprop / Argenprop)  15 lat  16 lng  17 m²
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

BLOCK = re.compile(r"corredor|matr[ií]cula|\bcpi\b|cucicba|cmcp|contacto\s*:|responsable|"
                   r"inmobiliaria|\bmls\b|ficha\s*brick|@|https?:|www\.", re.I)
GOOD = re.compile(r"lote|terreno|patio|jard|pileta|quincho|refac|recicl|apto cr|escritur|"
                  r"cochera|galer|parrilla|dormitorio|planta|fondo|amplio|luminos|balc|"
                  r"terraza|suite|gas natural|permuta|vista", re.I)
GARDEN = re.compile(r"jard[ií]n|jardines", re.I)

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


def drop_far_coords(rows):
    """Saca las coordenadas que caen lejos del centro de su zona.

    La caja de Argentina no alcanza: un aviso de Floresta geocodificado en Chubut
    sigue estando en el país, pero rompe el encuadre del mapa de CABA. Se compara
    contra la *mediana* de la zona, que no se mueve por unos pocos outliers.
    """
    from statistics import median
    dropped = 0
    for reg in {r[0] for r in rows}:
        pts = [r for r in rows if r[0] == reg and r[15] and r[16]]
        if len(pts) < 5:
            continue
        clat, clng = median(r[15] for r in pts), median(r[16] for r in pts)
        for r in pts:
            dy = (r[15] - clat) * 111.0
            dx = (r[16] - clng) * 111.0 * 0.82      # cos(lat) a estas latitudes
            if (dx * dx + dy * dy) ** 0.5 > OUTLIER_KM:
                r[15] = r[16] = 0
                dropped += 1
    return dropped


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
                        *geo(r), m2_of(r)])

    # --- 3. Argenprop, como segunda fuente ---
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
                    n = note(r.get("d", ""), reg)
                    if not n:
                        continue
                    ap_rows.append([reg, r["img"], r["url"],
                                    f"{r['price']:,}".replace(",", "."), r["price"],
                                    r.get("addr") or bar, specs(r), n, 0, bar,
                                    r.get("amb", 0), r.get("dorm", 0),
                                    int(bool(GARDEN.search(r.get("d", "")))),
                                    # Argenprop no publica coordenadas en el listado
                                    provider(reg, bar), 'Argenprop', 0, 0, m2_of(r)])

    allrows = ex + new + ap_rows
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
    far = drop_far_coords(allrows)
    print("coordenadas descartadas por lejanía:", far)
    js = "const D=" + json.dumps(allrows, ensure_ascii=False, separators=(",", ":")) + ";"
    open(os.path.join(D, "D.js"), "w", encoding="utf-8").write(js)
    print("data bytes", len(js.encode("utf-8")))
    json.dump(unresolved, open(os.path.join(D, "unresolved.json"), "w"))


if __name__ == "__main__":
    main()
