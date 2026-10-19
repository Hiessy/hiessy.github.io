/* El fichero giratorio de los logros.

   Las fichas cuelgan de un tambor que gira sobre un eje horizontal, como el
   Rolodex de escritorio: cada ficha sale radial desde la llanta, sube por el
   frente, se lee arriba y cae hacia atrás.

   La física es la del aparato de verdad, no una animación con `transition`:

     τ = −A·sen(N·θ) − b·ω

   El primer término son los **retenes**. El tambor tiene N posiciones estables
   —una por ficha— y entre dos hay una loma de energía. Un seno de período
   2π/N da exactamente eso: empuja hacia la ficha más cercana, se opone cuando
   querés salir de ella, y si venís rápido lo atravesás sin que te frene
   (promedia cero a lo largo de una vuelta). Es el mismo modelo que el de un
   motor paso a paso.

   El segundo es el **roce viscoso** del eje: frena de a poco y hace que un
   envión recorra tres o cuatro fichas antes de quedarse.

   De ahí salen solas las dos cosas que uno espera: un tirón corto mueve una
   ficha y encastra; uno fuerte hace rodar varias y va perdiendo fuerza hasta
   caer en un retén. No hay ningún caso especial escrito para eso.

   Se integra con Euler semi-implícito a paso fijo (4 ms), que con un resorte
   de esta rigidez es estable y no depende de los fps.

   Sin JavaScript, o con `prefers-reduced-motion`, las fichas quedan como una
   lista común: el CSS 3D se activa sólo cuando esto arranca. */
