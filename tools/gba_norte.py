"""Segundo relevamiento: casas y PH con jardín en el norte del conurbano.

Bella Vista, San Miguel, Olivos, La Lucila y Martínez, hasta USD 260.000.
Va a un archivo aparte (`.work/gba_norte.json`) y alimenta `gba-norte.html`;
no se mezcla con el relevamiento de CABA.

Dos trampas con los slugs:

  * `bella-vista` es Bella Vista de **Corrientes** y `la-lucila`, La Lucila de
    **Santa Fe**. Los del conurbano son `bella-vista-san-miguel` y
    `la-lucila-vicente-lopez`.
  * Agregarle `-gba-norte` a un slug que no existe no falla: devuelve la provincia
    entera (37.000 avisos). Por eso cada aviso se valida contra el partido esperado.

Se piden casas y PH por separado: Zonaprop corta en 9 páginas por consulta, así que
dos consultas por localidad duplican el techo de avisos que se pueden traer.

    python tools/gba_norte.py [--max 260000]
"""
import json, os, re, sys, time, random, unicodedata

from scrape import get, postings, parse, locpath

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
OUT = os.path.join(D, "gba_norte.json")

MINP = 15000
PAGES = 9                      # tope de paginación anónima de Zonaprop
TIPOS = ["casas", "ph"]

# (clave, etiqueta, slug, partido esperado en la ruta de ubicación)
ZONES = [
    ("bellavista", "Bella Vista", "bella-vista-san-miguel", "san miguel"),
    ("sanmiguel",  "San Miguel",  "san-miguel",             "san miguel"),
    ("olivos",     "Olivos",      "olivos",                 "vicente lopez"),
    ("lalucila",   "La Lucila",   "la-lucila-vicente-lopez", "vicente lopez"),
    ("martinez",   "Martínez",    "martinez",               "san isidro"),
    # `maschwitz` a secas cae en Fisherton (Rosario) y San Bernardo, y
    # `ingeniero-maschwitz-escobar` devuelve todo Belén de Escobar: el bueno
    # es `ingeniero-maschwitz`, que resuelve a "ingeniero maschwitz > escobar".
    ("maschwitz",  "Ingeniero Maschwitz", "ingeniero-maschwitz", "escobar"),
    # `san-fernando-gba-norte` y `tigre-gba-norte` caen los dos en José C Paz:
    # otra vez la trampa del sufijo. Los buenos son los slugs pelados.
    ("sanfernando", "San Fernando", "san-fernando", "san fernando"),
    ("tigre",       "Tigre",        "tigre",        "tigre"),
    # Sublocalidades. Las dos consultas madre se topan con las 9 páginas y se
    # cortan muy abajo del presupuesto —San Fernando en USD 150.000 y Tigre en
    # 100.000—, así que se pide cada sublocalidad por separado: cada una tiene su
    # propio cupo de 270 y entre todas cubren el rango completo. Se guardan con la
    # etiqueta del partido, así en la página siguen siendo un solo botón.
    ("sf-victoria",  "San Fernando", "victoria-san-fernando", "san fernando"),
    ("sf-virreyes",  "San Fernando", "virreyes",              "san fernando"),
    ("tg-torcuato",  "Tigre",        "don-torcuato",          "tigre"),
    ("tg-pacheco",   "Tigre",        "general-pacheco",       "tigre"),
    ("tg-benavidez", "Tigre",        "benavidez",             "tigre"),
    ("tg-milberg",   "Tigre",        "rincon-de-milberg",     "tigre"),
    ("tg-troncos",   "Tigre",        "troncos-del-talar",     "tigre"),
    ("tg-dique",     "Tigre",        "dique-lujan",           "tigre"),
    ("tg-rojas",     "Tigre",        "ricardo-rojas",         "tigre"),
]

