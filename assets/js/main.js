/* Wonda Luxe – storefront */
const WHATSAPP_NUMBER = (window.WL_CONFIG && window.WL_CONFIG.WHATSAPP_NUMBER) || '2348064674290';
const CART_KEY = 'wondaCart';
const WISH_KEY = 'wondaWish';

const CATEGORIES = [
  { key: 'Cosmetics', slug: 'cosmetics', blurb: 'Foundations, powders, lips & eyes', image: 'assets/images/571976.jpg' },
  { key: 'Perfumes', slug: 'perfumes', blurb: 'Oud, florals & gift sets', image: 'assets/images/571955.jpg' },
  { key: 'Body Care', slug: 'body-care', blurb: 'Skin & foot care essentials', image: 'assets/images/571974.jpg' }
];

/* ---------- Helpers ---------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const formatPrice = (n) => '₦' + Number(n).toLocaleString('en-NG');
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const getProduct = (id) => products.find(p => p.id === id);
const track = (ev, data) => { try { window.WLNotify && WLNotify.track(ev, data); } catch (e) { /* never break the shop */ } };

const ICON = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c2 0 3.3 1 4 2.2h4C14.7 6 16 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true" class="fill"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-1.9 1.3-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.8-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 .9c.3.1.5.2.6.3.1.2.1.8-.1 1.5z"/></svg>'
};

/* ---------- State (localStorage-backed, failure-safe) ---------- */
function readList(key, withQty) {
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(raw)) return [];
    if (withQty) return raw.filter(i => i && getProduct(i.id) && Number.isInteger(i.qty) && i.qty > 0).map(i => ({ id: i.id, qty: i.qty }));
    return raw.filter(id => typeof id === 'string' && getProduct(id));
  } catch (e) { return []; }
}
function writeList(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ } }

let cart = readList(CART_KEY, true);
let wish = readList(WISH_KEY, false);
const view = { cat: 'all', q: '', sort: 'featured' };

const cartQty = (id) => (cart.find(i => i.id === id) || {}).qty || 0;
const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);
const cartTotal = () => cart.reduce((s, i) => s + getProduct(i.id).price * i.qty, 0);

/* ---------- Cart ---------- */
function addToCart(id, silent) {
  if (!getProduct(id)) return;
  const it = cart.find(i => i.id === id);
  if (it) it.qty += 1; else cart.push({ id, qty: 1 });
  persistCart();
  const p = getProduct(id);
  track('cart_add', { product: p.name, price: p.price, qty: cartQty(id), cartItems: cartCount(), cartTotal: cartTotal() });
  if (!silent) toast(`Added to cart`, 'View cart', openCart);
}
function changeQty(id, d) {
  const it = cart.find(i => i.id === id);
  if (!it) return;
  it.qty += d;
  if (it.qty <= 0) cart = cart.filter(i => i.id !== id);
  persistCart();
}
function removeFromCart(id) { cart = cart.filter(i => i.id !== id); persistCart(); }
function clearCart() { cart = []; persistCart(); }
function persistCart() { writeList(CART_KEY, cart); syncUI(); }

/* ---------- Wishlist ---------- */
function toggleWish(id) {
  const p = getProduct(id);
  if (!p) return;
  const i = wish.indexOf(id);
  if (i >= 0) {
    wish.splice(i, 1);
    toast('Removed from wishlist');
  } else {
    wish.push(id);
    track('wishlist_add', { product: p.name, price: p.price, wishlistSize: wish.length });
    toast('Saved to wishlist', 'View', openWish);
  }
  writeList(WISH_KEY, wish);
  syncUI();
}

