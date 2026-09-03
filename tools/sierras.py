"""Casas en las sierras de Córdoba: valles de Punilla y Calamuchita.

Solo **casas** (no PH) de 3 ambientes o más, hasta USD 260.000. Sin la ciudad de
Córdoba ni las Sierras Chicas: los dos valles y nada más.

No existe un slug del valle. `casas-venta-punilla` y `casas-venta-calamuchita`
**no fallan**: devuelven una búsqueda nacional con avisos de Mendoza y Mar del
Plata. Por eso hay que pedir localidad por localidad y validar cada aviso contra
el nombre del pueblo en `locpath`.

Otros slugs que parecen de acá y no lo son —todos verificados a mano:

    san-roque          -> Luján, GBA Oeste          el-sauce      -> Mendoza
    san-agustin        -> Santa Fe                  san-ignacio   -> Misiones
    yacanto            -> depto. San Javier         icho-cruz     -> nacional
    villa-berna        -> nacional                  villa-alpina  -> nacional
    athos-pampa        -> nacional                  villa-ciudad-parque -> nacional
    villa-carlos-paz-centro -> Rosario              villa-rio-icho-cruz -> nacional

`yacanto` es el caso más traicionero: existe, es de Córdoba y no es del valle
—Yacanto de San Javier queda del otro lado de la provincia—. El del valle es
`villa-yacanto`.

    python tools/sierras.py [--max 260000] [--force]
"""
import json, os, sys, time, random, unicodedata

from scrape import get, postings, parse, locpath

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "sierras.json")

MAXP, MINP = 260000, 15000
PAGES = 12
MAX_AGE_H = 24

# (slug, etiqueta, valle) — el valle es el filtro grande de la página.
# Ordenados de norte a sur dentro de cada valle, como se recorren en el mapa.
PUNILLA, CALAMUCHITA = "Punilla", "Calamuchita"
LOCS = [
    ("capilla-del-monte",         "Capilla del Monte",         PUNILLA),
    ("charbonier",                "Charbonier",                PUNILLA),
    ("los-cocos",                 "Los Cocos",                 PUNILLA),
    ("san-esteban",               "San Esteban",               PUNILLA),
    ("la-cumbre",                 "La Cumbre",                 PUNILLA),
    ("villa-giardino",            "Villa Giardino",            PUNILLA),
    ("huerta-grande",             "Huerta Grande",             PUNILLA),
    ("la-falda",                  "La Falda",                  PUNILLA),
    ("valle-hermoso",             "Valle Hermoso",             PUNILLA),
    ("casa-grande",               "Casa Grande",               PUNILLA),
    ("cosquin",                   "Cosquín",                   PUNILLA),
    ("santa-maria-de-punilla",    "Santa María de Punilla",    PUNILLA),
    ("bialet-masse",              "Bialet Massé",              PUNILLA),
    ("villa-parque-siquiman",     "Villa Parque Síquiman",     PUNILLA),
    ("villa-santa-cruz-del-lago", "Villa Santa Cruz del Lago", PUNILLA),
    ("villa-carlos-paz",          "Villa Carlos Paz",          PUNILLA),
    # Villa Carlos Paz es el único pueblo que se topa con las 9 páginas. Ni yendo
    # de ida y de vuelta se llega al medio: queda un hueco entre USD 139.000 y
    # 245.000. `villa-del-lago` es un barrio suyo con slug propio y ayuda a
    # rellenarlo; se guarda con la misma etiqueta para que sea un solo pueblo.
    # Los otros barrios que probé —sol-y-rio, playas-de-oro, miguel-munoz,
    # villa-suiza, colinas-del-golf, el-canal, villa-del-rio— no existen como
    # slug y caen a la búsqueda nacional.
    ("villa-del-lago",            "Villa Carlos Paz",          PUNILLA),
    ("tanti",                     "Tanti",                     PUNILLA),
    ("estancia-vieja",            "Estancia Vieja",            PUNILLA),
    ("cabalango",                 "Cabalango",                 PUNILLA),
    ("san-antonio-de-arredondo",  "San Antonio de Arredondo",  PUNILLA),
    ("mayu-sumaj",                "Mayu Sumaj",                PUNILLA),
    ("cuesta-blanca",             "Cuesta Blanca",             PUNILLA),
    ("la-cumbrecita",             "La Cumbrecita",             CALAMUCHITA),
    ("villa-general-belgrano",    "Villa General Belgrano",    CALAMUCHITA),
    ("los-reartes",               "Los Reartes",               CALAMUCHITA),
    ("villa-ciudad-de-america",   "Villa Ciudad de América",   CALAMUCHITA),
    ("los-molinos",               "Los Molinos",               CALAMUCHITA),
    ("tala-huasi",                "Tala Huasi",                CALAMUCHITA),
    ("santa-rosa-de-calamuchita", "Santa Rosa de Calamuchita", CALAMUCHITA),
    ("villa-yacanto",             "Villa Yacanto",             CALAMUCHITA),
    ("villa-quillinzo",           "Villa Quillinzo",           CALAMUCHITA),
    ("embalse",                   "Embalse",                   CALAMUCHITA),
    ("villa-rumipal",             "Villa Rumipal",             CALAMUCHITA),
    ("villa-del-dique",           "Villa del Dique",           CALAMUCHITA),
    ("amboy",                     "Amboy",                     CALAMUCHITA),
]


