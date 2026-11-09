/* Switches between the two views: the floor plan and the 3D walk. The 3D code,
   and three.js from the CDN with it, loads the first time that view opens, so
   looking at the plan never downloads it. #3d in the address opens the 3D view
   straight away. */
(function () {
  "use strict";
  var walk = null, loading = null, view = "plan";

  function t(k) { return window.I18N && window.I18N.listo ? window.I18N.t(k) : ""; }
  function $(id) { return document.getElementById(id); }

  function message(key) {
    var m = $("walk-msg");
    if (!m) return;
    m.hidden = !key;
    m.setAttribute("data-key", key || "");
    if (key === "walk.loading") m.textContent = t("walk.loading");
    else if (key === "walk.loadfail") m.textContent = t("walk.loadfail");
  }

  function openWalk() {
    if (walk) { walk.resume(); return; }
    if (loading) return;
    message("walk.loading");
    loading = import("./walk.js").then(function (m) {
      walk = m;
      message(null);
      m.start();
      if (view !== "walk") m.pause();
    }).catch(function (e) {
      console.error(e);
      loading = null;
      message("walk.loadfail");
    });
  }

  function show(v, keepUrl) {
    view = v === "walk" ? "walk" : "plan";
    var plan = view === "plan";
    $("tab-plan").setAttribute("aria-selected", plan ? "true" : "false");
    $("tab-walk").setAttribute("aria-selected", plan ? "false" : "true");
    $("tab-plan").classList.toggle("on", plan);
    $("tab-walk").classList.toggle("on", !plan);
    $("view-plan").hidden = !plan;
    $("view-walk").hidden = plan;
    if (!keepUrl) history.replaceState(null, "", location.pathname + location.search + (plan ? "" : "#3d"));
    if (plan) { if (walk) walk.pause(); } else openWalk();
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("tab-plan").addEventListener("click", function () { show("plan"); });
    $("tab-walk").addEventListener("click", function () { show("walk"); });
    // Arrow keys move between the two tabs, as in any tab list.
    [$("tab-plan"), $("tab-walk")].forEach(function (b) {
      b.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        var next = view === "plan" ? "walk" : "plan";
        show(next);
        $(next === "plan" ? "tab-plan" : "tab-walk").focus();
      });
    });
    show(location.hash === "#3d" ? "walk" : "plan", true);
  });
  window.addEventListener("hashchange", function () {
    show(location.hash === "#3d" ? "walk" : "plan", true);
  });
  // The loading message is written before the texts may have arrived.
  document.addEventListener("idioma", function () {
    var m = $("walk-msg");
    if (m && !m.hidden) message(m.getAttribute("data-key"));
  });
})();
