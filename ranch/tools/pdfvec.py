# -*- coding: utf-8 -*-
"""Extracts the vector content of the survey PDF (one page, AutoCAD plot) as
JSON: every stroked or filled path with its layer, width and dash, and every
text with its position. Coordinates are in "view points": the page as it is
read (rotated), x to the right, y down, in PDF points.
Usage: python -I pdfvec.py <in.pdf> <out.json>"""
import re, sys, zlib, json

src, out = sys.argv[1], sys.argv[2]
data = open(src, "rb").read()
objs = {}
for m in re.finditer(rb"(\d+)\s+0\s+obj(.*?)endobj", data, re.S):
    objs[int(m.group(1))] = m.group(2)


def stream(body):
    m = re.search(rb"stream\r?\n(.*?)\r?\nendstream", body, re.S)
    if not m:
        return b""
    raw = m.group(1)
    if b"FlateDecode" in body[:m.start()]:
        try:
            return zlib.decompress(raw)
        except Exception:
            return zlib.decompressobj().decompress(raw)
    return raw


page = objs[[n for n, b in objs.items() if re.search(rb"/Type\s*/Page[^s]", b)][0]]
mb = [float(v) for v in re.search(rb"/MediaBox\s*\[([^\]]*)\]", page).group(1).split()]
W, H = mb[2] - mb[0], mb[3] - mb[1]
cids = [int(x) for x in re.findall(rb"(\d+)\s+0\s+R", re.search(rb"/Contents\s*\[([^\]]*)\]", page).group(1))]
props = dict((k.decode(), int(v)) for k, v in re.findall(rb"/(oc\d+)\s+(\d+)\s+0\s+R", page))
layers = {}
for k, n in props.items():
    layers[k] = re.search(rb"/Name\((.*?)\)", objs[n]).group(1).decode("latin-1")
fonts = dict((k.decode(), int(v)) for k, v in re.findall(rb"/(F\d+)\s+(\d+)\s+0\s+R", page))

# ToUnicode maps for the composite fonts
tou = {}
for fname, n in fonts.items():
    mm = re.search(rb"/ToUnicode\s+(\d+)\s+0\s+R", objs[n])
    if not mm:
        continue
    cmap = stream(objs[int(mm.group(1))]).decode("latin-1")
    table = {}
    for blk in re.findall(r"beginbfchar(.*?)endbfchar", cmap, re.S):
        for a, b in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", blk):
            table[int(a, 16)] = "".join(chr(int(b[i:i + 4], 16)) for i in range(0, len(b), 4))
    for blk in re.findall(r"beginbfrange(.*?)endbfrange", cmap, re.S):
        for a, b, c in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", blk):
            for i in range(int(a, 16), int(b, 16) + 1):
                table[i] = chr(int(c, 16) + i - int(a, 16))
    tou[fname] = table


def mul(a, b):
    return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3], a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
            a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]]


def view(m, x, y):
    X, Y = m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]
    # the page is turned 90 degrees counterclockwise to be read
    return (round(H - Y, 3), round(W - X, 3))


def unesc(b):
    o, i = bytearray(), 0
    while i < len(b):
        c = b[i]
        if c == 0x5c and i + 1 < len(b):
            n = b[i + 1]
            if n in b"nrtbf":
                o.append({110: 10, 114: 13, 116: 9, 98: 8, 102: 12}[n]); i += 2
            elif 48 <= n <= 55:
                j = i + 1; v = 0; k = 0
                while j < len(b) and k < 3 and 48 <= b[j] <= 55:
                    v = v * 8 + b[j] - 48; j += 1; k += 1
                o.append(v & 255); i = j
            else:
                o.append(n); i += 2
        else:
            o.append(c); i += 1
    return bytes(o).decode("cp1252", "replace")


TOK = re.compile(rb"/[^\s/\[\]()<>{}%]+|\((?:\\.|[^\\)])*\)|<<|>>|<[0-9A-Fa-f\s]*>|\[|\]|[-+]?\d*\.?\d+|[A-Za-z'\"*]+[0-9]?\*?")
paths, texts, images = [], [], []


def flat(p0, p1, p2, p3, n=10):
    r = []
    for i in range(1, n + 1):
        t = i / n; u = 1 - t
        r.append((u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
                  u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]))
    return r