/* ---------- WhatsApp checkout ---------- */
function buildOrder(items) {
  let total = 0;
  let msg = 'Hello Wonda Luxe! 👋 I would like to order:\n\n';
  items.forEach(({ id, qty }) => {
    const p = getProduct(id);
    const line = p.price * qty;
    total += line;
    msg += `• ${p.name} x${qty} – ${formatPrice(line)}\n`;
  });
  msg += `\n*Total: ${formatPrice(total)}*\n\nPlease confirm availability and delivery details. Thank you!`;
  return { msg, total };
}
function sendToWhatsApp(items, source) {
  if (!items.length) { toast('Your cart is empty'); return; }
  const { msg, total } = buildOrder(items);
  track('checkout', {
    source: source,
    total: total,
    items: items.map(i => `${getProduct(i.id).name} x${i.qty}`)
  });
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}
const checkoutWhatsApp = () => sendToWhatsApp(cart.slice(), 'cart');

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, actionLabel, action) {
  const el = $('#toast');
  if (!el) return;
  el.innerHTML = `<span>${escapeHTML(msg)}</span>${actionLabel ? `<button type="button">${escapeHTML(actionLabel)}</button>` : ''}`;
  const b = $('button', el);
  if (b) b.onclick = () => { el.classList.remove('show'); action(); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- Product cards ---------- */
function qtySlotHTML(id) {
  const q = cartQty(id);
  if (!q) return `<button type="button" class="add-btn" data-act="add" aria-label="Add to cart">+ Add</button>`;
  return `<div class="stepper" role="group" aria-label="Quantity">
      <button type="button" data-act="dec" aria-label="Decrease">−</button><span>${q}</span><button type="button" data-act="inc" aria-label="Increase">+</button>
    </div>`;
}
function cardHTML(p, i) {
  const id = escapeHTML(p.id);
  const on = wish.includes(p.id);
  return `
  <article class="card reveal" data-id="${id}" style="--i:${Math.min(i, 11)}">
    <div class="card-media${p.fit === 'contain' ? ' contain' : ''}">
      <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy" decoding="async">
      <button type="button" class="heart${on ? ' on' : ''}" data-act="wish" aria-pressed="${on}" aria-label="${on ? 'Remove from' : 'Add to'} wishlist">${ICON.heart}</button>
      <span class="chip-cat">${escapeHTML(p.category)}</span>
    </div>
    <div class="card-body">
      <h3><button type="button" class="title-btn" data-act="open">${escapeHTML(p.name)}</button></h3>
      <div class="card-foot"><span class="price">${formatPrice(p.price)}</span><span class="qty-slot">${qtySlotHTML(p.id)}</span></div>
    </div>
  </article>`;
}

function filteredProducts() {
  const q = view.q.trim().toLowerCase();
  let list = products.filter(p =>
    (view.cat === 'all' || p.category === view.cat) &&
    (!q || (p.name + ' ' + p.category + ' ' + p.description).toLowerCase().includes(q)));
  if (view.sort === 'low') list = list.slice().sort((a, b) => a.price - b.price);
  if (view.sort === 'high') list = list.slice().sort((a, b) => b.price - a.price);
  return list;
}

function renderGrid() {
  const grid = $('#grid');
  if (!grid) return;
  const list = filteredProducts();
  grid.innerHTML = list.length
    ? list.map(cardHTML).join('')
    : `<div class="empty-state"><p>No products match “${escapeHTML(view.q)}”.</p><button type="button" class="btn-ghost" data-act="reset">Clear filters</button></div>`;
  $('#result-count').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
  observeReveal();
}

function renderChips() {
  const all = [{ key: 'all', label: 'All', n: products.length }]
    .concat(CATEGORIES.map(c => ({ key: c.key, label: c.key, n: products.filter(p => p.category === c.key).length })));
  $('#chips').innerHTML = all.map(c =>
    `<button type="button" class="chip${view.cat === c.key ? ' active' : ''}" data-cat="${escapeHTML(c.key)}" aria-pressed="${view.cat === c.key}">${escapeHTML(c.label)} <small>${c.n}</small></button>`).join('');
}

function renderCategoryTiles() {
  const el = $('#cat-tiles');
  if (!el) return;
  el.innerHTML = CATEGORIES.map(c => `
    <button type="button" class="tile reveal" data-cat="${escapeHTML(c.key)}">
      <img src="${c.image}" alt="" loading="lazy">
      <span class="tile-text"><strong>${escapeHTML(c.key)}</strong><small>${escapeHTML(c.blurb)}</small><em>${products.filter(p => p.category === c.key).length === 1 ? '1 item' : products.filter(p => p.category === c.key).length + ' items'} →</em></span>
    </button>`).join('');
}

function setCategory(key, scroll) {
  view.cat = key;
  renderChips();
  renderGrid();
  const slug = key === 'all' ? 'shop' : (CATEGORIES.find(c => c.key === key) || {}).slug;
  if (history.replaceState) history.replaceState(null, '', '#' + slug);
  if (scroll) $('#shop').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Drawers & modal ---------- */
function openLayer(id) {
  closeLayers(true);
  const el = $('#' + id);
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  $('#overlay').classList.add('active');
  document.body.classList.add('no-scroll');
  const f = $('[data-focus]', el);
  if (f) f.focus();
}
function closeLayers(keepOverlay) {
  $$('.layer.open').forEach(l => { l.classList.remove('open'); l.setAttribute('aria-hidden', 'true'); });
  if (!keepOverlay) { $('#overlay').classList.remove('active'); document.body.classList.remove('no-scroll'); }
}
function openCart() { renderCart(); openLayer('cart-drawer'); }
function openWish() { renderWish(); openLayer('wish-drawer'); }

function renderCart() {
  const items = $('#cart-items');
  if (!items) return;
  if (!cart.length) {
    items.innerHTML = `<div class="empty-state"><p>Your cart is empty</p><button type="button" class="btn-ghost" data-act="close-layers">Start shopping</button></div>`;
  } else {
    items.innerHTML = cart.map(it => {
      const p = getProduct(it.id);
      return `<div class="row" data-id="${escapeHTML(p.id)}">
        <img src="${escapeHTML(p.image)}" alt="">
        <div class="row-info"><h4>${escapeHTML(p.name)}</h4><span class="price">${formatPrice(p.price * it.qty)}</span>
          <div class="stepper small"><button type="button" data-act="dec" aria-label="Decrease">−</button><span>${it.qty}</span><button type="button" data-act="inc" aria-label="Increase">+</button></div></div>
        <button type="button" class="icon-btn" data-act="remove" aria-label="Remove ${escapeHTML(p.name)}">${ICON.close}</button>
      </div>`;
    }).join('');
  }
  $('#cart-total').textContent = formatPrice(cartTotal());
  $('#cart-foot').hidden = !cart.length;
}

function renderWish() {
  const items = $('#wish-items');
  if (!items) return;
  if (!wish.length) {
    items.innerHTML = `<div class="empty-state"><p>Tap the ♡ on any product to save it here</p><button type="button" class="btn-ghost" data-act="close-layers">Browse products</button></div>`;
  } else {
    items.innerHTML = wish.map(id => {
      const p = getProduct(id);
      return `<div class="row" data-id="${escapeHTML(p.id)}">
        <img src="${escapeHTML(p.image)}" alt="">
        <div class="row-info"><h4><button type="button" class="title-btn" data-act="open">${escapeHTML(p.name)}</button></h4><span class="price">${formatPrice(p.price)}</span>
          <button type="button" class="add-btn" data-act="add-from-wish">${cartQty(p.id) ? 'Add one more' : '+ Add to cart'}</button></div>
        <button type="button" class="icon-btn" data-act="wish" aria-label="Remove from wishlist">${ICON.close}</button>
      </div>`;
    }).join('');
  }
  $('#wish-foot').hidden = !wish.length;
}

let modalId = null;
function showProduct(id) {
  const p = getProduct(id);
  if (!p) return;
  modalId = id;
  const related = products.filter(x => x.category === p.category && x.id !== id).slice(0, 4);
  $('#modal-body').innerHTML = `
    <div class="modal-media${p.fit === 'contain' ? ' contain' : ''}"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}"></div>
    <div class="modal-info">
      <span class="chip-cat static">${escapeHTML(p.category)}</span>
      <h2 id="modal-title">${escapeHTML(p.name)}</h2>
      <p class="price big">${formatPrice(p.price)}</p>
      <p class="desc">${escapeHTML(p.description)}</p>
      <div class="modal-actions">
        <span class="qty-slot" id="modal-qty">${qtySlotHTML(id)}</span>
        <button type="button" class="heart-btn${wish.includes(id) ? ' on' : ''}" data-act="wish" aria-pressed="${wish.includes(id)}">${ICON.heart}<span>${wish.includes(id) ? 'Saved' : 'Save'}</span></button>
      </div>
      <button type="button" class="btn-wa" data-act="buy-now">${ICON.wa} Order this on WhatsApp</button>
      ${p.ingredients ? `<details class="ing"><summary>Ingredients</summary><p>${escapeHTML(p.ingredients).replace(/\n\n/g, '<br><br>')}</p></details>` : ''}
      ${related.length ? `<h4 class="more">You may also like</h4><div class="related">${related.map(r =>
        `<button type="button" data-act="open-related" data-id="${escapeHTML(r.id)}"><img src="${escapeHTML(r.image)}" alt="${escapeHTML(r.name)}" loading="lazy"><span>${formatPrice(r.price)}</span></button>`).join('')}</div>` : ''}
    </div>`;
  $('#modal-scroll').scrollTop = 0;
  openLayer('product-modal');
}

/* ---------- Sync everything that mirrors cart/wishlist state ---------- */
function syncUI() {
  const n = cartCount();
  $$('.cart-count').forEach(el => { el.textContent = n; el.hidden = !n; });
  $$('.wish-count').forEach(el => { el.textContent = wish.length; el.hidden = !wish.length; });

  // Mobile cart bar
  const bar = $('#cart-bar');
  if (bar) {
    bar.classList.toggle('show', n > 0);
    document.body.classList.toggle('has-cart', n > 0);
    $('#bar-text').textContent = `${n} item${n === 1 ? '' : 's'} · ${formatPrice(cartTotal())}`;
  }

  // Card controls
  $$('.card').forEach(card => {
    const id = card.dataset.id;
    $('.qty-slot', card).innerHTML = qtySlotHTML(id);
    const h = $('.heart', card), on = wish.includes(id);
    h.classList.toggle('on', on);
    h.setAttribute('aria-pressed', on);
    h.setAttribute('aria-label', (on ? 'Remove from' : 'Add to') + ' wishlist');
  });

  // Open modal controls
  if (modalId && $('#product-modal').classList.contains('open')) {
    $('#modal-qty').innerHTML = qtySlotHTML(modalId);
    const hb = $('.heart-btn');
    if (hb) {
      const on = wish.includes(modalId);
      hb.classList.toggle('on', on);
      hb.setAttribute('aria-pressed', on);
      $('span', hb).textContent = on ? 'Saved' : 'Save';
    }
  }
  if ($('#cart-drawer').classList.contains('open')) renderCart();
  if ($('#wish-drawer').classList.contains('open')) renderWish();
}

/* ---------- Scroll reveal ---------- */
let io;
function observeReveal() {
  const els = $$('.reveal:not(.in)');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(e => e.classList.add('in'));
    return;
  }
  io = io || new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
}

/* ---------- One delegated click handler ---------- */
document.addEventListener('click', (e) => {
  const t = e.target;

  const catBtn = t.closest('[data-cat]');
  if (catBtn) { e.preventDefault(); setCategory(catBtn.dataset.cat, !catBtn.classList.contains('chip')); return; }

  const act = t.closest('[data-act]');
  if (!act) return;
  const kind = act.dataset.act;
  const holder = act.closest('[data-id]');
  const id = (holder && holder.dataset.id) || modalId;

  switch (kind) {
    case 'add': addToCart(id); break;
    case 'add-from-wish': addToCart(id); break;
    case 'inc': changeQty(id, 1); break;
    case 'dec': changeQty(id, -1); break;
    case 'remove': removeFromCart(id); break;
    case 'wish': toggleWish(id); break;
    case 'open': showProduct(id); break;
    case 'open-related': showProduct(act.dataset.id); break;
    case 'buy-now': sendToWhatsApp([{ id: modalId, qty: Math.max(1, cartQty(modalId)) }], 'buy-now'); break;
    case 'close-layers': closeLayers(); break;
    case 'reset': view.q = ''; $('#search').value = ''; setCategory('all'); break;
    case 'wish-all-to-cart': wish.forEach(w => { if (!cartQty(w)) addToCart(w, true); }); toast('Wishlist added to cart', 'View cart', openCart); break;
    case 'clear-cart': clearCart(); break;
  }
});

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('#overlay').addEventListener('click', () => closeLayers());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLayers(); });

  $('#open-cart').addEventListener('click', openCart);
  $('#bar-view').addEventListener('click', openCart);
  $('#open-wish').addEventListener('click', openWish);
  $('#checkout-btn').addEventListener('click', checkoutWhatsApp);

  let st;
  $('#search').addEventListener('input', (e) => {
    view.q = e.target.value;
    clearTimeout(st);
    st = setTimeout(renderGrid, 120);
    if (view.q.trim() && $('#shop').getBoundingClientRect().top > innerHeight * 0.7) {
      $('#shop').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  $('#sort').addEventListener('change', (e) => { view.sort = e.target.value; renderGrid(); });

  // Header shadow on scroll
  const hdr = $('#site-header');
  addEventListener('scroll', () => hdr.classList.toggle('scrolled', scrollY > 8), { passive: true });

  renderCategoryTiles();
  renderChips();

  // Open on a category from the URL hash (#perfumes, #cosmetics, #body-care)
  const hash = location.hash.slice(1);
  const fromHash = CATEGORIES.find(c => c.slug === hash);
  if (fromHash) view.cat = fromHash.key;
  renderChips();
  renderGrid();
  syncUI();
  observeReveal();
  if (fromHash) setTimeout(() => $('#shop').scrollIntoView(), 50);
});
