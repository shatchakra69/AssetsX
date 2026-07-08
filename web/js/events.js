// All click and input event listeners for the app.
// bindInteractions() is called after the page renders so listeners attach to real elements.

import { showToast } from './utils.js';
import { fetchStockCandles, getRangeWindow } from './api.js';
import { initStockChart, showChartSkeleton } from './charts.js';
import { appState } from './state.js';
import { renderWatchlist, renderProPlanStatus } from './pages.js';
import { clearAuth, startSocialSignIn } from './firebaseAuth.js';
import { addToWatchlist, removeFromWatchlist, createOrder, updateUserPlan } from './db.js';
import { FREE_WATCHLIST_LIMIT, PROFILE_CACHE_KEY, PORTFOLIO_CACHE_KEY } from './config.js';
import { writeCache, clearCache } from './cache.js';

// Save the profile fields to the same cache main.js reads on the next page,
// so a watchlist toggle or plan upgrade here doesn't get overwritten by old cached data.
function saveProfileCache() {
  writeCache(PROFILE_CACHE_KEY, {
    userName: appState.userName,
    userWatchlist: appState.userWatchlist,
    userPlan: appState.userPlan,
    emailVerified: appState.emailVerified,
  });
}

// Listen for clicks anywhere on the page and handle any [data-action] button.
// Using event delegation means we don't need to re-bind when new buttons are
// added to the DOM later (e.g. the Buy/Sell buttons rendered after the API loads).
function bindActionButtons() {
  if (document._actionsBound) return;
  document._actionsBound = true;

  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (button) handleAction(button);
  });
}

// Decide what happens when a data-action button is clicked
function handleAction(button) {
  const action = button.dataset.action;

  switch (action) {
    case "trade": {
      const rowSymbol = button.dataset.symbol;
      if (rowSymbol) {
        // Clicked Trade on a market table row — go to that stock's detail page first
        location.href = `stock.html?symbol=${rowSymbol}`;
      } else {
        // Already on a stock page — go straight to the buy order form
        const sym = appState.currentStockSymbol || new URLSearchParams(location.search).get('symbol');
        location.href = sym ? `trade.html?symbol=${sym}&action=buy` : 'markets.html';
      }
      break;
    }

    case "buy": {
      // Navigate to the buy order page for the current stock
      const sym = appState.currentStockSymbol || new URLSearchParams(location.search).get('symbol');
      location.href = sym ? `trade.html?symbol=${sym}&action=buy` : 'markets.html';
      break;
    }

    case "sell": {
      // Navigate to the sell order page — symbol comes from the row button or current page
      const sym = button.dataset.symbol || appState.currentStockSymbol || new URLSearchParams(location.search).get('symbol');
      if (sym) {
        location.href = `trade.html?symbol=${sym}&action=sell`;
      } else {
        showToast('Select a holding to sell.');
      }
      break;
    }

    case "forgot":
      // Handled in main.js by bindForgotPassword()
      break;

    case "social-google":
      // Leaves the page for Google's consent screen; main.js's
      // handleSocialRedirect() finishes the sign-in when Google sends us back
      startSocialSignIn('google.com').catch(error => showToast(error.message));
      break;

    case "social-apple":
      startSocialSignIn('apple.com').catch(error => showToast(error.message));
      break;

    case "pro-trial":
    case "upgrade":
      startProCheckout();
      break;

    case "compare":
      showToast("Free and Pro plan comparison highlighted.");
      break;

    case "watchlist-toggle": {
      const symbol = button.dataset.symbol;
      toggleWatchlistSymbol(symbol);
      break;
    }

    case "logout":
      // Clear the stored Firebase tokens and cached data, then let the
      // link's normal href take the user to signin.html — without this,
      // the next sign-in could briefly show the previous account's data
      clearAuth();
      clearCache(PROFILE_CACHE_KEY);
      clearCache(PORTFOLIO_CACHE_KEY);
      break;
  }
}

