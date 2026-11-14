/**
 * Wonda Luxe alert bot – Cloudflare Worker.
 *
 * The website posts small JSON events here; this worker forwards them to
 * your Telegram chat. Your bot token lives only in Cloudflare secrets, never
 * in the website's code.
 *
 * Secrets / vars (see README.md):
 *   TELEGRAM_BOT_TOKEN  (secret)  token from @BotFather
 *   TELEGRAM_CHAT_ID    (secret)  your chat id (or a group id)
 *   ALLOWED_ORIGINS     (var)     comma-separated site origins allowed to post
 */

const EVENTS = {
  visit: '👀 New visitor',
  wishlist_add: '❤️ Added to wishlist',
  cart_add: '🛒 Added to cart',
  checkout: '✅ Checkout started → WhatsApp'
};

// Best-effort per-IP limit (per worker instance): 40 events / 10 minutes
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 600000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 40;
}

const esc = (v) => String(v == null ? '' : v).slice(0, 200)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

export function formatMessage(ev, where) {
  const d = ev.data || {};
  const lines = [`<b>${EVENTS[ev.event]}</b>`];

  if (ev.event === 'wishlist_add') {
    lines.push(`💄 ${esc(d.product)} — ${naira(d.price)}`);
    lines.push(`Wishlist now has ${esc(d.wishlistSize)} item(s)`);
  } else if (ev.event === 'cart_add') {
    lines.push(`💄 ${esc(d.product)} — ${naira(d.price)} (x${esc(d.qty)})`);
    lines.push(`Cart: ${esc(d.cartItems)} item(s) · ${naira(d.cartTotal)}`);
  } else if (ev.event === 'checkout') {
    const items = Array.isArray(d.items) ? d.items.slice(0, 15) : [];
    items.forEach(i => lines.push(`• ${esc(i)}`));
    lines.push(`<b>Total: ${naira(d.total)}</b>`);
    lines.push('Expect a WhatsApp message from this customer 📲');
  }

  lines.push('');
  lines.push(`🆔 Visitor ${esc(ev.visitor)} ${ev.returning ? '(returning)' : '(first time)'}`);
  if (where) lines.push(`📍 ${esc(where)}`);
  lines.push(`📱 ${esc(ev.device)}`);
  lines.push(`🔗 From: ${esc(ev.source)}`);
  return lines.join('\n');
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const originOk = allowed.includes(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: originOk ? 204 : 403, headers: originOk ? cors(origin) : {} });
    }
    if (request.method !== 'POST') return new Response('Wonda Luxe alert bot is running ✅', { status: 200 });
    if (!originOk) return new Response('Forbidden', { status: 403 });

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (limited(ip)) return new Response('Slow down', { status: 429, headers: cors(origin) });

    let ev;
    try {
      const text = await request.text();
      if (text.length > 4000) throw new Error('too big');
      ev = JSON.parse(text);
    } catch (e) {
      return new Response('Bad request', { status: 400, headers: cors(origin) });
    }
    if (!ev || !EVENTS[ev.event]) return new Response('Unknown event', { status: 400, headers: cors(origin) });

    const cf = request.cf || {};
    const where = [cf.city, cf.region, cf.country].filter(Boolean).join(', ');

    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: formatMessage(ev, where),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    return new Response(res.ok ? 'ok' : 'telegram error', { status: res.ok ? 200 : 502, headers: cors(origin) });
  }
};
