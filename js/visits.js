/* Tells the visits Worker that this page was opened (see tools/visits/).

   No cookies. Nothing is counted on localhost, and a browser that opens /?me
   once stays out for good: that's how you don't count yourself. */
(function () {
  if (location.hostname !== 'hiessy.github.io') return;
  try {
    if (location.search === '?me') localStorage.setItem('do-not-count', '1');
    if (localStorage.getItem('do-not-count')) return;
  } catch (e) {}
  navigator.sendBeacon('https://visits.hiessy.workers.dev/v', JSON.stringify({
    p: location.pathname,
    r: document.referrer,
    s: screen.width + 'x' + screen.height,
    l: navigator.language
  }));
})();
