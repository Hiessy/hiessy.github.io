/* Switches between the four views: the floor plan, the 3D walk, the photos
   and the history. The 3D code, and three.js from the CDN with it, loads the
   first time that view opens, so the other views never download it. The
   address remembers the view: #3d, #photos, #history (the plan has none). */
(function () {
  "use strict";
  var VIEWS = ["plan", "walk", "photos", "history"];
  var HASH = { plan: "", walk: "#3d", photos: "#photos", history: "#history" };
  var walk = null, loading = null, view = "plan", goal = null;

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

  /* A room picked in the list or under a photo ("walk here in 3D"): go there
     once the model is up. */
  function arrive() {
    if (goal && walk && walk.goTo) walk.goTo(goal);
    goal = null;
  }

  function openWalk() {
    if (walk) { walk.resume(); arrive(); return; }
    if (loading) return;
    message("walk.loading");
    loading = import("./walk.js").then(function (m) {
      walk = m;
      message(null);
      m.start();
      arrive();
      if (view !== "walk") m.pause();
    }).catch(function (e) {
      console.error(e);
      loading = null;
      message("walk.loadfail");
    });
  }

  function fromHash() {
    for (var v in HASH) if (HASH[v] && HASH[v] === location.hash) return v;
    return "plan";
  }

  function show(v, keepUrl) {
    view = VIEWS.indexOf(v) < 0 ? "plan" : v;
    VIEWS.forEach(function (k) {
      var on = k === view;
      var tab = $("tab-" + k);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      tab.classList.toggle("on", on);
      $("view-" + k).hidden = !on;
    });
    if (!keepUrl) history.replaceState(null, "", location.pathname + location.search + HASH[view]);
    if (view === "walk") openWalk(); else if (walk) walk.pause();
  }

  function toTop() {
    var tabs = document.querySelector(".views");
    if (tabs && tabs.getBoundingClientRect().top < 0) tabs.scrollIntoView({ block: "start" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    VIEWS.forEach(function (k, i) {
      var b = $("tab-" + k);
      b.addEventListener("click", function () { show(k); });
      // Arrow keys move along the tabs, as in any tab list.
      b.addEventListener("keydown", function (e) {
        var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        var next = VIEWS[(i + step + VIEWS.length) % VIEWS.length];
        show(next);
        $("tab-" + next).focus();
      });
    });
    show(fromHash(), true);
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    var w = e.target.closest("[data-walk]");
    if (w) {
      goal = w.getAttribute("data-walk");
      var tabs = document.querySelector(".views");
      if (tabs) tabs.scrollIntoView({ block: "start" });
      show("walk");
      return;
    }
    // a room tag under a photo: the plan, with that room lit
    var p = e.target.closest("[data-plan]");
    if (p) {
      show("plan");
      toTop();
      if (window.PLAN) window.PLAN.show(p.getAttribute("data-plan"));
    }
  });
  window.addEventListener("hashchange", function () { show(fromHash(), true); });
  // The loading message is written before the texts may have arrived.
  document.addEventListener("idioma", function () {
    var m = $("walk-msg");
    if (m && !m.hidden) message(m.getAttribute("data-key"));
  });
})();
