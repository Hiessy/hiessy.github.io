"""Cliente de la API de Mercado Libre (OAuth) para probar si sirve como tercera fuente.

QUÉ TENÉS QUE HACER VOS (yo no puedo crear cuentas ni manejar tus credenciales):

  1. Entrá a https://developers.mercadolibre.com.ar/ con tu cuenta y creá una app
     en "Mis aplicaciones".
  2. En "Redirect URI" poné exactamente:   https://hiessy.github.io/oauth
     (no hace falta que exista: solo tiene que coincidir con lo que se manda acá.)
  3. En scopes marcá: read  y  offline_access
     Sin `offline_access` no dan refresh token y hay que re-autorizar cada 6 horas.
  4. Copiá App ID (client_id) y Secret Key (client_secret) a este archivo:

         .work/meli_secrets.json
         {"client_id": "1234...", "client_secret": "abcd..."}

     `.work/` está en .gitignore, así que no se sube. **No los pegues en el chat.**

DESPUÉS:

    python tools/meli.py --login    # imprime el link, le pegás el `code` de vuelta
    python tools/meli.py --probe    # dice qué endpoints contesta el token

OJO CON LA EXPECTATIVA: `/sites/MLA/search` hoy devuelve 403 con `{"message":
"forbidden"}`, que es distinto del 403 de "te falta token" (ese dice `PolicyAgent`).
Todo indica que Mercado Libre cerró la búsqueda general a terceros, así que el token
probablemente abra `/items/{id}` y `/sites/MLA` pero **no** la búsqueda, que es
justo la que necesitamos. `--probe` lo responde en una sola llamada.
"""
import json, os, sys, time, urllib.parse, urllib.request, urllib.error

D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".work")
SECRETS = os.path.join(D, "meli_secrets.json")
TOKENS = os.path.join(D, "meli_tokens.json")
REDIRECT = "https://hiessy.github.io/oauth"
API = "https://api.mercadolibre.com"
UA = "hiessy.github.io property map"


def load(path):
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}


def need_secrets():
    s = load(SECRETS)
    if not s.get("client_id") or not s.get("client_secret"):
        sys.exit(f"Falta {SECRETS} con client_id y client_secret. Ver el encabezado "
                 f"de este archivo para los pasos.")
    return s


def post(url, data):
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, headers={
        "User-Agent": UA, "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"_error": e.code, "_body": e.read().decode("utf-8", "ignore")[:300]}


def get(path, token=None):
    req = urllib.request.Request(API + path, headers={
        "User-Agent": UA,
        **({"Authorization": "Bearer " + token} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")[:300]
    except Exception as e:
        return 0, type(e).__name__


def login():
    s = need_secrets()
    url = "https://auth.mercadolibre.com.ar/authorization?" + urllib.parse.urlencode({
        "response_type": "code", "client_id": s["client_id"],
        "redirect_uri": REDIRECT})
    print("1) Abrí este link en el navegador y aceptá:\n")
    print("   " + url + "\n")
    print("2) Te va a redirigir a una URL que no carga (es esperable). Copiá de la")
    print("   barra el valor de ?code=... y pegalo acá abajo.\n")
    code = input("code = ").strip()
    if not code:
        sys.exit("sin code, nada que hacer")
    tok = post(API + "/oauth/token", {
        "grant_type": "authorization_code", "client_id": s["client_id"],
        "client_secret": s["client_secret"], "code": code, "redirect_uri": REDIRECT})
    if "_error" in tok:
        sys.exit(f"Mercado Libre rechazó el code: HTTP {tok['_error']} {tok['_body']}")
    tok["obtained_at"] = int(time.time())
    json.dump(tok, open(TOKENS, "w", encoding="utf-8"))
    print(f"\nOK. Token guardado en {TOKENS}")
    print("   dura", tok.get("expires_in", "?"), "s |",
          "con refresh" if tok.get("refresh_token") else
          "SIN refresh: falta el scope offline_access en la app")


def token():
    """Access token vigente, renovándolo con el refresh si hace falta."""
    t = load(TOKENS)
    if not t:
        sys.exit("No hay token todavía: corré  python tools/meli.py --login")
    if time.time() - t.get("obtained_at", 0) < t.get("expires_in", 21600) - 300:
        return t["access_token"]
    if not t.get("refresh_token"):
        sys.exit("El token venció y no hay refresh_token (falta offline_access). "
                 "Volvé a correr --login.")
    s = need_secrets()
    new = post(API + "/oauth/token", {
        "grant_type": "refresh_token", "client_id": s["client_id"],
        "client_secret": s["client_secret"], "refresh_token": t["refresh_token"]})
    if "_error" in new:
        sys.exit(f"No se pudo refrescar: HTTP {new['_error']} {new['_body']}")
    new["obtained_at"] = int(time.time())
    json.dump(new, open(TOKENS, "w", encoding="utf-8"))
    return new["access_token"]


def probe():
    tk = token()
    print("Probando con el token:\n")
    tests = [
        ("quién soy",            "/users/me"),
        ("sitio MLA",            "/sites/MLA"),
        ("categoría Inmuebles",  "/categories/MLA1459"),
        ("BÚSQUEDA (la que importa)", "/sites/MLA/search?category=MLA1466&limit=1"),
        ("búsqueda por texto",   "/sites/MLA/search?q=ph%20villa%20urquiza&limit=1"),
    ]
    for name, path in tests:
        code, body = get(path, tk)
        mark = "OK " if code == 200 else "NO "
        print(f"  {mark} {code}  {name:26s} {body[:80]}")
    print("\nSi la búsqueda sigue en 403 con el token, Mercado Libre la tiene cerrada")
    print("para terceros y no hay vuelta legítima: no sirve como fuente.")


if __name__ == "__main__":
    if "--login" in sys.argv:
        login()
    elif "--probe" in sys.argv:
        probe()
    elif "--token" in sys.argv:
        print(token()[:12] + "…")     # nunca imprimir el token entero
    else:
        print(__doc__)
