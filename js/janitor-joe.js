/* Janitor Joe, en chico.

   El original es de Kevin Bales (1984): un plataformas CGA de 320×200 parecido
   al Donkey Kong, donde se camina, se sube por escaleras, se salta con la barra
   espaciadora y los enemigos son robots. Esto es esa idea, con la paleta CGA 1
   de alta intensidad —cian, magenta y blanco sobre negro— que usaba el juego.

   Los textos de los carteles salen de `I18N`; cuando cambia el idioma llega el
   evento `idioma` y se redibuja. */
(function () {
  "use strict";

  var W = 320, H = 200, SUELO = 188;
  /* Las plataformas alternan de lado y cada escalera cae dentro del tramo de
     las dos que une. */
  var pisos = [
    { y: SUELO, x0: 0, x1: 320 },
    { y: 154, x0: 40, x1: 300 },
    { y: 120, x0: 20, x1: 280 },
    { y: 86, x0: 40, x1: 300 },
    { y: 52, x0: 20, x1: 280 }
  ];
  var escaleras = [
    { x: 266, y0: 154, y1: SUELO },
    { x: 54, y0: 120, y1: 154 },
    { x: 246, y0: 86, y1: 120 },
    { x: 60, y0: 52, y1: 86 }
  ];
  var ANCHO_ESC = 11, JW = 9, JH = 14, RW = 11, RH = 11;
  var GRAV = 430, VEL = 62, SALTO = 168, TREPA = 52;
  var CIAN = "#55ffff", MAGENTA = "#ff55ff", BLANCO = "#ffffff";

  var cv = document.getElementById("g");
  if (!cv) return;
  var cx = cv.getContext("2d");
  var hlvl = document.getElementById("hlvl"),
      hpts = document.getElementById("hpts"),
      hvid = document.getElementById("hvid");

  var esc = 1, papeles = null, joe, robots, nivel, puntos, vidas, estado, invuln;
  // estado: 'listo' | 'juega' | 'muerto' | 'fin'
  var teclas = { l: false, r: false, u: false, d: false, j: false };

  function medir() {
    var w = cv.clientWidth || 320;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(w * (H / W) * dpr);
    esc = (w * dpr) / W;
    cx.setTransform(esc, 0, 0, esc, 0, 0);
    cx.imageSmoothingEnabled = false;
    dibujar();
  }

  function enEscalera(x, pies) {
    for (var i = 0; i < escaleras.length; i++) {
      var e = escaleras[i];
      if (Math.abs(x - e.x) < ANCHO_ESC / 2 && pies >= e.y0 - 2 && pies <= e.y1 + 2) return e;
    }
    return null;
  }
  function pisoDe(x, pies) {
    for (var i = 0; i < pisos.length; i++) {
      var p = pisos[i];
      if (x >= p.x0 && x <= p.x1 && Math.abs(pies - p.y) < 1.5) return p;
    }
    return null;
  }

  function sembrar() {
    // papeles repartidos por las plataformas, sin caer encima de una escalera
    papeles = [];
    pisos.forEach(function (p) {
      var n = Math.max(3, Math.round((p.x1 - p.x0) / 48));
      for (var i = 0; i < n; i++) {
        var x = p.x0 + 12 + i * ((p.x1 - p.x0 - 24) / (n - 1 || 1));
        var pegado = escaleras.some(function (e) { return Math.abs(x - e.x) < 10; });
        if (pegado) continue;
        papeles.push({ x: Math.round(x), y: p.y });
      }
    });
  }
  function colocar() {
    joe = { x: 16, y: SUELO, vy: 0, trepa: false, mira: 1 };
    robots = [];
    var cand = [1, 2, 3, 4];
    for (var i = 0; i < Math.min(cand.length, 1 + nivel); i++) {
      var p = pisos[cand[i]];
      robots.push({
        x: (p.x0 + p.x1) / 2 + (i % 2 ? 30 : -30),
        y: p.y, dir: i % 2 ? 1 : -1, p: cand[i]
      });
    }
    invuln = 1.1;   // un respiro al reaparecer, si no te matan en el acto
  }
  function nuevaPartida() {
    nivel = 1; puntos = 0; vidas = 3;
    sembrar(); colocar(); estado = "listo"; marcador(); dibujar();
  }
  function nivelNuevo() { nivel++; puntos += 150; sembrar(); colocar(); marcador(); }
  function marcador() {
    hlvl.textContent = nivel; hpts.textContent = puntos; hvid.textContent = vidas;
  }

  function pasoJoe(dt) {
    var e = enEscalera(joe.x, joe.y);
    if (e && (teclas.u || teclas.d)) {
      joe.trepa = true; joe.vy = 0;
      joe.y += (teclas.u ? -1 : 1) * TREPA * dt;
      joe.x += (e.x - joe.x) * Math.min(1, dt * 12);   // se centra en la escalera
      if (joe.y < e.y0) joe.y = e.y0;
      if (joe.y > e.y1) joe.y = e.y1;
      if (joe.y <= e.y0 + 0.5 || joe.y >= e.y1 - 0.5) {
        if (pisoDe(joe.x, joe.y)) joe.trepa = false;
      }
      return;
    }
    if (joe.trepa && !e) joe.trepa = false;
    if (joe.trepa) return;

    var dir = (teclas.r ? 1 : 0) - (teclas.l ? 1 : 0);
    if (dir) { joe.x += dir * VEL * dt; joe.mira = dir; }
    joe.x = Math.max(JW / 2, Math.min(W - JW / 2, joe.x));

    var antes = joe.y;
    var apoyado = pisoDe(joe.x, joe.y) && Math.abs(joe.vy) < 1;
    if (teclas.j && apoyado) joe.vy = -SALTO;
    joe.vy += GRAV * dt;
    joe.y += joe.vy * dt;
    if (joe.vy > 0) {                       // sólo se aterriza cayendo
      for (var i = 0; i < pisos.length; i++) {
        var p = pisos[i];
        if (joe.x < p.x0 || joe.x > p.x1) continue;
        if (antes <= p.y && joe.y >= p.y) { joe.y = p.y; joe.vy = 0; break; }
      }
    }
    if (joe.y > SUELO) { joe.y = SUELO; joe.vy = 0; }
  }

  function pasoRobots(dt) {
    robots.forEach(function (r) {
      var p = pisos[r.p];
      r.x += r.dir * (34 + nivel * 7) * dt;
      if (r.x < p.x0 + 6) { r.x = p.x0 + 6; r.dir = 1; }
      if (r.x > p.x1 - 6) { r.x = p.x1 - 6; r.dir = -1; }
    });
  }
  function choque() {
    if (invuln > 0) return false;
    return robots.some(function (r) {
      return Math.abs(r.x - joe.x) < (JW + RW) / 2 - 2 &&
             Math.abs(r.y - joe.y) < Math.max(JH, RH) - 3;
    });
  }
  function barrer() {
    for (var i = papeles.length - 1; i >= 0; i--) {
      var b = papeles[i];
      if (Math.abs(b.x - joe.x) < 7 && Math.abs(b.y - joe.y) < 6) {
        papeles.splice(i, 1); puntos += 10; marcador();
      }
    }
    if (!papeles.length) nivelNuevo();
  }
  function perder() {
    vidas--; marcador();
    if (vidas <= 0) { estado = "fin"; return; }
    estado = "muerto";
    setTimeout(function () {
      if (estado === "muerto") { colocar(); estado = "juega"; }
    }, 900);
  }

  // --- dibujo --------------------------------------------------------------
  function rect(x, y, w, h, c) {
    cx.fillStyle = c; cx.fillRect(Math.round(x), Math.round(y), w, h);
  }
  function cartel(a, b) {
    cx.fillStyle = "rgba(0,0,0,.72)"; cx.fillRect(0, 0, W, H);
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillStyle = CIAN;
    cx.font = "bold 17px ui-monospace,Menlo,Consolas,monospace";
    cx.fillText(a, W / 2, H / 2 - 9);
    if (b) {
      cx.fillStyle = MAGENTA;
      cx.font = "10px ui-monospace,Menlo,Consolas,monospace";
      cx.fillText(b, W / 2, H / 2 + 11);
    }
  }
  function dibujar() {
    if (!papeles) return;
    cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H);
    escaleras.forEach(function (e) {
      rect(e.x - ANCHO_ESC / 2, e.y0, 1, e.y1 - e.y0, CIAN);
      rect(e.x + ANCHO_ESC / 2 - 1, e.y0, 1, e.y1 - e.y0, CIAN);
      for (var y = e.y0 + 3; y < e.y1 - 1; y += 5) rect(e.x - ANCHO_ESC / 2, y, ANCHO_ESC, 1, CIAN);
    });
    pisos.forEach(function (p) {
      rect(p.x0, p.y, p.x1 - p.x0, 2, BLANCO);
      rect(p.x0, p.y + 2, p.x1 - p.x0, 1, "#1a6a6a");
    });
    papeles.forEach(function (b) {
      rect(b.x - 1, b.y - 4, 3, 2, MAGENTA); rect(b.x, b.y - 2, 1, 1, MAGENTA);
    });
    robots.forEach(function (r) {
      var x = r.x - RW / 2, y = r.y - RH;
      rect(x, y, RW, RH - 3, MAGENTA);
      rect(x + 2, y + 2, 2, 2, "#000"); rect(x + RW - 4, y + 2, 2, 2, "#000");
      rect(x + 1, r.y - 3, 3, 3, MAGENTA); rect(x + RW - 4, r.y - 3, 3, 3, MAGENTA);
    });
    if (estado !== "muerto" && !(invuln > 0 && Math.floor(invuln * 12) % 2)) {
      var x = joe.x - JW / 2, y = joe.y - JH;
      rect(x + 2, y, 5, 4, CIAN);                                   // cabeza
      rect(x + 1, y + 4, 7, 6, BLANCO);                             // torso
      rect(x + 1, y + 10, 3, 4, CIAN); rect(x + 5, y + 10, 3, 4, CIAN);
      var s = joe.mira > 0 ? x + JW : x - 2;                        // escoba
      rect(s, y + 3, 2, 9, BLANCO); rect(s - 2, y + 11, 6, 2, MAGENTA);
    } else if (estado === "muerto") {
      rect(joe.x - 6, joe.y - 5, 12, 4, MAGENTA);
    }
    if (!window.I18N || !I18N.listo) return;   // todavía no llegaron los textos
    if (estado === "listo") cartel(I18N.t("juego.titulo"), I18N.t("juego.empezar"));
    else if (estado === "fin") cartel(I18N.t("juego.fin"), I18N.t("juego.reiniciar"));
  }

  // --- bucle ---------------------------------------------------------------
  // `setInterval` y no `requestAnimationFrame`: rAF no corre en pestañas de
  // fondo ni en algunos visores embebidos, y el juego queda congelado sin un
  // solo error en consola. Se pausa solo cuando la pestaña no se ve.
  var ult = 0, reloj = null;
  function tic(t) {
    var dt = Math.min((t - ult) / 1000, 0.05); ult = t;
    if (estado === "juega") {
      if (invuln > 0) invuln -= dt;
      pasoJoe(dt); pasoRobots(dt); barrer();
      if (estado === "juega" && choque()) perder();
    }
    dibujar();
  }
  function correr(on) {
    if (on && !reloj) {
      ult = performance.now();
      reloj = setInterval(function () { tic(performance.now()); }, 1000 / 50);
    } else if (!on && reloj) {
      clearInterval(reloj); reloj = null;
    }
  }
  document.addEventListener("visibilitychange", function () { correr(!document.hidden); });

  // --- controles -----------------------------------------------------------
  var MAPA = {
    ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d", " ": "j",
    a: "l", d: "r", w: "u", s: "d", A: "l", D: "r", W: "u", S: "d"
  };
  function arrancar() {
    if (estado === "fin") nuevaPartida();
    if (estado === "listo" || estado === "fin") { estado = "juega"; ult = performance.now(); }
    cv.focus({ preventScroll: true });
  }
  // El teclado se escucha en el canvas y no en window: las flechas y el espacio
  // sólo dejan de scrollear la página cuando el tablero tiene el foco.
  cv.addEventListener("keydown", function (e) {
    var k = MAPA[e.key]; if (!k) return;
    e.preventDefault();
    if (estado !== "juega") arrancar();
    teclas[k] = true;
  });
  cv.addEventListener("keyup", function (e) {
    var k = MAPA[e.key]; if (k) { e.preventDefault(); teclas[k] = false; }
  });
  cv.addEventListener("blur", function () {
    for (var k in teclas) teclas[k] = false;
  });
  cv.addEventListener("pointerdown", function (e) { e.preventDefault(); arrancar(); });
  document.querySelectorAll(".pad button").forEach(function (b) {
    var k = b.dataset.k;
    var on = function (e) { e.preventDefault(); arrancar(); teclas[k] = true; b.classList.add("on"); };
    var off = function (e) { e.preventDefault(); teclas[k] = false; b.classList.remove("on"); };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointerleave", off);
    b.addEventListener("pointercancel", off);
  });

  document.addEventListener("idioma", dibujar);   // los carteles cambian de idioma
  new ResizeObserver(medir).observe(cv);
  nuevaPartida(); medir(); correr(!document.hidden);
})();
