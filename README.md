# Wonda Luxe

Static storefront (HTML/CSS/JS). Customers save favourites, fill a cart, and finish the order on WhatsApp. Categories: **Cosmetics, Perfumes, Body Care**.

## Host on GitHub Pages
1. Upload the **contents** of this folder to the repo root (so `index.html` is at the root).
2. Repo → Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
3. `CNAME` holds your custom domain (`wondaluxe.com.ng`).

## Editing products
Edit `assets/js/products.js` (name, price, category, image, description, ingredients). Category must be exactly `Cosmetics`, `Perfumes` or `Body Care`. Add photos to `assets/images/`. Add `fit: "contain"` to a product to show a wide photo uncropped.

## Settings
`assets/js/config.js` – WhatsApp number and the alert-bot URL.

## Alert bot (visits, wishlist, cart, checkout)
See `bot/README.md` for the 10-minute Telegram setup.