def run(code):
    ctm = [1, 0, 0, 1, 0, 0]
    stack, gs, path, cur, lw, dash = [], [], [], None, 1.0, 0
    layer = [""]
    font, size, tz, tm = "", 0, 100, [1, 0, 0, 1, 0, 0]
    for t in TOK.findall(code):
        c = t[:1]
        if c in b"-+.0123456789":
            stack.append(float(t)); continue
        if c == b"(":
            stack.append(("s", t[1:-1])); continue
        if c == b"<" and t != b"<<":
            stack.append(("h", t[1:-1])); continue
        if c == b"/" or t in (b"[", b"]", b"<<", b">>"):
            stack.append(t); continue
        op = t
        if op == b"BDC":
            nm = stack[-1][1:].decode() if stack and isinstance(stack[-1], bytes) else ""
            layer.append(layers.get(nm, nm))
        elif op == b"EMC":
            if len(layer) > 1: layer.pop()
        elif op == b"BT":
            tm = [1, 0, 0, 1, 0, 0]
        elif op == b"Tf" and len(stack) >= 2:
            font = stack[-2][1:].decode(); size = stack[-1]
        elif op == b"Tz" and stack:
            tz = stack[-1]
        elif op == b"Tm" and len(stack) >= 6:
            tm = [float(v) for v in stack[-6:]]
        elif op == b"Td" and len(stack) >= 2:
            tm = mul([1, 0, 0, 1, stack[-2], stack[-1]], tm)
        elif op == b"Tj" and stack and isinstance(stack[-1], tuple):
            kind, raw = stack[-1]
            if kind == "s":
                s = unesc(raw)
            else:
                hx = re.sub(rb"\s", b"", raw).decode()
                tb = tou.get(font, {})
                s = "".join(tb.get(int(hx[i:i + 4], 16), "?") for i in range(0, len(hx) - 3, 4))
            full = mul(tm, ctm)
            x, y = view(full, 0, 0)
            x2, y2 = view(full, 1, 0)  # direction of the baseline in view coordinates
            texts.append({"l": layer[-1], "x": x, "y": y, "s": s, "h": round(size * 0.12, 2), "tz": tz,
                          "dx": round(x2 - x, 3), "dy": round(y2 - y, 3)})
        elif op == b"q":
            gs.append((ctm[:], lw, dash))
        elif op == b"Q":
            if gs: ctm, lw, dash = gs.pop()
        elif op == b"cm" and len(stack) >= 6:
            ctm = mul([float(v) for v in stack[-6:]], ctm)
        elif op == b"w" and stack:
            lw = float(stack[-1])
        elif op == b"d":
            i = len(stack) - 1
            while i >= 0 and stack[i] != b"[": i -= 1
            arr = [v for v in stack[i + 1:] if isinstance(v, float)]
            dash = 1 if len(arr) > 1 else 0
        elif op == b"m" and len(stack) >= 2:
            cur = [(stack[-2], stack[-1])]; path.append(cur)
        elif op == b"l" and len(stack) >= 2 and cur is not None:
            cur.append((stack[-2], stack[-1]))
        elif op == b"c" and len(stack) >= 6 and cur is not None:
            p = stack[-6:]
            cur.extend(flat(cur[-1], (p[0], p[1]), (p[2], p[3]), (p[4], p[5])))
        elif op == b"v" and len(stack) >= 4 and cur is not None:
            p = stack[-4:]
            cur.extend(flat(cur[-1], cur[-1], (p[0], p[1]), (p[2], p[3])))
        elif op == b"y" and len(stack) >= 4 and cur is not None:
            p = stack[-4:]
            cur.extend(flat(cur[-1], (p[0], p[1]), (p[2], p[3]), (p[2], p[3])))
        elif op == b"h" and cur:
            cur.append(cur[0])
        elif op == b"re" and len(stack) >= 4:
            x, y, w, h = stack[-4:]
            cur = [(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)]; path.append(cur)
        elif op in (b"S", b"s", b"f", b"F", b"f*", b"B", b"B*", b"b", b"b*"):
            fill = op in (b"f", b"F", b"f*", b"B", b"B*", b"b", b"b*")
            for p in path:
                if len(p) > 1:
                    if op in (b"s", b"b", b"b*") and p[-1] != p[0]:
                        p = p + [p[0]]
                    paths.append({"l": layer[-1], "w": round(lw * abs(ctm[0]), 3), "d": dash, "f": 1 if fill else 0,
                                  "p": [view(ctm, a, b) for a, b in p]})
            path, cur = [], None
        elif op == b"n":
            path, cur = [], None
        elif op == b"Do" and stack:
            nm = stack[-1][1:].decode() if isinstance(stack[-1], bytes) else ""
            corners = [view(ctm, a, b) for a, b in ((0, 0), (1, 0), (1, 1), (0, 1))]
            images.append({"l": layer[-1], "n": nm, "p": corners})
        stack = []


run(b"\n".join(stream(objs[c]) for c in cids))
json.dump({"W": H, "H": W, "layers": sorted(set(layers.values())), "paths": paths, "texts": texts, "images": images},
          open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print("view size pt", H, W)
print("paths", len(paths), "texts", len(texts), "images", len(images))
print(Counter(p["l"] for p in paths).most_common())
print(Counter(t["l"] for t in texts).most_common())
print(Counter(p["w"] for p in paths).most_common(12))
print("dashed", sum(p["d"] for p in paths), "filled", sum(p["f"] for p in paths))
