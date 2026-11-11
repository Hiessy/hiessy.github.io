# -*- coding: utf-8 -*-
"""Builds ranch/assets/model/survey.js from the survey's vectors (vec/vec.json), the
wall polygons (vec/polys_*.json) and the openings and rooms found by sem.py
(vec/sem.json).

House coordinates, meters: x = -depth (east is +x, the street side),
y = along the inner walls, south to north; (0, 0) is the lot's south corner
on the building line. Path data is in centimeters, y up.

Usage: python -I mksurvey.py <out.js>   (run from the scratchpad folder)"""
import sys, json, math, re, os

out = sys.argv[1]
F = json.load(open("vec/frame.json")); K = F["K"]
D = json.load(open("vec/vec.json", encoding="utf-8"))
SEM = json.load(open("vec/sem.json"))
O = {"0": F["O"], "1": F["PA"]}
TILT = 0.852 / 20.168
WING_SHIFT = -0.95


def divider(y):
    return 800 + (1581.44 - y) * 0.0905


def in_pb(cx, cy):
    return 100 < cx < divider(cy) and 480 < cy < 1700


def in_pa(cx, cy):
    return divider(cy) <= cx < 1520 and 480 < cy < 1700 and not (cx > 1290 and cy < 1000)


REG = {"0": in_pb, "1": in_pa}


