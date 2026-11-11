# -*- coding: utf-8 -*-
"""The meaning of the survey's lines: every door, window and room.

Openings are listed by hand as a point in the gap and the way the wall runs;
the tool finds the two jambs on the survey's own wall polygons, the wall's
thickness there, and which way each door swings (from the leaf the survey
draws). Rooms are flood-filled from a seed point, with doors and windows
closed, and traced back to polygons on the wall faces.

Works in survey coordinates: a along the inner walls (south to north), b the
depth from the street. Writes vec/sem.json and check pictures.
Usage: python -I sem.py   (from the scratchpad folder)"""
import json, math, sys
from PIL import Image, ImageDraw, ImageFont

F = json.load(open("vec/frame.json")); K = F["K"]
D = json.load(open("vec/vec.json", encoding="utf-8"))
TILT = 0.852 / 20.168            # the building line's slope: b = TILT * a
WING_SHIFT = -0.95               # the upper plan draws the wing's end 0.95 m too deep


def shift1(a, b):
    """Upper plan to ground plan coordinates."""
    return (a, b + WING_SHIFT) if (a < 9 and b > 20) else (a, b)


def load_polys(name, upper=False):
    P = json.load(open("vec/polys_%s.json" % name))["polys"]
    if upper:
        P = [[list(shift1(q[0], q[1])) for q in p] for p in P]
    return P


def pier(a0, a1, depth=0.31):
    """A pier of the hall's glazed front, on the building line."""
    return [[a0, TILT * a0], [a1, TILT * a1], [a1, TILT * a1 + depth], [a0, TILT * a0 + depth]]


WALLS = {
    0: load_polys("pb") + [pier(4.95, 5.15), pier(6.25, 6.5), pier(7.78, 8.05), pier(9.95, 10.16), pier(12.40, 12.61),
        [[6.0, 16.51], [6.2, 16.51], [6.2, 16.66], [6.0, 16.66]]],   # the post between V19 and the garden door
    1: load_polys("pa", True),
}


def inside(x, y, poly):
    c = False
    n = len(poly)
    for i in range(n):
        xi, yi = poly[i]; xj, yj = poly[i - 1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
    return c


BB = {lv: [(min(q[0] for q in p), min(q[1] for q in p), max(q[0] for q in p), max(q[1] for q in p)) for p in ps]
      for lv, ps in WALLS.items()}


def inwall(lv, x, y):
    for p, bb in zip(WALLS[lv], BB[lv]):
        if bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3] and inside(x, y, p):
            return True
    return False


def march(lv, x, y, ux, uy, maxd=4.5, step=0.004):
    """Distance from (x, y) along (ux, uy) to the first wall."""
    d = 0.0
    while d < maxd:
        d += step
        if inwall(lv, x + ux * d, y + uy * d):
            return d - step / 2
    return None


def thickness(lv, x, y, nx, ny):
    """Wall thickness through (x, y), a point inside a wall, along the normal;
    and the offset of the wall's middle from that point."""
    dp = dm = 0.0
    while dp < 0.8 and inwall(lv, x + nx * (dp + 0.004), y + ny * (dp + 0.004)):
        dp += 0.004
    while dm < 0.8 and inwall(lv, x - nx * (dm + 0.004), y - ny * (dm + 0.004)):
        dm += 0.004
    return dp + dm, (dp - dm) / 2


def unit(spec):
    if spec == "h":
        return (1.0, 0.0)
    if spec == "v":
        return (0.0, 1.0)
    if spec == "f":
        n = math.hypot(1, TILT)
        return (1 / n, TILT / n)
    a = math.radians(float(spec))
    return (math.cos(a), math.sin(a))


