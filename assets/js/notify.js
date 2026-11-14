/* Wonda Luxe – alert tracker.
   Sends small anonymous events to your alert bot (see /bot).
   Events: visit, wishlist_add, cart_add, checkout.
   No personal data is collected: a random visitor code, device type, page and
   referrer. The bot adds approximate city/country from the network request. */
(function () {
  const cfg = window.WL_CONFIG || {};
  const ENDPOINT = (cfg.NOTIFY_ENDPOINT || '').trim();
  const DEBUG = !!cfg.NOTIFY_DEBUG;
  const isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) || location.protocol === 'file:';

  function safeGet(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function safeSet(store, key, val) { try { store.setItem(key, val); } catch (e) { /* ignore */ } }

  function rand(n) {
    const c = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }

  let returning = true;
  let visitorId = safeGet(localStorage, 'wl_vid');
  if (!visitorId) { visitorId = rand(5); safeSet(localStorage, 'wl_vid', visitorId); returning = false; }

  function device() {
    const ua = navigator.userAgent || '';
    const type = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Desktop';
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS'
      : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Other';
    const browser = /Instagram/i.test(ua) ? 'Instagram app' : /FBAN|FBAV/i.test(ua) ? 'Facebook app'
      : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
      : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Browser';
    return `${type} · ${os} · ${browser}`;
  }

  function source() {
    const q = new URLSearchParams(location.search);
    const utm = q.get('utm_source') || q.get('ref');
    if (utm) return utm;
    try { if (document.referrer) return new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) { /* ignore */ }
    return 'direct';
  }

  function send(body) {
    if (DEBUG) console.log('[notify]', body);
    if (!ENDPOINT || (isLocal && !DEBUG)) return;
    const data = JSON.stringify(body);
    try {
      // text/plain keeps this a "simple" request (no CORS preflight)
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([data], { type: 'text/plain' }))) return;
    } catch (e) { /* fall through */ }
    try {
      fetch(ENDPOINT, { method: 'POST', body: data, headers: { 'Content-Type': 'text/plain' }, keepalive: true, mode: 'cors' })
        .catch(() => {});
    } catch (e) { /* ignore */ }
  }

  function track(event, data) {
    send({
      event: event,
      visitor: visitorId,
      returning: returning,
      device: device(),
      source: source(),
      page: location.pathname + location.hash,
      lang: navigator.language || '',
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
      data: data || {}
    });
  }

  window.WLNotify = { track: track };

  // One "visit" alert per browsing session
  if (!safeGet(sessionStorage, 'wl_visit')) {
    safeSet(sessionStorage, 'wl_visit', '1');
    track('visit');
  }
})();
