/* Tells the visits Worker that this page was opened (see tools/visits/).

   No cookies. Nothing is counted on localhost. A browser that opens /?me once
   has its visits marked as the owner's from then on: they still arrive, and the
   dashboard keeps them apart. The key keeps its old name so that browsers
   marked before stay marked. */
(function () {
  if (location.hostname !== 'hiessy.github.io') return;
  var mine = false;
  try {
    if (location.search === '?me') localStorage.setItem('do-not-count', '1');
    mine = !!localStorage.getItem('do-not-count');
  } catch (e) {}
  navigator.sendBeacon('https://visits.hiessy.workers.dev/v', JSON.stringify({
    p: location.pathname,
    r: document.referrer,
    s: screen.width + 'x' + screen.height,
    l: navigator.language,
    m: mine
  }));
})();
