"""Local page for the site's visits: http://localhost:8124

Every load downloads the finished days that are missing, so there's nothing else to
run. Today comes live from the Worker. The token stays in this process and the
server only listens on 127.0.0.1.

    python tools/visits/dashboard.py
"""
import datetime, http.server, json, pathlib, re, urllib.error

import download

HERE = pathlib.Path(__file__).parent
PORT = 8124
HOSTS = (f"localhost:{PORT}", f"127.0.0.1:{PORT}")
SHOWN_DAYS = 30


def today():
    return datetime.datetime.now(download.ARGENTINA).date()


def live(day):
    env = download.read_env()
    return download.fetch(f"{env['VISITS_URL']}/day/{day}", env["VISITS_TOKEN"])


def saved(day):
    path = download.TARGET / f"{day}.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def overview():
    end = today()
    offline = False
    try:
        download.main()
    except urllib.error.URLError:
        offline = True
    days = []
    for back in range(SHOWN_DAYS - 1, -1, -1):
        day = end - datetime.timedelta(days=back)
        data = saved(day)
        if day == end:
            try:
                data = live(day)
            except urllib.error.URLError:
                offline = True
        days.append({"day": str(day), "visits": data["visits"] if data else 0,
                     "visitors": data["visitors"] if data else 0})
    return {"today": str(end), "offline": offline, "days": days}


class Handler(http.server.BaseHTTPRequestHandler):
    def reply(self, status, kind, body):
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def reply_json(self, data, status=200):
        self.reply(status, "application/json", json.dumps(data).encode())

    def do_GET(self):
        # Stops DNS rebinding: a website pointing its own name at 127.0.0.1 to read this.
        if self.headers.get("Host") not in HOSTS:
            self.reply(403, "text/plain", b"forbidden")
            return
        match = re.fullmatch(r"/api/day/(\d{4}-\d{2}-\d{2})", self.path)
        try:
            if self.path == "/":
                self.reply(200, "text/html; charset=utf-8", (HERE / "dashboard.html").read_bytes())
            elif self.path == "/api/days":
                self.reply_json(overview())
            elif match:
                self.reply_json(saved(match[1]) or live(match[1]))
            else:
                self.reply(404, "text/plain", b"not found")
        except urllib.error.URLError as e:
            self.reply_json({"error": str(e.reason)}, 502)


def main():
    print(f"http://localhost:{PORT}", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
