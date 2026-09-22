"""Widget de escritorio translúcido con el avance de `run_all.py`.

Una ventanita sin bordes, siempre encima y semitransparente, arriba a la derecha:
qué etapa va, cuánto lleva, cuánto falta y la última línea del barrido.

    python tools/progress_widget.py          # o pythonw, sin consola

`run_all.py` lo abre solo; con `--no-widget` no. Se puede abrir aparte en
cualquier momento, incluso con la corrida ya empezada.

**Lee `.work/run_all.log`, no un archivo de estado aparte.** El log ya tiene todo
lo que hace falta —`== etapa:` al empezar y `-- etapa: estado en X min` al
terminar— así que no hay dos fuentes de verdad que se puedan desincronizar, y el
widget sirve para una corrida que ya está a la mitad.

Se arrastra con el mouse, se cierra con la ×, y a los 30 s de terminar la corrida
se va solo. Solo stdlib, como el resto del proyecto.
"""
import os
import re
import sys
import time
import tkinter as tk

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(ROOT, ".work", "run_all.log")
LOCK = os.path.join(ROOT, ".work", "run_all.lock")

# Minutos que tardó cada etapa la última vez, para estimar lo que falta. Son
# referencias, no promesas: Argenprop puede bloquear y duplicar lo suyo.
BASE = {"caba-zp": 3.3, "gba-zp": 9.5, "sierras-zp": 26.6, "caba-ap": 24.4,
        "gba-ap": 30.0, "geocode": 1.0, "build": 0.2, "deadlinks": 4.0,
        "build-final": 0.2, "gba": 0.2, "sierras": 0.2}
ORDEN = ["caba-zp", "gba-zp", "sierras-zp", "caba-ap", "gba-ap", "geocode",
         "build", "deadlinks", "build-final", "gba", "sierras"]

BG, FG, DIM, OK, BAD = "#14161a", "#f2f4f7", "#8b94a3", "#6ee7a8", "#ff8a8a"

RE_INI = re.compile(r"^== ([\w-]+): (.*)$")
RE_FIN = re.compile(r"^-- ([\w-]+): (.*?) en ([\d.]+) min")


def leer():
    """(etapa_actual, desc, hechas, corriendo, ultima_linea)."""
    if not os.path.exists(LOG):
        return None, "", [], False, "todavía no arrancó"
    try:
        with open(LOG, encoding="utf-8", errors="ignore") as f:
            lineas = f.read().split("\n")
    except OSError:
        return None, "", [], False, "no puedo leer el log"

    actual, desc, hechas, ultima = None, "", [], ""
    for l in lineas:
        m = RE_INI.match(l)
        if m:
            actual, desc = m.group(1), m.group(2)
            continue
        m = RE_FIN.match(l)
        if m:
            hechas.append((m.group(1), m.group(2), float(m.group(3))))
            if m.group(1) == actual:
                actual = None
            continue
        if l.strip() and not l.startswith(("=", "-", " ")):
            ultima = l.strip()
    corriendo = os.path.exists(LOCK)
    if not corriendo:
        actual = None
    return actual, desc, hechas, corriendo, ultima


def restante(actual, hechas):
    """Minutos estimados que faltan, contando la etapa en curso a medias."""
    hechos = {h[0] for h in hechas}
    falta = 0.0
    visto_actual = False
    for n in ORDEN:
        if n in hechos:
            continue
        if n == actual:
            visto_actual = True
            falta += BASE.get(n, 1.0) / 2      # a mitad de camino, en promedio
        elif visto_actual or actual is None:
            falta += BASE.get(n, 1.0)
        else:
            falta += BASE.get(n, 1.0)
    return falta