(function () {
  "use strict";

  var cont = document.getElementById("rolo");
  if (!cont) return;
  var tambor = cont.querySelector(".tambor");
  var fichas = Array.prototype.slice.call(cont.querySelectorAll(".ficha"));
  var N = fichas.length;
  if (!N) return;

  var TAU = Math.PI * 2;
  var PASO = TAU / N;              // un paso del tambor, en la física
  /* El ángulo **visual** entre fichas es mucho menor que el de la física. Con
     las doce repartidas en 360° reales, la ficha de al lado cae 30° adelante
     de la que estás leyendo y la tapa: un Rolodex de verdad no se ve así
     porque lleva cientos de fichas apretadas y de las que no están arriba sólo
     se ve el canto. Acá se apilan a 10°, que da ese mismo mazo inclinado.

     Y van **para atrás**: las que todavía no leíste se recuestan detrás de la
     actual, y las que ya pasaron caen hacia vos y hacia abajo, que es el
     movimiento real de pasar una ficha. Así la que se está leyendo nunca queda
     tapada: tiene todo el resto por detrás. */
  var ANG = 10 * Math.PI / 180;
  /* La que ya pasó no se queda a 10°: se desploma. En el aparato real la ficha
     cruza el punto de equilibrio y cae de golpe hacia adelante y hacia abajo,
     dejando ver la siguiente. Con el mismo paso de 10° quedaba parada justo
     delante de la que estás leyendo y la tapaba. */
  var CAIDA = 66 * Math.PI / 180;
  var ATRAS = 6;                   // cuántas se ven recostadas atrás
  var ADELANTE = 1.25;             // y cuántas cayendo adelante
  var R = 96;                      // radio del tambor, en px
  var A = 20;                      // fuerza de los retenes
  var ROCE = 4.2;                  // roce viscoso del eje
  var OMEGA_MAX = 16;              // tope, para que un envión bestia no se escape
  var SENS = 0.0062;               // radianes por píxel arrastrado
  var DT = 0.004;                  // paso fijo del integrador

  var theta = 0, omega = 0;
  /* Destino de un paso guiado (botones, teclas). Mientras está puesto manda un
     servo crítico en vez de los retenes: un botón tiene que mover **una** ficha
     y parar ahí. Antes esto era un empujón de velocidad y el resultado no era
     predecible —se pasaba de largo casi el doble, o no alcanzaba a salir del
     retén y no se movía nada—, porque la distancia que recorre un envión
     depende del roce y de dónde caiga la próxima loma. */
  var objetivo = null;
  var K_SERVO = 60, C_SERVO = 15.5;
  var arrastrando = false, quieto = true;
  var reloj = null, aLaVista = true;

  var lento = window.matchMedia("(prefers-reduced-motion: reduce)");

  function indiceActual() {
    var i = Math.round(-theta / PASO) % N;
    return (i + N) % N;
  }

  /* Cada ficha va a `rotateX(φ) translateY(−(R + alto/2))`: el giro la lleva a
     su lugar en la llanta y la deja apuntando hacia afuera, que es como se
     monta una ficha de verdad. */
  function pintar() {
    var alto = fichas[0].offsetHeight || 190;
    var brazo = R + alto / 2;
    var actual = indiceActual();
    var pos = -theta / PASO;                 // índice continuo de la de arriba
    for (var i = 0; i < N; i++) {
      var f = fichas[i];
      // distancia en fichas hasta la de arriba, por el camino más corto
      var d = ((i - pos + N / 2) % N + N) % N - N / 2;
      if (d > ATRAS || d < -ADELANTE) {
        if (f.style.visibility !== "hidden") f.style.visibility = "hidden";
        continue;
      }
      f.style.visibility = "visible";
      // el paso crece al cruzar el frente, así la ficha se desploma en vez de
      // quedarse parada delante de la que se está leyendo
      var k = d >= 0 ? ANG : ANG + (CAIDA - ANG) * Math.min(1, -d / 0.55);
      var phi = d * k;
      f.style.transform = "rotateX(" + (phi * 180 / Math.PI).toFixed(2) +
                          "deg) translateY(" + (-brazo).toFixed(1) + "px)";
      // Las de atrás se apagan porque les llega menos luz; las que ya cayeron
      // se van a negro rápido. Va como variable y no como `opacity`, que
      // aplanaría el 3D y rompería el orden por profundidad (ver el CSS).
      var dim = d >= 0 ? Math.min(0.75, d * 0.145)
                       : Math.min(0.92, -d * 0.55);
      f.style.setProperty("--dim", dim.toFixed(3));
      f.classList.toggle("alfrente", i === actual && Math.abs(d) < 0.5);
    }
    cont.setAttribute("aria-label", rotulo(actual));
  }

  function rotulo(i) {
    var base = (window.I18N && I18N.listo) ? I18N.t("logros.aria") : "";
    return base + " — " + (i + 1) + "/" + N;
  }

  function paso(dt) {
    var n = Math.max(1, Math.min(40, Math.round(dt / DT)));
    for (var k = 0; k < n; k++) {
      var tau = objetivo !== null
        ? K_SERVO * (objetivo - theta) - C_SERVO * omega
        : -A * Math.sin(N * theta) - ROCE * omega;
      omega += tau * DT;
      if (omega > OMEGA_MAX) omega = OMEGA_MAX;
      if (omega < -OMEGA_MAX) omega = -OMEGA_MAX;
      theta += omega * DT;
      if (objetivo !== null &&
          Math.abs(objetivo - theta) < 0.002 && Math.abs(omega) < 0.03) {
        theta = objetivo; omega = 0; objetivo = null;
      }
    }
  }

  var ult = 0;
  function tic() {
    var t = performance.now();
    var dt = Math.min((t - ult) / 1000, 0.1);
    ult = t;
    if (!arrastrando) {
      paso(dt);
      // dormido: ya está encastrado y no se mueve
      var lejos = Math.abs(Math.sin(N * theta)) > 0.002;
      if (objetivo === null && Math.abs(omega) < 0.004 && !lejos) {
        theta = Math.round(theta / PASO) * PASO;
        omega = 0;
        pintar();
        parar();
        return;
      }
    }
    pintar();
  }
  function andar() {
    if (reloj || !aLaVista) return;
    quieto = false;
    ult = performance.now();
    reloj = setInterval(tic, 16);
  }
  function parar() {
    if (reloj) { clearInterval(reloj); reloj = null; }
    quieto = true;
  }

  /* Ir a una ficha concreta: se empuja el tambor hacia ese retén en vez de
     saltar, así el movimiento sale de la misma física que el arrastre. */
  function irA(i) {
    var obj = -i * PASO;
    // por el camino más corto, que el tambor da toda la vuelta
    var d = obj - theta;
    d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
    objetivo = theta + d;
    andar();
  }
  function mover(n) {
    irA((indiceActual() + n % N + N) % N);
  }

  // --- arrastre -------------------------------------------------------------
  var ultY = 0, ultT = 0, idPtr = null;
  cont.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".rolo-btn")) return;      // los botones se manejan solos
    idPtr = e.pointerId;
    cont.setPointerCapture(idPtr);
    arrastrando = true; omega = 0; objetivo = null;   // la mano manda
    ultY = e.clientY; ultT = performance.now();
    cont.classList.add("agarrado");
    andar();
  });
  cont.addEventListener("pointermove", function (e) {
    if (!arrastrando || e.pointerId !== idPtr) return;
    e.preventDefault();
    var t = performance.now();
    var dy = e.clientY - ultY;
    var dt = Math.max((t - ultT) / 1000, 0.001);
    // Arrastrar hacia arriba adelanta, como en cualquier lista. La ficha que
    // se pasa igual cae hacia vos, que es el gesto real de voltearla.
    var dth = dy * SENS;
    theta += dth;
    // la velocidad al soltar sale del último tramo, no de todo el gesto
    omega = Math.max(-OMEGA_MAX, Math.min(OMEGA_MAX, dth / dt));
    ultY = e.clientY; ultT = t;
    pintar();
  });
  function soltar(e) {
    if (!arrastrando || (e && e.pointerId !== idPtr)) return;
    arrastrando = false;
    cont.classList.remove("agarrado");
    // si el dedo se frenó antes de soltar, no hay envión
    if (performance.now() - ultT > 90) omega = 0;
    andar();
  }
  cont.addEventListener("pointerup", soltar);
  cont.addEventListener("pointercancel", soltar);

  // --- rueda ----------------------------------------------------------------
  // Sólo después de hacer foco, como el mapa de la otra página: robarle la
  // rueda a la página entera por pasar el mouse por encima es molesto.
  cont.addEventListener("wheel", function (e) {
    if (document.activeElement !== cont) return;
    e.preventDefault();
    omega += Math.max(-3.2, Math.min(3.2, -e.deltaY * 0.016));
    andar();
  }, { passive: false });

  // --- teclado --------------------------------------------------------------
  cont.addEventListener("keydown", function (e) {
    var n = 0;
    if (e.key === "ArrowDown" || e.key === "PageDown") n = 1;
    else if (e.key === "ArrowUp" || e.key === "PageUp") n = -1;
    else if (e.key === "Home") { irA(0); e.preventDefault(); return; }
    else if (e.key === "End") { irA(N - 1); e.preventDefault(); return; }
    if (!n) return;
    e.preventDefault();
    mover(n);
  });

  /* Los botones están en `.rolo-ctrl`, que es **hermano** de `#rolo` y no hijo:
     van por fuera para que el arrastre del tambor no se los coma. Buscarlos
     dentro de `cont` no devolvía ninguno y se quedaban sin handler. */
  var caja = cont.closest(".rolo-caja") || document;
  caja.querySelectorAll(".rolo-btn").forEach(function (b) {
    b.addEventListener("click", function () { mover(b.dataset.dir === "sig" ? 1 : -1); });
  });

  // --- ciclo de vida --------------------------------------------------------
  // Fuera de pantalla no se calcula nada.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      aLaVista = es[0].isIntersecting;
      if (!aLaVista) parar(); else if (!quieto) andar();
    }, { threshold: 0.05 }).observe(cont);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) parar(); else if (!quieto) andar();
  });
  document.addEventListener("idioma", function () { pintar(); });
  new ResizeObserver(function () { pintar(); }).observe(cont);

  function arrancar() {
    if (lento.matches) {           // sin giro: queda la lista de siempre
      cont.classList.remove("rolo-on");
      return;
    }
    cont.classList.add("rolo-on");
    cont.tabIndex = 0;
    pintar();
  }
  lento.addEventListener ? lento.addEventListener("change", arrancar)
                         : lento.addListener(arrancar);
  arrancar();
})();
