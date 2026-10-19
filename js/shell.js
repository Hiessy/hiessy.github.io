/* Una shell de verdad sobre un sistema de archivos de mentira.

   Todo vive en memoria y dura lo que dura la pestaña: no hay servidor, no se
   guarda nada y recargar lo deja como al principio. Eso es a propósito —es una
   página personal, no un hosting— y está dicho en pantalla al entrar.

   Las dos funciones de hash son reales, no un adorno:

   - `sha256` usa **Web Crypto** (`crypto.subtle.digest`), que es SHA-256 de
     verdad, el del navegador. Pide contexto seguro: anda en https y en
     localhost, y si no está se avisa en vez de inventar un resultado.
   - `fnv` es **FNV-1a de 32 bits** escrito a mano, que entra en ocho líneas.
     No es criptográfico —sirve para tablas de hash, no para firmar nada— y
     justamente por eso es el ejemplo bueno de "hash fácil de implementar".

   Los dos hashean los **bytes UTF-8**, no las unidades UTF-16 que devuelve
   `charCodeAt`. Con acentos o emoji la diferencia se nota, y el resultado tiene
   que coincidir con `sha256sum` del sistema. Hay vectores de prueba conocidos
   en el comentario de cada uno.

   Lo que escribe quien usa la página **nunca** se inserta como HTML: sale por
   `textContent`. El único innerHTML es el de los textos propios de i18n. */
