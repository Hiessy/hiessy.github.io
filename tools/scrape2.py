"""Phase 2: Tigre / San Miguel sub-localities.

Zonaprop caps anonymous pagination at 9 pages (270 results) per query, so the
partido-wide sweeps for Tigre and San Miguel stopped around USD 90.000. Splitting
by locality gets under that cap. Every row is checked against the expected parent
locality, so a bad slug (which silently falls back to a nationwide search) is
discarded instead of polluting the zone.
"""
import json, os, time, random
from scrape import get, url_for, postings, parse, OUT, MAXP, MINP

TIGRE = ['rincon-de-milberg', 'nordelta', 'benavidez', 'general-pacheco',
         'don-torcuato', 'el-talar', 'troncos-del-talar', 'dique-lujan',
         'tigre-centro', 'villa-la-nata', 'ricardo-rojas', 'el-talar-de-pacheco']
SANMIGUEL = ['bella-vista', 'muniz', 'santa-maria', 'san-miguel-centro',
             'campo-de-mayo', 'jose-c-paz', 'del-viso']

JOBS = [('tigre', s, 4, 9, 'tigre') for s in TIGRE] + \
       [('sanmiguel', s, 5, 9, 'san miguel') for s in SANMIGUEL]


def locpath(raw):
    loc = ((raw.get('postingLocation') or {}).get('location')) or {}
    out = []
    while loc:
        if loc.get('name'):
            out.append(loc['name'].lower())
        loc = loc.get('parent') or {}
    return ' > '.join(out)


def main():
    data = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
    for key, slug, reg, maxp, require in JOBS:
        bucket = data.setdefault(key, [])
        seen = {x['id'] for x in bucket}
        for p in range(1, maxp + 1):
            html = get(url_for(slug, p))
            if not html:
                print(f"{key}/{slug} p{p}: FAIL", flush=True); break
            raws = postings(html)
            if not raws:
                print(f"{key}/{slug} p{p}: empty", flush=True); break
            over = added = wrong = 0
            for raw in raws:
                path = locpath(raw)
                if require not in path:
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
                if not r['img'] or not r['url'] or 'alquiler' in r['url']:
                    continue
                r['reg'] = reg
                r['slugzone'] = slug
                seen.add(r['id'])
                bucket.append(r)
                added += 1
            print(f"{key}/{slug} p{p}: +{added} (tot {len(bucket)}) over={over} offzone={wrong}", flush=True)
            json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
            if wrong >= 25:          # slug not recognised -> nationwide fallback
                print(f"{key}/{slug}: bad slug, skipping", flush=True); break
            if over >= 8:
                break
            time.sleep(1.1 + random.random() * 0.6)
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print("DONE", {k: len(v) for k, v in data.items()}, flush=True)


if __name__ == '__main__':
    main()