# ---------------------------------------------------------------- openings
# (id, kind, level, a, b, dir [, options])  kind: door, double, open, window,
# high (a clerestory), glass (a glazed door), slide, gate. Options: w=  forces
# a width around the point; ends=(a0, a1) gives both ends on the building line.
SPEC = [
    # ---- ground floor: doors
    ("P3", "door", 0, 4.80, 1.06, "v"),            # bedroom 2 - hall
    ("P4", "door", 0, 8.95, 2.51, "h"),            # hall - sitting room 4
    ("P4", "door", 0, 8.23, 3.80, "v"),            # bedroom 3 - sitting room 4
    ("P4", "door", 0, 1.56, 5.26, "h"),            # bedroom 2 - store 7
    ("P5", "door", 0, 3.20, 5.26, "h"),            # bedroom 2 - bath 8
    ("P5", "door", 0, 4.45, 5.26, "h"),            # bedroom 3's lobby - bath 9
    ("",   "open", 0, 4.88, 3.80, "v", {"join": 1}),  # bedroom 3 - its lobby
    ("P5", "door", 0, 4.88, 8.36, "v"),            # bedroom 11 - bath 10
    ("P6", "double", 0, 6.55, 9.06, "h"),          # bedroom 11 - corridor
    ("",   "open", 0, 10.45, 9.06, "h"),           # dining 12 - corridor
    ("",   "open", 0, 10.75, 5.26, "h"),           # sitting 4 - dining 12
    ("P6", "double", 0, 14.36, 9.06, "h"),         # bedroom 13 - corridor
    ("P5", "door", 0, 16.00, 9.06, "h"),           # bedroom 13 - bath 15
    ("P3", "door", 0, 1.70, 9.10, "h"),            # store 7 - passage 34
    ("P4", "door", 0, 1.68, 10.36, "h"),           # passage 34 - kitchen
    ("P7", "door", 0, 4.85, 9.70, "v"),            # passage 34 - corridor
    ("P7", "door", 0, 5.60, 11.76, "h"),           # corridor - bath 19
    ("P8", "door", 0, 10.85, 11.76, "h"),          # corridor - glazed room
    ("P4", "door", 0, 2.03, 13.66, "h"),           # kitchen - passage 18
    ("P5", "door", 0, 4.22, 13.66, "h"),           # kitchen - laundry
    ("P4", "door", 0, 4.98, 15.87, "83"),          # passage 18 - glazed room
    ("",   "open", 0, 2.28, 16.30, "h"),           # passage 18 - bedroom 21
    ("P10", "glass", 0, 6.70, 16.585, "h"),        # glazed room - garden (west)
    ("P10", "glass", 0, 10.15, 16.585, "h"),       # glazed room - garden
    ("P9", "double", 0, 13.18, 13.80, "v", {"glass": 1}),  # glazed room - drive
    ("P4", "door", 0, 6.00, 18.06, "h"),           # store 23 - outside
    ("P4", "door", 0, 3.76, 20.63, "h"),           # bath 22 - bedroom 24
    ("P3", "door", 0, 7.05, 20.90, "v"),           # bedroom 24 - galeria
    ("P3", "door", 0, 7.05, 25.65, "v"),           # bedroom 25 - galeria
    ("P4", "door", 0, 3.98, 26.43, "h"),           # bedroom 25 - bath 26
    ("P5", "door", 0, 15.10, 1.91, "h"),           # bedroom 6 - bath 5
    ("P4", "door", 0, 16.61, 4.70, "v"),           # bedroom 6 - drive
    ("P1", "door", 0, 14.08, 0.75, "f"),           # stair - street
    ("P2", "double", 0, 0, 0, "f", {"ends": (6.5, 7.78), "glass": 1}),   # main entrance
    # ---- ground floor: windows
    ("V4", "window", 0, 2.50, 0.26, "f"),
    ("V3", "window", 0, 0, 0, "f", {"ends": (5.15, 6.25)}),
    ("V2", "window", 0, 0, 0, "f", {"ends": (8.05, 9.95)}),
    ("V1", "window", 0, 0, 0, "f", {"ends": (10.16, 12.40)}),
    ("V5", "window", 0, 6.55, 2.51, "h"),          # bedroom 3 onto the hall
    ("V6", "window", 0, 11.00, 2.60, "h"),         # sitting room onto the hall
    ("V7", "window", 0, 16.61, 1.30, "v"),
    ("V8", "window", 0, 16.61, 3.30, "v"),
    ("V9", "window", 0, 16.61, 7.16, "v"),
    ("V10", "window", 0, 15.93, 11.76, "h"),
    ("V11", "window", 0, 14.25, 11.76, "h"),
    ("V12", "window", 0, 7.60, 11.76, "h"),
    ("V13", "window", 0, 6.53, 13.06, "v"),
    ("V10", "window", 0, 4.88, 14.62, "v"),
    ("V16", "window", 0, 13.18, 12.45, "v"),
    ("V17", "window", 0, 13.18, 15.63, "v"),
    ("V18", "window", 0, 8.45, 16.585, "h"),
    ("V18", "window", 0, 11.95, 16.585, "h"),
    ("V19", "window", 0, 5.60, 16.585, "h"),
    ("V20", "window", 0, 5.13, 17.35, "83.6"),
    ("V21", "window", 0, 7.05, 19.10, "v"),
    ("V22", "window", 0, 7.05, 22.40, "v"),
    ("V22", "window", 0, 7.05, 24.55, "v"),
    ("V23", "window", 0, 4.54, 27.16, "v"),
    # ---- upper level
    ("P3", "door", 1, 16.95, 2.02, "v"),           # landing - living room
    ("PV1", "slide", 1, 18.40, 1.12, "h"),         # living room - street balcony
    ("P4", "door", 1, 18.20, 8.32, "h"),           # bedroom - bath 28
    ("P4", "door", 1, 19.76, 6.47, "84"),          # bath 29 - hallway
    ("P3", "door", 1, 19.92, 8.80, "84"),          # hallway - bedroom
    ("PV2", "slide", 1, 17.80, 11.85, "h"),        # bedroom - rear balcony
    ("",   "open", 1, 20.20, 6.06, "h"),           # living room - hallway
    ("",   "open", 1, 20.30, 11.80, "h"),          # hallway - kitchen
    ("V26", "window", 1, 15.80, 0.75, "f"),
    ("V26b", "block", 1, 14.12, 0.68, "f"),        # glass blocks on the stair
    ("V27", "window", 1, 16.95, 6.68, "v"),
    ("V28", "window", 1, 16.95, 10.93, "v"),
    ("V28", "window", 1, 18.62, 12.25, "v"),
    ("V29", "window", 1, 20.20, 13.45, "h"),
    ("P4", "door", 1, 3.85, 25.85, "v"),           # the tower's door
    ("V24", "window", 1, 4.40, 26.45, "h"),
    ("V25", "window", 1, 7.05, 26.07, "v"),
    ("V25", "window", 1, 7.05, 25.67, "v"),
    ("V25", "window", 1, 7.05, 24.07, "v"),
    ("V25", "window", 1, 7.05, 23.67, "v"),
]

