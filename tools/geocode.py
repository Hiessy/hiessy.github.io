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
SOURCES = ["caba_ap.json", "gba_ap.json", "argenprop_merged.json", "sierras_ap.json",
           # Zonaprop **casi siempre** publica coordenadas, pero no siempre: en la
           # sierra 315 avisos venían sin ellas y se quedaban fuera del mapa
           # teniendo dirección. Los que ya traen lat/lng se saltean abajo, así
           # que sumar este archivo no agrega 3.000 consultas sino las que faltan.
           "sierras.json"]

UA = "hiessy.github.io property map (contact via github.com/Hiessy)"
DELAY = 1.1                      # la política de Nominatim es 1 req/s

# Caja de cada zona, para descartar una respuesta que cayó en otra provincia.
BOXES = {
    "caba":      (-34.71, -34.50, -58.56, -58.32),
    "vicente":   (-34.55, -34.47, -58.55, -58.45),
    "sanisidro": (-34.53, -34.44, -58.58, -58.47),
    "sanmiguel": (-34.62, -34.48, -58.79, -58.63),
    # Ingeniero Maschwitz, partido de Escobar. Sin esta caja caía en la de CABA
    # —el default de `zone_of`— y se descartaban todas sus direcciones por
    # "fuera de zona", estando bien resueltas.
    "escobar":   (-34.45, -34.28, -58.90, -58.60),
    "sanfdo":    (-34.50, -34.38, -58.64, -58.48),
    # Tigre continente: Don Torcuato y El Talar al sur, Benavídez al oeste,
    # Rincón de Milberg al este. El Delta no entra al relevamiento.
    "tigre":     (-34.52, -34.30, -58.80, -58.48),
    # Los dos valles de Córdoba. Punilla corre de norte a sur unos 100 km y
    # Calamuchita queda al sur de la capital: una caja por valle, generosa,
    # porque acá lo que se descarta es una respuesta que cayó en otra provincia.
    # Punilla va de Capilla del Monte (-30,86) a Cuesta Blanca (-31,48): el
    # borde sur tiene que pasar los -31,50. Con -31,30 quedaban afuera Villa
    # Carlos Paz, Tanti y todo el sur del valle, y se descartaban **todas** sus
    # direcciones como "fuera de zona" estando bien resueltas.
    "punilla":     (-31.60, -30.75, -64.75, -64.30),
    "calamuchita": (-32.40, -31.70, -64.90, -64.30),
}


