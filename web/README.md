# AssetsX

A responsive stock market web app, the web half of the AssetsX Semester 4 Frontend Designing project. The Flutter mobile app lives in [`../mobile`](../mobile).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 — mobile-first, custom dark theme |
| Scripting | Vanilla JavaScript (ES modules) |
| UI Framework | Bootstrap 5.3 (CDN) — required by the module spec |
| Charts | Chart.js (CDN) — required by the module spec |
| Auth | Real accounts with email verification, via Firebase's Identity Toolkit REST API — called with plain `fetch()` in JS (`js/firebaseAuth.js`) and PHP's `curl` extension server-side (`firebase_helper.php`, used by `login.php`/`register.php`). **No Firebase SDK is loaded anywhere** — no `<script src="firebase...">`, no npm/Composer package — this is the same hand-built request/response pattern already used for the Finnhub and ipapi.co calls in `js/api.js`. See "Database/Auth backend" below for why this satisfies the module's "vanilla JS/PHP only" rule. |
| Database | Firestore, also REST-only (`js/db.js`) — stores user profiles, per-user watchlists, real per-account portfolio holdings, and Pro-plan order records. |
| Market Data | Finnhub Stock API — real-time quotes, candles, news, company profiles |
| Geolocation | ipapi.co — IP-based city/country for the header |
| Hosting | Vercel (auto-deploy from GitHub main branch) — static hosting only; Firestore/Identity Toolkit are the only backend, no server needed |

---

## Pages

| File | Description |
|---|---|
| `index.html` | Landing / sign-in entry point |
| `signin.html` | Email + password sign-in (login.php; main.js handles it client-side when JS is on) |
| `signup.html` | New account registration (register.php; main.js handles it client-side when JS is on) |
| `home.html` | Dashboard — greeting, portfolio metrics, featured stock chart, watchlist, news |
| `markets.html` | Live market table — search, country filter, region pills (Americas / Europe / Asia) |
| `stock.html` | Stock detail — hero card, 52-week range, price chart (1D/1W/1M/3M/6M/1Y/5Y/ALL), key stats, company profile, related news |
| `trade.html` | Buy/Sell order page — simulated trading with a live price chart |
| `portfolio.html` | Portfolio — value chart, asset allocation donut chart, holdings table with sparklines |
| `news.html` | General market news feed with category tabs |
| `pro.html` | Pro subscription page — feature grid and Free vs Pro comparison |

---

## Features