SCHED = {"P1": (.9, 2.05), "P2": (1.4, 2.05), "P3": (.75, 2.05), "P4": (.8, 2.05), "P5": (.7, 2.05), "P6": (1.1, 2.75),
         "P7": (.85, 2.05), "P8": (1.1, 2.05), "P9": (1.5, 2.5), "P10": (1.0, 2.5), "PV1": (2.0, 2.05), "PV2": (1.4, 2.05),
         "V1": (1.85, 2.05), "V2": (1.95, 2.05), "V3": (1.15, 2.05), "V4": (1.6, 1.0), "V5": (1.55, 1.25),
         "V6": (3.0, 2.3), "V7": (.3, .6), "V8": (1.0, 1.0), "V9": (1.4, .9), "V10": (.4, .4), "V11": (1.85, .95),
         "V12": (2.0, .95), "V13": (.4, .4), "V14": (1.8, .4), "V15": (1.0, .4), "V16": (1.15, 2.5), "V17": (2.0, 2.5),
         "V18": (2.5, 2.5), "V19": (.85, 2.85), "V20": (1.3, 1.0), "V21": (.6, .85), "V22": (1.45, 1.2),
         "V23": (.9, .6), "V24": (.6, .6), "V25": (.2, .6), "V26": (1.2, 1.2), "V27": (.6, .3), "V28": (.6, .95),
         "V29": (2.0, .95)}