def plain(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


# Los pueblos de sierra salen de la misma tabla que usa el barrido, así que
# agregar uno no obliga a tocar esto. `loc` llega como "Cosquín" pelado —sin
# "Córdoba"—, de modo que reconocerlos por nombre es la única forma de mandarlos
# a la caja correcta: mirando si decía "córdoba" no entraba ninguno y todos se
# validaban contra la caja de CABA.
try:
    from sierras import LOCS as _LOCS
    T_PUNILLA = {plain(lab) for _, lab, val in _LOCS if val == "Punilla"}
    T_CALAMUCHITA = {plain(lab) for _, lab, val in _LOCS if val == "Calamuchita"}
except Exception:
    T_PUNILLA = T_CALAMUCHITA = set()


# Abreviaturas de calle: Nominatim no resuelve "Int. Arricau", sí "Intendente
# Arricau". Se reemplaza palabra por palabra y no con regex: una barra-b mal
# termina siendo un backspace literal y el patrón deja de matchear en silencio.
ABBR = {"int": "Intendente", "av": "Avenida", "avda": "Avenida", "gral": "General",
        "grl": "General", "dr": "Doctor", "dra": "Doctora", "cnel": "Coronel",
        "tte": "Teniente", "pte": "Presidente", "pje": "Pasaje", "sgto": "Sargento",
        "alte": "Almirante", "gob": "Gobernador", "ing": "Ingeniero",
        "prof": "Profesor", "sta": "Santa", "sto": "Santo",
        # Erratas que vienen escritas así en los avisos y que Nominatim no
        # perdona: "Tucman 76, Tala Huasi" no resuelve, "Tucumán 76" sí.
        "tucman": "Tucumán", "tucuman": "Tucumán", "cordoba": "Córdoba",
        "sanmartin": "San Martín", "belgrano.": "Belgrano"}


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
    # "florida": las direcciones de Argenprop traen la localidad y no el partido,
    # así que sin esto los avisos de Florida quedaban sin zona y se descartaban
    # sus coordenadas. Entra en la misma caja que el resto de Vicente López.
    if ("vicente lopez" in l or "olivos" in l or "la lucila" in l
            or "florida" in l):
        return "vicente"
    if "san isidro" in l or "martinez" in l:
        return "sanisidro"
    if "san miguel" in l or "bella vista" in l:
        return "sanmiguel"
    if "maschwitz" in l or "escobar" in l:
        return "escobar"
    if any(pu in l for pu in T_CALAMUCHITA):
        return "calamuchita"
    if any(pu in l for pu in T_PUNILLA) or "cordoba" in l:
        return "punilla"
    if "san fernando" in l or "victoria" in l or "virreyes" in l:
        return "sanfdo"
    if "tigre" in l or "torcuato" in l or "pacheco" in l or "benavidez" in l:
        return "tigre"
    return "caba"


def cola(loc):
    tail = re.sub(r"^.*?\ben\s+Venta\s+en\s+", "", loc or "", flags=re.I)
    return tail.replace("CABA", "Ciudad Autónoma de Buenos Aires")


def query_for(addr, loc):
    """La dirección sola es ambigua: hay una calle Nuñez en media Argentina."""
    a = clean_addr(addr)
    if not a or not re.search(r"\d", a):
        return None                      # sin altura: ver `query_calle`
    return f"{a}, {cola(loc)}, Argentina"


# Sin altura la dirección no da un punto exacto, pero la **calle** sí ubica el
# aviso dentro del pueblo, que para mirar un mapa de la sierra ya es bastante.
# Pidiendo solo las que traen altura quedaban 482 avisos sin pin teniendo los dos
# datos escritos ("Curupaiti, La Falda"). Estos puntos se marcan como aproximados
# y la página los dibuja distinto: un pin a media cuadra es útil, uno que finge
# precisión que no tiene, no.
SIN_ALTURA = re.compile(r"\bs/?n\b|\bsin\s+n[uú]mero\b", re.I)


def query_calle(addr, loc):
    a = clean_addr(addr)
    if not a:
        return None
    a = SIN_ALTURA.sub("", a)
    # sacar la cola de localidad que ya viene repetida en la dirección
    t = cola(loc)
    a = re.sub(r",\s*" + re.escape(t) + r"\s*$", "", a, flags=re.I).strip(" ,")
    # entrecalles: con la primera alcanza para ubicar la cuadra
    a = re.split(r"\s+(?:e/|entre|esq\.?|esquina|y)\s+", a, flags=re.I)[0].strip(" ,")
    a = re.sub(r"\d+", "", a).strip(" ,")
    if len(a) < 3 or not t:
        return None
    # "Ruta", "Privada", "Lote" sueltos no son una calle: lo que conteste
    # Nominatim va a ser cualquier cosa que quede dentro de la caja del valle,
    # y un pin equivocado es peor que ninguno.
    if plain(a) in GENERICA:
        return None
    return f"{a}, {t}, Argentina"


def query_pueblo(loc):
    """El pueblo, sin más. Último recurso y el menos preciso de los tres.

    Cinco favoritos no tenían pin porque el aviso pone una calle de relleno
    ("Publica 100", "Calle Publica 100") que `query_calle` descarta bien: un pin
    inventado es peor que ninguno. Pero desaparecer del mapa tampoco sirve, y el
    pueblo **sí** lo sabemos. Queda marcado como aproximado de pueblo (nivel 2) y
    la página lo dibuja distinto y lo dice en el globo.
    """
    t = cola(loc)
    return f"{t}, Córdoba, Argentina" if t and len(t) > 2 else None


GENERICA = {"ruta", "rutas", "ruta nacional", "ruta provincial", "calle", "calles",
            "privada", "publica", "camino", "barrio", "lote", "lotes", "manzana",
            "sn", "s/n", "domicilio", "direccion", "zona", "centro", "s/d"}


def lookup(q, tries=4):
    """Resuelve una dirección, esperando si el servidor pide que aflojemos.

    Nominatim contesta **429** cuando se le pide de más, y antes eso se guardaba
    en la caché como si fuera un resultado: la dirección quedaba marcada como no
    resuelta para siempre sin haberla consultado nunca de verdad. Un 429 no es
    una respuesta sobre la dirección, es una respuesta sobre nosotros: se espera
    y se reintenta, y si no afloja se devuelve el error **sin** cachearlo.
    """
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": q, "format": "jsonv2", "limit": 1, "countrycodes": "ar"})
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Accept-Language": "es"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                js = json.loads(r.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and i < tries - 1:
                time.sleep(20 * (i + 1))
                continue
            return {"err": f"http{e.code}", "reintentar": e.code in (429, 503)}
        except Exception as e:
            if i < tries - 1:
                time.sleep(6)
                continue
            return {"err": type(e).__name__, "reintentar": True}
    if not js:
        return {"err": "nohit"}
    return {"lat": round(float(js[0]["lat"]), 6), "lng": round(float(js[0]["lon"]), 6)}


def in_box(lat, lng, zone):
    s, n, w, e = BOXES[zone]
    return s <= lat <= n and w <= lng <= e


def load_cache():
    return json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}