def plain(s):
    """Sin acentos y en minúsculas.

    Zonaprop escribe la jerarquía sin tildes: el `locpath` dice "villa parque
    siquiman" y la etiqueta "Villa Parque Síquiman", así que comparar en crudo
    descartaba el pueblo entero — quedó en 0 avisos teniendo 30.
    """
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def url_for(slug, p, orden="ascendente"):
    """URL del listado, de menor a mayor precio o al revés.

    **No hay filtro de precio usable.** `-mas-de-130000-dolares` se ignora y
    devuelve la lista entera desde USD 34.000; `-130000-260000-dolares` es peor,
    porque no falla: cae a una búsqueda nacional y trae Mendoza y Mar del Plata.
    Por eso el tope de páginas se esquiva dando vuelta el orden y no acotando el
    precio.
    """
    base = f"casas-venta-{slug}-mas-de-3-ambientes-orden-precio-{orden}"
    return (f"https://www.zonaprop.com.ar/{base}.html" if p == 1
            else f"https://www.zonaprop.com.ar/{base}-pagina-{p}.html")


def main():
    mx = MAXP
    if "--max" in sys.argv:
        mx = int(sys.argv[sys.argv.index("--max") + 1])
    force = "--force" in sys.argv
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    stamp = data.setdefault("_fetched", {})

    def sweep(slug, label, valle, bucket, seen, orden="ascendente"):
        """Recorre un slug en un orden de precio.

        Devuelve cuántas páginas caminó, para saber si tocó el tope de 9.
        """
        want = plain(label)
        tag = orden[:3]
        pages = 0
        for p in range(1, PAGES + 1):
            html = get(url_for(slug, p, orden))
            pages = p
            if not html:
                print(f"{slug}/{tag} p{p}: FALLO", flush=True); break
            rows = postings(html)
            if not rows:
                print(f"{slug}/{tag} p{p}: sin avisos", flush=True); break
            added = over = wrong = 0
            for raw in rows:
                path = plain(locpath(raw))
                # el pueblo tiene que estar en la jerarquía **y** la provincia ser
                # Córdoba: sin lo segundo entra "San Roque > Luján > GBA Oeste"
                if want not in path or "cordoba" not in path:
                    wrong += 1
                    continue
                r = parse(raw)
                if r["price"] > mx:
                    over += 1
                if not r["id"] or r["id"] in seen:
                    continue
                if not (MINP <= r["price"] <= mx):
                    continue
                if r["amb"] and r["amb"] < 3:
                    continue
                if not r["img"] or not r["url"] or "alquiler" in r["url"]:
                    continue
                r["loc"] = label
                r["valle"] = valle
                seen.add(r["id"])
                bucket.append(r)
                added += 1
            print(f"{slug}/{tag} p{p}: +{added} (tot {len(bucket)}) "
                  f"caros={over} fuera={wrong}", flush=True)
            json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
            if wrong >= 25:
                print(f"{slug}: slug inválido, corto", flush=True); break
            # ascendente corta al cruzar el techo; descendente arranca por
            # arriba de él, así que ahí `caros` no significa nada
            if orden == "ascendente" and over >= 8:
                break
            time.sleep(1.1 + random.random() * 0.6)
        return pages

    for slug, label, valle in LOCS:
        if not force and time.time() - stamp.get(slug, 0) < MAX_AGE_H * 3600:
            print(f"{slug}: cache — skip", flush=True); continue
        bucket = data.setdefault(slug, [])
        seen = {x["id"] for x in bucket}
        pages = sweep(slug, label, valle, bucket, seen)
        # Zonaprop corta la paginación anónima en 9 páginas (270 avisos) por
        # consulta. Villa Carlos Paz se topó ahí con 267 avisos y quedó cortado en
        # USD 139.000. Como el listado va de menor a mayor, se sigue pidiendo desde
        # el precio más alto que entró: cada banda arranca donde murió la anterior.
        if pages >= 9:
            print(f"{slug}: tocó el tope de páginas, voy por el otro extremo", flush=True)
            sweep(slug, label, valle, bucket, seen, "descendente")
        stamp[slug] = time.time()
        json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)

    tot = sum(len(v) for k, v in data.items() if not k.startswith("_"))
    porvalle = {}
    for slug, label, valle in LOCS:
        porvalle[valle] = porvalle.get(valle, 0) + len(data.get(slug, []))
    print("DONE total", tot, porvalle, flush=True)


if __name__ == "__main__":
    main()
