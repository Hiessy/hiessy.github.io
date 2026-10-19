/* i18n para el sitio: los textos viven en `i18n/<idioma>.json` y el HTML sólo
   lleva claves.

   Antes cada elemento traía los dos idiomas encima, en `data-es` y `data-en`:

       <p data-es="Hola" data-en="Hello"></p>

   Eso anda con dos idiomas y se cae con tres. Cada texto nuevo hay que tocarlo
   en el markup, cada idioma nuevo multiplica los atributos de *todos* los
   elementos, y no hay forma de saber si falta una traducción salvo leyendo la
   página entera en cada idioma. Acá el HTML dice **qué** va en cada lugar y los
   JSON dicen **cómo** se escribe en cada idioma.

   Cómo se usa en el markup:

       <p data-i18n="pie.nota"></p>                   <- contenido
       <meta data-i18n-attr="content=meta.descripcion">  <- atributos
       <a data-i18n="x" data-i18n-attr="title=x.title;aria-label=x.aria">

   Para sumar un idioma: un archivo en `i18n/` y una entrada en `IDIOMAS`. Nada
   más; los botones se arman solos.

   Para sumar un texto: la clave en **todos** los archivos de `i18n/`.
   `python .claude/skills/i18n/revisar.py` avisa si falta alguna. */
(function () {
  "use strict";

  var IDIOMAS = [
    { cod: "es", et: "ES", nom: "Castellano" },
    { cod: "en", et: "EN", nom: "English" }
  ];
  var POR_DEFECTO = "es";
  var LK = "hiessy:idioma";

  var textos = {};
  var actual = POR_DEFECTO;

  function soportado(c) {
    return IDIOMAS.some(function (i) { return i.cod === c; });
  }

  /* Elegido antes > idioma del navegador > el de por defecto. */
  function inicial() {
    var g = null;
    try { g = localStorage.getItem(LK); } catch (e) { /* modo privado */ }
    if (soportado(g)) return g;
    var langs = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < langs.length; i++) {
      var c = String(langs[i]).toLowerCase().split("-")[0];
      if (soportado(c)) return c;
    }
    return POR_DEFECTO;
  }

  function traer(cod) {
    return fetch("i18n/" + cod + ".json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("i18n/" + cod + ".json -> HTTP " + r.status);
      return r.json();
    });
  }

  function pintar() {
    var faltan = [];
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      var v = textos[k];
      if (v === undefined) { faltan.push(k); return; }
      // Son cadenas nuestras, de archivos del propio repo: no entra nada de
      // afuera. Se usa innerHTML porque varias llevan <b> y <code>.
      el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (par) {
        var p = par.split("=");
        if (p.length !== 2) return;
        var attr = p[0].trim(), k = p[1].trim(), v = textos[k];
        if (v === undefined) { faltan.push(k); return; }
        el.setAttribute(attr, v);
      });
    });
    if (faltan.length) {
      // Ruidoso a propósito: una clave sin traducir deja un hueco en blanco en
      // la página y así, al menos, queda dicho cuál.
      console.warn("i18n: sin traducir en «" + actual + "»:", faltan.join(", "));
    }
  }

  function aplicar(cod) {
    if (!soportado(cod)) cod = POR_DEFECTO;
    return traer(cod).then(function (j) {
      textos = j;
      actual = cod;
      window.I18N.listo = true;
      document.documentElement.lang = cod;
      try { localStorage.setItem(LK, cod); } catch (e) { /* modo privado */ }
      pintar();
      botones();
      // El juego redibuja sus carteles cuando cambia el idioma. Va por evento
      // para que i18n no tenga que saber que el juego existe.
      document.dispatchEvent(new CustomEvent("idioma", { detail: { idioma: cod } }));
      return cod;
    });
  }

  /* Los botones salen de IDIOMAS, así sumar un idioma no toca el HTML. */
  function botones() {
    var cont = document.getElementById("lang");
    if (!cont) return;
    if (!cont.children.length) {
      IDIOMAS.forEach(function (i) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = i.et;
        b.title = i.nom;
        b.setAttribute("lang", i.cod);
        b.dataset.cod = i.cod;
        b.addEventListener("click", function () { aplicar(i.cod); });
        cont.appendChild(b);
      });
    }
    Array.prototype.forEach.call(cont.children, function (b) {
      b.classList.toggle("on", b.dataset.cod === actual);
    });
  }

  window.I18N = {
    idiomas: IDIOMAS,
    /* Los JSON llegan por fetch, o sea después del primer dibujo. Lo que se
       pinta a mano —los carteles del juego— mira esto para no mostrar el
       nombre crudo de la clave mientras tanto. */
    listo: false,
    /* Un texto suelto, para lo que se dibuja a mano (los carteles del juego). */
    t: function (clave, alt) {
      var v = textos[clave];
      if (v === undefined) {
        console.warn("i18n: falta la clave «" + clave + "»");
        return alt !== undefined ? alt : clave;
      }
      return v;
    },
    get idioma() { return actual; },
    aplicar: aplicar,
    /* Si los JSON no se pueden leer —típico al abrir el archivo con file://,
       donde fetch no tiene permitido salir— la página queda muda. Mejor decirlo
       en pantalla que dejar los huecos en blanco sin explicación. */
    iniciar: function () {
      return aplicar(inicial()).catch(function (e) {
        console.error(e);
        var p = document.createElement("p");
        p.className = "ln aviso";
        p.textContent = "No se pudieron cargar los textos (" + e.message +
          "). Esta página necesita servirse por HTTP: probá `python -m http.server`.";
        document.body.insertBefore(p, document.body.firstChild);
      });
    }
  };
  document.addEventListener("DOMContentLoaded", function () {
    window.I18N.iniciar();
  });
})();