def leaves(lv):
    """Door leaves the survey draws: thin strokes about a door wide."""
    org = F["O"] if lv == 0 else F["PA"]
    out = []
    for p in D["paths"]:
        if p["l"] not in ("Vista", "ABERTURAS") or p["f"]:
            continue
        pts = [((q[0] - org[0]) / K, (org[1] - q[1]) / K) for q in p["p"]]
        if lv == 1:
            pts = [shift1(*q) for q in pts]
        best = None
        for q1, q2 in zip(pts, pts[1:]):
            L = math.hypot(q2[0] - q1[0], q2[1] - q1[1])
            if best is None or L > best[0]:
                best = (L, q1, q2)
        if best and 0.3 <= best[0] <= 1.25:
            xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
            # thin: its box is narrow across the long edge
            ux, uy = (best[2][0] - best[1][0]) / best[0], (best[2][1] - best[1][1]) / best[0]
            across = max(abs((q[0] - best[1][0]) * -uy + (q[1] - best[1][1]) * ux) for q in pts)
            if across < 0.09:
                out.append((best[1], best[2]))
    return out


LEAF = {0: leaves(0), 1: leaves(1)}
opens = []
for s in SPEC:
    idn, kind, lv, a, b, dr = s[:6]
    opt = s[6] if len(s) > 6 else {}
    ux, uy = unit(dr)
    nx, ny = -uy, ux
    if "ends" in opt:
        a0, a1 = opt["ends"]
        off = 0.155
        A = (a0 - TILT * off, TILT * a0 + off); B = (a1 - TILT * off, TILT * a1 + off)
        t = 0.31
    else:
        if inwall(lv, a, b):
            print("!! point inside a wall:", s); continue
        d1 = march(lv, a, b, ux, uy); d2 = march(lv, a, b, -ux, -uy)
        if d1 is None or d2 is None:
            print("!! no jamb found:", s, d1, d2); continue
        A = (a - ux * d2, b - uy * d2); B = (a + ux * d1, b + uy * d1)
        tA, oA = thickness(lv, A[0] - ux * 0.03, A[1] - uy * 0.03, nx, ny)
        tB, oB = thickness(lv, B[0] + ux * 0.03, B[1] + uy * 0.03, nx, ny)
        # put the opening on the middle of the thinner jamb (a pier may be wider than the wall)
        t, o = (tA, oA) if tA <= tB else (tB, oB)
        if t < 0.05:
            t, o = max(tA, tB), (oA if tA > tB else oB)
        A = (A[0] + nx * o, A[1] + ny * o); B = (B[0] + nx * o, B[1] + ny * o)
    w = math.hypot(B[0] - A[0], B[1] - A[1])
    o = {"id": idn, "kind": kind, "level": lv, "a": [round(A[0], 3), round(A[1], 3)], "b": [round(B[0], 3), round(B[1], 3)],
         "w": round(w, 3), "t": round(t, 3)}
    o.update({k: v for k, v in opt.items() if k != "ends"})
    if kind in ("door", "double", "glass"):
        hits = []
        for e1, e2 in LEAF[lv]:
            for J, nm in ((A, "a"), (B, "b")):
                for E, Eo in ((e1, e2), (e2, e1)):
                    if math.hypot(E[0] - J[0], E[1] - J[1]) < t / 2 + 0.16:
                        side = (Eo[0] - J[0]) * nx + (Eo[1] - J[1]) * ny
                        along = (Eo[0] - J[0]) * ux + (Eo[1] - J[1]) * uy
                        hits.append((nm, 1 if side > 0 else -1, round(math.hypot(Eo[0] - E[0], Eo[1] - E[1]), 2), round(abs(side), 2), round(along, 2)))
        # keep leaves that stand away from the wall (drawn open)
        hits = [h for h in hits if h[3] > 0.25] or hits
        if hits:
            o["hinge"] = "".join(sorted(set(h[0] for h in hits)))
            o["swing"] = max(set(h[1] for h in hits), key=[h[1] for h in hits].count)
        else:
            o["hinge"] = "?"
    sw = SCHED.get(idn)
    opens.append(o)
    print("%-4s %-6s L%d (%.2f, %.2f)-(%.2f, %.2f) w %.2f t %.2f %s %s%s" % (
        idn or "-", kind, lv, A[0], A[1], B[0], B[1], w, t, ("sched %.2f" % sw[0]) if sw else "",
        ("hinge %s swing %+d" % (o.get("hinge"), o.get("swing", 0))) if "hinge" in o else "",
        "   <-- width" if sw and abs(sw[0] - w) > 0.16 else ""))

