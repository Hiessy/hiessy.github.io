/* The floor plan view: draws js/house.js into the #plan SVG for the chosen
   floor and lists the rooms beside it. Pointing at a room, on the plan or in
   the list, lights it up in both places; a click keeps it lit. Every text
   comes from i18n through I18N.t(). */
(function () {
  "use strict";
  var H = window.HOUSE;
  var NS = "http://www.w3.org/2000/svg";

  /* Both floors share one transform: 30 px per meter. */
  var K = 30, OX = 1287.5, OY = 794;
  function X(x) { return OX + K * x; }
  function Y(y) { return OY - K * y; }
  /* The whole drawing, and the part of it on screen: zooming and panning only
     move this window. */
  var FULL = { x: 20, y: 90, w: 1640, h: 810 };
  var vb = { x: FULL.x, y: FULL.y, w: FULL.w, h: FULL.h };
  var MIN_W = 240;

  var FILL = { bedroom: "#E3EBF6", bath: "#C9DCEB", living: "#F5E8D3", service: "#E7E3DA",
               hall: "#EFEDE7", stair: "#E7E3DA", covered: "#FFFFFF", balcony: "#FFFFFF",
               terrace: "#FFFFFF", roof: "#E9E6DF" };
  var DASHED = { covered: true, balcony: true, terrace: true, roof: true };

  var floor = 0;        // 0 ground floor, 1 upper level (levels 1 and 2)
  var pinned = null;    // the room a click keeps lit
  var svg, list;

  function t(k) { return window.I18N && window.I18N.listo ? window.I18N.t(k) : ""; }
  /* The strings may carry <br> and simple tags; SVG text gets plain lines. */
  function plain(s) {
    return String(s).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pts(poly) {
    return poly.map(function (p) { return X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1); }).join(" ");
  }
  function bbox(poly) {
    var b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
    poly.forEach(function (p) {
      b.x1 = Math.min(b.x1, p[0]); b.x2 = Math.max(b.x2, p[0]);
      b.y1 = Math.min(b.y1, p[1]); b.y2 = Math.max(b.y2, p[1]);
    });
    return b;
  }
  function visible(item) { return floor === 0 ? item.level === 0 : item.level > 0; }

  /* A guess at text width, close enough to wrap labels inside their rooms. */
  function width(s, size, bold) { return s.length * size * (bold ? 0.6 : 0.54); }
  function wrap(s, size, bold, max) {
    var out = [];
    String(s).split("\n").forEach(function (para) {
      var line = "";
      para.split(/\s+/).filter(Boolean).forEach(function (w) {
        var next = line ? line + " " + w : w;
        if (line && width(next, size, bold) > max) { out.push(line); line = w; } else line = next;
      });
      if (line) out.push(line);
    });
    return out;
  }
  function text(parent, x, y, str, o) {
    o = o || {};
    var e = el("text", {
      x: x.toFixed(1), y: y.toFixed(1), "font-size": o.size || 12,
      "font-weight": o.bold ? 700 : 400, fill: o.fill || "#1F1F1C",
      "text-anchor": o.anchor || "start", "dominant-baseline": "central",
      transform: o.rotate ? "rotate(" + o.rotate + " " + x.toFixed(1) + " " + y.toFixed(1) + ")" : null
    }, parent);
    e.textContent = str;
    return e;
  }
  function pill(parent, x, y, num, anchor) {
    var w = 10 + 7 * num.length, left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
    el("rect", { x: left.toFixed(1), y: (y - 8).toFixed(1), width: w, height: 16, rx: 8, fill: "#2B2B28" }, parent);
    text(parent, left + w / 2, y + 0.5, num, { size: 11, bold: true, fill: "#FFFFFF", anchor: "middle" });
    return w;
  }

  function defs() {
    var d = el("defs", {}, svg);
    var g = el("pattern", { id: "pt-gravel", width: 7, height: 7, patternUnits: "userSpaceOnUse" }, d);
    el("rect", { width: 7, height: 7, fill: "#E6E2D7" }, g);
    el("circle", { cx: 3.5, cy: 3.5, r: 1, fill: "#ABA492" }, g);
    var p = el("pattern", { id: "pt-pavers", width: 8, height: 8, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, d);
    el("rect", { width: 8, height: 8, fill: "#ECE6DA" }, p);
    el("path", { d: "M0 0 H8 M0 0 V8", stroke: "#D6CEBD", "stroke-width": 1.2 }, p);
    var tx = el("pattern", { id: "pt-treads-x", width: 12, height: 12, patternUnits: "userSpaceOnUse" }, d);
    el("rect", { width: 12, height: 12, fill: "#E7E3DA" }, tx);
    el("path", { d: "M11.5 0 V12", stroke: "#B9B3A6", "stroke-width": 1 }, tx);
    var ty = el("pattern", { id: "pt-treads-y", width: 12, height: 10, patternUnits: "userSpaceOnUse" }, d);
    el("rect", { width: 12, height: 10, fill: "#E7E3DA" }, ty);
    el("path", { d: "M0 9.5 H12", stroke: "#8E887C", "stroke-width": 1 }, ty);
  }

  /* The sidewalk and street run along the building line. */
  function street(parent) {
    var e = [0.9840, 0.1779];
    function band(o1, o2) {
      var ys = [-3.2, 23.6], c = [];
      [[ys[0], o1], [ys[0], o2], [ys[1], o2], [ys[1], o1]].forEach(function (q) {
        c.push([H.streetX(q[0]) + q[1] * e[0], q[0] + q[1] * e[1]]);
      });
      return c;
    }
    el("polygon", { points: pts(band(0, 2.5)), fill: "#E9E7E1" }, parent);
    el("polygon", { points: pts(band(2.5, 10.5)), fill: "#DCDAD3" }, parent);
    var curb = band(2.5, 2.5);
    el("path", { d: "M" + pts([curb[0], curb[2]]).replace(" ", " L"), stroke: "#A9A69C", "stroke-width": 1.5, fill: "none" }, parent);
  }

  function lotOutline(parent) {
    el("polygon", { points: pts(H.lot), fill: floor === 0 ? "#DDEBD2" : "#EEF2E8",
                    stroke: "#6B6A65", "stroke-width": 2, "stroke-dasharray": "7 5" }, parent);
  }

  function gardenLayer(parent) {
    var G = H.garden, r;
    r = G.gravel;
    el("rect", { x: X(r[0]), y: Y(r[3]), width: K * (r[2] - r[0]), height: K * (r[3] - r[1]),
                 fill: "url(#pt-gravel)", stroke: "#C9C3B3" }, parent);
    G.tracks.forEach(function (c) {
      var d = "M " + X(c[0][0]) + " " + Y(c[0][1]) + " C " +
        [c[1], c[2], c[3]].map(function (p) { return X(p[0]) + " " + Y(p[1]); }).join(", ");
      el("path", { d: d, stroke: "#B3AD9E", "stroke-width": 16, fill: "none" }, parent);
      el("path", { d: d, stroke: "#F3F0E8", "stroke-width": 12, fill: "none" }, parent);
    });
    r = G.pavers;
    el("rect", { x: X(r[0]), y: Y(r[3]), width: K * (r[2] - r[0]), height: K * (r[3] - r[1]),
                 fill: "url(#pt-pavers)", stroke: "#C9C3B3" }, parent);
    el("circle", { cx: X(G.tree.c[0]), cy: Y(G.tree.c[1]), r: K * G.tree.r,
                   fill: "rgba(110,150,86,0.28)", stroke: "#7C9A68", "stroke-width": 2 }, parent);
  }

  function roofsBelow(parent) {
    H.roofs.forEach(function (r) {
      var poly = H.polyOf(r), b = bbox(poly);
      el("polygon", { points: pts(poly), fill: "#E9E6DF", stroke: "#9A978F", "stroke-width": 2,
                      "stroke-dasharray": "6 4" }, parent);
      var lines = wrap(plain(t(r.name)), 11, false, K * (b.x2 - b.x1) - 16);
      var cy = Y((b.y1 + b.y2) / 2) - (lines.length - 1) * 7;
      lines.forEach(function (s, i) {
        text(parent, X((b.x1 + b.x2) / 2) - (r.street ? 18 : 0), cy + i * 14, s,
             { size: 11, fill: "#4A4944", anchor: "middle" });
      });
    });
  }

  function shape(parent, item) {
    var poly = H.polyOf(item), id = H.idOf(item);
    var g = el("g", { class: "rm", "data-room": id }, parent);
    var fill = FILL[item.kind] || "#FFFFFF";
    if (item.treads) fill = "url(#pt-treads-" + item.treads + ")";
    el("polygon", {
      class: "shape", points: pts(poly), fill: fill,
      stroke: DASHED[item.kind] ? "#6B6A65" : "#2B2B28", "stroke-width": 2,
      "stroke-dasharray": DASHED[item.kind] ? "6 4" : null
    }, g);
  }

  function label(parent, item) {
    var poly = H.polyOf(item), b = bbox(poly), id = H.idOf(item);
    var g = el("g", { class: "rml", "data-room": id }, parent);
    var name = item.name ? plain(t(item.name)) : "";
    var note = item.note ? plain(t(item.note)) : "";
    var num = item.n ? String(item.n) : "";
    var size = item.inner ? 12 : 13;

    if (item.outside) {
      var o = item.outside;
      text(g, X(o[0]), Y(o[1]), name, { size: 12, fill: "#3A3935",
           anchor: o[2] === "e" ? "end" : o[2] === "m" ? "middle" : "start" });
      return;
    }
    if (!name && !num) return;

    var lab = item.lab || [(b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, "m"];
    var anchor = lab[2] === "s" ? "start" : lab[2] === "e" ? "end" : "middle";
    var ax = X(lab[0]), cy = Y(lab[1]);

    if (item.line) {
      var x = ax;
      if (num) x += pill(g, ax, cy, num, "start") + 6;
      var e = text(g, x, cy, name, { size: 12, bold: true });
      if (note) {
        var ts = el("tspan", { "font-weight": 400, fill: "#4A4944" }, e);
        ts.textContent = "  " + note;
      }
      return;
    }

    var right = item.street ? H.streetX(b.y2) : b.x2;
    var maxW = anchor === "middle" ? K * (right - b.x1) - 12
             : anchor === "start" ? X(right) - ax - 8 : ax - X(b.x1) - 8;
    maxW = Math.max(maxW, 28);
    var rows = [];
    if (num) rows.push({ pill: num, h: 19 });
    wrap(name, size, true, maxW).forEach(function (s) { rows.push({ s: s, size: size, bold: true, h: size + 3 }); });
    if (note) wrap(note, 11, false, maxW).forEach(function (s) { rows.push({ s: s, size: 11, fill: "#4A4944", h: 14 }); });
    var total = rows.reduce(function (a, r) { return a + r.h; }, 0);
    var y = cy - total / 2;
    rows.forEach(function (r) {
      var mid = y + r.h / 2;
      if (r.pill) pill(g, ax, mid - 1, r.pill, anchor);
      else text(g, ax, mid, r.s, { size: r.size, bold: r.bold, fill: r.fill, anchor: anchor });
      y += r.h;
    });
  }

  /* Windows, doors and the gate on the building line; glass walls in blue. */
  function marks(parent) {
    function seg(y1, y2, color, w, dash) {
      el("line", { x1: X(H.streetX(y1)), y1: Y(y1), x2: X(H.streetX(y2)), y2: Y(y2),
                   stroke: color, "stroke-width": w, "stroke-dasharray": dash || null }, parent);
    }
    if (floor === 0) {
      var f = H.facade[0];
      seg(f.from, f.to, "#2B2B28", 5);
      seg(f.gate.from, f.gate.to, "#6B6A65", 2, "4 3");
      f.windows.forEach(function (w) { seg(w[0], w[1], "#6E9BC4", 7); });
      f.doors.forEach(function (d) { seg(d.from, d.to, "#8A4B2A", 7); });
      H.glass.forEach(function (g) {
        if (g.level !== 0) return;
        var a = g.x !== undefined ? [g.x, g.from] : [g.from, g.y];
        var b = g.x !== undefined ? [g.x, g.to] : [g.to, g.y];
        el("line", { x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), stroke: "#6E9BC4", "stroke-width": 5 }, parent);
      });
    } else {
      var u = H.facade[1];
      seg(u.from, u.to, "#2B2B28", 4);
      u.windows.forEach(function (w) { seg(w[0], w[1], "#6E9BC4", 6); });
      u.doors.forEach(function (d) { seg(d.from, d.to, "#8A4B2A", 6); });
    }
  }

  /* Names written on the drawing outside any room. */
  function notes(parent) {
    var G = H.garden;
    function at(x, y, s, o) { return text(parent, X(x), Y(y), s, o); }
    var small = { size: 12, fill: "#3A3935" };
    at(5.6, 9.57, plain(t("street.name")), { size: 13, fill: "#3A3935", anchor: "middle", rotate: -100.25 });
    if (floor === 0) {
      at(-38.87, 16.88, plain(t("space.garden")), { size: 14, fill: "#2F4A22", bold: true });
      at(-24.25, 17.07, plain(t("space.tracks")), small);
      at(-32.4, 8.26, plain(t("space.gravel")), small);
      el("circle", { cx: X(G.statue[0]), cy: Y(G.statue[1]), r: 5, fill: "#2B2B28" }, parent);
      at(G.statue[0] + 0.4, G.statue[1], plain(t("space.statue")), small);
      el("circle", { cx: X(G.bench[0]), cy: Y(G.bench[1]), r: 5, fill: "#2B2B28" }, parent);
      at(G.bench[0] + 0.4, G.bench[1], plain(t("space.bench")), small);
      at(G.tree.c[0], G.tree.c[1], plain(t("space.tree")), { size: 13, bold: true, fill: "#2F4A22", anchor: "middle" });
      var pv = G.pavers;
      at((pv[0] + pv[2]) / 2, (pv[1] + pv[3]) / 2, plain(t("space.pavers")), { size: 11, fill: "#3A3935", anchor: "middle" });
      at(-2.33, 17.65, plain(t("facade.gate")), small);
      at(-1.94, 14.45, plain(t("facade.aptdoor")), small);
      at(-1.3, 11.0, plain(t("facade.windows")), small);
      at(-0.67, 7.4, plain(t("facade.entrance")), { size: 12, fill: "#3A3935", bold: true });
      at(0.13, 2.92, plain(t("facade.window")), small);
      at(0.67, 0.49, plain(t("facade.door")), small);
    } else {
      at(-38.25, 16.17, plain(t("space.garden.below")), { size: 13, fill: "#4A5E3C" });
    }
    at(-21.63, 19.95, plain(t("dim.north")), { size: 12, fill: "#4A4944", anchor: "middle" });
    at(-21.63, -1.97, plain(t("dim.south")), { size: 12, fill: "#4A4944", anchor: "middle" });
    at(-40.79, 8.37, plain(t("dim.west")), { size: 12, fill: "#4A4944", anchor: "middle", rotate: -90 });

    // north arrow
    var nx = X(10.5);
    el("line", { x1: nx, y1: Y(21.0), x2: nx, y2: Y(22.5) + 6, stroke: "#2B2B28", "stroke-width": 2 }, parent);
    el("path", { d: "M" + (nx - 6) + " " + (Y(22.5) + 8) + " L" + nx + " " + (Y(22.5) - 4) + " L" + (nx + 6) + " " + (Y(22.5) + 8) + " Z", fill: "#2B2B28" }, parent);
    text(parent, nx, Y(23.05), plain(t("plan.north")), { size: 16, bold: true, anchor: "middle" });

    // scale bar
    var sx = X(-40.25), sy = Y(-2.45);
    el("rect", { x: sx, y: sy, width: 5 * K, height: 8, fill: "#2B2B28" }, parent);
    el("rect", { x: sx + 5 * K, y: sy, width: 5 * K, height: 8, fill: "#FFFFFF", stroke: "#2B2B28" }, parent);
    text(parent, sx, sy + 20, "0", { size: 11, fill: "#4A4944", anchor: "middle" });
    text(parent, sx + 5 * K, sy + 20, "5", { size: 11, fill: "#4A4944", anchor: "middle" });
    text(parent, sx + 10 * K, sy + 20, plain(t("plan.scale")), { size: 11, fill: "#4A4944", anchor: "middle" });
  }

  function items() {
    return H.rooms.concat(H.spaces).filter(visible);
  }

  function drawPlan() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    applyView();
    defs();
    var bg = el("g", { class: "bg" }, svg);
    street(bg);
    lotOutline(bg);
    if (floor === 0) gardenLayer(bg); else roofsBelow(bg);

    var shapes = el("g", { class: "shapes" }, svg);
    var all = items();
    all.filter(function (i) { return !i.inner; }).forEach(function (i) { shape(shapes, i); });
    all.filter(function (i) { return i.inner; }).forEach(function (i) { shape(shapes, i); });
    marks(el("g", { class: "marks" }, svg));

    var labels = el("g", { class: "labels" }, svg);
    notes(el("g", { class: "notes" }, svg));
    all.forEach(function (i) { label(labels, i); });
    light(pinned);
  }

  function tagText(src) {
    if (src === "confirmed") return t("tag.confirmed");
    if (src === "photos") return t("tag.photos");
    return t("tag.guess");
  }

  function drawList() {
    list.innerHTML = "";
    var rooms = H.rooms.filter(visible).sort(function (a, b) { return a.n - b.n; });
    var spaces = H.spaces.filter(visible);
    rooms.concat(spaces).forEach(function (item) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ri";
      b.setAttribute("data-room", H.idOf(item));
      var mark = document.createElement("span");
      if (item.n) { mark.className = "pill"; mark.textContent = item.n; }
      else { mark.className = "swatch k-" + item.kind; }
      var name = document.createElement("span");
      name.className = "ri-name";
      name.textContent = plain(t(item.name)).replace(/\s*·.*$/, "");
      var tag = document.createElement("span");
      tag.className = "tag tag-" + item.src;
      tag.textContent = tagText(item.src);
      var info = document.createElement("span");
      info.className = "ri-info";
      info.innerHTML = t(item.info);
      b.appendChild(mark); b.appendChild(name); b.appendChild(tag); b.appendChild(info);
      li.appendChild(b);
      // A second button takes you into the room in the 3D view (js/page.js
      // handles it). Roofs have nowhere to stand.
      if (item.kind !== "roof") {
        var go = document.createElement("button");
        go.type = "button";
        go.className = "ri-walk";
        go.setAttribute("data-walk", H.idOf(item));
        go.title = t("rooms.walk");
        go.setAttribute("aria-label", t("rooms.walk") + ": " + (item.n ? item.n + ", " : "") + name.textContent);
        go.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.6 16.4 6.3v7.4L10 17.4 3.6 13.7V6.3z M3.6 6.3 10 10l6.4-3.7M10 10v7.4"/></svg>';
        li.appendChild(go);
      }
      list.appendChild(li);
    });
    light(pinned);
  }

  /* Lights one room (by number or space id) on the plan and in the list. */
  function light(id) {
    svg.classList.toggle("hl", !!id);
    Array.prototype.forEach.call(document.querySelectorAll("#plan [data-room], #room-list [data-room]"), function (e) {
      e.classList.toggle("on", e.getAttribute("data-room") === id);
    });
  }
  function scrollListTo(id) {
    var b = list.querySelector('[data-room="' + id + '"]');
    var box = list.closest(".rooms");
    if (!b || !box || box.scrollHeight <= box.clientHeight) return;
    var top = b.offsetTop - box.offsetTop, bottom = top + b.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top - 8;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 8;
  }
  function roomOf(e) {
    var r = e.target.closest && e.target.closest("[data-room]");
    return r ? r.getAttribute("data-room") : null;
  }

  /* ---------- zoom and pan ---------- */

  function applyView() {
    svg.setAttribute("viewBox", [vb.x, vb.y, vb.w, vb.h].map(function (v) { return v.toFixed(1); }).join(" "));
    svg.classList.toggle("zoomed", vb.w < FULL.w - 1);
  }
  function clampView(v) {
    v.w = Math.min(FULL.w, Math.max(MIN_W, v.w));
    v.h = v.w * FULL.h / FULL.w;
    v.x = Math.min(FULL.x + FULL.w - v.w, Math.max(FULL.x, v.x));
    v.y = Math.min(FULL.y + FULL.h - v.h, Math.max(FULL.y, v.y));
    return v;
  }
  function toSvg(cx, cy) {
    var r = svg.getBoundingClientRect();
    return { x: vb.x + (cx - r.left) / r.width * vb.w, y: vb.y + (cy - r.top) / r.height * vb.h };
  }
  function zoomAt(factor, px, py) {
    var w = Math.min(FULL.w, Math.max(MIN_W, vb.w * factor)), k = w / vb.w;
    var v = clampView({ x: px - (px - vb.x) * k, y: py - (py - vb.y) * k, w: w, h: 0 });
    vb.x = v.x; vb.y = v.y; vb.w = v.w; vb.h = v.h;
    applyView();
  }
  var anim = null;
  function animateTo(target) {
    var from = { x: vb.x, y: vb.y, w: vb.w }, t0 = performance.now();
    target = clampView(target);
    if (anim) cancelAnimationFrame(anim);
    (function tick(now) {
      var u = Math.min(1, (now - t0) / 260), e = 1 - Math.pow(1 - u, 3);
      vb.x = from.x + (target.x - from.x) * e;
      vb.y = from.y + (target.y - from.y) * e;
      vb.w = from.w + (target.w - from.w) * e;
      vb.h = vb.w * FULL.h / FULL.w;
      applyView();
      anim = u < 1 ? requestAnimationFrame(tick) : null;
    })(t0);
  }
  function fit() { animateTo({ x: FULL.x, y: FULL.y, w: FULL.w, h: FULL.h }); }
  function zoomToRoom(id) {
    var item = H.rooms.concat(H.spaces).filter(function (i) { return H.idOf(i) === id; })[0];
    if (!item) return;
    var b = bbox(H.polyOf(item));
    var w = Math.max(520, K * Math.max(b.x2 - b.x1, (b.y2 - b.y1) * FULL.w / FULL.h) * 2.4);
    var cx = X((b.x1 + b.x2) / 2), cy = Y((b.y1 + b.y2) / 2), h = w * FULL.h / FULL.w;
    animateTo({ x: cx - w / 2, y: cy - h / 2, w: w, h: h });
  }
  /* If the list sits below the plan and the plan has scrolled away, bring
     it back so the room that lit up can be seen. */
  function showPlan() {
    var r = svg.getBoundingClientRect();
    if (r.bottom < 80 || r.top > window.innerHeight - 80) svg.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function bindZoom() {
    var moved = false, pointers = {}, last = null, pinch = null;
    svg.addEventListener("wheel", function (e) {
      if (!e.ctrlKey && !e.metaKey) return;   // plain scrolling still scrolls the page
      e.preventDefault();
      var p = toSvg(e.clientX, e.clientY);
      zoomAt(Math.exp(e.deltaY * 0.0022), p.x, p.y);
    }, { passive: false });
    svg.addEventListener("dblclick", function (e) {
      var p = toSvg(e.clientX, e.clientY);
      zoomAt(e.shiftKey ? 1.6 : 0.6, p.x, p.y);
    });
    svg.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      moved = false;
      last = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
      }
    });
    svg.addEventListener("pointermove", function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2 && pinch) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        var mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (pinch.d > 0) zoomAt(pinch.d / d, mid.x, mid.y);
        pinch.d = d;
        moved = true;
        return;
      }
      var dx = e.clientX - last.x, dy = e.clientY - last.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (vb.w >= FULL.w - 1) return;          // nothing to pan at full size
      moved = true;
      svg.classList.add("dragging");
      var r = svg.getBoundingClientRect();
      var v = clampView({ x: vb.x - dx * vb.w / r.width, y: vb.y - dy * vb.h / r.height, w: vb.w, h: vb.h });
      vb.x = v.x; vb.y = v.y;
      applyView();
      last = { x: e.clientX, y: e.clientY };
    });
    function up(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinch = null;
      svg.classList.remove("dragging");
    }
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("pointerleave", up);
    // A drag must not count as a click on the room under the pointer.
    svg.addEventListener("click", function (e) { if (moved) { e.stopImmediatePropagation(); moved = false; } }, true);
    document.getElementById("zoom-in").addEventListener("click", function () {
      zoomAt(0.7, vb.x + vb.w / 2, vb.y + vb.h / 2);
    });
    document.getElementById("zoom-out").addEventListener("click", function () {
      zoomAt(1.45, vb.x + vb.w / 2, vb.y + vb.h / 2);
    });
    document.getElementById("zoom-fit").addEventListener("click", fit);
  }

  function setFloor(f) {
    floor = f;
    pinned = null;
    vb = { x: FULL.x, y: FULL.y, w: FULL.w, h: FULL.h };
    Array.prototype.forEach.call(document.querySelectorAll("[data-floor]"), function (b) {
      var on = Number(b.getAttribute("data-floor")) === f;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    drawPlan();
    drawList();
  }

  function init() {
    svg = document.getElementById("plan");
    list = document.getElementById("room-list");
    if (!svg || !list) return;

    svg.addEventListener("pointerover", function (e) {
      var id = roomOf(e);
      if (id) { light(id); scrollListTo(id); }
    });
    svg.addEventListener("pointerleave", function () { light(pinned); });
    svg.addEventListener("click", function (e) {
      var id = roomOf(e);
      pinned = id && id !== pinned ? id : null;
      light(pinned || id);
    });
    list.addEventListener("pointerover", function (e) { var id = roomOf(e); if (id) light(id); });
    list.addEventListener("pointerleave", function () { light(pinned); });
    list.addEventListener("focusin", function (e) { var id = roomOf(e); if (id) light(id); });
    list.addEventListener("focusout", function () { light(pinned); });
    // A click in the list keeps the room lit and zooms the plan to it; a
    // second click lets go and shows the whole plan again.
    list.addEventListener("click", function (e) {
      var id = roomOf(e);
      if (!id) return;
      pinned = id !== pinned ? id : null;
      light(pinned || id);
      if (pinned) { zoomToRoom(pinned); showPlan(); } else fit();
    });
    bindZoom();
    Array.prototype.forEach.call(document.querySelectorAll("[data-floor]"), function (b) {
      b.addEventListener("click", function () { setFloor(Number(b.getAttribute("data-floor"))); });
    });
    document.addEventListener("idioma", function () { drawPlan(); drawList(); });
    setFloor(0);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
