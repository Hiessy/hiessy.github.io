# -*- coding: utf-8 -*-
"""Baja el catastro minero de la provincia desde IDECOR y lo recorta a los valles.

Esto reemplaza al buscar "cantera" por nombre en OpenStreetMap, que era lo único
que se podía hacer hasta ahora y encontraba sólo lo que alguien se había tomado
el trabajo de mapear **y** de ponerle nombre. Acá el dato es **el registro
oficial**: la provincia publica el catastro minero completo por WFS abierto, sin
clave ni cuenta, con razón social, material y número de expediente ambiental.

    https://idecor-ws.mapascordoba.gob.ar/geoserver/idecor/wfs

Lo que se trae, y por qué cada cosa:

- **canteras** (puntos y polígonos): lo que más molesta en la sierra, por el
  polvo y las voladuras;
- **minas** y **pertenencias mineras**: derechos otorgados sobre el terreno;
- **plantas** de beneficio y de elaboración: trituración, corte y pulido, que
  son las que hacen ruido y polvo todo el día. Traen el expediente de impacto
  ambiental, que es el hilo del que se tira para leer el estudio;
- **áreas de cateo**: permisos de **exploración**. Son las canteras que todavía
  no existen, y es lo que nadie mira: una ladera limpia hoy con un cateo encima
  no es la misma compra que una sin cateo.

    python tools/idecor.py
"""
import io, json, os, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WFS = "https://idecor-ws.mapascordoba.gob.ar/geoserver/idecor/wfs"
UA = {"User-Agent": "hiessy.github.io property map (github.com/Hiessy)"}

# Los dos valles, con margen. Lo de afuera no se guarda: la provincia es grande
# y el catastro entero no tiene por qué viajar en la página.
CAJA = (-32.45, -30.70, -65.05, -64.25)          # sur, norte, oeste, este

CAPAS = [
    ("cantera", "idecor:mineria_punto_canteras"),
    ("cantera", "idecor:mineria_canteras"),
    ("mina",    "idecor:mineria_minas"),
    ("planta",  "idecor:mineria_plantas"),
    ("planta",  "idecor:mineria_plantas_benefico"),
    ("planta",  "idecor:mineria_plantas_elaboracion"),
    ("cateo",   "idecor:mineria_area_cateo"),
    ("cateo",   "idecor:mineria_pertenencias_mineras"),
]

# Los nombres de campo cambian de capa en capa; se prueba en orden.
CAMPOS_NOMBRE = ("establecimiento", "nombre", "denominacion", "mina", "expediente")
CAMPOS_TITULAR = ("razon_social", "razon_social_apellido_nombre", "titular",
                  "apellido_nombre", "empresa")
CAMPOS_MATERIAL = ("material", "material_sustancia_tipo", "sustancia", "actividad", "tipo")


def bajar(capa):
    p = {"service": "WFS", "version": "2.0.0", "request": "GetFeature",
         "typeNames": capa, "outputFormat": "application/json", "srsName": "EPSG:4326"}
    req = urllib.request.Request(WFS + "?" + urllib.parse.urlencode(p), headers=UA)
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def primero(props, campos):
    for c in campos:
        v = props.get(c)
        if v and str(v).strip() and str(v).strip().lower() not in ("null", "none"):
            return str(v).strip()
    return ""


def puntos_de(geom):
    """Todos los (lng, lat) de una geometría, sin importar el tipo."""
    t, c = geom.get("type"), geom.get("coordinates")
    if t == "Point":
        return [c]
    if t in ("MultiPoint", "LineString"):
        return list(c)
    if t in ("Polygon", "MultiLineString"):
        return [p for anillo in c for p in anillo]
    if t == "MultiPolygon":
        return [p for poli in c for anillo in poli for p in anillo]
    return []


def anillos_de(geom):
    """Anillos exteriores en [lat, lng], que es como los quiere Leaflet."""
    t, c = geom.get("type"), geom.get("coordinates")
    out = []
    if t == "Polygon":
        out = [c[0]]
    elif t == "MultiPolygon":
        out = [poli[0] for poli in c]
    return [[[round(p[1], 5), round(p[0], 5)] for p in anillo] for anillo in out]


def dentro(lat, lng):
    s, n, o, e = CAJA
    return s <= lat <= n and o <= lng <= e


def main():
    out = {"puntos": [], "areas": []}
    for cat, capa in CAPAS:
        try:
            d = bajar(capa)
        except Exception as ex:
            print(f"{capa:42} fail {type(ex).__name__}", flush=True)
            continue
        dentro_n = 0
        for f in d.get("features", []):
            g, pr = f.get("geometry") or {}, f.get("properties") or {}
            pts = puntos_de(g)
            if not pts:
                continue
            lat = sum(p[1] for p in pts) / len(pts)
            lng = sum(p[0] for p in pts) / len(pts)
            if not dentro(lat, lng):
                continue
            dentro_n += 1
            reg = {"c": cat, "lat": round(lat, 6), "lng": round(lng, 6),
                   "n": primero(pr, CAMPOS_NOMBRE),
                   "t": primero(pr, CAMPOS_TITULAR),
                   "m": primero(pr, CAMPOS_MATERIAL)}
            eia = pr.get("impacto_ambiental")
            if eia:
                reg["eia"] = str(eia)
            anillos = anillos_de(g)
            if anillos:
                reg["g"] = anillos
                out["areas"].append(reg)
            else:
                out["puntos"].append(reg)
        total = d.get("totalFeatures") or d.get("numberMatched") or len(d.get("features", []))
        print(f"{capa:42} {dentro_n:>4} de {total} dentro de los valles", flush=True)

    dst = os.path.join(ROOT, "mineria.json")
    json.dump(out, io.open(dst, "w", encoding="utf-8", newline=""),
              ensure_ascii=False, separators=(",", ":"))
    from collections import Counter
    print("puntos:", dict(Counter(p["c"] for p in out["puntos"])))
    print("áreas :", dict(Counter(a["c"] for a in out["areas"])))
    print(f"escrito {dst} ({os.path.getsize(dst)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
