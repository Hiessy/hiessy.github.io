import urllib.request, urllib.error, json, re, time, os, sys, random

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work", "scraped.json")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
HDR = {"User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9",
       "Accept": "text/html,application/xhtml+xml"}

BARRIOS = ['colegiales', 'chacarita', 'villa-ortuzar', 'villa-urquiza', 'coghlan',
           'saavedra', 'nunez', 'belgrano', 'palermo', 'la-paternal', 'agronomia',
           'parque-chas', 'villa-pueyrredon', 'villa-devoto', 'villa-del-parque',
           'villa-crespo', 'villa-santa-rita', 'villa-general-mitre', 'monte-castro',
           'villa-real', 'versalles', 'floresta', 'velez-sarsfield', 'santa-rita',
           'parque-chacabuco', 'caballito', 'almagro', 'boedo', 'flores']

# (key, slug, region index, max pages, required substring of the location path)
JOBS = [('smla', 'san-martin-de-los-andes', 0, 25, 'san mart'),
        ('lacumbre', 'la-cumbre', 1, 12, 'la cumbre'),
        ('calamuchita', 'santa-rosa-de-calamuchita', 2, 15, 'calamuchita'),
        ('tigre', 'tigre', 4, 45, 'tigre'),
        ('sanmiguel', 'san-miguel', 5, 35, 'san miguel')]
JOBS += [('caba', b, 3, 14, 'capital federal') for b in BARRIOS]

MAXP = 200000
MINP = 15000
MAX_AGE_H = 24        # re-sweep a slug only if its cache is older than this


def url_for(slug, p):
    base = f"casas-ph-venta-{slug}-mas-de-3-ambientes-orden-precio-ascendente"
    return f"https://www.zonaprop.com.ar/{base}.html" if p == 1 else \
           f"https://www.zonaprop.com.ar/{base}-pagina-{p}.html"


def get(u, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(u, headers=HDR)
            return urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')
        except urllib.error.HTTPError as e:
            if e.code in (403, 429):
                time.sleep(8 * (i + 1)); continue
            if e.code == 404:
                return None
            time.sleep(3)
        except Exception:
            time.sleep(4)
    return None


def postings(html):
    k = "window.__PRELOADED_STATE__ = "
    i = html.find(k)
    if i < 0:
        return []
    try:
        obj, _ = json.JSONDecoder().raw_decode(html[i + len(k):])
        return obj.get('listStore', {}).get('listPostings', []) or []
    except Exception:
        return []


def feat(r, fid):
    try:
        return r['mainFeatures'][fid]['value']
    except Exception:
        return None


def num(v):
    try:
        return int(str(v).split('.')[0].replace(',', ''))
    except Exception:
        return 0


def price(r):
    for po in r.get('priceOperationTypes') or []:
        if (po.get('operationType') or {}).get('name') != 'Venta':
            continue
        for p in po.get('prices') or []:
            if p.get('currency') == 'USD':
                return int(p.get('amount') or 0)
    return 0


GARDEN = re.compile(r"jard[ií]n|jardines|parquizad|gran parque|parque propio", re.I)
# Zonaprop's list results carry no amenity flags (generalFeatures comes back empty
# and mainFeatures only holds surface/rooms), so garden is derived from the listing
# text. Computed over the *full* description before it gets truncated for display.


def parse(r):
    loc = r.get('postingLocation') or {}
    addr = ((loc.get('address') or {}) or {}).get('name') or ''
    lname = ((loc.get('location') or {}) or {}).get('name') or ''
    full = r.get('descriptionNormalized') or ''
    pics = ((r.get('visiblePictures') or {}).get('pictures') or [])
    img = ''
    for p in pics:
        u = p.get('url360x266') or ''
        if u:
            img = u.split('?')[0].replace('https://imgar.zonapropcdn.com/avisos/', '')
            break
    geo = ((loc.get('postingGeolocation') or {}).get('geolocation')) or {}
    return {
        'id': str(r.get('postingId') or ''),
        'url': (r.get('url') or '').replace('/propiedades/clasificado/', ''),
        'img': img,
        'price': price(r),
        'addr': addr,
        'loc': lname,
        'tot': num(feat(r, 'CFT100')),
        'cub': num(feat(r, 'CFT101')),
        'amb': num(feat(r, 'CFT1')),
        'dorm': num(feat(r, 'CFT2')),
        'ban': num(feat(r, 'CFT3')),
        'kind': ((r.get('realEstateType') or {}).get('name') or ''),
        'gar': int(bool(GARDEN.search(full)) or (r.get('triggerPill') or '') == 'Jardín'),
        # coordenadas para el mapa; vienen en todos los avisos del listado
        'lat': round(geo['latitude'], 6) if geo.get('latitude') else 0,
        'lng': round(geo['longitude'], 6) if geo.get('longitude') else 0,
        'd': full[:400],
    }


def locpath(raw):
    loc = ((raw.get('postingLocation') or {}).get('location')) or {}
    out = []
    while loc:
        if loc.get('name'):
            out.append(loc['name'].lower())
        loc = loc.get('parent') or {}
    return ' > '.join(out)


def load():
    """Cached scrape state. `_fetched` maps each slug to when it was last swept."""
    if os.path.exists(OUT):
        return json.load(open(OUT, encoding='utf-8'))
    return {}


def save(data):
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)


def fresh(data, slug):
    """True if this slug was swept within MAX_AGE_H, so we can skip the requests."""
    ts = (data.get('_fetched') or {}).get(slug)
    if not ts:
        return False
    return (time.time() - ts) < MAX_AGE_H * 3600


def main():
    data = load()
    force = '--force' in sys.argv
    for key, slug, reg, maxp, require in JOBS:
        if not force and fresh(data, slug):
            age = (time.time() - data['_fetched'][slug]) / 3600
            print(f"{key}/{slug}: cache ({age:.1f} h) — skip", flush=True)
            continue
        bucket = data.setdefault(key, [])
        seen = {x['id'] for x in bucket}
        for p in range(1, maxp + 1):
            html = get(url_for(slug, p))
            if not html:
                print(f"{key}/{slug} p{p}: FAIL", flush=True); break
            rows = postings(html)
            if not rows:
                print(f"{key}/{slug} p{p}: empty", flush=True); break
            over = 0
            added = 0
            wrong = 0
            for raw in rows:
                if require not in locpath(raw):
                    wrong += 1
                    continue
                r = parse(raw)
                if r['price'] > MAXP:
                    over += 1
                if not r['id'] or r['id'] in seen:
                    continue
                if not (MINP <= r['price'] <= MAXP):
                    continue
                if r['amb'] and r['amb'] < 3:
                    continue
                if not r['img'] or not r['url']:
                    continue
                if 'alquiler' in r['url']:
                    continue
                r['reg'] = reg
                r['slugzone'] = slug
                seen.add(r['id'])
                bucket.append(r)
                added += 1
            print(f"{key}/{slug} p{p}: +{added} (tot {len(bucket)}) over={over} offzone={wrong}",
                  flush=True)
            save(data)
            if wrong >= 25:          # slug not recognised -> nationwide fallback
                print(f"{key}/{slug}: bad slug, skipping", flush=True); break
            if over >= 8:
                break
            time.sleep(1.1 + random.random() * 0.6)
        data.setdefault('_fetched', {})[slug] = time.time()
        save(data)
    save(data)
    print("DONE", {k: len(v) for k, v in data.items() if not k.startswith("_")}, flush=True)


if __name__ == '__main__':
    main()
