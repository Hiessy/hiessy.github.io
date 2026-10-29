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
    santa-monica       -> Mar del Plata             villa-del-parque -> CABA
    yacanto-de-calamuchita -> Yacanto, San Javier   el-torreon    -> nacional
    falda-de-los-reartes -> nacional                villa-benegas -> nacional
    la-cruz-cordoba / los-molinos-cordoba -> toda la provincia

Calamuchita tiene **la mitad de pueblos que Punilla** (14 contra 24) y no por
olvido: Zonaprop no indexa por separado a Villa Berna, Athos Pampa, Falda de
los Reartes, El Vergel ni Calmayo, que sí aparecen en los avisos de Argenprop y
MercadoLibre —esos dos se piden por partido entero y no por pueblo, así que los
levantan igual—.

Pegados al valle pero **fuera** de él, en el departamento Santa María, hay dos
slugs que sí funcionan y que hoy no se piden porque el sitio dice Punilla y
Calamuchita: `potrero-de-garay` (170 avisos) y `san-clemente` (12).

`yacanto` es el caso más traicionero: existe, es de Córdoba y no es del valle
—Yacanto de San Javier queda del otro lado de la provincia—. El del valle es
`villa-yacanto`.

    python tools/sierras.py [--max 260000] [--force] [--purge] [--only charbonier,los-cocos]
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
# Tercer grupo, chico y pegado al valle pero **fuera** de él: Potrero de Garay y
# San Clemente son del departamento Santa María, sobre la costa oeste del lago
# Los Molinos. Van aparte y no metidos dentro de Calamuchita, que sería decir
# que están donde no están.
SANTA_MARIA = "Santa María"
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
    # 57 avisos que faltaban: el pueblo tiene slug propio y largo. El corto,
    # `villa-ciudad-parque`, cae a la búsqueda nacional (ver la lista de arriba).
    ("villa-ciudad-parque-los-reartes", "Villa Ciudad Parque Los Reartes", CALAMUCHITA),
    ("villa-ciudad-de-america",   "Villa Ciudad de América",   CALAMUCHITA),
    ("los-molinos",               "Los Molinos",               CALAMUCHITA),
    # Tala Huasi está sobre el Icho Cruz, al sur de Villa Carlos Paz: es
    # **Punilla**, no Calamuchita. Estaba en el valle equivocado, así que sus
    # 27 avisos aparecían bajo el filtro de Calamuchita y la caja de
    # geocodificación que les tocaba era la del otro valle.
    ("tala-huasi",                "Tala Huasi",                PUNILLA),
    ("santa-rosa-de-calamuchita", "Santa Rosa de Calamuchita", CALAMUCHITA),
    ("villa-yacanto",             "Villa Yacanto",             CALAMUCHITA),
    ("villa-quillinzo",           "Villa Quillinzo",           CALAMUCHITA),
    ("embalse",                   "Embalse",                   CALAMUCHITA),
    ("villa-rumipal",             "Villa Rumipal",             CALAMUCHITA),
    ("villa-amancay",             "Villa Amancay",             CALAMUCHITA),
    ("villa-del-dique",           "Villa del Dique",           CALAMUCHITA),
    ("amboy",                     "Amboy",                     CALAMUCHITA),

    # Santa María: el lago Los Molinos, por el lado de afuera del valle.
    ("potrero-de-garay",          "Potrero de Garay",          SANTA_MARIA),
    ("san-clemente",              "San Clemente",              SANTA_MARIA),
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

        Devuelve (páginas caminadas, si falló algún pedido): lo primero para
        saber si tocó el tope de 9, lo segundo para que `--purge` no tire el
        bucket viejo sobre un barrido que quedó por la mitad.
        """
        want = plain(label)
        tag = orden[:3]
        pages = 0
        anterior = None
        for p in range(1, PAGES + 1):
            html = get(url_for(slug, p, orden))
            pages = p
            if not html:
                # Pasada la novena página Zonaprop no sirve más resultados
                # anónimos. Eso es el tope, no una falla: lo resuelve `tope` con
                # las páginas caminadas, yendo por el otro extremo.
                if p > 9:
                    print(f"{slug}/{tag} p{p}: tope de páginas anónimas", flush=True)
                    return p - 1, False
                print(f"{slug}/{tag} p{p}: FALLO", flush=True)
                return pages, True
            rows = postings(html)
            if not rows:
                print(f"{slug}/{tag} p{p}: sin avisos", flush=True); break
            # Pasado el final Zonaprop **no da una página vacía: repite la
            # última**. Charbonier, con una sola página, devolvía la misma de la
            # 2 a la 9 y en la 10 chocaba con el tope; eran 8 pedidos de más por
            # pueblo, y con `--purge` ese choque se leía como falla y no dejaba
            # purgar ninguno.
            firma = [str(raw.get("postingId") or "") for raw in rows]
            if firma == anterior:
                print(f"{slug}/{tag} p{p}: repite la anterior, fin", flush=True)
                return p - 1, False
            anterior = firma
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
        return pages, False

    # `--purge`: el bucket de cada pueblo se reemplaza por lo que Zonaprop lista
    # **hoy**, así se van solos los dados de baja, los vendidos y los que
    # subieron de precio. Es lo que el README llama purgar y volver a relevar, y
    # limpia más que `deadlinks.py` en una fracción del tiempo.
    #
    # El bucket viejo solo se tira si el barrido del pueblo llegó entero. Dos
    # casos en que no, y entonces se suman los nuevos sin sacar nada:
    #   - un pedido falló: una página que no vino se ve igual que una sin avisos;
    #   - el pueblo tocó el tope de 9 páginas (Villa Carlos Paz): ni yendo de ida
    #     y de vuelta se ve el medio, así que lo que no apareció puede estar vivo.
    #     Esos los verifica `deadlinks.py`, aviso por aviso.
    purge = "--purge" in sys.argv
    only = set(sys.argv[sys.argv.index("--only") + 1].split(",")) \
        if "--only" in sys.argv else None

    for slug, label, valle in LOCS:
        if only and slug not in only:
            continue
        if not force and time.time() - stamp.get(slug, 0) < MAX_AGE_H * 3600:
            print(f"{slug}: cache — skip", flush=True); continue
        bucket = data.setdefault(slug, [])
        # Con `--purge` se barre a una lista aparte y el bucket viejo sigue en
        # `data` hasta el final: `sweep()` escribe el archivo en cada página, y
        # vaciándolo antes un corte a mitad dejaba el pueblo en cero en disco.
        destino = [] if purge else bucket
        seen = {x["id"] for x in destino}
        pages, fallo = sweep(slug, label, valle, destino, seen)
        # Zonaprop corta la paginación anónima en 9 páginas (270 avisos) por
        # consulta. Villa Carlos Paz se topó ahí con 267 avisos y quedó cortado en
        # USD 139.000. Como el listado va de menor a mayor, se sigue pidiendo desde
        # el precio más alto que entró: cada banda arranca donde murió la anterior.
        tope = pages >= 9
        if tope and not fallo:
            print(f"{slug}: tocó el tope de páginas, voy por el otro extremo", flush=True)
            _, fallo = sweep(slug, label, valle, destino, seen, "descendente")
        if purge:
            ids = {x["id"] for x in destino}
            if fallo or tope:
                quedan = [x for x in bucket if x["id"] not in ids]
                data[slug] = destino + quedan
                print(f"{slug}: {'falló un pedido' if fallo else 'tope de páginas'}, "
                      f"no purgo ({len(quedan)} viejos se quedan)", flush=True)
            else:
                data[slug] = destino
                print(f"{slug}: purgo {sum(1 for x in bucket if x['id'] not in ids)} "
                      f"de {len(bucket)} (quedan {len(destino)})", flush=True)
        # Un pueblo que falló no se sella: así la próxima corrida lo vuelve a pedir
        # en vez de saltearlo 24 horas con datos a medias.
        if not fallo:
            stamp[slug] = time.time()
        json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)

    tot = sum(len(v) for k, v in data.items() if not k.startswith("_"))
    porvalle = {}
    for slug, label, valle in LOCS:
        porvalle[valle] = porvalle.get(valle, 0) + len(data.get(slug, []))
    print("DONE total", tot, porvalle, flush=True)


if __name__ == "__main__":
    main()
