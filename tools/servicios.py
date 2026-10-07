"""Qué hay cerca de cada aviso, según OpenStreetMap vía Nominatim.

Overpass —lo natural para esto— contesta 406 desde acá y los espejos no
responden, así que se usa Nominatim acotado a una caja alrededor del aviso.
Devuelve menos cosas que Overpass y solo las que tienen nombre, de modo que esto
dice **qué hay**, no qué no hay: en pueblos de sierra el mapa está incompleto.
"""
import json, math, time, urllib.parse, urllib.request

UA = {"User-Agent": "hiessy.github.io property map (github.com/Hiessy)"}
R = 6371.0
BUSQUEDAS = [("escuela", "escuela"), ("escuela", "colegio"), ("salud", "hospital"),
             ("salud", "dispensario"), ("farmacia", "farmacia"),
             ("super", "supermercado"), ("nafta", "estación de servicio"),
             ("banco", "banco"), ("bomberos", "bomberos"), ("policía", "policía")]


def dist(a, b, c, d):
    p = math.radians
    h = (math.sin(p(c-a)/2)**2 + math.cos(p(a))*math.cos(p(c))*math.sin(p(d-b)/2)**2)
    return 2 * R * math.asin(math.sqrt(h))


def buscar(q, lat, lng, d=0.09):
    p = {"q": q, "format": "jsonv2", "limit": 12, "bounded": 1,
         "viewbox": f"{lng-d},{lat+d},{lng+d},{lat-d}"}
    u = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(p)
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40) as r:
            return json.load(r)
    except Exception:
        return []


def para(lat, lng):
    out = {}
    for cat, q in BUSQUEDAS:
        for e in buscar(q, lat, lng):
            nom = e.get("name") or ""
            if not nom:
                continue
            km = round(dist(lat, lng, float(e["lat"]), float(e["lon"])), 1)
            out.setdefault(cat, {})
            if nom not in out[cat] or km < out[cat][nom]:
                out[cat][nom] = km
        time.sleep(1.2)
    return {k: sorted(v.items(), key=lambda x: x[1])[:5] for k, v in out.items()}


if __name__ == "__main__":
    sel = json.load(open(".work/seleccion.json", encoding="utf-8"))
    res = {}
    for r in sel:
        if not r[15]:
            continue
        print(f"\n== {r[5][:46]}  ({r[9]})", flush=True)
        d = para(r[15], r[16])
        res[r[2]] = {"addr": r[5], "pueblo": r[9], "lat": r[15], "lng": r[16], "serv": d}
        for k in ("escuela", "salud", "farmacia", "super", "nafta", "banco", "bomberos", "policía"):
            if k in d:
                print(f"   {k:9} " + " · ".join(f"{n} ({km} km)" for n, km in d[k][:4]), flush=True)
    json.dump(res, open(".work/servicios.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\nescrito .work/servicios.json")
