"""Publish the visits Worker to Cloudflare: D1 database, secrets and code.

Safe to run as often as needed; whatever exists is not created again. It uses the
API rather than Wrangler because Wrangler needs Node 22 and this PC has Node 12.

Reads `CLOUDFLARE_API_TOKEN` from `~/.cloudflare.env` and adds `VISITS_TOKEN`,
`VISITS_SALT` and `VISITS_URL` there the first time. The site is public: none of
those can go in the repo.

    python tools/visits/deploy.py
"""
import json, pathlib, secrets, urllib.error, urllib.request, uuid

from download import ENV, read_env

HERE = pathlib.Path(__file__).parent
API = "https://api.cloudflare.com/client/v4"
NAME = "visits"
SUBDOMAIN = "hiessy"
SCHEMA = """
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL,
  day TEXT NOT NULL,
  page TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  network TEXT,
  browser TEXT,
  os TEXT,
  device TEXT,
  screen TEXT,
  language TEXT,
  visitor TEXT,
  mine INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS visits_day ON visits (day);
"""


def api(method, path, token, body=None, kind="application/json"):
    if isinstance(body, dict):
        body = json.dumps(body).encode()
    r = urllib.request.Request(API + path, data=body, method=method, headers={
        "Authorization": "Bearer " + token, "Content-Type": kind, "User-Agent": "hiessy-visits"})
    try:
        return json.load(urllib.request.urlopen(r, timeout=60))
    except urllib.error.HTTPError as e:
        return json.loads(e.read())


def ok(resp):
    if not resp.get("success"):
        raise SystemExit(f"Cloudflare said no: {resp.get('errors')}")
    return resp["result"]


def secret(env, key):
    if key not in env:
        env[key] = secrets.token_hex(32)
        with ENV.open("a", encoding="utf-8") as f:
            f.write(f"\n{key}={env[key]}")
    return env[key]


def subdomain(account, token):
    r = api("GET", f"/accounts/{account}/workers/subdomain", token)
    if r.get("success") and r["result"].get("subdomain"):
        return r["result"]["subdomain"]
    return ok(api("PUT", f"/accounts/{account}/workers/subdomain", token, {"subdomain": SUBDOMAIN}))["subdomain"]


def database(account, token):
    for d in ok(api("GET", f"/accounts/{account}/d1/database?per_page=100", token)):
        if d["name"] == NAME:
            return d["uuid"]
    return ok(api("POST", f"/accounts/{account}/d1/database", token, {"name": NAME}))["uuid"]


def upload(account, token, db_id, env):
    meta = {
        "main_module": "worker.js",
        "compatibility_date": "2026-10-01",
        "bindings": [
            {"type": "d1", "name": "DB", "id": db_id},
            {"type": "secret_text", "name": "TOKEN", "text": secret(env, "VISITS_TOKEN")},
            {"type": "secret_text", "name": "SALT", "text": secret(env, "VISITS_SALT")},
        ],
    }
    boundary = uuid.uuid4().hex
    parts = [
        ("metadata", "metadata.json", "application/json", json.dumps(meta).encode()),
        ("worker.js", "worker.js", "application/javascript+module", (HERE / "worker.js").read_bytes()),
    ]
    body = b""
    for name, filename, kind, data in parts:
        body += (f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; '
                 f'filename="{filename}"\r\nContent-Type: {kind}\r\n\r\n').encode() + data + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    ok(api("PUT", f"/accounts/{account}/workers/scripts/{NAME}", token, body,
           f"multipart/form-data; boundary={boundary}"))
    ok(api("POST", f"/accounts/{account}/workers/scripts/{NAME}/subdomain", token,
           {"enabled": True, "previews_enabled": False}))


def main():
    env = read_env()
    token = env["CLOUDFLARE_API_TOKEN"]
    account = ok(api("GET", "/accounts", token))[0]["id"]
    sub = subdomain(account, token)
    db_id = database(account, token)
    query = f"/accounts/{account}/d1/database/{db_id}/query"
    ok(api("POST", query, token, {"sql": SCHEMA}))
    columns = ok(api("POST", query, token, {"sql": "PRAGMA table_info(visits)"}))[0]["results"]
    if not any(c["name"] == "mine" for c in columns):
        ok(api("POST", query, token, {"sql": "ALTER TABLE visits ADD COLUMN mine INTEGER NOT NULL DEFAULT 0"}))
    upload(account, token, db_id, env)

    url = f"https://{NAME}.{sub}.workers.dev"
    if env.get("VISITS_URL") != url:
        with ENV.open("a", encoding="utf-8") as f:
            f.write(f"\nVISITS_URL={url}")
    print("published at", url)


if __name__ == "__main__":
    main()
