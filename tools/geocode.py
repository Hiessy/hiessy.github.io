"""Convierte las direcciones de Argenprop en coordenadas, para que sus avisos
tengan pin en el mapa.

Zonaprop publica lat/lng en el listado; Argenprop no (solo en la ficha individual,
que está bloqueada). Pero sí publica la dirección, y con eso alcanza.

Se usa **Nominatim** (OpenStreetMap): gratis, sin API key y sin cuenta, así que no
hay credenciales dando vueltas. A cambio pide respetar **1 pedido por segundo** y
mandar un User-Agent que identifique la aplicación — las dos cosas están abajo.
Google Geocoding haría lo mismo pero exige key y facturación.

Cada dirección resuelta queda en `.work/geocode.json` **para siempre**: es un dato
que no cambia, así que una dirección se pide una sola vez en la vida del proyecto.
Volver a correrlo solo pide las nuevas.

    python tools/geocode.py [--limit N]
"""
import json, os, re, sys, time, unicodedata, urllib.parse, urllib.request, urllib.error

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
CACHE = os.path.join(D, "geocode.json")
SOURCES = ["caba_ap.json", "gba_ap.json", "argenprop_merged.json"]

UA = "hiessy.github.io property map (contact via github.com/Hiessy)"
DELAY = 1.1                      # la política de Nominatim es 1 req/s

# Caja de cada zona, para descartar una respuesta que cayó en otra provincia.
BOXES = {
    "caba":      (-34.71, -34.50, -58.56, -58.32),
    "vicente":   (-34.55, -34.47, -58.55, -58.45),
    "sanisidro": (-34.53, -34.44, -58.58, -58.47),
    "sanmiguel": (-34.62, -34.48, -58.79, -58.63),
}


def plain(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


# Abreviaturas de calle: Nominatim no resuelve "Int. Arricau", sí "Intendente
# Arricau". Se reemplaza palabra por palabra y no con regex: una barra-b mal
# termina siendo un backspace literal y el patrón deja de matchear en silencio.
ABBR = {"int": "Intendente", "av": "Avenida", "avda": "Avenida", "gral": "General",
        "grl": "General", "dr": "Doctor", "dra": "Doctora", "cnel": "Coronel",
        "tte": "Teniente", "pte": "Presidente", "pje": "Pasaje", "sgto": "Sargento",
        "alte": "Almirante", "gob": "Gobernador", "ing": "Ingeniero",
        "prof": "Profesor", "sta": "Santa", "sto": "Santo"}


def expand_abbr(a):
    return " ".join(ABBR.get(w.lower().rstrip("."), w) for w in a.split())


def clean_addr(addr):
    """'Cabildo al 3000, Piso PB' -> 'Cabildo 3000'.

    Nominatim no entiende 'al 3000' (así se escribe una altura aproximada en
    Argentina) ni los sufijos de piso o entrecalles.
    """
    a = addr or ""
    a = re.split(r",\s*(?:piso|p\.b\.|pb|uf|depto|dto)\b", a, flags=re.I)[0]
    a = re.split(r"\.?\s*entre\s+", a, flags=re.I)[0]
    a = re.sub(r"\bal\s+(\d)", r"\1", a, flags=re.I)
    a = re.sub(r"\s*\d+\s*°.*$", "", a)
    a = re.sub(r"[*]+", " ", a)
    a = expand_abbr(a)
    return re.sub(r"\s+", " ", a).strip(" ,.-")


def zone_of(loc):
    l = plain(loc)
    if "vicente lopez" in l or "olivos" in l or "la lucila" in l:
        return "vicente"
    if "san isidro" in l or "martinez" in l:
        return "sanisidro"
    if "san miguel" in l or "bella vista" in l:
        return "sanmiguel"
    return "caba"


def query_for(addr, loc):
    """La dirección sola es ambigua: hay una calle Nuñez en media Argentina."""
    a = clean_addr(addr)
    if not a or not re.search(r"\d", a):
        return None                      # sin altura no vale la pena preguntar
    tail = re.sub(r"^.*?\ben\s+Venta\s+en\s+", "", loc or "", flags=re.I)
    tail = tail.replace("CABA", "Ciudad Autónoma de Buenos Aires")
    return f"{a}, {tail}, Argentina"


def lookup(q):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": q, "format": "jsonv2", "limit": 1, "countrycodes": "ar"})
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Accept-Language": "es"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            js = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"err": f"http{e.code}"}
    except Exception as e:
        return {"err": type(e).__name__}
    if not js:
        return {"err": "nohit"}
    return {"lat": round(float(js[0]["lat"]), 6), "lng": round(float(js[0]["lon"]), 6)}


def in_box(lat, lng, zone):
    s, n, w, e = BOXES[zone]
    return s <= lat <= n and w <= lng <= e


def load_cache():
    return json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}


def coords_for(addr, loc, cache):
    """(lat, lng) de una dirección ya geocodificada, o (0, 0) si no se resolvió."""
    q = query_for(addr, loc)
    hit = cache.get(q) if q else None
    if not hit or "lat" not in hit:
        return 0, 0
    return hit["lat"], hit["lng"]


def main():
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
    cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}

    todo, seen_q = [], set()
    for name in SOURCES:
        p = os.path.join(D, name)
        if not os.path.exists(p):
            continue
        for key, bucket in json.load(open(p, encoding="utf-8")).items():
            if key.startswith("_"):
                continue
            for r in bucket:
                q = query_for(r.get("addr"), r.get("loc"))
                if not q or q in cache or q in seen_q:
                    continue
                seen_q.add(q)
                todo.append((q, zone_of(r.get("loc"))))

    print(f"direcciones nuevas: {len(todo)} | ya en caché: {len(cache)}", flush=True)
    if limit:
        todo = todo[:limit]

    ok = bad = out = 0
    for i, (q, zone) in enumerate(todo, 1):
        res = lookup(q)
        if "lat" in res and not in_box(res["lat"], res["lng"], zone):
            res = {"err": "fuera de zona"}          # cayó en otra ciudad: no sirve
            out += 1
        cache[q] = res
        ok += "lat" in res
        bad += "err" in res
        if i % 25 == 0 or i == len(todo):
            json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
            print(f"{i}/{len(todo)} resueltas={ok} sin_resultado={bad} fuera_de_zona={out}",
                  flush=True)
        time.sleep(DELAY)

    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    tot = sum(1 for v in cache.values() if "lat" in v)
    print(f"DONE cache={len(cache)} con coordenadas={tot}", flush=True)


if __name__ == "__main__":
    main()
