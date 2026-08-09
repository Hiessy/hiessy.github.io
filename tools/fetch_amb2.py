"""Re-resolve `ambientes` for the 62 unmatched originals, parsing the real CFT1 field.

Detail pages carry no __PRELOADED_STATE__, and their `generalFeatures` has a *category*
literally named "Ambientes" (Cocina, Comedor, Patio...) — so the earlier text fallback
could latch onto the wrong number. CFT1 is the actual room count.
"""
import json, os, re, time, random
from scrape import get

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
BASE = "https://www.zonaprop.com.ar/propiedades/clasificado/"
CFT = re.compile(r'"(CFT\d+)":\{"featureId":"\1","label":"[^"]*","measure":[^,]*,"value":"(\d+)"')


def feats(html):
    out = {}
    for m in CFT.finditer(html or ""):
        out.setdefault(m.group(1), int(m.group(2)))
    return out


def main():
    ex = json.load(open(os.path.join(D, "existing.json"), encoding="utf-8"))
    missing = set(json.load(open(os.path.join(D, "missing_amb.json"))))
    outp = os.path.join(D, "amb_lookup2.json")
    found = json.load(open(outp)) if os.path.exists(outp) else {}
    todo = [(re.search(r"-(\d+)\.html$", r[2]).group(1), r[2]) for r in ex]
    todo = [(i, s) for i, s in todo if i in missing and i not in found]
    print("to fetch:", len(todo), flush=True)
    for n, (i, slug) in enumerate(todo, 1):
        html = get(BASE + slug, tries=2)
        f = feats(html)
        found[i] = {"amb": f.get("CFT1", 0), "dorm": f.get("CFT2", 0),
                    "ban": f.get("CFT3", 0), "ok": bool(html)}
        if n % 10 == 0 or n == len(todo):
            json.dump(found, open(outp, "w"))
            print(f"{n}/{len(todo)}", flush=True)
        time.sleep(1.0 + random.random() * 0.5)
    json.dump(found, open(outp, "w"))
    got = sum(1 for v in found.values() if v["amb"])
    print("DONE amb resolved", got, "of", len(found), flush=True)


if __name__ == "__main__":
    main()
