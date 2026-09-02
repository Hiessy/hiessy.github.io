"""Relevamiento de Argenprop, como segunda fuente junto a Zonaprop.

Argenprop no expone un JSON como Zonaprop, pero cada ficha trae los datos duros en
atributos del `<a>` (dormitorios, ambientes, moneda, monto), así que no hay que
adivinarlos del texto. El resto (superficie, baños, dirección, descripción) sale
del markup de la tarjeta.

Ojo con el ritmo: detrás de CloudFront, Argenprop empieza a devolver **202 con
cuerpo vacío** después de una docena de pedidos rápidos. No es un captcha ni un
error: es un bloqueo silencioso. Por eso el delay es alto y un 202 dispara una
espera larga.
"""
import urllib.request, urllib.error, json, re, time, os, sys, random, html

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   ".work", "argenprop.json")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
HDR = {"User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9",
       "Accept": "text/html,application/xhtml+xml"}

MAXP, MINP = 260000, 15000
MAX_AGE_H = 24
DELAY = (7.0, 11.0)          # segundos entre pedidos
PAGES = 12                   # 20 avisos por página

# (clave, región, slug de localidad de Argenprop)
ZONES = [
    ("smla",        0, "san-martin-de-los-andes"),
    ("lacumbre",    1, "la-cumbre"),
    ("calamuchita", 2, "santa-rosa-de-calamuchita"),
    ("caba",        3, "capital-federal"),
    ("tigre",       4, "tigre"),
    ("sanmiguel",   5, "san-miguel"),
]
TIPOS = ["casas", "ph"]


def url_for(tipo, loc, page):
    u = f"https://www.argenprop.com/{tipo}/venta/{loc}/hasta-{MAXP}-dolares"
    return u if page == 1 else f"{u}/pagina-{page}"


def get(u, tries=4, deadline=None):
    """Devuelve el HTML, o None. Un 202 vacío = bloqueo silencioso -> espera larga.

    `deadline` es un timestamp absoluto: pasado ese momento no se espera más y se
    devuelve None. Sin él, un solo URL bloqueado duerme 45+90+135+180 = 450 s, así
    que dos barrios pueden tardar media hora — y desde afuera parece colgado.
    """
    def wait(s):
        """Duerme s segundos, salvo que eso cruce el deadline. False = dejar de reintentar."""
        if deadline is None:
            time.sleep(s); return True
        if time.time() + s > deadline:
            return False
        time.sleep(s); return True

    for i in range(tries):
        if deadline and time.time() > deadline:
            return None
        try:
            r = urllib.request.urlopen(urllib.request.Request(u, headers=HDR), timeout=35)
            t = r.read().decode("utf-8", "ignore")
            if r.status == 202 or len(t) < 2000:
                if not wait(45 * (i + 1)):
                    return None
                continue
            return t
        except urllib.error.HTTPError as e:
            if e.code in (403, 429):
                if not wait(45 * (i + 1)):
                    return None
                continue
            if e.code == 404:
                return None
            wait(5)
        except Exception:
            wait(6)
    return None


def txt(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


CARD = re.compile(r'<a href="(?P<href>[^"]+)"[^>]*?data-item-card="(?P<id>\d+)"(?P<attrs>.*?)</a>', re.S)
ATTR = lambda a, n: (re.search(rf'\b{n}="([^"]*)"', a) or [None, ""])[1]


def parse(page_html):
    out = []
    for m in CARD.finditer(page_html):
        a, body = m.group("attrs"), m.group(0)
        if ATTR(a, "idmoneda") != "2":          # 2 = USD
            continue
        try:
            price = int(float(ATTR(a, "montooperacion") or 0))
        except ValueError:
            continue
        img = ""
        mi = re.search(r'<img[^>]+src="(https://www\.argenprop\.com/static-content/[^"]+)"', body)
        if mi:
            img = mi.group(1)
        feats = re.search(r'card__main-features">(.*?)</ul>', body, re.S)
        fe = txt(feats.group(1)) if feats else ""

        def num(pat):
            """La superficie viene con coma decimal ('113,50 m²'), así que hay que
            tomar el número entero completo y no los dos dígitos de after la coma."""
            m = re.search(pat, fe)
            if not m:
                return 0
            return int(re.split(r"[.,]", m.group(1))[0])
        addr = re.search(r'card__address"[^>]*>(.*?)</p>', body, re.S)
        title = re.search(r'card__title--primary">(.*?)</p>', body, re.S)
        desc = re.search(r'card__info\s*">(.*?)</p>', body, re.S)
        href = m.group("href")
        amb = int(ATTR(a, "ambientes") or 0)
        if not amb:
            # el slug escribe "-1-ambiente-" en SINGULAR: sin la "s?" los
            # monoambientes quedaban con ambientes=0 y pasaban un filtro de 3+
            ma = re.search(r"-(\d+)-ambientes?-", href)
            amb = int(ma.group(1)) if ma else 0
        out.append({
            "id": m.group("id"),
            "url": "https://www.argenprop.com" + href,
            "img": img,
            "price": price,
            "addr": txt(addr.group(1)) if addr else "",
            "loc": txt(title.group(1)) if title else "",
            "cub": num(r"([\d.,]+) m² cubie"),
            "tot": num(r"([\d.,]+) m² tot"),
            "dorm": int(ATTR(a, "dormitorios") or 0),
            "amb": amb,
            "ban": num(r"([\d.,]+) baño"),
            "d": txt(desc.group(1))[:400] if desc else "",
            "src": "Argenprop",
        })
    return out


def keep(r):
    if not (MINP <= r["price"] <= MAXP):
        return False
    if r["amb"] and r["amb"] < 3:
        return False
    if not r["amb"] and r["dorm"] and r["dorm"] < 2:
        return False
    return bool(r["img"] and r["url"])


def main():
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    force = "--force" in sys.argv
    stamp = data.setdefault("_fetched", {})
    # Los primeros ~12 pedidos pasan; después CloudFront corta. Así que arrancamos
    # por las zonas que menos avisos tienen, si no las últimas de la lista nunca
    # llegan a relevarse.
    zones = sorted(ZONES, key=lambda z: len(data.get(z[0], [])))
    for key, reg, loc in zones:
        for tipo in TIPOS:
            tag = f"{tipo}/{loc}"
            if not force and (time.time() - stamp.get(tag, 0)) < MAX_AGE_H * 3600:
                print(f"{tag}: cache — skip", flush=True); continue
            bucket = data.setdefault(key, [])
            before = len(bucket)
            seen = {x["id"] for x in bucket}
            for p in range(1, PAGES + 1):
                h = get(url_for(tipo, loc, p))
                if not h:
                    print(f"{tag} p{p}: BLOQUEADO/vacío", flush=True); break
                rows = parse(h)
                if not rows:
                    print(f"{tag} p{p}: sin avisos", flush=True); break
                added = 0
                for r in rows:
                    if r["id"] in seen or not keep(r):
                        continue
                    r["reg"] = reg
                    seen.add(r["id"])
                    bucket.append(r)
                    added += 1
                print(f"{tag} p{p}: +{added} (tot {len(bucket)})", flush=True)
                json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
                time.sleep(random.uniform(*DELAY))
            # Solo marcamos el slug como relevado si realmente trajo avisos. Si
            # CloudFront nos cortó, dejarlo sin sellar para que el próximo intento
            # lo retome en vez de saltearlo por caché.
            if len(bucket) > before:
                stamp[tag] = time.time()
            json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("DONE", {k: len(v) for k, v in data.items() if not k.startswith("_")}, flush=True)


if __name__ == "__main__":
    main()
