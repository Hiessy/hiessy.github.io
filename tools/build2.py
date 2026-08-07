"""Merge the original 192 curated listings with the new sweep and rewrite index.html's data array.

Row shape (unchanged prefix, two new trailing fields):
  0 region  1 img  2 slug  3 priceStr  4 priceNum  5 address
  6 specs   7 note 8 pick  9 caption  10 ambientes  11 dormitorios
"""
import json, os, re
from collections import Counter

D = os.path.dirname(os.path.abspath(__file__))
REPO = r"C:\Users\Tincho\Documents\Proyects\hiessy.github.io"

# how many scraped listings to publish per region (the sweep found far more)
CAP = {3: 220, 4: 190, 5: 150, 2: 110, 0: 90, 1: 65}

BLOCK = re.compile(r"corredor|matr[ií]cula|\bcpi\b|cucicba|cmcp|contacto\s*:|responsable|"
                   r"inmobiliaria|\bmls\b|ficha\s*brick|@|https?:|www\.", re.I)
GOOD = re.compile(r"lote|terreno|patio|jard|pileta|quincho|refac|recicl|apto cr|escritur|"
                  r"cochera|galer|parrilla|dormitorio|planta|fondo|amplio|luminos|balc|"
                  r"terraza|suite|gas natural|permuta|vista", re.I)


def note(d):
    t = re.sub(r"&[a-z]+;", " ", d or "")
    t = re.sub(r"\bu\$?s?d?\s*[\d.,]+", "", t, flags=re.I)
    t = re.sub(r"\bUSD\s*[\d.,]+", "", t, flags=re.I)
    t = re.sub(r"[|•*]+", ". ", t)
    t = re.sub(r"\s+", " ", t).replace(" ,", ",").replace(" .", ".").strip()
    parts = [s.strip() for s in re.split(r"(?<!\d)[.!?]\s+(?=[A-ZÁÉÍÓÚÑa-z])", t)]
    parts = [s for s in parts if len(s) >= 18 and not BLOCK.search(s)]
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
        out = (parts[0] if parts else t)[:100]
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


def lid(slug):
    m = re.search(r"-(\d+)\.html$", slug)
    return m.group(1) if m else None


def main():
    ex = json.load(open(os.path.join(D, "existing.json"), encoding="utf-8"))
    sc = json.load(open(os.path.join(D, "scraped.json"), encoding="utf-8"))
    lookup = {}
    p = os.path.join(D, "amb_lookup.json")
    if os.path.exists(p):
        lookup = json.load(open(p))

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
        if not amb:
            unresolved.append(i)
        row.append(amb)
        row.append(dorm)

    # --- 2. new listings, sampled evenly across each region's price range ---
    have = {lid(r[2]) for r in ex}
    per = {}
    for rows in sc.values():
        for r in rows:
            if r["id"] in have or not r.get("amb"):
                continue
            per.setdefault(r["reg"], {})[r["id"]] = r

    new = []
    for reg, d in per.items():
        rows = sorted(d.values(), key=lambda r: r["price"])
        cap = CAP.get(reg, 100)
        if len(rows) > cap:
            step = len(rows) / cap
            rows = [rows[int(i * step)] for i in range(cap)]
        for r in rows:
            n = note(r.get("d", ""))
            if not n:
                continue
            new.append([reg, r["img"], r["url"], f"{r['price']:,}".replace(",", "."),
                        r["price"], r.get("addr") or r.get("loc") or "", specs(r), n, 0,
                        r.get("loc") or "", r.get("amb", 0), r.get("dorm", 0)])

    allrows = ex + new
    allrows.sort(key=lambda r: (r[0], r[4]))
    print("existing", len(ex), "unresolved amb", len(unresolved))
    print("new", len(new), "total", len(allrows))
    print("by region", Counter(r[0] for r in allrows))
    print("amb dist", Counter(r[10] for r in allrows))
    print("picks", sum(1 for r in allrows if r[8]))

    js = "const D=" + json.dumps(allrows, ensure_ascii=False, separators=(",", ":")) + ";"
    open(os.path.join(D, "D.js"), "w", encoding="utf-8").write(js)
    print("data bytes", len(js.encode("utf-8")))
    json.dump(unresolved, open(os.path.join(D, "unresolved.json"), "w"))


if __name__ == "__main__":
    main()