class Widget:
    def __init__(self):
        self.r = tk.Tk()
        self.r.overrideredirect(True)              # sin barra de título
        self.r.attributes("-topmost", True)
        self.r.attributes("-alpha", 0.86)          # translúcido
        self.r.configure(bg=BG)
        w, h = 330, 132
        sw = self.r.winfo_screenwidth()
        self.r.geometry(f"{w}x{h}+{sw - w - 24}+24")

        cont = tk.Frame(self.r, bg=BG, padx=14, pady=11)
        cont.pack(fill="both", expand=True)

        top = tk.Frame(cont, bg=BG)
        top.pack(fill="x")
        self.titulo = tk.Label(top, text="Relevamiento", bg=BG, fg=FG,
                               font=("Segoe UI Semibold", 10), anchor="w")
        self.titulo.pack(side="left")
        cerrar = tk.Label(top, text="✕", bg=BG, fg=DIM, font=("Segoe UI", 10),
                          cursor="hand2")
        cerrar.pack(side="right")
        cerrar.bind("<Button-1>", lambda e: self.r.destroy())

        self.etapa = tk.Label(cont, text="", bg=BG, fg=FG, anchor="w",
                              font=("Segoe UI", 9), justify="left")
        self.etapa.pack(fill="x", pady=(6, 4))

        self.barra = tk.Canvas(cont, height=6, bg="#242833", highlightthickness=0)
        self.barra.pack(fill="x")
        self.relleno = self.barra.create_rectangle(0, 0, 0, 6, fill=OK, width=0)

        self.tiempo = tk.Label(cont, text="", bg=BG, fg=DIM, anchor="w",
                               font=("Segoe UI", 8))
        self.tiempo.pack(fill="x", pady=(5, 0))
        self.detalle = tk.Label(cont, text="", bg=BG, fg=DIM, anchor="w",
                                font=("Consolas", 7), justify="left")
        self.detalle.pack(fill="x")

        for wdg in (self.r, cont, top, self.titulo, self.etapa, self.tiempo, self.detalle):
            wdg.bind("<Button-1>", self.agarrar)
            wdg.bind("<B1-Motion>", self.mover)
        self.t0 = time.time()
        self.fin = None
        self.tick()

    def agarrar(self, e):
        self._x, self._y = e.x_root - self.r.winfo_x(), e.y_root - self.r.winfo_y()

    def mover(self, e):
        self.r.geometry(f"+{e.x_root - self._x}+{e.y_root - self._y}")

    def tick(self):
        actual, desc, hechas, corriendo, ultima = leer()
        n = len(hechas)
        tot = len(ORDEN)
        fallidas = [h for h in hechas if h[1] != "ok"]

        if corriendo and actual:
            self.titulo.config(text=f"Relevando  {n + 1}/{tot}", fg=FG)
            self.etapa.config(text=f"{actual}\n{desc[:46]}")
            falta = restante(actual, hechas)
            transcurrido = sum(h[2] for h in hechas)
            self.tiempo.config(
                text=f"{transcurrido:.0f} min hechos · faltan ~{falta:.0f} min")
            frac = transcurrido / max(transcurrido + falta, 1)
        elif corriendo:
            self.titulo.config(text=f"Relevando  {n}/{tot}", fg=FG)
            self.etapa.config(text="arrancando…")
            self.tiempo.config(text="")
            frac = n / tot
        else:
            if self.fin is None:
                self.fin = time.time()
            listo = n >= tot
            self.titulo.config(text="Listo" if listo and not fallidas else
                               ("Terminó con fallas" if fallidas else "Sin corrida"),
                               fg=BAD if fallidas else OK)
            self.etapa.config(
                text=(", ".join(f"{h[0]} {h[1]}" for h in fallidas)[:60]
                      if fallidas else f"{n} etapas en {sum(h[2] for h in hechas):.0f} min"))
            self.tiempo.config(text="")
            frac = 1.0 if listo else (n / tot)
            if time.time() - self.fin > 30:        # se va solo al rato
                self.r.destroy(); return

        self.barra.update_idletasks()
        self.barra.coords(self.relleno, 0, 0,
                          max(2, int(self.barra.winfo_width() * min(frac, 1.0))), 6)
        self.barra.itemconfig(self.relleno, fill=BAD if fallidas else OK)
        self.detalle.config(text=ultima[:52])
        self.r.after(1500, self.tick)


if __name__ == "__main__":
    try:
        Widget().r.mainloop()
    except tk.TclError as e:
        # sin escritorio (sesión remota, servicio): que no rompa nada
        print("no hay display para el widget:", e, file=sys.stderr)
