#!/usr/bin/env bash
# Barrido completo de las dos páginas, en serie.
#
# En serie a propósito: dos instancias de Argenprop a la vez escriben el mismo JSON
# y se pisan. Y los purgados van antes del barrido para que los avisos dados de baja
# desaparezcan en vez de quedar cacheados para siempre.
set -u
cd "$(dirname "$0")"
W=../.work
say() { echo; echo "=== $* ==="; }

say "backup"
for f in scraped gba_norte caba_ap gba_ap; do
  [ -f "$W/$f.json" ] && cp "$W/$f.json" "$W/${f}_bak.json"
done

say "1/6 CABA Zonaprop (purga los 12 barrios Edenor y vuelve a pedirlos)"
python refresh.py --edenor && python scrape.py

say "2/6 GBA Zonaprop (de cero: la caché vieja tiene descripciones cortadas en 400)"
rm -f "$W/gba_norte.json"
python gba_norte.py --max 260000

say "3/6 Argenprop CABA"
python - <<'PY'
import json, os
p = os.path.join(os.path.dirname(os.path.abspath("tools")), ".work", "caba_ap.json")
p = "../.work/caba_ap.json"
if os.path.exists(p):
    d = json.load(open(p, encoding="utf-8"))
    d["_fetched"] = {}          # forzar: si no, saltea todo por caché de 24 h
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False)
    print("sellos de caba_ap limpiados")
PY
python caba_ap.py --max 260000

say "4/6 Argenprop zona norte"
python - <<'PY'
import json, os
p = "../.work/gba_ap.json"
if os.path.exists(p):
    d = json.load(open(p, encoding="utf-8"))
    d["_fetched"] = {}
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False)
    print("sellos de gba_ap limpiados")
PY
python gba_ap.py --max 260000

say "5/6 geocodificar direcciones nuevas"
python geocode.py

say "6/6 armar los dos datasets"
python build2.py
python build_gba.py

say "LISTO"