- **Real-time prices** — live stock data from Finnhub with 5-minute sessionStorage caching to avoid rate limits
- **International stocks** — AAPL, MSFT, TSLA, NVDA, AMZN (US), SAP (Germany), TM (Japan), SHEL (UK), BABA (China)
- **Search by symbol, company, or country** — filters live as you type; Enter with a ticker symbol navigates to that stock's page
- **Region filter** — Americas / Europe / Asia-Pacific pills on the markets page filter by country column
- **Price history tabs** — 1D / 1W / 1M / 3M / 6M / 1Y / 5Y / ALL on the stock detail and trade pages re-fetch candle data and redraw the chart
- **Simulated Buy/Sell, real per-account portfolio** — trade.html lets you buy or sell by entering either a share count or a dollar amount; holdings are stored in Firestore (one doc per symbol under `/users/{uid}/holdings`), not the browser, so every account starts at $0 and its portfolio follows it across logout/login and devices. The UI updates instantly everywhere (home metrics, portfolio page, holdings) right after each trade
- **Portfolio performance chart** — 30-day portfolio value line chart on the portfolio page summary card
- **Asset allocation donut chart** — Chart.js doughnut built from your real holdings (shows a friendly "buy your first stock" message when the portfolio is empty — no fake data for new accounts)
- **Holdings table with sparklines** — per-row trend indicator next to each position
- **Currency switching** — USD / EUR / GBP / JPY selector in the top bar; preference persists in localStorage
- **Geolocation header** — city and country shown in the subtitle via ipapi.co
- **Real accounts with email verification** — sign-up creates a real Firebase account and emails a verification link (Google's own infrastructure sends it — no SMTP server or email API key needed); a banner on protected pages prompts unverified users to check their inbox or resend the link
- **Per-user watchlist** — add/remove symbols from the Markets table, the stock detail page, or the home dashboard widget; persisted server-side in Firestore (not just localStorage), so it follows the account across devices. Free accounts are capped at 5 symbols, Pro accounts are unlimited
- **Pro plan checkout** — a simulated cart/checkout for the Pro upgrade: generates a session id, writes an order record to Firestore, and flips the account's plan, unlocking the unlimited watchlist
- **PHP authentication** — login.php / register.php call the same Firebase REST endpoints server-side (via `firebase_helper.php`) that main.js calls client-side, so the PHP path is genuinely functional, not just a stub; main.js mirrors the same logic in JavaScript since static `.html` pages can't read a PHP session
- **Light/dark mode** — toggle in the top bar (or next to the logo on auth pages); preference persists in localStorage and is applied before the page paints to avoid a flash of the wrong theme
- **Color-coded sentiment** — green for gains, red for losses across all badges, cards, and the 52-week range bar
- **Responsive layout** — sidebar + content grid on desktop (≥1050px), stacked layout on tablet, bottom tab bar on mobile (≤680px)
- **Instant render** — fallback market data renders immediately on page load; real API data replaces it in the background so mobile users never see a blank screen
- **Official logo** — SVG icon used in the sidebar, auth pages, and browser tab favicon

---

## File Structure

```
AssetsX/
├── index.html          sign-in entry point
├── signin.html
├── signup.html
├── home.html
├── markets.html
├── stock.html
├── trade.html          Buy/Sell order page
├── portfolio.html
├── news.html
├── pro.html
├── login.php           Firebase sign-in via cURL, called by signin.html's form
├── register.php        Firebase sign-up + Firestore profile + verification email, called by signup.html's form
├── logout.php          destroys the PHP session
├── session_handler.php shared session_start() config, included by the files above
├── firebase_helper.php PHP mirror of js/firebaseAuth.js + js/db.js — cURL calls, no SDK
├── styles.css          all styles — variables, layout, components, responsive
├── logo.svg            official app icon
├── package.json
└── js/
    ├── main.js         app entry point — reads data-page and routes to the right renderer
    ├── pages.js        render functions for each page (home, markets, stock, trade, portfolio, news, auth, pro)
    ├── events.js       click/input event listeners — search, row nav, range tabs, region filter, watchlist, checkout
    ├── api.js          Finnhub + geolocation fetch calls
    ├── firebaseAuth.js Firebase Identity Toolkit REST wrapper — sign-up/in, email verification, token refresh
    ├── db.js           Firestore REST wrapper — user profile, watchlist, Pro plan orders
    ├── config.js       API keys, Firebase config, watchlist symbols, country map, fallback data
    ├── state.js        shared in-memory store (market rows, news items, user location, signed-in user profile)
    ├── cache.js        sessionStorage helpers with 5-minute TTL
    ├── currency.js     USD / EUR / GBP / JPY conversion with localStorage persistence
    ├── theme.js        light/dark mode with localStorage persistence
    ├── trade.js        simulated buy/sell, portfolio storage in Firestore (per account)
    ├── charts.js       Chart.js line chart, doughnut chart, and no-data placeholder
    └── utils.js        price formatters, toast notifications, sparkline SVG generator
```

---

## How It Works

Every HTML file has a `data-page` attribute on `<body>`:

```html
<body data-page="markets">
```

`main.js` reads that value and calls the matching render function from `pages.js` (e.g. `renderMarketsPage()`). On app pages, it renders immediately with fallback data then re-renders once the Finnhub API responds — so the UI is never blocked by a slow network.

Each JS module has one clear job: `config.js` for constants, `api.js` for network calls, `cache.js` for caching, `pages.js` for rendering, `events.js` for interactions.

---

## Running Locally

```bash
npm run dev
```

Then open `http://localhost:5173`. No build step — it's a static site served by Python's built-in HTTP server.

---

## Project Context

Built for the Semester 4 **Frontend Designing** module. The web app is the companion to the Flutter mobile app in this repo. Module requirements met:

- HTML5/PHP — login.php/register.php run real, working auth logic (vanilla JS handles everything else)
- Bootstrap 5 integration
- Chart.js charts with functional range tabs
- Real external API (Finnhub)
- Geolocation (ipapi.co, shown in the header)
- Search and filtering (by name, symbol, and country)
- Currency conversion (USD / EUR / GBP / JPY)
- Stock timeframes (1D / 1W / 1M / 3M / 6M / 1Y / 5Y / ALL)
- Portfolio tracking and a Pro upgrade page
- **Database** — Firestore, storing user profiles, per-user watchlists, and Pro plan orders
- **Email verification** — real sign-up confirmation email sent via Identity Toolkit
- **Shopping cart / session checkout** — Pro plan upgrade generates a session id and an order record
- Light/dark mode (optional feature)
- Fully responsive across desktop, tablet, and mobile

### Database/Auth backend — why this isn't "a JavaScript/PHP framework or library"

The module brief prohibits any JS/PHP framework or library beyond what it names (HTML5/PHP, CSS3, Bootstrap 5, JavaScript, Chart.js, a stock API). Firebase normally means importing the Firebase SDK — that's a real client library, and it's exactly what was removed from this project early on for that reason.

Instead, this app calls Firebase's underlying REST APIs directly:
- **Auth** — `identitytoolkit.googleapis.com` (sign-up, sign-in, send verification email, check verification status, refresh tokens)
- **Database** — `firestore.googleapis.com` (read/write user profile, watchlist, orders)

Every call is a hand-built `fetch()` in JS (`js/firebaseAuth.js`, `js/db.js`) or a `curl` call in PHP (`firebase_helper.php`) — **no Firebase SDK, no npm/Composer package, no `<script src="firebase...">` tag anywhere in this app.** This is the same integration shape already used for the Finnhub and ipapi.co calls in `js/api.js`: write the request/response handling yourself instead of importing a library. You can verify this by opening DevTools → Network on any live page: every Firebase-related request is a plain JSON `fetch()`/XHR to `googleapis.com`, with no `gstatic.com` SDK script ever loaded.

Firestore/Identity Toolkit are used here purely as a *hosted database + auth REST service* — filling the role of "a database" given the site only runs on Vercel's static hosting, with no server to run a traditional database on.

**Scope decision:** the free-plan 5-symbol watchlist cap is enforced in the app layer only, not in Firestore Security Rules. It's a soft product limit, not a security boundary — there's no real payment processor protecting the Pro plan anyway, so duplicating the check in rules wasn't worth the added complexity for this project.

### Firebase project setup (for anyone re-running this project)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com), enable **Authentication → Email/Password**, and create a **Firestore Database** (production mode).
2. Add these Firestore Security Rules so each account can only read/write its own data:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
         match /orders/{orderId} {
           allow read, write: if request.auth != null && request.auth.uid == uid;
         }
         match /holdings/{symbol} {
           allow read, write: if request.auth != null && request.auth.uid == uid;
         }
       }
     }
   }
   ```
3. Copy the **Web API key** and **Project ID** from Project settings → General → Your apps, and paste them into `FIREBASE_CONFIG` in `js/config.js` and `FIREBASE_API_KEY`/`FIREBASE_PROJECT_ID` in `firebase_helper.php`.
