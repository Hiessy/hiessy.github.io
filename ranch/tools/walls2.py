# -*- coding: utf-8 -*-
"""Turns the wall line work (walls_<name>.json) into closed wall polygons.
Snaps near vertices, splits at T joints, closes small gaps between loose
ends, drops what still dangles, then walks the faces of the planar graph.
Writes vec/polys_<name>.json: {"polys": [[[a, b], ...], ...]} in meters, each
counterclockwise, and a picture. Usage: python -I walls2.py <name> [extra.json]
extra.json: {"add": [[a1,b1,a2,b2], ...], "drop": [[a,b], ...]} manual fixes
(add a segment; drop every segment with an end within 2 cm of a point)."""
import sys, json, math
from collections import defaultdict
from PIL import Image, ImageDraw, ImageFont

name = sys.argv[1]
W = json.load(open("vec/walls_%s.json" % name))
extra = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
raw = [(s[0], s[1], s[2], s[3]) for s in W["segs"]] + [tuple(s) for s in extra.get("add", [])]
for d in extra.get("drop", []):
    raw = [s for s in raw if min(math.hypot(s[0] - d[0], s[1] - d[1]), math.hypot(s[2] - d[0], s[3] - d[1])) > 0.02]

SNAP = 0.013
# --- snap vertices
pts = []


def vid(p):
    for i, q in enumerate(pts):
        if abs(q[0] - p[0]) < SNAP and abs(q[1] - p[1]) < SNAP:
            return i
    pts.append(p)
    return len(pts) - 1


E = set()
for s in raw:
    a, b = vid((s[0], s[1])), vid((s[2], s[3]))
    if a != b:
        E.add((min(a, b), max(a, b)))

# --- split at T joints
changed = True
while changed:
    changed = False
    for (a, b) in list(E):
        ax, ay = pts[a]; bx, by = pts[b]
        L = math.hypot(bx - ax, by - ay)
        for i, (px, py) in enumerate(pts):
            if i == a or i == b:
                continue
            t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (L * L)
            if t <= 0 or t >= 1:
                continue
            d = abs((px - ax) * (by - ay) - (py - ay) * (bx - ax)) / L
            if d < 0.008 and min(t, 1 - t) * L > SNAP:
                E.discard((a, b))
                E.add((min(a, i), max(a, i))); E.add((min(i, b), max(i, b)))
                changed = True
                break
        if changed:
            break


def adjacency():
    adj = defaultdict(set)
    for a, b in E:
        adj[a].add(b); adj[b].add(a)
    return adj


# --- close gaps between loose ends
adj = adjacency()
loose = [v for v, n in adj.items() if len(n) == 1]
print("loose ends before closing:", len(loose))
used = set()
closed = []
for v in loose:
    if v in used:
        continue
    best = None
    for u in loose:
        if u == v or u in used:
            continue
        d = math.hypot(pts[u][0] - pts[v][0], pts[u][1] - pts[v][1])
        if d < 0.42 and (best is None or d < best[0]):
            best = (d, u)
    if best:
        u = best[1]
        E.add((min(u, v), max(u, v))); used.add(u); used.add(v)
        closed.append((pts[v], pts[u], round(best[0], 3)))
for c in closed:
    print("  closed gap %.3f m at (%.2f, %.2f)-(%.2f, %.2f)" % (c[2], c[0][0], c[0][1], c[1][0], c[1][1]))

# --- drop what dangles
dropped = []
while True:
    adj = adjacency()
    d1 = [v for v, n in adj.items() if len(n) == 1]
    if not d1:
        break
    for v in d1:
        for u in list(adj[v]):
            E.discard((min(u, v), max(u, v)))
            dropped.append((pts[v], pts[u]))
for d in dropped:
    print("  dropped dangling (%.2f, %.2f)-(%.2f, %.2f)" % (d[0][0], d[0][1], d[1][0], d[1][1]))


