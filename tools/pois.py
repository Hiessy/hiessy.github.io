# -*- coding: utf-8 -*-
"""Puntos de interés alrededor de los favoritos: servicios, producción y riesgo.

**Esto no es un relevamiento, es lo que está mapeado y con nombre en
OpenStreetMap.** Lo natural para esto es Overpass, que sabe buscar por etiqueta
(`landuse=industrial`, `organic=yes`) y devuelve también lo que no tiene nombre.
Desde acá no se puede: el servidor principal contesta 406, los espejos no
responden y overpass.osm.ch resultó ser un extracto sólo de Suiza —contesta
bien y devuelve cero para Argentina—. Queda Nominatim, que **sólo encuentra por
nombre**. Consecuencia, y por eso la página lo dice en la leyenda:

    que no aparezca una cantera no significa que no haya una.

Y una que no se arregla con otra herramienta: **OpenStreetMap no registra si un
campo usa agroquímicos**. No es que no lo sepamos consultar, no está en ningún
lado. Lo más cerca que se llega es ubicar acopios, cerealeras y viveros, que es
otra cosa y se llama distinto en la leyenda.

    python tools/pois.py [--favoritos favoritos.json]
"""
import io, json, math, os, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "hiessy.github.io property map (github.com/Hiessy)"}
R = 6371.0
DELAY = 1.2                      # política de Nominatim: 1 req/s

# (categoría, término de búsqueda). La categoría manda el color y el ícono.
BUSQUEDAS = [
    ("escuela",  "escuela"), ("escuela", "colegio"), ("escuela", "jardín de infantes"),
    ("salud",    "hospital"), ("salud", "dispensario"), ("salud", "centro de salud"),
    ("farmacia", "farmacia"),
    ("super",    "supermercado"), ("super", "almacén"),
    ("banco",    "banco"),
    ("seguridad", "policía"), ("seguridad", "bomberos"),
    # producción local y de la buena
    ("verde",    "vivero"), ("verde", "granja"), ("verde", "huerta"),
    ("verde",    "orgánico"), ("verde", "agroecológico"), ("verde", "feria franca"),
    ("verde",    "apícola"), ("verde", "reserva natural"),
    # lo que conviene saber que está al lado
    ("riesgo",   "cantera"), ("riesgo", "fábrica"), ("riesgo", "planta industrial"),
    ("riesgo",   "aserradero"), ("riesgo", "basural"), ("riesgo", "relleno sanitario"),
    ("riesgo",   "frigorífico"), ("riesgo", "cerealera"), ("riesgo", "acopio"),
    ("riesgo",   "parque industrial"), ("riesgo", "planta de tratamiento"),
]


def dist(a, b, c, d):
    p = math.radians
    h = math.sin(p(c-a)/2)**2 + math.cos(p(a))*math.cos(p(c))*math.sin(p(d-b)/2)**2
    return 2 * R * math.asin(math.sqrt(h))


def buscar(q, lat, lng, d=0.11):
    p = {"q": q, "format": "jsonv2", "limit": 12, "bounded": 1,
         "viewbox": f"{lng-d},{lat+d},{lng+d},{lat-d}"}
    u = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(p)
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40) as r:
            return json.load(r)
    except Exception:
        return []


def main():
    fav = json.load(io.open(os.path.join(ROOT, "favoritos.json"), encoding="utf-8"))
    centros = []
    for v in fav.values():
        r = v.get("r") or []
        if len(r) > 16 and r[15] and r[16]:
            centros.append((round(r[15], 2), round(r[16], 2)))
    # una consulta por zona y no por aviso: varios favoritos del mismo pueblo
    # devuelven exactamente lo mismo
    centros = sorted(set(centros))
    print(f"{len(fav)} favoritos -> {len(centros)} zonas a consultar "
          f"x {len(BUSQUEDAS)} búsquedas = {len(centros)*len(BUSQUEDAS)} consultas "
          f"(~{len(centros)*len(BUSQUEDAS)*DELAY/60:.0f} min)", flush=True)

    out = {}
    salida = os.path.join(ROOT, "pois.json")
    if os.path.exists(salida):
        out = json.load(io.open(salida, encoding="utf-8"))
    # Qué zonas ya se barrieron, para poder cortar y seguir después: son ~30
    # zonas por 31 búsquedas a un pedido por segundo, casi veinte minutos.
    hechas = os.path.join(ROOT, ".work", "pois_zonas.json")
    ya = set(json.load(io.open(hechas, encoding="utf-8"))) if os.path.exists(hechas) else set()
    for n, (lat, lng) in enumerate(centros, 1):
        if f"{lat},{lng}" in ya:
            print(f"  {n}/{len(centros)} ({lat},{lng}) ya estaba", flush=True)
            continue
        nuevos = 0
        for cat, q in BUSQUEDAS:
            for e in buscar(q, lat, lng):
                nom = (e.get("name") or "").strip()
                if not nom:
                    continue
                la, ln = round(float(e["lat"]), 6), round(float(e["lon"]), 6)
                k = f"{la},{ln}"
                if k in out:
                    continue
                out[k] = {"n": nom, "c": cat, "lat": la, "lng": ln,
                          "t": e.get("type") or ""}
                nuevos += 1
            time.sleep(DELAY)
        json.dump(out, io.open(salida, "w", encoding="utf-8", newline=""),
                  ensure_ascii=False, sort_keys=True)
        ya.add(f"{lat},{lng}")
        json.dump(sorted(ya), io.open(hechas, "w", encoding="utf-8", newline=""))
        print(f"  {n}/{len(centros)} ({lat},{lng}) +{nuevos} · total {len(out)}", flush=True)

    from collections import Counter
    print("por categoría:", dict(Counter(v["c"] for v in out.values())))
    print("escrito", salida)


if __name__ == "__main__":
    main()