def coords_for(addr, loc, cache):
    """(lat, lng) de una dirección ya geocodificada, o (0, 0) si no se resolvió.

    Tres niveles, de mejor a peor: la dirección con altura, la calle sola, y el
    pueblo. `aprox_for` dice cuál de los tres salió, para dibujarlos distinto.
    """
    for q in (query_for(addr, loc), query_calle(addr, loc), query_pueblo(loc)):
        hit = cache.get(q) if q else None
        if hit and "lat" in hit:
            return hit["lat"], hit["lng"]
    return 0, 0


def aprox_for(addr, loc, cache):
    """0 exacto · 1 la calle sin altura · 2 sólo el pueblo."""
    for nivel, q in enumerate((query_for(addr, loc), query_calle(addr, loc),
                               query_pueblo(loc))):
        if q and "lat" in (cache.get(q) or {}):
            return nivel
    return 0


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
                # El que ya trae coordenadas del portal no se pregunta, **salvo
                # que caigan fuera de su zona**: Zonaprop publica alguna mal
                # (Tucumán 76 de Tala Huasi venía con la latitud de Capilla del
                # Monte, 68 km al norte). El guardia de distancia las tira, y sin
                # esto el aviso se quedaba sin pin teniendo dirección buena.
                lat, lng = r.get("lat"), r.get("lng")
                if lat and lng and in_box(lat, lng, zone_of(r.get("loc"))):
                    continue
                # Se encolan **los tres niveles**, no el primero que se pueda
                # armar: "Publica 100" tiene número, así que `query_for` devolvía
                # una consulta, esa consulta no resolvía y nunca se probaba el
                # pueblo. El aviso quedaba sin pin teniendo el pueblo escrito.
                # Las consultas de pueblo se repiten mucho y `seen_q` las junta:
                # son una por pueblo, no una por aviso.
                for q in (query_for(r.get("addr"), r.get("loc")),
                          query_calle(r.get("addr"), r.get("loc")),
                          query_pueblo(r.get("loc"))):
                    if not q or q in cache or q in seen_q:
                        continue
                    seen_q.add(q)
                    todo.append((q, zone_of(r.get("loc"))))

    print(f"direcciones nuevas: {len(todo)} | ya en caché: {len(cache)}", flush=True)
    if limit:
        todo = todo[:limit]

    ok = bad = out = saltadas = 0
    for i, (q, zone) in enumerate(todo, 1):
        res = lookup(q)
        if res.pop("reintentar", False):
            # el servidor nos frenó: no es un veredicto sobre esta dirección
            saltadas += 1
            continue
        if "lat" in res and not in_box(res["lat"], res["lng"], zone):
            res = {"err": "fuera de zona"}          # cayó en otra ciudad: no sirve
            out += 1
        cache[q] = res
        ok += "lat" in res
        bad += "err" in res
        if i % 25 == 0 or i == len(todo):
            json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
            print(f"{i}/{len(todo)} resueltas={ok} sin_resultado={bad} fuera_de_zona={out}" + (f" frenadas={saltadas}" if saltadas else ""),
                  flush=True)
        time.sleep(DELAY)

    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    tot = sum(1 for v in cache.values() if "lat" in v)
    print(f"DONE cache={len(cache)} con coordenadas={tot}", flush=True)


if __name__ == "__main__":
    main()
