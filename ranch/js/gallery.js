/* The photos view: the listing photos in a grid, grouped by part of the
   house, and a viewer that shows one large with arrows, swipes and keys.
   A photo that shows a known room carries a tag that lights the room up on
   the plan. The room list (js/plan.js) asks GALLERY.count() which rooms have
   photos and opens them here with GALLERY.open().

   photos/NN.jpg is the large copy and photos/small/NN.jpg the thumbnail.
   Captions are i18n keys; `t()` keeps them literal for revisar.py. */
(function () {
  "use strict";
  var t = function (k) { return k; };

  var GROUPS = [
    { id: "street", name: t("photos.group.street") },
    { id: "garden", name: t("photos.group.garden") },
    { id: "galeria", name: t("photos.group.galeria") },
    { id: "back", name: t("photos.group.back") },
    { id: "sitting", name: t("photos.group.sitting") },
    { id: "dining", name: t("photos.group.dining") },
    { id: "glazed", name: t("photos.group.glazed") },
    { id: "kitchen", name: t("photos.group.kitchen") },
    { id: "bedrooms", name: t("photos.group.bedrooms") },
    { id: "baths", name: t("photos.group.baths") },
    { id: "apartment", name: t("photos.group.apartment") }
  ];

  /* In order, a part of the house at a time and the same room's photos
     together: [group, room (number, space id or ""), caption key] */
  var LIST = [
    ["street", "drive", t("photo.01")], ["street", "3", t("photo.02")], ["street", "drive", t("photo.03")],
    ["street", "20", t("photo.04")], ["street", "drive", t("photo.05")],
    ["garden", "", t("photo.06")], ["garden", "", t("photo.07")], ["garden", "15", t("photo.08")],
    ["garden", "15", t("photo.09")], ["galeria", "galeria", t("photo.10")], ["galeria", "galeria", t("photo.11")],
    ["galeria", "galeria", t("photo.12")], ["galeria", "26", t("photo.13")], ["back", "grill", t("photo.14")],
    ["back", "steelstair", t("photo.15")], ["back", "carport", t("photo.16")],
    ["sitting", "1", t("photo.17")], ["sitting", "1", t("photo.18")], ["sitting", "1", t("photo.19")],
    ["sitting", "1", t("photo.20")], ["sitting", "", t("photo.21")], ["sitting", "", t("photo.22")],
    ["dining", "5", t("photo.23")], ["dining", "5", t("photo.24")], ["dining", "5", t("photo.25")],
    ["dining", "5", t("photo.26")], ["dining", "5", t("photo.27")],
    ["glazed", "15", t("photo.28")], ["glazed", "15", t("photo.29")], ["glazed", "15", t("photo.30")],
    ["glazed", "15", t("photo.31")], ["glazed", "15", t("photo.32")], ["glazed", "15", t("photo.33")],
    ["kitchen", "12", t("photo.34")],
    ["bedrooms", "", t("photo.35")], ["bedrooms", "", t("photo.36")], ["bedrooms", "", t("photo.37")],
    ["bedrooms", "", t("photo.38")], ["bedrooms", "", t("photo.39")], ["baths", "", t("photo.40")],
    ["baths", "", t("photo.41")], ["baths", "", t("photo.42")], ["baths", "", t("photo.43")],
    ["baths", "", t("photo.44")], ["baths", "", t("photo.45")],
    ["apartment", "23", t("photo.46")], ["apartment", "20", t("photo.47")], ["apartment", "20", t("photo.48")],
    ["apartment", "20", t("photo.49")], ["apartment", "21", t("photo.50")], ["apartment", "21", t("photo.51")],
    ["apartment", "21", t("photo.52")], ["apartment", "25", t("photo.53")], ["apartment", "25", t("photo.54")]
  ];
  var PHOTOS = LIST.map(function (p, i) {
    var f = (i < 9 ? "0" : "") + (i + 1) + ".jpg";
    return { i: i, group: p[0], room: p[1], cap: p[2], big: "photos/" + f, small: "photos/small/" + f };
  });

  function tr(k) { return window.I18N && window.I18N.listo ? window.I18N.t(k) : ""; }
  function plain(s) { var d = document.createElement("div"); d.innerHTML = s; return d.textContent; }
  function $(id) { return document.getElementById(id); }
  function item(id) {
    var H = window.HOUSE;
    return H.rooms.concat(H.spaces).filter(function (i) { return H.idOf(i) === id; })[0];
  }
  /* "5 · Dining room" for a numbered room, the space's name otherwise. */
  function roomName(id) {
    var it = item(id);
    if (!it) return "";
    var name = plain(tr(it.name)).replace(/\s*·.*$/, "");
    return it.n ? it.n + " · " + name : name;
  }

  /* ---------- the grid ---------- */

  function draw() {
    var box = $("photo-groups");
    if (!box) return;
    box.innerHTML = "";
    // a row of chips, one per group, that scroll to it
    var nav = document.createElement("nav");
    nav.className = "pnav";
    nav.setAttribute("aria-label", tr(t("photos.nav")));
    GROUPS.forEach(function (g) {
      var a = document.createElement("a");
      a.href = "#pg-" + g.id;
      a.textContent = tr(g.name) + " ";
      var n = document.createElement("span");
      n.textContent = PHOTOS.filter(function (p) { return p.group === g.id; }).length;
      a.appendChild(n);
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var target = $("pg-" + g.id);
        if (target) target.scrollIntoView({ block: "start", behavior: "smooth" });
      });
      nav.appendChild(a);
    });
    box.appendChild(nav);
    GROUPS.forEach(function (g) {
      var sec = document.createElement("section");
      sec.className = "pgroup";
      sec.id = "pg-" + g.id;
      var h = document.createElement("h2");
      var shots = PHOTOS.filter(function (p) { return p.group === g.id; });
      h.textContent = tr(g.name);
      var n = document.createElement("span");
      n.className = "pcount";
      n.textContent = shots.length;
      h.appendChild(n);
      sec.appendChild(h);
      var ul = document.createElement("ul");
      ul.className = "pgrid";
      shots.forEach(function (p) {
        var li = document.createElement("li");
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pthumb";
        b.setAttribute("data-photo", p.i);
        var img = document.createElement("img");
        img.src = p.small;
        img.alt = plain(tr(p.cap));
        img.loading = "lazy";
        img.decoding = "async";
        b.appendChild(img);
        li.appendChild(b);
        var cap = document.createElement("p");
        cap.className = "pcap";
        cap.textContent = plain(tr(p.cap));
        li.appendChild(cap);
        if (p.room) li.appendChild(roomTag(p.room));
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      box.appendChild(sec);
    });
  }

  /* The tag under a photo: lights the room on the plan. */
  function roomTag(id) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "proom";
    b.setAttribute("data-plan", id);
    b.title = tr(t("photos.plan"));
    var it = item(id);
    if (it && it.n) {
      var pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = it.n;
      b.appendChild(pill);
      b.appendChild(document.createTextNode(roomName(id).replace(/^\d+ · /, "")));
    } else b.textContent = roomName(id);
    return b;
  }

  /* ---------- the viewer ---------- */

  var set = [], at = 0, dlg;

  function show(k) {
    at = (k + set.length) % set.length;
    var p = set[at];
    var img = $("pv-img");
    img.src = p.big;
    img.alt = plain(tr(p.cap));
    $("pv-cap").innerHTML = tr(p.cap);
    $("pv-count").textContent = (at + 1) + " / " + set.length;
    var acts = $("pv-acts");
    acts.innerHTML = "";
    if (p.room) {
      var where = document.createElement("span");
      where.className = "pv-room";
      where.textContent = roomName(p.room);
      acts.appendChild(where);
      var plan = document.createElement("button");
      plan.type = "button";
      plan.className = "pv-btn";
      plan.setAttribute("data-plan", p.room);
      plan.textContent = tr(t("photos.plan"));
      acts.appendChild(plan);
      var walk = document.createElement("button");
      walk.type = "button";
      walk.className = "pv-btn";
      walk.setAttribute("data-walk", p.room);
      walk.textContent = tr("rooms.walk");
      acts.appendChild(walk);
    }
    var one = set.length < 2;
    $("pv-prev").hidden = one;
    $("pv-next").hidden = one;
    // the neighbours load while this one is looked at
    [at + 1, at - 1].forEach(function (j) { new Image().src = set[(j + set.length) % set.length].big; });
  }

  function openSet(list, k) {
    if (!dlg || !list.length) return;
    set = list;
    show(k || 0);
    if (!dlg.open) dlg.showModal();
  }
  function close() { if (dlg && dlg.open) dlg.close(); }

  function bindViewer() {
    dlg = $("photo-viewer");
    if (!dlg) return;
    $("pv-prev").addEventListener("click", function () { show(at - 1); });
    $("pv-next").addEventListener("click", function () { show(at + 1); });
    $("pv-close").addEventListener("click", close);
    // a click on the dark backdrop, outside the photo and its buttons, closes it
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.classList.contains("pv-stage")) close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1); }
    });
    // swipe left or right on a touch screen
    var x0 = null, y0 = 0;
    dlg.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(dx < 0 ? at + 1 : at - 1);
    });
    // the plan and 3D buttons leave the viewer; js/page.js does the rest
    dlg.addEventListener("click", function (e) {
      if (e.target.closest("[data-plan], [data-walk]")) close();
    });
  }

  /* ---------- the peek: a room's photos over the plan ----------
     Lighting a room up on the plan (js/plan.js) shows its photos in a small
     strip over the plan's corner; a thumbnail opens the viewer there. Going
     off the room hides it after a moment, so the pointer can reach it. */

  var peekId = null, peekTimer = null;
  function peek(id) {
    var box = $("room-peek");
    if (!box) return;
    clearTimeout(peekTimer);
    var shots = id ? PHOTOS.filter(function (p) { return p.room === id; }) : [];
    if (!shots.length) {
      peekTimer = setTimeout(function () { box.hidden = true; peekId = null; }, 350);
      return;
    }
    if (id === peekId && !box.hidden) return;
    peekId = id;
    box.innerHTML = "";
    var head = document.createElement("p");
    head.className = "peek-title";
    head.textContent = roomName(id) + " · " + shots.length + " " + tr(shots.length === 1 ? t("photos.one") : t("photos.many"));
    box.appendChild(head);
    var row = document.createElement("div");
    row.className = "peek-row";
    shots.forEach(function (p, k) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-peek", k);
      b.title = plain(tr(p.cap));
      var img = document.createElement("img");
      img.src = p.small;
      img.alt = plain(tr(p.cap));
      b.appendChild(img);
      row.appendChild(b);
    });
    box.appendChild(row);
    box.hidden = false;
  }

  function bindPeek() {
    var box = $("room-peek");
    if (!box) return;
    box.addEventListener("pointerenter", function () { clearTimeout(peekTimer); });
    box.addEventListener("pointerleave", function () { peek(window.PLAN ? window.PLAN.pinned() : null); });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-peek]");
      if (b && peekId) openSet(PHOTOS.filter(function (p) { return p.room === peekId; }), Number(b.getAttribute("data-peek")));
    });
  }

  function init() {
    bindPeek();
    draw();
    bindViewer();
    var box = $("photo-groups");
    if (box) box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-photo]");
      if (b) openSet(PHOTOS, Number(b.getAttribute("data-photo")));
    });
    document.addEventListener("idioma", function () {
      draw();
      if (peekId) { var id = peekId; peekId = null; peek(id); }
      if (dlg && dlg.open) show(at);
    });
  }

  window.GALLERY = {
    /* How many photos show this room or space. */
    peek: peek,
    count: function (id) { return PHOTOS.filter(function (p) { return p.room === id; }).length; },
    /* The viewer, with only this room's photos. */
    open: function (id) { openSet(PHOTOS.filter(function (p) { return p.room === id; }), 0); }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
