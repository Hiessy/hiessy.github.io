# -*- coding: utf-8 -*-
"""Receptor de una sola carga, para sacar datos del navegador sin pasar por el chat.

El panel del navegador puede leer una página y quedarse con lo que interesa, pero
devolver un mega de HTML como resultado de herramienta es carísimo y además lo
trunca. Esto levanta un servidor mínimo en localhost, la página le hace `POST` de
lo que juntó y queda escrito en un archivo. Después se apaga.

    python tools/recibir.py .work/ap_browser.json [--puerto 8124] [--espera 900]

Manda `Access-Control-Allow-Origin: *` porque quien postea es una página de otro
dominio. Escucha **sólo en 127.0.0.1**: no queda nada abierto hacia afuera, y se
apaga solo apenas recibe algo o cuando se acaba la espera.
"""
import io
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

DESTINO = None
listo = threading.Event()


class Mano(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    # Página de recogida: se navega **la misma pestaña** hasta acá y esto lee
    # `window.name`, que sobrevive al cambio de dominio, y lo postea. Hace falta
    # porque un sitio en https no deja postear a 127.0.0.1 —lo corta su propia
    # Content-Security-Policy— y la pestaña no se puede leer desde afuera.
    def do_GET(self):
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            b"<!doctype html><meta charset=utf-8><title>recogida</title>"
            b"<body style=\"font:14px ui-monospace,monospace;background:#0a0b0d;color:#f4f2f0;padding:24px\">"
            b"<p id=e>leyendo window.name...</p><script>"
            b"var d=window.name||'';"
            b"if(!d){document.getElementById('e').textContent='window.name vino vacio';}"
            b"else{fetch('/',{method:'POST',headers:{'Content-Type':'text/plain'},body:d})"
            b".then(function(r){return r.text()}).then(function(t){"
            b"document.getElementById('e').textContent='enviados '+d.length+' bytes: '+t;"
            b"window.name='';}).catch(function(e){"
            b"document.getElementById('e').textContent='fallo: '+e.message});}"
            b"</script>")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        cuerpo = self.rfile.read(n).decode("utf-8", "replace")
        with io.open(DESTINO, "w", encoding="utf-8", newline="") as f:
            f.write(cuerpo)
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"ok")
        print("recibidos %d bytes -> %s" % (n, DESTINO), flush=True)
        listo.set()

    def log_message(self, *a):
        pass


def main():
    global DESTINO
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    DESTINO = os.path.abspath(args[0])
    puerto = int(args[args.index("--puerto") + 1]) if "--puerto" in args else 8124
    espera = float(args[args.index("--espera") + 1]) if "--espera" in args else 900
    srv = HTTPServer(("127.0.0.1", puerto), Mano)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print("esperando un POST en http://127.0.0.1:%d/ (hasta %ds)" % (puerto, espera), flush=True)
    ok = listo.wait(espera)
    srv.shutdown()
    print("listo" if ok else "se acabó la espera sin recibir nada", flush=True)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