def centre(p):
    xs = [a for a, b in p["p"]]; ys = [b for a, b in p["p"]]
    return (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2


def ab(pt, org):
    return ((pt[0] - org[0]) / K, (org[1] - pt[1]) / K)


def shift1(a, b):
    return (a, b + WING_SHIFT) if (a < 9 and b > 20) else (a, b)


def hx(a, b):
    """Survey (a, b) to house (x, y)."""
    return (-b, a)


def dp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    best, bi = 0, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = math.hypot(p[0] - a[0], p[1] - a[1]) if L < 1e-9 else abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / L
        if d > best:
            best, bi = d, i
    if best <= eps:
        return [a, b]
    return dp(pts[:bi + 1], eps)[:-1] + dp(pts[bi:], eps)


def is_hexagon(pts):
    if len(pts) != 7 or pts[0] != pts[-1]:
        return False
    ls = [math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(6)]
    return max(ls) < 1.25 * min(ls) and 5 < sum(ls) < 80


def d_of(paths):
    """Path data in centimeters from polylines in meters."""
    parts = []
    for pts in paths:
        q = [(int(round(x * 100)), int(round(y * 100))) for x, y in pts]
        r = [q[0]]
        for v in q[1:]:
            if v != r[-1]:
                r.append(v)
        if len(r) < 2:
            continue
        closed = len(r) > 3 and r[0] == r[-1]
        if closed:
            r = r[:-1]
        s = "M%d %d" % r[0]
        px, py = r[0]
        for x, y in r[1:]:
            dx, dy = x - px, y - py
            s += ("h%d" % dx) if dy == 0 else ("v%d" % dy) if dx == 0 else ("l%d %d" % (dx, dy))
            px, py = x, y
        parts.append(s + ("z" if closed else ""))
    return "".join(parts)


# ------------------------------------------------------------------ plans
THIN = {"Vista", "Corte2", "Corte 2"}
plans = {}
for lv in ("0", "1"):
    org = O[lv]
    cls = {"thin": [], "arcs": [], "proj": [], "fix": [], "roof": []}
    for p in D["paths"]:
        if p["f"]:
            continue
        cx, cy = centre(p)
        if not REG[lv](cx, cy):
            continue
        l, w, pts = p["l"], p["w"], p["p"]
        if l in THIN or (l == "Corte" and w < 1):
            if is_hexagon(pts):
                continue
            c = "thin"
        elif l == "Vista 2":
            if len(pts) == 2:
                a, b = pts
                ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 90
                L = math.hypot(b[0] - a[0], b[1] - a[1])
                if lv == "1" or 20 < ang < 70 or L < 8:   # wall and roof hatching, line by line
                    continue
            elif lv == "1" and len(pts) < 8:
                continue
            c = "arcs"
        elif l == "ABERTURAS" and lv == "1" and w > 0.3 and len(pts) > 2:
            c = "arcs"                                    # the apartment's red door leaves
        elif l == "Proyeccion":
            c = "proj"
        elif l == "equipamiento":
            c = "fix"
        elif l == "0" and lv == "1" and w < 1:
            c = "roof"
        else:
            continue
        q = [ab(v, org) for v in pts]
        if lv == "1":
            q = [shift1(*v) for v in q]
        cls[c].append(dp([hx(*v) for v in q], 0.004))
    plans[lv] = {k: d_of(v) for k, v in cls.items() if v}
    print("level", lv, {k: (len(v), len(plans[lv].get(k, ""))) for k, v in cls.items()})


def pier(a0, a1, depth=0.31):
    return [[a0, TILT * a0], [a1, TILT * a1], [a1, TILT * a1 + depth], [a0, TILT * a0 + depth]]


walls = {}
for lv, name in (("0", "pb"), ("1", "pa")):
    polys = json.load(open("vec/polys_%s.json" % name))["polys"]
    if lv == "0":
        polys = polys + [pier(4.95, 5.15), pier(6.25, 6.5), pier(7.78, 8.05), pier(9.95, 10.16), pier(12.40, 12.61),
                         [[6.0, 16.51], [6.2, 16.51], [6.2, 16.66], [6.0, 16.66]]]
    else:
        polys = [[list(shift1(q[0], q[1])) for q in p] for p in polys]
    walls[lv] = [[round(v, 3) for q in p for v in hx(*q)] for p in polys]
    print("walls", lv, len(walls[lv]), sum(len(r) for r in walls[lv]) // 2, "vertices")

rooms = {}
for name, r in SEM["rooms"].items():
    rooms[name] = [round(v, 3) for q in r["poly"] for v in hx(*q)]
opens = []
for o in SEM["openings"]:
    e = {"id": o["id"], "kind": o["kind"], "level": o["level"],
         "a": [round(v, 3) for v in hx(*o["a"])], "b": [round(v, 3) for v in hx(*o["b"])], "t": o["t"]}
    for k in ("hinge", "swing", "glass", "join"):
        if k in o and o[k] not in ("?", 0):
            e[k] = o[k]
    opens.append(e)

# --------------------------------------------------------------- sections
# name: (x0, y0, x1, y1 window in view points; origin: view point where the
# distance along the cut and the height are zero)
SEC = {
    "A": ((95, 20, 1190, 292), (234.14, 264.76)),     # along the depth, at a = 6.9: x is the depth
    "B": ((1535, 30, 2135, 292), (1568.1, 263.34)),   # along the drive: x is the depth
    "C": ((2990, 20, 3425, 292), (2944.0, 268.8)),    # across the wing: x runs south to north
    "D": ((2760, 330, 3480, 562), (2794.4, 545.95)),  # along the front rooms: x runs south to north
    "F": ((2760, 600, 3480, 884), (2806.0, 827.5)),   # the street front
}
SKIP = {"Haches", "ELECTRICIDAD", "COTAS", "COTASsss", "Vista 2", "Rotulo 1", "cotas100", "HATCH", "Ejes", "textos", "lavado ray"}
LEVEL = re.compile(r"^[+±]\s*\d+\.\d\d$")
sections = {}
for name, (win, org) in SEC.items():
    cut, thin = [], []
    for p in D["paths"]:
        if p["f"] or p["l"] in SKIP:
            continue
        cx, cy = centre(p)
        if not (win[0] <= cx <= win[2] and win[1] <= cy <= win[3]):
            continue
        if any(q[0] < win[0] - 6 or q[0] > win[2] + 6 or q[1] < win[1] - 6 or q[1] > win[3] + 6 for q in p["p"]):
            continue                                      # the sheet's frame and leader lines
        pts = [((q[0] - org[0]) / K, (org[1] - q[1]) / K) for q in p["p"]]
        if is_hexagon(p["p"]):
            continue
        (cut if p["w"] >= 1.2 else thin).append(dp(pts, 0.004))
    marks, names = [], []
    for t in D["texts"]:
        if not (win[0] <= t["x"] <= win[2] and win[1] <= t["y"] <= win[3]):
            continue
        x, y = (t["x"] - org[0]) / K, (org[1] - t["y"]) / K
        s = t["s"].strip()
        if re.fullmatch(r"[^0-9A-Za-z]\s*\d+\.\d\d", s):
            sign = s[0] if s[0] in "+-" else "±"
            marks.append([round(x, 2), round(y, 2), sign + s[1:].strip()])
        elif t["l"] == "equipamiento" and re.fullmatch(r"[^0-9:.,+]{4,}", s) and t["h"] < 9 and not s.lower().startswith(("tanque", "cap", "revo", "cier", "port", "cubi", "ondu", "frat", "termi", "y fino", "revest")):
            names.append([round(x, 2), round(y, 2), re.sub(r"[^A-Z \-]", "N", s.upper())])
    allp = [q for pl in cut + thin for q in pl]
    box = [round(min(q[0] for q in allp), 2), round(min(q[1] for q in allp), 2),
           round(max(q[0] for q in allp), 2), round(max(q[1] for q in allp), 2)]
    sections[name] = {"box": box, "cut": d_of(cut), "thin": d_of(thin), "marks": marks, "names": names}
    print("section", name, "box", box, "cut", len(cut), "thin", len(thin), "marks", [m[2] for m in marks], "names", [n[2] for n in names])


def js(o):
    return json.dumps(o, separators=(",", ":"), ensure_ascii=False)


with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write("/* Generated from the survey plan of August 2015 by tools/mksurvey.py: do not\n"
            "   edit by hand. Meters, x east (the street side), y north along the inner\n"
            "   walls, (0, 0) at the lot's south corner on the building line.\n"
            "   walls: closed polygons [x1, y1, x2, y2, ...] per level;\n"
            "   rooms: each room's floor, wall face to wall face, by its number;\n"
            "   openings: doors and windows, from jamb a to jamb b on the wall's middle,\n"
            "     t the wall's thickness, hinge the jamb(s) the leaf hangs on, swing the\n"
            "     side it opens to (+1 is left of a->b);\n"
            "   plan: the survey's own thin lines as SVG path data, in centimeters;\n"
            "   sections: its four cuts and the street front, x along the cut and y the\n"
            "     height above the sidewalk, path data in centimeters. */\n")
    f.write("window.SURVEY={\nwalls:{\n")
    for lv in ("0", "1"):
        f.write(lv + ":[\n" + ",\n".join(js(w) for w in walls[lv]) + "\n]" + ("," if lv == "0" else "") + "\n")
    f.write("},\nrooms:{\n" + ",\n".join(js(k) + ":" + js(v) for k, v in rooms.items()) + "\n},\n")
    f.write("openings:[\n" + ",\n".join(js(o) for o in opens) + "\n],\n")
    f.write("plan:{\n")
    for lv in ("0", "1"):
        f.write(lv + ":{\n" + ",\n".join(k + ":" + js(v) for k, v in plans[lv].items()) + "\n}" + ("," if lv == "0" else "") + "\n")
    f.write("},\nsections:{\n")
    f.write(",\n".join(k + ":{\n" + ",\n".join(kk + ":" + js(vv) for kk, vv in v.items()) + "\n}" for k, v in sections.items()))
    f.write("\n}\n};\n")
print(out, os.path.getsize(out), "bytes")
