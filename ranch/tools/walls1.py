# -*- coding: utf-8 -*-
"""Wall line work of one plan of the survey, in the house frame (meters):
a along the walls parallel to the street (south to north), b the depth in
from the street; origin at the lot's south corner on the building line.
Writes vec/walls_<name>.json with the segments, and a picture with the
loose ends marked. Usage: python -I walls1.py <name> x0 y0 x1 y1 [ox oy]
(window in view points; ox, oy: view point of the frame's origin)."""
import sys, json, math
from collections import defaultdict
from PIL import Image, ImageDraw, ImageFont

name = sys.argv[1]
x0, y0, x1, y1 = [float(v) for v in sys.argv[2:6]]
F = json.load(open("vec/frame.json"))
K = F["K"]
OX, OY = (float(sys.argv[6]), float(sys.argv[7])) if len(sys.argv) > 7 else F["O"]
D = json.load(open("vec/vec.json", encoding="utf-8"))


def ab(p):
    return ((p[0] - OX) / K, (OY - p[1]) / K)


def key(p):
    return (round(p[0] / 0.12), round(p[1] / 0.12))


segs = {}
for p in D["paths"]:
    if p["w"] != 1.44 or p["l"] not in ("Corte", "PLANTA"):
        continue
    pts = p["p"]
    xs = [a for a, b in pts]; ys = [b for a, b in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    if not (x0 <= cx < x1 and y0 <= cy < y1):
        continue
    for a, b in zip(pts, pts[1:]):
        ka, kb = key(a), key(b)
        if ka != kb:
            segs[(ka, kb) if ka < kb else (kb, ka)] = p["l"]
adj = defaultdict(set)
for a, b in segs:
    adj[a].add(b); adj[b].add(a)
print("segments", len(segs), "vertices", len(adj))
deg = defaultdict(int)
for v, n in adj.items():
    deg[len(n)] += 1
print("degrees", dict(deg))


def pt(k):
    return ab((k[0] * 0.12, k[1] * 0.12))


out = {"origin": [OX, OY], "K": K,
       "segs": [[round(v, 4) for v in pt(a) + pt(b)] + [segs[(a, b)]] for a, b in sorted(segs)]}
json.dump(out, open("vec/walls_%s.json" % name, "w"))

# picture: 60 px per meter
S = 60
amin = min(min(s[0], s[2]) for s in out["segs"]) - 1; amax = max(max(s[0], s[2]) for s in out["segs"]) + 1
bmin = min(min(s[1], s[3]) for s in out["segs"]) - 1; bmax = max(max(s[1], s[3]) for s in out["segs"]) + 1
W, Hh = int((amax - amin) * S), int((bmax - bmin) * S)
img = Image.new("RGB", (W, Hh), "white"); dr = ImageDraw.Draw(img)
f = ImageFont.load_default(size=13)
P = lambda a, b: ((a - amin) * S, (bmax - b) * S)
for m in range(int(math.floor(amin)), int(math.ceil(amax)) + 1):
    dr.line([P(m, bmin), P(m, bmax)], fill=(255, 215, 215))
    dr.text((P(m, 0)[0] + 2, 2), str(m), fill=(220, 80, 80), font=f)
for m in range(int(math.floor(bmin)), int(math.ceil(bmax)) + 1):
    dr.line([P(amin, m), P(amax, m)], fill=(215, 215, 255))
    dr.text((2, P(0, m)[1] + 1), str(m), fill=(80, 80, 220), font=f)
for s in out["segs"]:
    dr.line([P(s[0], s[1]), P(s[2], s[3])], fill=(0, 0, 0) if s[4] == "Corte" else (0, 140, 0), width=2)
for v, n in adj.items():
    if len(n) != 2:
        x, y = P(*pt(v))
        c = (230, 0, 0) if len(n) == 1 else (0, 90, 255)
        dr.ellipse([x - 4, y - 4, x + 4, y + 4], outline=c, width=2)
img.save("vec/walls_%s.png" % name)
print(img.size, "a %.2f..%.2f b %.2f..%.2f" % (amin, amax, bmin, bmax))
