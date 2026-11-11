# -*- coding: utf-8 -*-
"""Draws a window of the extracted survey vectors (vec.json) to a PNG.
Usage: python -I vdraw.py <vec.json> <out.png> x0 y0 x1 y1 scale [options]
  x0..y1   window in view points
  scale    pixels per point
options (any order):
  layers=A,B     only these layers        skip=A,B   all but these
  grid=m         meter grid of a frame: grid=plan | grid=<ox>,<oy>,<sx>,<sy>
                 (meters = (x-ox)/sx, (y-oy)/sy ; sx, sy in points per meter, signed)
  step=0.5       grid step in meters
  notext         leave the texts out
  mono           everything black
"""
import sys, json, math
from PIL import Image, ImageDraw, ImageFont

vec, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, S = [float(v) for v in sys.argv[3:8]]
opt = dict(a.split("=", 1) if "=" in a else (a, "1") for a in sys.argv[8:])
only = set(opt["layers"].split(",")) if "layers" in opt else None
skip = set(opt["skip"].split(",")) if "skip" in opt else set()
D = json.load(open(vec, encoding="utf-8"))

COL = {"PLANTA": (0, 0, 0), "ABERTURAS": (200, 0, 0), "COTAS": (0, 110, 220), "COTASsss": (0, 150, 200),
       "equipamiento": (0, 140, 60), "Haches": (190, 190, 190), "Proyeccion": (230, 120, 0), "Ejes": (160, 0, 200),
       "Corte": (0, 0, 0), "Corte2": (90, 60, 0), "Corte 2": (120, 0, 80), "Vista": (0, 90, 160), "Vista 2": (120, 120, 120),
       "ELECTRICIDAD": (200, 160, 0), "0": (70, 70, 70), "cotas100": (0, 110, 220), "Rotulo 1": (160, 0, 0),
       "00-carp": (200, 0, 120), "lavado ray": (150, 150, 255), "HATCH": (210, 210, 210), "textos": (0, 140, 60)}
mono = "mono" in opt
Wp, Hp = int((x1 - x0) * S), int((y1 - y0) * S)
img = Image.new("RGB", (Wp, Hp), (255, 255, 255))
dr = ImageDraw.Draw(img)


def P(x, y):
    return ((x - x0) * S, (y - y0) * S)


def use(l):
    if only is not None:
        return l in only
    return l not in skip


# grid first, under the drawing
frame = None
if "grid" in opt:
    g = opt["grid"]
    if g == "plan":
        frame = (140.27, 1563.6, 28.5, -28.5)
    else:
        frame = tuple(float(v) for v in g.split(","))
    ox, oy, sx, sy = frame
    step = float(opt.get("step", "1"))
    f = ImageFont.load_default(size=max(10, int(S * 2.6)))
    ma, mb = sorted(((x0 - ox) / sx, (x1 - ox) / sx)), sorted(((y0 - oy) / sy, (y1 - oy) / sy))
    k = math.floor(ma[0] / step)
    while k * step <= ma[1]:
        m = k * step
        X = (ox + m * sx - x0) * S
        whole = abs(m - round(m)) < 1e-6
        dr.line([(X, 0), (X, Hp)], fill=(255, 150, 150) if whole else (255, 225, 225), width=1)
        if whole:
            for yy in range(0, Hp, 520):
                dr.text((X + 2, yy + 2), "%g" % round(m), fill=(230, 60, 60), font=f)
        k += 1
    k = math.floor(mb[0] / step)
    while k * step <= mb[1]:
        m = k * step
        Y = (oy + m * sy - y0) * S
        whole = abs(m - round(m)) < 1e-6
        dr.line([(0, Y), (Wp, Y)], fill=(150, 150, 255) if whole else (225, 225, 255), width=1)
        if whole:
            for xx in range(0, Wp, 620):
                dr.text((xx + 2, Y + 1), "%g" % round(m), fill=(60, 60, 230), font=f)
        k += 1

for p in D["paths"]:
    if not use(p["l"]):
        continue
    pts = p["p"]
    xs = [a for a, b in pts]; ys = [b for a, b in pts]
    if max(xs) < x0 or min(xs) > x1 or max(ys) < y0 or min(ys) > y1:
        continue
    c = (0, 0, 0) if mono else COL.get(p["l"], (0, 0, 0))
    q = [P(a, b) for a, b in pts]
    if p["f"] and len(q) > 2:
        dr.polygon(q, fill=c)
    else:
        dr.line(q, fill=c, width=max(1, int(round(p["w"] * S))))

if "notext" not in opt:
    for t in D["texts"]:
        if not use(t["l"]):
            continue
        if not (x0 <= t["x"] <= x1 and y0 <= t["y"] <= y1):
            continue
        size = max(9, int(t["h"] * S * 0.8))
        f = ImageFont.load_default(size=size)
        c = (0, 0, 0) if mono else COL.get(t["l"], (0, 0, 0))
        X, Y = P(t["x"], t["y"])
        if abs(t["dy"]) > abs(t["dx"]):
            # vertical text: draw it turned
            w = int(dr.textlength(t["s"], font=f)) + 4
            tmp = Image.new("RGBA", (w, size + 6), (0, 0, 0, 0))
            ImageDraw.Draw(tmp).text((2, 0), t["s"], fill=c + (255,), font=f)
            tmp = tmp.rotate(90 if t["dy"] < 0 else 270, expand=True)
            if t["dy"] < 0:
                img.paste(tmp, (int(X - size), int(Y - w)), tmp)
            else:
                img.paste(tmp, (int(X), int(Y)), tmp)
        else:
            dr.text((X, Y - size), t["s"], fill=c, font=f)

img.save(out)
print(out, img.size)