// Add or remove a symbol from the signed-in user's Firestore watchlist.
// Free-plan accounts are capped at FREE_WATCHLIST_LIMIT symbols.
async function toggleWatchlistSymbol(symbol) {
  if (!symbol) return;
  if (!appState.uid) { showToast('Sign in to use your watchlist.'); return; }

  const inWatchlist = appState.userWatchlist.includes(symbol);

  if (!inWatchlist && appState.userPlan !== 'pro' && appState.userWatchlist.length >= FREE_WATCHLIST_LIMIT) {
    showToast(`Free plan is limited to ${FREE_WATCHLIST_LIMIT} watchlist symbols — upgrade to Pro for unlimited.`);
    return;
  }

  try {
    if (inWatchlist) {
      await removeFromWatchlist(appState.uid, symbol);
      appState.userWatchlist = appState.userWatchlist.filter((s) => s !== symbol);
    } else {
      await addToWatchlist(appState.uid, symbol);
      appState.userWatchlist = [...appState.userWatchlist, symbol];
    }

    // Flip every star for this symbol on the page (markets table + stock hero
    // can both show the same symbol) and re-render the home widget if present
    const nowIn = appState.userWatchlist.includes(symbol);
    document.querySelectorAll(`[data-action="watchlist-toggle"][data-symbol="${symbol}"]`).forEach((btn) => {
      btn.classList.toggle('active', nowIn);
      btn.textContent = nowIn ? '★' : '☆';
    });
    if (document.getElementById('watchlist-container')) renderWatchlist();
    saveProfileCache();
  } catch (error) {
    showToast(error.message);
  }
}

// Simulated Pro plan checkout — no real payment processor, just a Firestore
// order record with a generated session id and a plan flip on the user doc.
async function startProCheckout() {
  if (!appState.uid) { showToast('Please sign in first.'); return; }
  if (appState.userPlan === 'pro') { showToast("You're already on the Pro plan."); return; }
  if (!appState.emailVerified) { showToast('Please verify your email before upgrading.'); return; }

  try {
    const sessionId = crypto.randomUUID();
    await createOrder(appState.uid, {
      sessionId,
      plan: 'pro',
      billingCycle: 'monthly',
      price: 9.99,
      status: 'confirmed',
    });
    await updateUserPlan(appState.uid, 'pro');
    appState.userPlan = 'pro';
    saveProfileCache();
    renderProPlanStatus(sessionId);
    showToast('Upgrade confirmed — welcome to AssetsX Pro.');
  } catch (error) {
    showToast(error.message);
  }
}

// Make pill tabs inside any .range-tabs group switch the active state when clicked.
// The stock chart tabs are handled separately because they also reload chart data.
function bindRangeTabs() {
  document.querySelectorAll(".range-tabs:not(#stockRangeTabs)").forEach((group) => {
    group.querySelectorAll(".pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        group.querySelectorAll(".pill").forEach((item) => item.classList.remove("active"));
        pill.classList.add("active");
      });
    });
  });
}

// Wire the timeframe tabs (1D / 1W / 1M / 3M / 6M / 1Y / 5Y / ALL) on the
// stock detail page. Each click calculates the correct date range and redraws the chart.
function bindStockRangeTabs() {
  const container = document.getElementById('stockRangeTabs');
  if (!container) return;

  const symbol = new URLSearchParams(location.search).get('symbol') || 'AAPL';

  container.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', async () => {
      container.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const now = Math.floor(Date.now() / 1000);
      const { from, resolution } = getRangeWindow(pill.dataset.range, now);

      showChartSkeleton('stockChart');
      const data = await fetchStockCandles(symbol, resolution, from, now);
      initStockChart('stockChart', data);
    });
  });
}