# ---------------------------------------------------------------- rooms
# Seeds: (name, level, a, b). Names are the page's room numbers or space ids.
SEEDS = [
    ("1", 0, 7.8, 1.5), ("2", 0, 2.0, 2.4), ("3", 0, 6.5, 3.9), ("4", 0, 10.5, 3.9), ("5", 0, 15.9, 1.4),
    ("6", 0, 14.0, 3.9), ("7", 0, 1.5, 7.0), ("8", 0, 2.95, 6.6), ("9", 0, 4.25, 6.6), ("10", 0, 3.6, 8.45),
    ("11", 0, 7.0, 7.0), ("12", 0, 10.7, 7.0), ("13", 0, 14.6, 7.0), ("14", 0, 9.5, 10.4), ("15", 0, 15.95, 10.4),
    ("34", 0, 3.0, 9.8), ("16", 0, 3.0, 12.0), ("17", 0, 3.9, 14.3), ("18", 0, 3.6, 15.7), ("19", 0, 5.7, 13.2),
    ("20", 0, 9.5, 14.2), ("21", 0, 3.4, 17.6), ("22", 0, 3.2, 20.0), ("23", 0, 6.0, 19.8), ("24", 0, 4.5, 22.0),
    ("25", 0, 4.5, 25.0), ("26", 0, 3.6, 27.2), ("aptstair", 0, 13.5, 1.6),
    ("35", 1, 15.6, 1.6), ("27", 1, 18.5, 3.5), ("28", 1, 17.8, 7.2), ("29", 1, 19.3, 7.2), ("30", 1, 18.4, 10.0),
    ("31", 1, 20.0, 12.6), ("32", 1, 20.45, 9.0), ("33", 1, 5.4, 25.0),
]
EXTRA_CLOSE = {
    0: [],
    1: [((14.82, 0.6), (14.82, 2.6))],       # landing - stair treads
}
RES = 0.02
A0, B0, A1, B1 = -1.0, -1.5, 23.0, 30.0
Wp, Hp = int((A1 - A0) / RES), int((B1 - B0) / RES)


def px(a, b):
    return ((a - A0) / RES, (B1 - b) / RES)


rooms = {}
for lv in (0, 1):
    img = Image.new("L", (Wp, Hp), 0)
    dr = ImageDraw.Draw(img)
    for p in WALLS[lv]:
        dr.polygon([px(*q) for q in p], fill=255, outline=255)
    for o in opens:
        if o["level"] == lv and not o.get("join"):
            dr.line([px(*o["a"]), px(*o["b"])], fill=255, width=2)
    for c1, c2 in EXTRA_CLOSE[lv]:
        dr.line([px(*c1), px(*c2)], fill=255, width=2)
    base = img.copy()
    for name, slv, a, b in SEEDS:
        if slv != lv:
            continue
        im = base.copy()
        x, y = px(a, b)
        if im.getpixel((int(x), int(y))) != 0:
            print("!! seed in a wall:", name); continue
        ImageDraw.floodfill(im, (int(x), int(y)), 128)
        hist = im.histogram()
        area = hist[128] * RES * RES
        bb = im.point(lambda v: 255 if v == 128 else 0).getbbox()
        leak = bb[0] <= 1 or bb[1] <= 1 or bb[2] >= Wp - 1 or bb[3] >= Hp - 1
        print("room %-8s area %6.2f m2 %s" % (name, area, "  <-- LEAKS" if leak or area > 60 else ""))
        rooms[name] = {"level": lv, "area": round(area, 2), "mask": im.point(lambda v: 255 if v == 128 else 0)}


# ---- trace each mask to a polygon, then snap its corners to the walls
def trace(mask):
    w, h = mask.size
    pix = mask.load()
    bb = mask.getbbox()
    edges = {}
    for y in range(max(0, bb[1] - 1), min(h, bb[3] + 1)):
        for x in range(max(0, bb[0] - 1), min(w, bb[2] + 1)):
            if not pix[x, y]:
                continue
            # directed so that the room stays on the left of each edge
            if y == 0 or not pix[x, y - 1]:
                edges.setdefault((x + 1, y), []).append((x, y))
            if y == h - 1 or not pix[x, y + 1]:
                edges.setdefault((x, y + 1), []).append((x + 1, y + 1))
            if x == 0 or not pix[x - 1, y]:
                edges.setdefault((x, y), []).append((x, y + 1))
            if x == w - 1 or not pix[x + 1, y]:
                edges.setdefault((x + 1, y + 1), []).append((x + 1, y))
    loops = []
    while edges:
        start = next(iter(edges))
        loop = [start]; cur = start
        while True:
            nxt = edges[cur].pop()
            if not edges[cur]:
                del edges[cur]
            if nxt == start:
                break
            loop.append(nxt); cur = nxt
        loops.append(loop)
    return max(loops, key=len)


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


