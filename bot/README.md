# Wonda Luxe alert bot (Telegram)

Sends you an instant Telegram message when someone:

| Event | What you get |
|---|---|
| Visits the site | 👀 device, city/country, where they came from, new or returning |
| Adds a product to wishlist | ❤️ product + price |
| Adds a product to cart | 🛒 product, cart total |
| Taps **Checkout on WhatsApp** | ✅ full item list + total, so you expect their WhatsApp message |

Visitors are anonymous (a random code like `k3x9m`). Their name and number only appear when they message you on WhatsApp.

> Why Telegram and not WhatsApp? WhatsApp doesn't let a site message *you* automatically without the paid WhatsApp Business API. Telegram bots are free and instant.

## Setup (about 10 minutes, free)

**1. Create the bot**
- In Telegram, open **@BotFather** → `/newbot` → pick a name. Copy the **token** it gives you.
- Open your new bot and press **Start** (send it any message).

**2. Get your chat id**
- Open `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser.
- Find `"chat":{"id":123456789` — that number is your **chat id**.

**3. Deploy the relay** (keeps your token secret, off the website)
```bash
cd bot
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN     # paste the token
npx wrangler secret put TELEGRAM_CHAT_ID       # paste the chat id
npx wrangler deploy
```
Wrangler prints a URL like `https://wonda-luxe-alerts.yourname.workers.dev`.

Edit `wrangler.toml` first if your site address differs from the ones listed in `ALLOWED_ORIGINS`.

**4. Connect the site**
Open `assets/js/config.js` and paste the URL:
```js
NOTIFY_ENDPOINT: 'https://wonda-luxe-alerts.yourname.workers.dev',
```
Commit and push. Visit your live site from your phone — you should get the 👀 alert within seconds.

## Testing without deploying
Set `NOTIFY_DEBUG: true` in `config.js` and open the browser console to see each event as it fires.

## Notes
- Alerts are not sent from `localhost`/`file://` unless `NOTIFY_DEBUG` is on.
- The relay only accepts requests from the origins you list, only the four event types above, and caps each visitor at 40 alerts per 10 minutes. A determined person could still fake the origin from a script, so keep the Telegram chat private and don't reuse the bot for anything else.
