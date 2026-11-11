"""A tiny local server that lets assets/models/index.html write the exported
.obj/.mtl files to disk: POST /<name> saves ranch/assets/models/obj/<name>.
Run it, press "Save all" on the page, then stop it. Binds to localhost only.
Usage: python tools/save_server.py [port]"""
import os, re, sys
from http.server import BaseHTTPRequestHandler, HTTPServer

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "models", "obj")
os.makedirs(OUT, exist_ok=True)


class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_POST(self):
        name = self.path.strip("/")
        if not re.fullmatch(r"[a-z0-9-]+\.(obj|mtl)", name):
            self.send_response(400); self._cors(); self.end_headers(); return
        data = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(data)
        self.send_response(200); self._cors(); self.end_headers()

    def log_message(self, *a):
        pass


HTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8125), H).serve_forever()