// Make watchlist rows and market table rows clickable, navigating to the stock detail page.
// Clicks on a button inside the row (Trade, the watchlist star, etc.) are left
// alone so they don't also trigger this row-level navigation.
function bindRowNavigation() {
  document.querySelectorAll(".watch-row, .market-table tbody tr").forEach((row) => {
    const symbol = row.dataset.symbol;
    if (!symbol) return;

    row.style.cursor = 'pointer';
    row.addEventListener("click", (e) => {
      if (e.target.closest('[data-action]')) return;
      location.href = `stock.html?symbol=${symbol}`;
    });
  });
}

// Open the source article URL in a new tab when a news card is clicked.
// No internal reader page — go straight to the original story.
function bindNewsCardNavigation() {
  document.querySelectorAll(".news-card").forEach((card) => {
    const url = card.dataset.url;
    if (!url) return;

    card.style.cursor = 'pointer';
    card.addEventListener("click", () => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });
}

// Filter visible rows and cards as the user types into the search box.
// Pressing Enter with a stock symbol (1-5 letters) navigates directly to that stock.
function bindGlobalSearch() {
  [".search", ".market-search"].forEach(selector => {
    const searchInput = document.querySelector(selector);
    // Guard against double-binding when bindInteractions() is called a second time after API load
    if (!searchInput || searchInput.dataset.bound) return;
    searchInput.dataset.bound = 'true';

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      document.querySelectorAll(".watch-row, .holdings-row, .news-card, .market-table tbody tr").forEach((row) => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
      });
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const query = searchInput.value.trim().toUpperCase();
      if (query.length >= 1 && query.length <= 5 && /^[A-Z]+$/.test(query)) {
        location.href = `stock.html?symbol=${query}`;
      }
    });
  });
}

// Wire the region filter pills on the Markets page so they filter the table by country.
// Country name is read from the fourth column (index 3) of each table row —
// the watchlist star is column 0, so Symbol/Company/Country sit at 1/2/3.
function bindMarketRegionFilter() {
  const tabs = document.getElementById('market-region-tabs');
  if (!tabs) return;

  const REGIONS = {
    americas: ['united states', 'canada', 'brazil', 'mexico'],
    europe:   ['germany', 'united kingdom', 'france', 'netherlands', 'sweden'],
    asia:     ['japan', 'china', 'south korea', 'india', 'hong kong'],
  };

  tabs.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const region = pill.dataset.region || 'all';
      document.querySelectorAll('.market-table tbody tr').forEach(row => {
        if (region === 'all') {
          row.style.display = '';
          return;
        }
        const country = (row.cells[3]?.textContent || '').toLowerCase();
        row.style.display = REGIONS[region].some(c => country.includes(c)) ? '' : 'none';
      });
    });
  });
}

// Filter news cards by category when the tabs on the news page are clicked.
// The category keywords are matched against the tag text on each news card.
function bindNewsCategoryTabs() {
  const tabs = document.getElementById('news-category-tabs');
  if (!tabs) return;

  const CATEGORY_KEYWORDS = {
    macro: ['economy', 'macro', 'federal', 'rate', 'inflation', 'gdp', 'market'],
    tech:  ['tech', 'software', 'apple', 'google', 'microsoft', 'nvidia', 'amazon'],
    crypto: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'coin'],
  };

  tabs.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      tabs.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const category = pill.dataset.category;
      const cards = document.querySelectorAll('#news-grid .news-card');

      cards.forEach(card => {
        if (category === 'all') {
          card.style.display = '';
          return;
        }
        const text = card.textContent.toLowerCase();
        const keywords = CATEGORY_KEYWORDS[category] || [];
        card.style.display = keywords.some(kw => text.includes(kw)) ? '' : 'none';
      });
    });
  });
}

// Attach all event listeners. Called after the page's dynamic content has been rendered.
export function bindInteractions() {
  bindActionButtons();
  bindRangeTabs();
  bindStockRangeTabs();
  bindRowNavigation();
  bindNewsCardNavigation();
  bindGlobalSearch();
  bindMarketRegionFilter();
  bindNewsCategoryTabs();
}
