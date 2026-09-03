"""Corre todo el relevamiento y reconstruye las tres páginas, en el orden correcto.

    python tools/run_all.py                 # todo
    python tools/run_all.py --pages         # solo rearmar las páginas (sin red)
    python tools/run_all.py --only caba-zp,build,deadlinks,build-final
    python tools/run_all.py --skip sierras-zp,gba-zp
    python tools/run_all.py --list          # ver las etapas y salir

Cada etapa corre como subproceso **con timeout**, así que ninguna puede colgar la
corrida entera: si se pasa del tope se la mata, queda marcada y sigue la que viene.
Al final imprime qué anduvo y qué no.

Tres cosas que el orden tiene que respetar, y por eso este archivo existe:

1. **Argenprop nunca en paralelo.** Dos instancias escriben el mismo JSON y se
   pisan: una corrida dejó Calamuchita en 0 después de haber juntado 34 avisos.
   Acá las dos etapas de Argenprop van una después de la otra, y un lock impide
   que se corran dos `run_all.py` a la vez.
2. **`build` va dos veces.** `deadlinks.py` necesita `index.html` armado para
   saber qué avisos hay que verificar, y `build2.py` necesita el resultado de
   `deadlinks.py` para descartar los dados de baja. Primero se arma, después se
   verifica, después se arma de nuevo.
3. **Las páginas 2 y 3 se generan desde `index.html`**, así que `build-final`
   tiene que terminar antes que `gba` y `sierras`.
"""
import os, subprocess, sys, time

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
LOCK = os.path.join(ROOT, ".work", "run_all.lock")
PY = sys.executable

EDENOR = ("belgrano,nunez,saavedra,coghlan,villa-urquiza,villa-pueyrredon,"
          "colegiales,chacarita,villa-ortuzar,palermo,parque-chas,agronomia")

# (nombre, descripción, [comandos], timeout en segundos)
STAGES = [
    ("caba-zp", "Zonaprop CABA: purga los 12 barrios Edenor y los vuelve a pedir",
     [["refresh.py", "--edenor"], ["scrape.py", "--only", EDENOR]], 2400),

    ("gba-zp", "Zonaprop zona norte",
     [["gba_norte.py", "--max", "260000"]], 3600),

    ("sierras-zp", "Zonaprop sierras de Córdoba (35 pueblos)",
     [["sierras.py"]], 3600),

    # --- Argenprop, siempre en serie ---
    ("caba-ap", "Argenprop CABA por barrio",
     [["caba_ap.py", "--only", EDENOR, "--purge", "--deadline", "1500"]], 1800),

    ("gba-ap", "Argenprop zona norte",
     [["gba_ap.py", "--max", "260000"]], 1800),

    ("geocode", "Geocodificar las direcciones nuevas de Argenprop",
     [["geocode.py"]], 2400),

    ("build", "Armar index.html (primera pasada, para que deadlinks sepa qué mirar)",
     [["build2.py"], ["inject.py"]], 900),

    ("deadlinks", "Verificar que los avisos publicados sigan vivos (410 = baja)",
     [["deadlinks.py", "--limit", "1400", "--deadline", "2400"]], 2700),

    ("build-final", "Rearmar index.html descartando los dados de baja",
     [["build2.py"], ["inject.py"]], 900),

    ("gba", "Armar y escribir gba-norte.html",
     [["build_gba.py"], ["make_gba.py"]], 900),

    ("sierras", "Armar y escribir sierras.html",
     [["build_sierras.py"], ["make_sierras.py"]], 900),
]

PAGES = {"build-final", "gba", "sierras"}      # lo que no toca la red


def corr(nombre):
    return next((s for s in STAGES if s[0] == nombre), None)


def main():
    args = sys.argv[1:]
    if "--list" in args:
        for n, d, cmds, t in STAGES:
            print(f"  {n:12s} {d}  (tope {t // 60} min)")
        return
    if "--help" in args or "-h" in args:
        print(__doc__); return

    pedidas = [s[0] for s in STAGES]
    if "--pages" in args:
        pedidas = [n for n in pedidas if n in PAGES]
    if "--only" in args:
        pedidas = args[args.index("--only") + 1].split(",")
        for n in pedidas:
            if not corr(n):
                sys.exit(f"no existe la etapa '{n}'. Ver --list")
    if "--skip" in args:
        fuera = set(args[args.index("--skip") + 1].split(","))
        pedidas = [n for n in pedidas if n not in fuera]

    # el lock cubre solo las etapas de red; rearmar páginas se puede en paralelo
    usa_red = any(n not in PAGES for n in pedidas)
    if usa_red:
        if os.path.exists(LOCK):
            edad = (time.time() - os.path.getmtime(LOCK)) / 60
            sys.exit(f"Ya hay un run_all.py corriendo (lock de hace {edad:.0f} min).\n"
                     f"Si estás seguro de que no, borrá {LOCK}")
        os.makedirs(os.path.dirname(LOCK), exist_ok=True)
        open(LOCK, "w").write(str(os.getpid()))

    resultados, t0 = [], time.time()
    try:
        for nombre in pedidas:
            etapa = corr(nombre)
            _, desc, cmds, tope = etapa
            print(f"\n{'=' * 72}\n== {nombre}: {desc}\n{'=' * 72}", flush=True)
            ini = time.time()
            estado = "ok"
            for cmd in cmds:
                try:
                    r = subprocess.run([PY, "-u", os.path.join(TOOLS, cmd[0])] + cmd[1:],
                                       cwd=TOOLS, timeout=tope)
                    if r.returncode != 0:
                        estado = f"error ({r.returncode})"
                        break
                except subprocess.TimeoutExpired:
                    estado = f"cortada por tiempo ({tope // 60} min)"
                    break
            resultados.append((nombre, estado, time.time() - ini))
            print(f"-- {nombre}: {estado} en {(time.time() - ini) / 60:.1f} min", flush=True)
    finally:
        if usa_red and os.path.exists(LOCK):
            os.remove(LOCK)

    print(f"\n{'=' * 72}\nRESUMEN ({(time.time() - t0) / 60:.0f} min en total)\n{'=' * 72}")
    for n, e, s in resultados:
        marca = "ok  " if e == "ok" else "FALLO"
        print(f"  {marca} {n:12s} {s / 60:5.1f} min   {'' if e == 'ok' else e}")
    malas = [n for n, e, _ in resultados if e != "ok"]
    if malas:
        print(f"\nRevisar: {', '.join(malas)}")
        print("Se pueden reintentar solas:  python tools/run_all.py --only " + ",".join(malas))
    else:
        print("\nTodo bien. Falta mirar las páginas y hacer commit.")


if __name__ == "__main__":
    main()