def snap_poly(lv, poly):
    V = [q for p in WALLS[lv] for q in p]
    for o in opens:
        if o["level"] == lv:
            V.append(o["a"]); V.append(o["b"])
    out = []
    for x, y in poly:
        best = None
        for q in V:
            d = math.hypot(q[0] - x, q[1] - y)
            if d < 0.09 and (best is None or d < best[0]):
                best = (d, q)
        out.append((round(best[1][0], 3), round(best[1][1], 3)) if best else (round(x, 2), round(y, 2)))
    res = []
    for q in out:
        if not res or q != res[-1]:
            res.append(q)
    if len(res) > 1 and res[0] == res[-1]:
        res.pop()
    # drop points on a straight run
    clean = []
    n = len(res)
    for i in range(n):
        a, b, c = res[i - 1], res[i], res[(i + 1) % n]
        cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        if abs(cr) > 0.004:
            clean.append(b)
    return clean


out_rooms = {}
for name, r in rooms.items():
    loop = trace(r["mask"])
    pts = [(A0 + x * RES, B1 - y * RES) for x, y in loop]
    # split at the two farthest points so the simplification has fixed ends
    i0 = 0
    i1 = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
    simp = dp(pts[i0:i1 + 1], 0.035)[:-1] + dp(pts[i1:] + [pts[0]], 0.035)[:-1]
    poly = snap_poly(r["level"], simp)
    out_rooms[name] = {"level": r["level"], "area": r["area"], "poly": poly}
    print("  %-8s %2d corners" % (name, len(poly)))

json.dump({"openings": opens, "rooms": out_rooms}, open("vec/sem.json", "w"), indent=0)

# ---- check pictures
S = 70
for lv in (0, 1):
    img = Image.new("RGB", (int((A1 - A0) * S), int((B1 - B0) * S)), "white"); dr = ImageDraw.Draw(img)
    P = lambda a, b: ((a - A0) * S, (B1 - b) * S)
    f = ImageFont.load_default(size=13); fb = ImageFont.load_default(size=17)
    import random
    random.seed(4)
    for name, r in out_rooms.items():
        if r["level"] != lv:
            continue
        col = tuple(random.randint(170, 240) for _ in range(3))
        dr.polygon([P(*q) for q in r["poly"]], fill=col, outline=(120, 120, 120))
        cx = sum(q[0] for q in r["poly"]) / len(r["poly"]); cy = sum(q[1] for q in r["poly"]) / len(r["poly"])
        dr.text(P(cx, cy), name, fill=(0, 0, 0), font=fb)
    for p in WALLS[lv]:
        dr.polygon([P(*q) for q in p], fill=(50, 50, 50))
    for o in opens:
        if o["level"] != lv:
            continue
        col = {"window": (0, 120, 255), "high": (0, 180, 255), "block": (0, 180, 255), "open": (0, 170, 0)}.get(o["kind"], (230, 0, 0))
        dr.line([P(*o["a"]), P(*o["b"])], fill=col, width=4)
        mx, my = (o["a"][0] + o["b"][0]) / 2, (o["a"][1] + o["b"][1]) / 2
        dr.text((P(mx, my)[0] + 4, P(mx, my)[1] + 3), o["id"], fill=col, font=f)
    for m in range(int(A0), int(A1) + 1):
        dr.text((P(m, 0)[0], 2), str(m), fill=(200, 80, 80), font=f)
    for m in range(int(B0), int(B1) + 1):
        dr.text((2, P(0, m)[1]), str(m), fill=(80, 80, 200), font=f)
    img.save("vec/sem_%d.png" % lv)
    print("vec/sem_%d.png" % lv, img.size)