(function () {
  "use strict";

  var out = document.getElementById("sh-out");
  var inp = document.getElementById("sh-in");
  var caja = document.getElementById("sh");
  if (!out || !inp || !caja) return;

  var t = function (k) { return (window.I18N && I18N.listo) ? I18N.t(k) : k; };
  var fmt = function (k, a) { return t(k).replace("{0}", a); };

  // --- sistema de archivos -------------------------------------------------
  // d: true = directorio. c: contenido, texto o función (para lo que se arma
  // al vuelo y tiene que seguir el idioma).
  function D(h) { return { d: true, h: h || {} }; }
  function F(c) { return { d: false, c: c }; }

  var raiz, cwd;

  function logrosTxt() {
    var l = [];
    for (var i = 1; i <= 12; i++) {
      var k = "logros." + (i < 10 ? "0" + i : i);
      var s = t(k).replace(/<[^>]+>/g, "");          // el JSON trae <b> y <code>
      l.push((i < 10 ? "0" + i : i) + ". " + s);
    }
    return l.join("\n");
  }

  function sembrar() {
    raiz = D({
      "logros.txt": F(logrosTxt),
      "README": F("hiessy.github.io\n\n" +
                  "Portada personal. El fichero de arriba gira con inercia de\n" +
                  "verdad y el Janitor Joe es un plataformas CGA.\n\n" +
                  "La busqueda de casa esta en /casas."),
      "janitor-joe": F("#!/bin/sh\n# 1984, Kevin Bales. Jugalo mas arriba.\n"),
      casas: D({
        "index.html": F("<!-- 7.020 avisos en tres zonas -->\n"),
        "README": F("Zonaprop, Argenprop y MercadoLibre, sin repetidos.\n")
      }),
      i18n: D({
        "es.json": F('{ "meta.titulo": "Martin Diaz · Software", ... }\n'),
        "en.json": F('{ "meta.titulo": "Martin Diaz · Software", ... }\n')
      }),
      tmp: D({})
    });
    cwd = [];
  }

  function contenido(n) {
    return typeof n.c === "function" ? n.c() : n.c;
  }

  /* Devuelve el array de tramos ya resuelto, o null si la ruta es imposible
     (subir mas alla de la raiz no lo es: ahi se queda, como en un shell). */
  function tramos(ruta) {
    var p = (ruta === undefined || ruta === "") ? "." : ruta;
    var base = (p.charAt(0) === "/" || p.charAt(0) === "~") ? [] : cwd.slice();
    p.replace(/^~/, "").split("/").forEach(function (s) {
      if (s === "" || s === ".") return;
      if (s === "..") { base.pop(); return; }
      base.push(s);
    });
    return base;
  }
  function buscar(tr) {
    var n = raiz;
    for (var i = 0; i < tr.length; i++) {
      if (!n.d || !Object.prototype.hasOwnProperty.call(n.h, tr[i])) return null;
      n = n.h[tr[i]];
    }
    return n;
  }
  function padreDe(tr) {
    return tr.length ? buscar(tr.slice(0, -1)) : null;
  }
  var texto = function (tr) { return "/" + tr.join("/"); };

  // --- salida ---------------------------------------------------------------
  function linea(txt, clase, html) {
    var p = document.createElement("p");
    p.className = "sh-ln" + (clase ? " " + clase : "");
    if (html) p.innerHTML = txt; else p.textContent = txt;
    out.appendChild(p);
    return p;
  }
  function escribir(txt, clase) {
    if (txt === undefined || txt === null || txt === "") return;
    String(txt).split("\n").forEach(function (l) { linea(l, clase); });
  }
  function abajo() { out.scrollTop = out.scrollHeight; }

  // --- hashes ---------------------------------------------------------------
  var bytes = function (s) { return new TextEncoder().encode(s); };

  /* FNV-1a de 32 bits. Vectores conocidos, que es como se sabe que está bien:
       ""        -> 811c9dc5
       "a"       -> e40c292c
       "foobar"  -> bf9cf968
     `Math.imul` hace la multiplicación de 32 bits sin perder precisión, que con
     `*` se iría a doble y daría cualquier cosa. */
  function fnv1a(s) {
    var b = bytes(s), h = 0x811c9dc5;
    for (var i = 0; i < b.length; i++) {
      h ^= b[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }

  /* SHA-256 del navegador. Vector conocido:
       "abc" -> ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad */
  function sha256(s) {
    if (!(window.crypto && crypto.subtle)) return Promise.reject(new Error("nocripto"));
    return crypto.subtle.digest("SHA-256", bytes(s)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (x) {
        return ("0" + x.toString(16)).slice(-2);
      }).join("");
    });
  }

  // --- comandos -------------------------------------------------------------
  function listar(n) { return Object.keys(n.h).sort(); }

  var cmd = {};

  cmd.help = function () {
    linea(t("sh.help"), "sh-help", true);
  };
  cmd.pwd = function () { escribir(texto(cwd) || "/"); };
  cmd.whoami = function () { escribir("martin"); };
  cmd.date = function () { escribir(new Date().toString()); };
  cmd.clear = function () { out.textContent = ""; };

  cmd.ls = function (a) {
    var largo = a.indexOf("-l") >= 0;
    var ocultos = a.indexOf("-a") >= 0;
    var rutas = a.filter(function (x) { return x.charAt(0) !== "-"; });
    if (!rutas.length) rutas = ["."];
    rutas.forEach(function (r, i) {
      var tr = tramos(r), n = buscar(tr);
      if (!n) return escribir(fmt("sh.err.noexiste", r), "sh-err");
      if (rutas.length > 1) escribir((i ? "\n" : "") + r + ":");
      if (!n.d) return escribir(largo ? fila(r, n) : r);
      var hijos = listar(n).filter(function (x) { return ocultos || x.charAt(0) !== "."; });
      if (!hijos.length) return escribir(t("sh.vacio"), "sh-tenue");
      if (largo) hijos.forEach(function (x) { escribir(fila(x, n.h[x])); });
      else escribir(hijos.map(function (x) { return n.h[x].d ? x + "/" : x; }).join("  "));
    });
  };
  function fila(nom, n) {
    var tam = n.d ? listar(n).length : bytes(contenido(n) || "").length;
    return (n.d ? "d" : "-") + "rw-r--r--  " +
           ("      " + tam).slice(-6) + "  " + nom + (n.d ? "/" : "");
  }

  cmd.cd = function (a) {
    var r = a[0] === undefined ? "/" : a[0];
    var tr = tramos(r), n = buscar(tr);
    if (!n) return escribir(fmt("sh.err.noexiste", r), "sh-err");
    if (!n.d) return escribir(fmt("sh.err.nodir", r), "sh-err");
    cwd = tr;
  };

  cmd.mkdir = function (a) {
    var p = a.indexOf("-p") >= 0;
    var rutas = a.filter(function (x) { return x.charAt(0) !== "-"; });
    if (!rutas.length) return escribir(fmt("sh.err.faltan", "mkdir"), "sh-err");
    rutas.forEach(function (r) {
      var tr = tramos(r), n = raiz;
      for (var i = 0; i < tr.length; i++) {
        var ult = i === tr.length - 1;
        if (Object.prototype.hasOwnProperty.call(n.h, tr[i])) {
          if (ult && !p) return escribir(fmt("sh.err.existe", r), "sh-err");
          n = n.h[tr[i]];
          if (!n.d) return escribir(fmt("sh.err.nodir", r), "sh-err");
          continue;
        }
        if (!ult && !p) return escribir(fmt("sh.err.noexiste", r), "sh-err");
        n.h[tr[i]] = D();
        n = n.h[tr[i]];
      }
    });
  };

  cmd.touch = function (a) {
    if (!a.length) return escribir(fmt("sh.err.faltan", "touch"), "sh-err");
    a.forEach(function (r) {
      var tr = tramos(r), pad = padreDe(tr);
      if (!pad || !pad.d) return escribir(fmt("sh.err.noexiste", r), "sh-err");
      if (!Object.prototype.hasOwnProperty.call(pad.h, tr[tr.length - 1])) {
        pad.h[tr[tr.length - 1]] = F("");
      }
    });
  };

  cmd.cat = function (a) {
    if (!a.length) return escribir(fmt("sh.err.faltan", "cat"), "sh-err");
    a.forEach(function (r) {
      var n = buscar(tramos(r));
      if (!n) return escribir(fmt("sh.err.noexiste", r), "sh-err");
      if (n.d) return escribir(fmt("sh.err.esdir", r), "sh-err");
      escribir(contenido(n));
    });
  };

  cmd.wc = function (a) {
    var soloL = a.indexOf("-l") >= 0;
    a.filter(function (x) { return x.charAt(0) !== "-"; }).forEach(function (r) {
      var n = buscar(tramos(r));
      if (!n || n.d) return escribir(fmt("sh.err.noexiste", r), "sh-err");
      var c = contenido(n) || "";
      var ls = c === "" ? 0 : c.split("\n").length;
      var ps = c.split(/\s+/).filter(Boolean).length;
      escribir(soloL ? ls + " " + r : ls + " " + ps + " " + bytes(c).length + " " + r);
    });
  };

  /* Copia profunda: si no, `cp -r a b` dejaría los dos apuntando al mismo
     objeto y tocar uno cambiaría el otro. */
  function clonar(n) {
    if (!n.d) return F(typeof n.c === "function" ? n.c() : n.c);
    var h = {};
    Object.keys(n.h).forEach(function (k) { h[k] = clonar(n.h[k]); });
    return D(h);
  }

  function mover(a, copiar) {
    var nom = copiar ? "cp" : "mv";
    var rec = a.indexOf("-r") >= 0 || a.indexOf("-R") >= 0;
    var rutas = a.filter(function (x) { return x.charAt(0) !== "-"; });
    if (rutas.length < 2) return escribir(fmt("sh.err.faltan", nom), "sh-err");
    var destR = rutas.pop();
    var destTr = tramos(destR), dest = buscar(destTr);
    if (rutas.length > 1 && (!dest || !dest.d)) {
      return escribir(fmt("sh.err.nodir", destR), "sh-err");
    }
    rutas.forEach(function (r) {
      var tr = tramos(r), n = buscar(tr);
      if (!n) return escribir(fmt("sh.err.noexiste", r), "sh-err");
      if (n.d && copiar && !rec) return escribir(fmt("sh.err.norecursivo", r), "sh-err");
      var nombre = tr[tr.length - 1];
      var padDest, clave;
      if (dest && dest.d) { padDest = dest; clave = nombre; }
      else {
        padDest = padreDe(destTr);
        clave = destTr[destTr.length - 1];
        if (!padDest || !padDest.d) return escribir(fmt("sh.err.destino", destR), "sh-err");
      }
      // moverse adentro de uno mismo deja el árbol colgado de la nada
      if (!copiar && n.d && texto(destTr).indexOf(texto(tr) + "/") === 0) {
        return escribir(fmt("sh.err.adentro", r), "sh-err");
      }
      padDest.h[clave] = copiar ? clonar(n) : n;
      if (!copiar) {
        var pad = padreDe(tr);
        if (pad) delete pad.h[nombre];
      }
    });
  }
  cmd.cp = function (a) { mover(a, true); };
  cmd.mv = function (a) { mover(a, false); };

  cmd.rm = function (a) {
    var rec = a.indexOf("-r") >= 0 || a.indexOf("-rf") >= 0 || a.indexOf("-R") >= 0;
    var rutas = a.filter(function (x) { return x.charAt(0) !== "-"; });
    if (!rutas.length) return escribir(fmt("sh.err.faltan", "rm"), "sh-err");
    rutas.forEach(function (r) {
      var tr = tramos(r), n = buscar(tr);
      if (!n) return escribir(fmt("sh.err.noexiste", r), "sh-err");
      if (!tr.length) return escribir(fmt("sh.err.raiz", "rm"), "sh-err");
      if (n.d && !rec) return escribir(fmt("sh.err.norecursivo", r), "sh-err");
      delete padreDe(tr).h[tr[tr.length - 1]];
    });
  };

  cmd.tree = function (a) {
    var r = a[0] || ".";
    var n = buscar(tramos(r));
    if (!n) return escribir(fmt("sh.err.noexiste", r), "sh-err");
    escribir(r);
    (function rama(n, pre) {
      if (!n.d) return;
      var ks = listar(n);
      ks.forEach(function (k, i) {
        var ult = i === ks.length - 1;
        escribir(pre + (ult ? "`-- " : "|-- ") + k + (n.h[k].d ? "/" : ""));
        rama(n.h[k], pre + (ult ? "    " : "|   "));
      });
    })(n, "");
  };

  cmd.echo = function (a, crudo) {
    // redirección: echo hola > archivo  /  >> archivo
    var m = /^(.*?)\s*(>>|>)\s*(\S+)\s*$/.exec(crudo);
    if (!m) return escribir(a.join(" "));
    var txt = m[1].replace(/^echo\s*/, "").replace(/^["']|["']$/g, "");
    var tr = tramos(m[3]), pad = padreDe(tr);
    if (!pad || !pad.d) return escribir(fmt("sh.err.noexiste", m[3]), "sh-err");
    var k = tr[tr.length - 1], hay = pad.h[k];
    if (hay && hay.d) return escribir(fmt("sh.err.esdir", m[3]), "sh-err");
    var prev = (m[2] === ">>" && hay) ? contenido(hay) + "\n" : "";
    pad.h[k] = F(prev + txt);
  };

  function hashear(a, nombre, fn) {
    if (!a.length) return escribir(fmt("sh.err.faltan", nombre), "sh-err");
    a.forEach(function (r) {
      var n = buscar(tramos(r));
      if (!n) return escribir(fmt("sh.err.noexiste", r), "sh-err");
      if (n.d) return escribir(fmt("sh.err.esdir", r), "sh-err");
      fn(contenido(n) || "", r);
    });
  }
  cmd.fnv = function (a) {
    hashear(a, "fnv", function (c, r) { escribir(fnv1a(c) + "  " + r); });
  };
  cmd.sha256 = function (a) {
    hashear(a, "sha256", function (c, r) {
      var p = linea("…  " + r, "sh-tenue");
      sha256(c).then(function (h) {
        p.className = "sh-ln";
        p.textContent = h + "  " + r;
        abajo();
      }, function () {
        p.className = "sh-ln sh-err";
        p.textContent = t("sh.err.cripto");
        abajo();
      });
    });
  };

  // --- intérprete -----------------------------------------------------------
  var historia = [], hpos = 0;

  function correr(crudo) {
    var linea0 = crudo.trim();
    if (!linea0) return;
    var partes = linea0.match(/"[^"]*"|'[^']*'|\S+/g) || [];
    var nombre = partes[0];
    var args = partes.slice(1).map(function (s) { return s.replace(/^["']|["']$/g, ""); });
    if (Object.prototype.hasOwnProperty.call(cmd, nombre)) {
      try { cmd[nombre](args, linea0); }
      catch (e) { escribir(nombre + ": " + e.message, "sh-err"); }
    } else {
      escribir(fmt("sh.err.nocomando", nombre), "sh-err");
    }
  }

  function prompt() { return (texto(cwd) || "/") + " $ "; }
  function pintarPrompt() {
    document.getElementById("sh-ps").textContent = prompt();
  }

  function enviar() {
    var v = inp.value;
    linea(prompt() + v, "sh-eco");
    inp.value = "";
    if (v.trim()) { historia.push(v); if (historia.length > 100) historia.shift(); }
    hpos = historia.length;
    correr(v);
    pintarPrompt();
    abajo();
  }

  /* Completado con Tab: mira el último token contra lo que haya en ese
     directorio. Con un solo candidato completa; con varios los lista. */
  function completar() {
    var v = inp.value, m = /(\S*)$/.exec(v), frag = m[1];
    var corte = frag.lastIndexOf("/");
    var dirR = corte >= 0 ? frag.slice(0, corte + 1) : "";
    var pre = corte >= 0 ? frag.slice(corte + 1) : frag;
    var base = buscar(tramos(dirR || "."));
    var cands;
    if (!v.trim() || (!/\s/.test(v.trim()) && corte < 0)) {
      cands = Object.keys(cmd).sort().filter(function (k) { return k.indexOf(pre) === 0; });
      if (base && base.d) {
        cands = cands.concat(listar(base).filter(function (k) { return k.indexOf(pre) === 0; }));
      }
    } else {
      if (!base || !base.d) return;
      cands = listar(base).filter(function (k) { return k.indexOf(pre) === 0; });
    }
    if (!cands.length) return;
    if (cands.length === 1) {
      var n = base && base.d ? base.h[cands[0]] : null;
      inp.value = v.slice(0, v.length - frag.length) + dirR + cands[0] + (n && n.d ? "/" : " ");
      return;
    }
    linea(prompt() + v, "sh-eco");
    escribir(cands.join("  "), "sh-tenue");
    abajo();
  }

  inp.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); enviar(); return; }
    if (e.key === "Tab") { e.preventDefault(); completar(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hpos > 0) { hpos--; inp.value = historia[hpos]; }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hpos < historia.length - 1) { hpos++; inp.value = historia[hpos]; }
      else { hpos = historia.length; inp.value = ""; }
      return;
    }
    if (e.key === "l" && e.ctrlKey) { e.preventDefault(); cmd.clear(); return; }
    if (e.key === "c" && e.ctrlKey) {
      e.preventDefault(); linea(prompt() + inp.value + "^C", "sh-eco");
      inp.value = ""; abajo();
    }
  });
  // click en cualquier parte del marco: foco al renglón, como una terminal
  caja.addEventListener("pointerdown", function (e) {
    if (e.target.closest("a") || window.getSelection().toString()) return;
    if (e.target !== inp) { e.preventDefault(); inp.focus(); }
  });

  function bienvenida() {
    out.textContent = "";
    linea(t("sh.bienvenida"), "sh-tenue", true);
    pintarPrompt();
  }
  // al cambiar de idioma se rehace la bienvenida; lo que escribiste queda
  document.addEventListener("idioma", function () {
    if (!out.querySelector(".sh-eco")) bienvenida(); else pintarPrompt();
  });

  sembrar();
  bienvenida();
})();
