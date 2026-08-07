import urllib.request, urllib.error, json, time, os, sys, random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scraped.json')
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
HDR = {"User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9",
       "Accept": "text/html,application/xhtml+xml"}

BARRIOS = ['colegiales', 'chacarita', 'villa-ortuzar', 'villa-urquiza', 'coghlan',
           'saavedra', 'nunez', 'belgrano', 'palermo', 'la-paternal', 'agronomia',
           'parque-chas', 'villa-pueyrredon', 'villa-devoto', 'villa-del-parque',
           'villa-crespo']

# (key, slug, region index, max pages)
JOBS = [('smla', 'san-martin-de-los-andes', 0, 25),
        ('lacumbre', 'la-cumbre', 1, 12),
        ('calamuchita', 'santa-rosa-de-calamuchita', 2, 15),
        ('tigre', 'tigre', 4, 45),
        ('sanmiguel', 'san-miguel', 5, 35)]
JOBS += [('caba', b, 3, 14) for b in BARRIOS]

MAXP = 200000
MINP = 15000


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


def parse(r):
    loc = r.get('postingLocation') or {}
    addr = ((loc.get('address') or {}) or {}).get('name') or ''
    lname = ((loc.get('location') or {}) or {}).get('name') or ''
    pics = ((r.get('visiblePictures') or {}).get('pictures') or [])
    img = ''
    for p in pics:
        u = p.get('url360x266') or ''
        if u:
            img = u.split('?')[0].replace('https://imgar.zonapropcdn.com/avisos/', '')
            break
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
        'd': (r.get('descriptionNormalized') or '')[:400],
    }


def main():
    data = {}
    if os.path.exists(OUT):
        data = json.load(open(OUT, encoding='utf-8'))
    for key, slug, reg, maxp in JOBS:
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
            for raw in rows:
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
            print(f"{key}/{slug} p{p}: +{added} (tot {len(bucket)}) over={over}", flush=True)
            json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
            if over:
                break
            time.sleep(1.1 + random.random() * 0.6)
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print("DONE", {k: len(v) for k, v in data.items()}, flush=True)


if __name__ == '__main__':
    main()