# El pedido para estas dos fue "casa con jardín", así que no se piden PH.
SOLO_CASAS = {"sanfernando", "tigre", "sf-victoria", "sf-virreyes",
               "tg-torcuato", "tg-pacheco", "tg-benavidez", "tg-milberg",
               "tg-troncos", "tg-dique", "tg-rojas"}

# **El 64% de las casas baratas de Tigre están en el Delta**: son islas, se llega
# en lancha y no hay calle. No es comparable con una casa con jardín en el
# continente, así que no entran. Para incluirlas, sacar esta entrada.
#
# OJO: esta línea se escribe con chr(92) y **nunca** desde un heredoc de
# shell. Ya pasó cuatro veces en el proyecto: el heredoc se come un nivel de
# barra, el \b queda como un backspace literal (0x08) y el patrón deja de
# matchear sin avisar — "delta > tigre" entraba como si fuera continente.
EXCLUIR = {"tigre": re.compile(r"\bdelta\b|\bisla|islas\s+del\s+paran", re.I)}


def plain(s):
    """Sin acentos y en minúsculas, para comparar rutas de ubicación."""
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def url_for(tipo, slug, p, orden="ascendente"):
    base = f"{tipo}-venta-{slug}-mas-de-3-ambientes-orden-precio-{orden}"
    return (f"https://www.zonaprop.com.ar/{base}.html" if p == 1
            else f"https://www.zonaprop.com.ar/{base}-pagina-{p}.html")


def main():
    mx = 260000
    if "--max" in sys.argv:
        mx = int(sys.argv[sys.argv.index("--max") + 1])
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}

    def barrer(key, label, slug, partido, tipo, bucket, seen, orden):
        """Una pasada. Devuelve cuántas páginas caminó, para detectar el tope."""
        pages = 0
        for p in range(1, PAGES + 1):
                html = get(url_for(tipo, slug, p, orden))
                pages = p
                if not html:
                    print(f"{key}/{tipo} p{p}: FAIL", flush=True); break
                raws = postings(html)
                if not raws:
                    print(f"{key}/{tipo} p{p}: vacío", flush=True); break
                over = added = wrong = 0
                fuera_zona = EXCLUIR.get(key)
                for raw in raws:
                    lp = plain(locpath(raw))
                    if partido not in lp:
                        wrong += 1
                        continue
                    if fuera_zona and fuera_zona.search(lp):
                        continue          # Delta: isla, sin calle
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
                    r["zona"] = label
                    r["zkey"] = key
                    seen.add(r["id"])
                    bucket.append(r)
                    added += 1
                print(f"{key}/{tipo} p{p}: +{added} (tot {len(bucket)}) over={over} offzone={wrong}",
                      flush=True)
                json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
                if wrong >= 25:
                    print(f"{key}/{tipo}: slug fuera de zona, corto", flush=True); break
                # ascendente corta al cruzar el techo de precio; descendente
                # arranca por arriba, así que ahí `over` no dice nada
                if orden == "ascendente" and over >= 8:
                    break
                time.sleep(1.1 + random.random() * 0.6)
        return pages

    for key, label, slug, partido in ZONES:
        bucket = data.setdefault(key, [])
        seen = {x["id"] for x in bucket}
        for tipo in (["casas"] if key in SOLO_CASAS else TIPOS):
            pages = barrer(key, label, slug, partido, tipo, bucket, seen, "ascendente")
            # Zonaprop corta en 9 páginas por consulta. Ingeniero Maschwitz llenó
            # las 9 con `over=0`: no llegó al techo de precio, se quedó sin páginas.
            # Pidiendo la lista al revés entra la otra punta del rango.
            if pages >= PAGES:
                print(f"{key}/{tipo}: tope de páginas, voy por el otro extremo", flush=True)
                barrer(key, label, slug, partido, tipo, bucket, seen, "descendente")
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    tot = sum(len(v) for v in data.values())
    print("DONE", {k: len(v) for k, v in data.items()}, "TOTAL", tot, flush=True)


if __name__ == "__main__":
    main()