# --- faces
def faces():
    adj = adjacency()
    order = {}
    for v, ns in adj.items():
        order[v] = sorted(ns, key=lambda u: math.atan2(pts[u][1] - pts[v][1], pts[u][0] - pts[v][0]))
    seen = set(); out = []
    for a, b in list(E):
        for h in ((a, b), (b, a)):
            if h in seen:
                continue
            loop = []; cur = h
            while cur not in seen:
                seen.add(cur); loop.append(cur[0])
                u, v = cur
                ns = order[v]; i = ns.index(u)
                cur = (v, ns[(i - 1) % len(ns)])  # turn clockwise: keeps the face on the left
            out.append(loop)
    return out


def area(loop):
    s = 0
    for i in range(len(loop)):
        x1, y1 = pts[loop[i]]; x2, y2 = pts[loop[(i + 1) % len(loop)]]
        s += x1 * y2 - x2 * y1
    return s / 2


fs = faces()
inner = [f for f in fs if area(f) > 1e-6]
# edges with a wall face on both sides are inner lines: remove them and walk again
side = defaultdict(int)
for f in inner:
    for i in range(len(f)):
        a, b = f[i], f[(i + 1) % len(f)]
        side[(min(a, b), max(a, b))] += 1
internal = [e for e, n in side.items() if n == 2]
print("inner lines removed:", len(internal))
for e in internal:
    E.discard(e)
# removing them can leave vertices of degree 0 or chains: clean again
while True:
    adj = adjacency()
    d1 = [v for v, n in adj.items() if len(n) == 1]
    if not d1:
        break
    for v in d1:
        for u in list(adj[v]):
            E.discard((min(u, v), max(u, v)))
fs = faces()
inner = [f for f in fs if area(f) > 1e-6]
outer = [f for f in fs if area(f) <= 1e-6]
print("wall polygons:", len(inner), "outer loops:", len(outer))


def simplify(loop):
    P = [pts[i] for i in loop]
    out = []
    n = len(P)
    for i in range(n):
        a, b, c = P[i - 1], P[i], P[(i + 1) % n]
        cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        if abs(cr) > 1e-4 * max(1e-9, math.hypot(b[0] - a[0], b[1] - a[1]) * math.hypot(c[0] - b[0], c[1] - b[1])) * 20:
            out.append([round(b[0], 3), round(b[1], 3)])
    return out


polys = [simplify(f) for f in inner]
polys = [p for p in polys if len(p) >= 3]
tot = sum(abs(area(f)) for f in inner)
print("wall area m2: %.2f" % tot, "vertices:", sum(len(p) for p in polys))
json.dump({"polys": polys}, open("vec/polys_%s.json" % name, "w"))

S = 60
allp = [q for p in polys for q in p]
amin = min(q[0] for q in allp) - 1; amax = max(q[0] for q in allp) + 1
bmin = min(q[1] for q in allp) - 1; bmax = max(q[1] for q in allp) + 1
img = Image.new("RGB", (int((amax - amin) * S), int((bmax - bmin) * S)), "white"); dr = ImageDraw.Draw(img)
f = ImageFont.load_default(size=13)
P = lambda a, b: ((a - amin) * S, (bmax - b) * S)
for m in range(int(math.floor(amin)), int(math.ceil(amax)) + 1):
    dr.line([P(m, bmin), P(m, bmax)], fill=(255, 215, 215)); dr.text((P(m, 0)[0] + 2, 2), str(m), fill=(220, 80, 80), font=f)
for m in range(int(math.floor(bmin)), int(math.ceil(bmax)) + 1):
    dr.line([P(amin, m), P(amax, m)], fill=(215, 215, 255)); dr.text((2, P(0, m)[1] + 1), str(m), fill=(80, 80, 220), font=f)
for i, p in enumerate(polys):
    dr.polygon([P(*q) for q in p], fill=(70, 70, 70), outline=(0, 0, 0))
    cx = sum(q[0] for q in p) / len(p); cy = sum(q[1] for q in p) / len(p)
    dr.text(P(cx, cy), str(i), fill=(255, 60, 60), font=f)
for d in dropped:
    dr.line([P(*d[0]), P(*d[1])], fill=(255, 0, 0), width=3)
for c in closed:
    dr.line([P(*c[0]), P(*c[1])], fill=(0, 160, 255), width=3)
img.save("vec/polys_%s.png" % name)
print(img.size)
