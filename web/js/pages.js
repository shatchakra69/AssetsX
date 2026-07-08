// These functions fill in the content for each page.
// main.js calls the right one based on which page is open.

import { appState } from './state.js';
import { fetchStockDetails, fetchStockCandles, getRangeWindow } from './api.js';
import { initStockChart, initDoughnutChart, showChartSkeleton } from './charts.js';
import { sparkline, isTrendUp, formatTimeAgo, showToast } from './utils.js';
import { DEMO_PORTFOLIO_CHART } from './config.js';
import { formatWithCurrency, getCurrency } from './currency.js';
import {
  getPortfolio,
  getLivePrice,
  calcPortfolioTotals,
  calcPortfolioDailyChange,
  formatShareQty,
  getHolding,
  buyShares,
  sellShares,
} from './trade.js';

// Fill the summary cards at the top of the dashboard
export function renderMetrics(metrics) {
  const container = document.getElementById('metrics-container');
  if (!container) return;

  container.innerHTML = metrics.map(([label, value, detail, isPositive]) => `
    <article class="card metric-card ${isPositive ? 'metric-up' : 'metric-down'}">
      <div class="label">${label}</div>
      <span class="value">${value}</span>
      <small class="${isPositive ? "up" : "down"} mono">${detail}</small>
    </article>
  `).join("");
}

// Build one news card. Clicking it opens the real article in a new tab.
export function renderNewsCard(tag, title, copy, img, isLarge = false, timestamp = null, url = null) {
  const maxLength = 110;
  const truncatedCopy = copy && copy.length > maxLength ? `${copy.substring(0, maxLength)}...` : (copy || "");
  const timeLabel = timestamp ? formatTimeAgo(timestamp) : '2h ago';

  return `
    <article class="card news-card ${isLarge ? 'large' : ''}" data-url="${url || ''}">
      ${img ? `<img src="${img}" class="news-preview-image" alt="${title}" loading="lazy" onerror="this.remove()">` : ''}
      <div class="news-content">
        <div class="news-meta">
          <span class="pill active">${tag}</span>
          <small class="mono">${timeLabel}</small>
        </div>
        <h4>${title}</h4>
        <p>${truncatedCopy}</p>
      </div>
    </article>
  `;
}


// ── Home page ─────────────────────────────────────────────────────────────────

// Small star toggle used wherever a symbol can be added to or removed from
// the signed-in user's Firestore watchlist — markets table, stock hero, and
// the home widget itself. handleAction("watchlist-toggle") in events.js wires the click.
function watchlistButtonHTML(symbol) {
  const inWatchlist = appState.userWatchlist.includes(symbol);
  return `
    <button type="button" class="watchlist-btn ${inWatchlist ? 'active' : ''}"
      data-action="watchlist-toggle" data-symbol="${symbol}"
      aria-label="${inWatchlist ? 'Remove' : 'Add'} ${symbol} ${inWatchlist ? 'from' : 'to'} watchlist">
      ${inWatchlist ? '★' : '☆'}
    </button>`;
}

// Fill the watchlist on the right side of the home page with live prices.
// Shows the signed-in user's own watchlist (from Firestore), not every tracked symbol.
export function renderWatchlist() {
  const container = document.getElementById('watchlist-container');
  if (!container) return;

  const rows = appState.marketRows.filter(([symbol]) => appState.userWatchlist.includes(symbol));

  if (rows.length === 0) {
    container.innerHTML = `<p class="muted" style="padding:0.75rem 0">Your watchlist is empty — add symbols from the Markets page.</p>`;
    return;
  }

  container.innerHTML = rows.map(([symbol, name, price, change]) => {
    const up = isTrendUp(change);
    return `
    <div class="watch-row" data-symbol="${symbol}">
      <span class="watch-symbol">${symbol}</span>
      <span class="watch-name">${name}</span>
      ${sparkline(up)}
      <span class="price">
        ${convertPriceString(price)}
        <small><span class="change-badge ${up ? 'badge-up' : 'badge-down'}">${change}</span></small>
      </span>
      ${watchlistButtonHTML(symbol)}
    </div>`;
  }).join("");
}

// Show the 3 most recent news articles on the home page
function renderHomeNewsFeed() {
  const container = document.getElementById('news-container');
  if (!container) return;

  container.innerHTML = appState.newsItems.slice(0, 3).map(([tag, title, copy, img, time, url]) =>
    renderNewsCard(tag, title, copy, img, false, time, url)).join("");
}

// Get the current price of a stock from the data we already loaded
function getMarketPrice(symbol) {
  const row = appState.marketRows.find(([rowSymbol]) => rowSymbol === symbol);
  if (!row) return undefined;
  return Number(row[2].replace(/[^0-9.-]/g, ''));
}

// Build the 4 metric cards on the home page using real data.
// calcPortfolioTotals() and calcPortfolioDailyChange() both return 0 for an
// empty portfolio, so a brand new user correctly sees $0.00, not demo numbers.
function buildHomeMetrics() {
  const { totalValue, gain } = calcPortfolioTotals();
  const dailyChange = calcPortfolioDailyChange();
  const yesterdayValue = totalValue - dailyChange;
  const dailyPct = yesterdayValue > 0 ? (dailyChange / yesterdayValue) * 100 : 0;

  const watchlistCount = appState.userWatchlist.length;

  return [
    ["PORTFOLIO VALUE", formatWithCurrency(totalValue), `${gain >= 0 ? '+' : ''}${formatWithCurrency(gain)} all-time`, gain >= 0],
    ["DAILY P/L", `${dailyChange >= 0 ? '+' : ''}${formatWithCurrency(dailyChange)}`, `${dailyChange >= 0 ? '+' : ''}${dailyPct.toFixed(2)}% today`, dailyChange >= 0],
    ["WATCHLIST", `${watchlistCount} symbol${watchlistCount !== 1 ? 's' : ''}`, watchlistCount ? 'Tracked symbols' : 'Add symbols from Markets', true],
    ["MARKET STATUS", "Open", appState.userLocation, true],
  ];
}

// Recompute and redraw the home page metric cards from the latest portfolio data.
// Exported so a storage/portfolio-changed event can refresh it without a page reload.
export function renderPortfolioMetrics() {
  renderMetrics(buildHomeMetrics());
}

// Render the home page: metric cards, watchlist, news feed, and performance chart
export function renderHomePage(now, monthAgo) {
  renderPortfolioMetrics();
  renderWatchlist();
  renderHomeNewsFeed();

  const aaplPrice = getMarketPrice('AAPL');
  showChartSkeleton('homeChart');
  fetchStockCandles('AAPL', 'D', monthAgo, now, aaplPrice).then(data => initStockChart('homeChart', data));
}


// ── Markets page ──────────────────────────────────────────────────────────────

// Convert a price string like "$173.50" to the currency the user has selected
function convertPriceString(priceStr) {
  const usd = parseFloat(priceStr.replace(/[$,]/g, ''));
  return isNaN(usd) ? priceStr : formatWithCurrency(usd);
}

// Fill the markets table with live stock prices
export function renderMarketsPage() {
  const tbody = document.getElementById('market-table-body');
  if (!tbody) return;

  tbody.innerHTML = appState.marketRows.map(([symbol, name, price, change, volume, country]) => {
    const up = isTrendUp(change);
    return `
    <tr data-symbol="${symbol}">
      <td class="watch-col">${watchlistButtonHTML(symbol)}</td>
      <td class="mono strong">${symbol}</td>
      <td>${name}</td>
      <td class="muted">${country || ''}</td>
      <td class="mono">${convertPriceString(price)}</td>
      <td><span class="change-badge ${up ? 'badge-up' : 'badge-down'}">${change}</span></td>
      <td class="mono muted">${volume}</td>
      <td>${sparkline(up)}</td>
      <td><button class="table-action" data-action="trade" data-symbol="${symbol}">Trade</button></td>
    </tr>`;
  }).join("");
}


// ── Stock detail page ─────────────────────────────────────────────────────────

// These helper functions format numbers for display.
// They return 'N/A' if the API did not return a value for that field.
function formatNumber(value) {
  return typeof value === 'number' ? value.toFixed(2) : 'N/A';
}

function formatPercent(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}%` : 'N/A';
}

// Market cap comes from Finnhub in millions, so we convert it to B (billions) or T (trillions)
function formatMarketCap(valueInMillions) {
  if (typeof valueInMillions !== 'number') return 'N/A';
  const { symbol, rate } = getCurrency();
  const converted = valueInMillions * rate;
  if (converted >= 1_000_000) return `${symbol}${(converted / 1_000_000).toFixed(2)}T`;
  if (converted >= 1_000) return `${symbol}${(converted / 1_000).toFixed(2)}B`;
  return `${symbol}${converted.toFixed(2)}M`;
}

function formatShares(valueInMillions) {
  return typeof valueInMillions === 'number' ? `${valueInMillions.toFixed(2)}M` : 'N/A';
}

// Update the page title in the topbar to show the stock symbol
function renderStockTitle(symbol) {
  const title = document.getElementById('stock-title');
  if (title) title.textContent = `${symbol} Details`;
}

// Show the company logo, name, price, and change at the top of the stock page.
// Also saves the current symbol, name, and price to appState so the Buy/Sell buttons can read them.
function renderStockHero(symbol, details) {
  const hero = document.getElementById('stock-hero');
  if (!hero) return;

  const { profile, quote } = details;
  const isUp = quote.d >= 0;
  const sign = isUp ? '+' : '';

  // Save current stock info so event handlers know what stock the user is looking at
  appState.currentStockSymbol = symbol;
  appState.currentStockName   = profile.name || symbol;
  appState.currentStockPrice  = quote.c;

  // Finnhub returns long exchange names like "NASDAQ NMS - GLOBAL MARKET", we only need the first part
  const exchange = (profile.exchange || 'N/A').split(' - ')[0];

  const logo = profile.logo
    ? `<img class="stock-logo" src="${profile.logo}" alt="${symbol} logo" loading="lazy" onerror="this.outerHTML='<div class=&quot;stock-logo stock-logo-fallback&quot;>${symbol[0]}</div>'">`
    : `<div class="stock-logo stock-logo-fallback">${symbol[0]}</div>`;

  // Add a green or red highlight to the card depending on whether the price is up or down
  hero.classList.add(isUp ? 'trend-up' : 'trend-down');

  hero.innerHTML = `
    <div class="stock-identity">
      ${logo}
      <div>
        <h2>${symbol}</h2>
        <p>${profile.name || ''}</p>
        <div class="stock-tags">
          <span class="pill active">${exchange}</span>
          ${profile.finnhubIndustry ? `<span class="pill">${profile.finnhubIndustry}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="stock-price-block">
      <strong class="stock-price">${formatWithCurrency(quote.c)}</strong>
      <span class="price-change ${isUp ? 'up' : 'down'}">${sign}${formatWithCurrency(Math.abs(quote.d))} (${sign}${quote.dp.toFixed(2)}%)</span>
      <div class="stock-actions">
        ${watchlistButtonHTML(symbol)}
        <button class="btn" data-action="sell">Sell</button>
        <button class="btn primary" data-action="buy">Buy</button>
      </div>
    </div>`;
}

// Render the quick stats row above the chart: open, high, low, prev close, market cap, volume
function renderStockQuickStats(details) {
  const container = document.getElementById('stock-quick-stats');
  if (!container) return;

  const { quote, metrics } = details;
  const stats = [
    ['OPEN', formatWithCurrency(quote.o)],
    ['HIGH', formatWithCurrency(quote.h)],
    ['LOW', formatWithCurrency(quote.l)],
    ['PREV CLOSE', formatWithCurrency(quote.pc)],
    ['MARKET CAP', formatMarketCap(metrics?.marketCapitalization)],
    ['AVG VOLUME', formatShares(metrics?.['10DayAverageTradingVolume'])],
  ];

  container.innerHTML = stats.map(([label, value]) => `
    <article class="card quick-stat">
      <div class="label">${label}</div>
      <span class="value">${value}</span>
    </article>`).join("");
}

// Render the key statistics sidebar on the stock detail page
function renderStockStats(details) {
  const rows = document.getElementById('stat-rows');
  if (!rows) return;

  const m = details.metrics || {};
  const stats = [
    ['MARKET CAP', formatMarketCap(m.marketCapitalization)],
    ['52W HIGH', formatWithCurrency(m['52WeekHigh'])],
    ['52W LOW', formatWithCurrency(m['52WeekLow'])],
    ['P/E (TTM)', formatNumber(m.peTTM)],
    ['EPS (TTM)', formatNumber(m.epsTTM)],
    ['BETA', formatNumber(m.beta)],
    ['DIV YIELD', formatPercent(m.dividendYieldIndicatedAnnual)],
  ];

  rows.innerHTML = stats.map(([label, value]) => `
    <div class="stat-row"><span>${label}</span><strong class="mono">${value}</strong></div>`).join("");
}

// Render the About card with company profile information
function renderStockAbout(details) {
  const grid = document.getElementById('stock-about');
  if (!grid) return;

  const p = details.profile;
  const rows = [
    ['Industry', p.finnhubIndustry || 'N/A'],
    ['Country', p.country || 'N/A'],
    ['IPO Date', p.ipo || 'N/A'],
    ['Shares Outstanding', formatShares(p.shareOutstanding)],
    ['Currency', p.currency || 'N/A'],
    ['Website', p.weburl
      ? `<a href="${p.weburl}" target="_blank" rel="noopener">${p.weburl.replace(/^https?:\/\//, '')}</a>`
      : 'N/A'],
  ];

  grid.innerHTML = rows.map(([label, value]) => `
    <div class="about-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

// Show 3 recent news articles related to the stock being viewed
function renderStockNews(details) {
  const grid = document.getElementById('stock-news-container');
  if (!grid || !details.news) return;

  grid.innerHTML = details.news.slice(0, 3).map(([tag, title, copy, img, time, url]) =>
    renderNewsCard(tag, title, copy, img, true, time, url)).join("");
}

// Show a progress bar for the 52-week price range — how close is the current price to the high?
function renderStockRange(details) {
  const container = document.getElementById('stock-range');
  if (!container) return;

  const m = details.metrics || {};
  const low  = m['52WeekLow'];
  const high = m['52WeekHigh'];
  const cur  = details.quote.c;

  if (!low || !high || low >= high) { container.style.display = 'none'; return; }

  const pct = Math.min(100, Math.max(0, ((cur - low) / (high - low)) * 100)).toFixed(1);

  container.innerHTML = `
    <div class="range-header">
      <span class="label">52-WEEK RANGE</span>
      <span class="mono muted">${formatWithCurrency(cur)} current</span>
    </div>
    <div class="range-track">
      <div class="range-fill" style="width: ${pct}%"></div>
      <div class="range-thumb" style="left: ${pct}%"></div>
    </div>
    <div class="range-extremes">
      <span>${formatWithCurrency(low)} low</span>
      <span>${formatWithCurrency(high)} high</span>
    </div>`;
}

// Load and display the full stock detail page.
// The stock symbol comes from the URL, for example: stock.html?symbol=AAPL
export function renderStockPage(now, monthAgo) {
  const params = new URLSearchParams(location.search);
  const symbol = params.get('symbol') || 'AAPL';

  showChartSkeleton('stockChart');
  fetchStockDetails(symbol).then((details) => {
    if (!details) return;

    renderStockTitle(symbol);
    renderStockHero(symbol, details);
    renderStockQuickStats(details);
    renderStockRange(details);
    renderStockStats(details);
    renderStockAbout(details);
    renderStockNews(details);

    fetchStockCandles(symbol, 'D', monthAgo, now, details.quote.c).then(data => initStockChart('stockChart', data));
  });
}


// ── Portfolio page ────────────────────────────────────────────────────────────

// Show the total portfolio value, gains, and a performance chart.
// Updates automatically after every trade (see portfolio:updated in main.js).
function renderPortfolioSummary(portfolio) {
  const summary = document.getElementById('portfolio-summary');
  if (!summary) return;

  if (portfolio.length === 0) {
    // Nothing bought yet — show a prompt to get started
    summary.innerHTML = `
      <div class="portfolio-empty-state">
        <p class="muted">You haven't made any trades yet.</p>
        <a href="markets.html" class="btn primary" style="display:inline-block;margin-top:0.5rem">Browse Markets</a>
      </div>
    `;
    return;
  }

  const { totalValue, totalInvested, gain, gainPct } = calcPortfolioTotals();
  const isUp   = gain >= 0;
  const sign   = isUp ? '+' : '';

  summary.innerHTML = `
    <div class="portfolio-summary-left">
      <div class="portfolio-balance">
        <p class="eyebrow">TOTAL PORTFOLIO VALUE</p>
        <h2 class="portfolio-value">${formatWithCurrency(totalValue)}</h2>
        <span class="price-change ${isUp ? 'up' : 'down'}">${sign}${formatWithCurrency(Math.abs(gain))} total gain (${sign}${gainPct.toFixed(2)}%)</span>
      </div>
      <div class="portfolio-stat-tiles">
        <div class="portfolio-stat-tile">
          <span>Invested</span>
          <strong class="mono">${formatWithCurrency(totalInvested)}</strong>
        </div>
        <div class="portfolio-stat-tile">
          <span>Total Gain</span>
          <strong class="mono ${isUp ? 'up' : 'down'}">${sign}${gainPct.toFixed(2)}%</strong>
        </div>
        <div class="portfolio-stat-tile">
          <span>Holdings</span>
          <strong class="mono">${portfolio.length} asset${portfolio.length !== 1 ? 's' : ''}</strong>
        </div>
      </div>
    </div>
    <div class="portfolio-summary-right">
      <div class="range-tabs">
        <span class="pill active">1M</span>
        <span class="pill">3M</span>
        <span class="pill">1Y</span>
      </div>
      <div class="portfolio-mini-chart">
        <canvas id="portfolioChart" class="chart"></canvas>
      </div>
    </div>
  `;
}

// Fixed colors for the allocation chart — cycles if portfolio has more than 6 holdings
const CHART_COLORS = ['#4d6080', '#7b94b0', '#b0c4d8', '#2d4a6e', '#a8c0d8', '#6b8aaa'];

// Render the donut chart and legend for asset allocation, using real holdings.
function renderPortfolioAllocation(portfolio) {
  const legend = document.getElementById('allocation-legend');
  const canvas = document.getElementById('allocationChart');
  if (!legend) return;

  if (portfolio.length === 0) {
    // Nothing bought yet — remove any old chart and show a friendly message
    if (typeof Chart !== 'undefined') Chart.getChart('allocationChart')?.destroy();
    if (canvas) canvas.style.display = 'none';
    legend.innerHTML = `<p class="muted" style="padding:0.5rem 0">Buy your first stock to see your allocation here.</p>`;
    return;
  }

  if (canvas) canvas.style.display = '';

  // Calculate each holding's share of the total portfolio value
  const { totalValue } = calcPortfolioTotals();
  const allocation = portfolio.map(({ symbol, shares, avgCost }, i) => {
    const price = getLivePrice(symbol);
    const value = shares * price;
    const pct   = totalValue > 0 ? (value / totalValue) * 100 : 0;
    return { label: symbol, value: formatWithCurrency(value), pct, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  initDoughnutChart('allocationChart', {
    labels: allocation.map(a => a.label),
    values: allocation.map(a => a.pct),
    colors: allocation.map(a => a.color),
  });

  legend.innerHTML = allocation.map(({ label, value, pct, color }) => `
    <div class="allocation-legend-row">
      <span class="allocation-dot" style="background: ${color};"></span>
      <span class="name">${label}</span>
      <span class="pct mono">${pct.toFixed(1)}%</span>
      <span class="value mono">${value}</span>
    </div>`).join("");
}

// Render the full portfolio page — reads real holdings from Firestore so it always reflects real trades.
export function renderPortfolioPage() {
  const portfolio = getPortfolio();

  renderPortfolioSummary(portfolio);
  // The chart canvas only exists when renderPortfolioSummary() drew the
  // non-empty layout above, so this is skipped automatically for a $0
  // portfolio. It's a small illustrative trend line, not real price history.
  initStockChart('portfolioChart', DEMO_PORTFOLIO_CHART, { compact: true });
  renderPortfolioAllocation(portfolio);

  const container = document.getElementById('holdings-container');
  if (!container) return;

  if (portfolio.length === 0) {
    container.innerHTML = `
      <div class="holdings-empty">
        <p class="muted" style="padding:1.5rem 1rem">No holdings yet — buy your first stock from the <a href="markets.html">Markets</a> page.</p>
      </div>`;
    return;
  }

  // Build one row per holding with live price, profit/loss, and a Sell button
  container.innerHTML = portfolio.map(({ symbol, name, shares, avgCost }) => {
    const currentPrice = getLivePrice(symbol);
    const value        = shares * currentPrice;
    const gainAmt      = (currentPrice - avgCost) * shares;
    const gainPct      = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0;
    const isUp         = gainAmt >= 0;
    const sign         = isUp ? '+' : '';

    return `
    <div class="holdings-row" data-symbol="${symbol}">
      <div class="asset-name">
        <span class="ticker-avatar">${symbol[0]}</span>
        <div><strong>${symbol}</strong><small>${name} · ${formatShareQty(shares)} share${shares !== 1 ? 's' : ''}</small></div>
      </div>
      <span class="col mono">${formatWithCurrency(avgCost)}</span>
      <span class="col mono">${formatWithCurrency(currentPrice)}</span>
      <span class="col mono">${formatWithCurrency(value)}</span>
      <span class="col sparkline-col">${sparkline(isUp)}</span>
      <span class="col mono ${isUp ? 'up' : 'down'}">${sign}${gainPct.toFixed(2)}%</span>
      <span class="col">
        <button class="table-action" data-action="sell" data-symbol="${symbol}">Sell</button>
      </span>
    </div>`;
  }).join("");
}


// ── News page ─────────────────────────────────────────────────────────────────

// Show all news articles in the grid
function renderNewsGrid(grid) {
  grid.innerHTML = appState.newsItems.map(([tag, title, copy, img, time, url]) =>
    renderNewsCard(tag, title, copy, img, true, time, url)).join("");
}

// Render compact clickable ticker chips along the top of the news page.
// Each chip links directly to the stock detail page for that symbol.
function renderNewsStockSnapshot() {
  const strip = document.getElementById('news-ticker-strip');
  if (!strip) return;

  strip.innerHTML = appState.marketRows.map(([symbol, name, price, change]) => {
    const up = isTrendUp(change);
    return `
    <a class="ticker-chip" href="stock.html?symbol=${symbol}" title="${name}">
      <span class="ticker-sym">${symbol}</span>
      <span class="ticker-price mono">${convertPriceString(price)}</span>
      <span class="change-badge ${up ? 'badge-up' : 'badge-down'}">${change}</span>
    </a>`;
  }).join('');
}

// Render the news page — ticker strip at the top, then the article grid
export function renderNewsPage() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;
  renderNewsStockSnapshot();
  renderNewsGrid(grid);
}


// ── Auth pages ────────────────────────────────────────────────────────────────

// Draw the decorative preview chart on the auth page left panel
export function renderAuthPage() {
  initStockChart('miniChart', {
    labels: Array.from({ length: 20 }, (_, i) => i + 1),
    prices: [18, 22, 19, 25, 23, 28, 26, 30, 27, 32, 31, 35, 33, 38, 36, 40, 38, 43, 41, 45],
  }, { compact: true });
}


// ── Pro page ──────────────────────────────────────────────────────────────────

// Show plan status near the pricing card: nothing for free users (the existing
// "Upgrade Now" CTA already covers that), or a confirmation card for Pro users.
// sessionId is only passed right after a checkout completes, to show a receipt.
export function renderProPlanStatus(sessionId = null) {
  const box = document.getElementById('plan-status');
  if (!box) return;

  if (appState.userPlan !== 'pro') {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }

  box.style.display = 'block';
  box.innerHTML = `
    <div class="card plan-status-card">
      <strong>You're on the Pro plan.</strong>
      ${sessionId ? `<p class="muted mono" style="margin:0.25rem 0 0">Order confirmed — session ${sessionId}</p>` : ''}
    </div>`;
}


// ── Trade page ────────────────────────────────────────────────────────────────

// Show a full-page success screen after the trade is confirmed
function showTradeSuccess(container, symbol, companyName, qty, total, isBuy) {
  container.innerHTML = `
    <div class="trade-success-wrap">
      <div class="card trade-success-card">
        <div class="trade-success-icon ${isBuy ? '' : 'sell'}">
          ${isBuy ? '✓' : '✓'}
        </div>
        <h2 class="trade-success-title">Order ${isBuy ? 'Placed' : 'Executed'}</h2>
        <p class="trade-success-detail">
          ${isBuy ? 'You bought' : 'You sold'}
          <strong>${formatShareQty(qty)} share${qty !== 1 ? 's' : ''}</strong> of <strong>${symbol}</strong>
        </p>
        <p class="muted" style="font-size:0.875rem">${companyName}</p>

        <div class="trade-success-receipt">
          <div class="trade-success-receipt-row">
            <span>Shares</span>
            <strong class="mono">${formatShareQty(qty)}</strong>
          </div>
          <div class="trade-success-receipt-row">
            <span>Price per share</span>
            <strong class="mono">${formatWithCurrency(total / qty)}</strong>
          </div>
          <div class="trade-success-receipt-row total">
            <span>${isBuy ? 'Total Paid' : 'Proceeds'}</span>
            <strong class="mono">${formatWithCurrency(total)}</strong>
          </div>
        </div>

        <div class="trade-success-actions">
          <a href="trade.html?symbol=${symbol}&action=${isBuy ? 'sell' : 'buy'}" class="btn">
            ${isBuy ? `Sell ${symbol}` : `Buy ${symbol}`}
          </a>
          <a href="portfolio.html" class="btn primary">View Portfolio</a>
        </div>
        <p class="trade-disclaimer">Simulated trade only — no real money is involved</p>
      </div>
    </div>
  `;
}


// ── Trade Page (trade.html) ───────────────────────────────────────────────────

// Full-screen stock trading page: hero card, price chart, order panel, news.
// Reads ?symbol and ?action from the URL.
export async function renderTradePage() {
  const container = document.getElementById('trade-page-content');
  if (!container || container.dataset.loaded) return;
  container.dataset.loaded = 'true';

  const params  = new URLSearchParams(location.search);
  const symbol  = params.get('symbol') || 'AAPL';
  const initialAction = params.get('action') || 'buy';

  const titleEl = document.getElementById('trade-page-title');
  if (titleEl) titleEl.textContent = symbol;

  // Show a loading state while the API responds
  container.innerHTML = `
    <div class="trade-layout">
      <div class="card stock-hero">
        <div class="stock-identity">
          <div class="stock-logo stock-logo-fallback">${symbol.charAt(0)}</div>
          <div>
            <h2>${symbol}</h2>
            <p>Loading&hellip;</p>
          </div>
        </div>
      </div>
      <p class="muted" style="text-align:center;padding:4rem 0">Fetching market data&hellip;</p>
    </div>
  `;

  // Fetch profile, quote, and key metrics all at once
  let profile = {}, quote = {}, metrics = {};
  try {
    const data = await fetchStockDetails(symbol);
    profile = data.profile || {};
    quote   = data.quote   || {};
    metrics = data.metrics || {};
  } catch (_) {
    container.innerHTML = `
      <div style="text-align:center;padding:4rem 0">
        <p class="muted">Could not load data for <strong>${symbol}</strong>.</p>
        <a href="markets.html" class="btn" style="margin-top:1rem">Back to Markets</a>
      </div>
    `;
    return;
  }

  const price = quote.c || 0;
  const isUp  = quote.d >= 0;
  const sign  = isUp ? '+' : '';
  // price is always in USD (straight from Finnhub) — the amount field shows it
  // converted to the user's selected currency, so we need the exchange rate too.
  const currencyRate = getCurrency().rate;

  const holding       = getHolding(symbol);
  const sharesOwned   = holding ? holding.shares  : 0;
  const avgCost       = holding ? holding.avgCost : 0;
  const positionValue = sharesOwned * price;
  const positionGain  = sharesOwned * (price - avgCost);
  const positionGainPct = avgCost ? ((price - avgCost) / avgCost) * 100 : 0;

  const companyName = profile.name || symbol;
  // Finnhub returns long exchange names like "NASDAQ NMS - GLOBAL MARKET", we only need the first part
  const exchange    = (profile.exchange || '').split(' - ')[0];
  const logoUrl     = profile.logo || '';

  const stats = [
    ['OPEN',       formatWithCurrency(quote.o || 0)],
    ['HIGH',       formatWithCurrency(quote.h || 0)],
    ['LOW',        formatWithCurrency(quote.l || 0)],
    ['PREV CLOSE', formatWithCurrency(quote.pc || 0)],
    ['MKT CAP',    formatMarketCap(metrics.marketCapitalization)],
    ['52W HIGH',   metrics['52WeekHigh'] ? formatWithCurrency(metrics['52WeekHigh']) : 'N/A'],
  ];

  // Trending strip — reuse the same ticker-chip rows the news page uses
  const trending = appState.marketRows.filter(([s]) => s !== symbol).slice(0, 8);
  const trendingHTML = trending.length
    ? trending.map(([s, name, p, chg]) => {
        const up = isTrendUp(chg);
        return `
          <a class="ticker-chip" href="trade.html?symbol=${s}&action=buy" title="${name}">
            <span class="ticker-sym">${s}</span>
            <span class="ticker-price mono">${convertPriceString(p)}</span>
            <span class="change-badge ${up ? 'badge-up' : 'badge-down'}">${chg}</span>
          </a>`;
      }).join('')
    : '';

  container.innerHTML = `
    <div class="trade-layout">

      <!-- ── Hero card — same component as the stock detail page ─────────────── -->
      <div class="card stock-hero ${isUp ? 'trend-up' : 'trend-down'}">
        <div class="stock-identity">
          ${logoUrl
            ? `<img class="stock-logo" src="${logoUrl}" alt="${symbol} logo" loading="lazy" onerror="this.outerHTML='<div class=&quot;stock-logo stock-logo-fallback&quot;>${symbol.charAt(0)}</div>'">`
            : `<div class="stock-logo stock-logo-fallback">${symbol.charAt(0)}</div>`}
          <div>
            <h2>${symbol}</h2>
            <p>${companyName}</p>
            <div class="stock-tags">
              ${exchange ? `<span class="pill active">${exchange}</span>` : ''}
              ${profile.finnhubIndustry ? `<span class="pill">${profile.finnhubIndustry}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="stock-price-block">
          <strong class="stock-price">${formatWithCurrency(price)}</strong>
          <span class="price-change ${isUp ? 'up' : 'down'}">${sign}${formatWithCurrency(Math.abs(quote.d || 0))} (${sign}${(quote.dp || 0).toFixed(2)}%)</span>
        </div>
      </div>

      <!-- ── Two-column: chart left, order right ────────────────────────────── -->
      <div class="trade-content-grid">

        <!-- Chart column -->
        <div class="trade-chart-col">
          <article class="card chart-card">
            <div class="card-head">
              <h3>Price History</h3>
              <div class="range-tabs" id="tradeRangeTabs">
                <span class="pill" data-range="1D">1D</span>
                <span class="pill" data-range="1W">1W</span>
                <span class="pill active" data-range="1M">1M</span>
                <span class="pill" data-range="3M">3M</span>
                <span class="pill" data-range="6M">6M</span>
                <span class="pill" data-range="1Y">1Y</span>
                <span class="pill" data-range="5Y">5Y</span>
                <span class="pill" data-range="ALL">ALL</span>
              </div>
            </div>
            <div class="chart-container">
              <canvas id="tradeChart" class="chart"></canvas>
            </div>
          </article>

          <!-- 6 stat tiles below chart -->
          <div class="quick-stats-grid">
            ${stats.map(([label, val]) => `
              <article class="card quick-stat">
                <div class="label">${label}</div>
                <span class="value">${val}</span>
              </article>
            `).join('')}
          </div>

          ${trendingHTML ? `
          <!-- Trending strip -->
          <div class="card trade-trending-card">
            <h3>Trending</h3>
            <div class="news-ticker-strip">${trendingHTML}</div>
          </div>
          ` : ''}
        </div>

        <!-- Order panel (sticky on desktop) -->
        <div class="trade-order-col">

          ${holding ? `
          <div class="card trade-balance-card">
            <div class="trade-balance-label">Market Value</div>
            <div class="trade-balance-value mono">${formatWithCurrency(positionValue)}</div>
            <span class="change-badge ${positionGain >= 0 ? 'badge-up' : 'badge-down'}">
              ${positionGain >= 0 ? '+' : ''}${formatWithCurrency(positionGain)}
              (${positionGainPct >= 0 ? '+' : ''}${positionGainPct.toFixed(2)}%)
            </span>
            <div class="trade-balance-subrow">
              <div>
                <span class="muted">Shares</span>
                <strong>${formatShareQty(sharesOwned)}</strong>
              </div>
              <div>
                <span class="muted">Avg cost</span>
                <strong class="mono">${formatWithCurrency(avgCost)}</strong>
              </div>
            </div>
          </div>
          ` : ''}

          <div class="card trade-order-card">
            <!-- Buy / Sell capsule tab switcher -->
            <div class="trade-order-tabs" id="tradeOrderTabs">
              <button class="trade-order-tab buy ${initialAction === 'buy' ? 'active' : ''}" data-tab="buy">Buy</button>
              <button class="trade-order-tab sell ${initialAction === 'sell' ? 'active' : ''}" data-tab="sell">Sell</button>
            </div>

            <!-- Swap-style order ticket: shares row ↔ amount row, kept in sync both ways -->
            <div class="trade-ticket">
              <div class="trade-ticket-row">
                <div class="trade-ticket-left">
                  ${logoUrl
                    ? `<img src="${logoUrl}" class="trade-ticket-icon-img" alt="${symbol}" onerror="this.style.display='none'">`
                    : `<div class="trade-ticket-icon">${symbol.charAt(0)}</div>`}
                  <div>
                    <div class="trade-ticket-label">${symbol}</div>
                    <div class="trade-ticket-sublabel" id="tradeMaxHint">
                      ${holding ? `Own ${formatShareQty(sharesOwned)}` : 'Shares'}
                    </div>
                  </div>
                </div>
                <div class="trade-ticket-right">
                  <div class="trade-ticket-stepper">
                    <button type="button" class="trade-ticket-step" id="tradeQtyMinus" aria-label="Decrease shares">&minus;</button>
                    <input type="number" id="tradeQtyInput" class="trade-ticket-input" value="1" min="0" step="any" inputmode="decimal" aria-label="Number of shares">
                    <button type="button" class="trade-ticket-step" id="tradeQtyPlus" aria-label="Increase shares">+</button>
                  </div>
                  <div class="trade-ticket-sublabel">shares</div>
                </div>
              </div>

              <div class="trade-ticket-divider"><span>&darr;</span></div>

              <div class="trade-ticket-row">
                <div class="trade-ticket-left">
                  <div class="trade-ticket-icon cash">$</div>
                  <div>
                    <div class="trade-ticket-label" id="receiptLabel">${initialAction === 'buy' ? 'You pay' : 'You receive'}</div>
                    <div class="trade-ticket-sublabel">Or type an amount</div>
                  </div>
                </div>
                <div class="trade-ticket-right">
                  <div class="trade-ticket-amount-wrap">
                    <span class="trade-ticket-amount-prefix">${getCurrency().symbol}</span>
                    <input type="number" id="tradeAmountInput" class="trade-ticket-input trade-ticket-amount-input" value="${(price * currencyRate).toFixed(2)}" min="0" step="any" inputmode="decimal" aria-label="Amount to ${initialAction === 'buy' ? 'spend' : 'receive'}">
                  </div>
                  <div class="trade-ticket-sublabel">${getCurrency().code}</div>
                </div>
              </div>
            </div>

            <!-- Live rate pill -->
            <div class="trade-rate-pill">
              <span class="trade-rate-icon">i</span>
              1 share&nbsp;=&nbsp;<span class="mono">${formatWithCurrency(price)}</span>
            </div>

            <button
              class="btn trade-page-confirm-btn ${initialAction === 'sell' ? 'sell-btn' : 'primary'}"
              id="tradeConfirmBtn"
            >
              ${initialAction === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`}
            </button>
            <p class="trade-disclaimer">Simulated only &mdash; no real money is involved</p>
          </div>
        </div>

      </div>

    </div>
  `;

  // ── Load chart ──────────────────────────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  try {
    const initialWindow = getRangeWindow('1M', now);
    showChartSkeleton('tradeChart');
    const candles = await fetchStockCandles(symbol, initialWindow.resolution, initialWindow.from, now);
    initStockChart('tradeChart', candles);
  } catch (_) {}

  const rangeTabs = document.getElementById('tradeRangeTabs');
  if (rangeTabs) {
    rangeTabs.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', async () => {
        rangeTabs.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const n = Math.floor(Date.now() / 1000);
        const { from, resolution } = getRangeWindow(pill.dataset.range, n);
        try {
          showChartSkeleton('tradeChart');
          const data = await fetchStockCandles(symbol, resolution, from, n);
          initStockChart('tradeChart', data);
        } catch (_) {}
      });
    });
  }

  // ── Wire order form ─────────────────────────────────────────────────────────
  // The shares field and the amount field stay in sync both ways: typing a
  // share count fills in the cost, and typing a dollar amount fills in the
  // equivalent share count — like a real brokerage order ticket.
  let currentAction = initialAction;

  const qtyInput     = document.getElementById('tradeQtyInput');
  const amountInput  = document.getElementById('tradeAmountInput');
  const receiptLabel = document.getElementById('receiptLabel');
  const maxHint      = document.getElementById('tradeMaxHint');
  const confirmBtn   = document.getElementById('tradeConfirmBtn');
  const orderTabs    = document.getElementById('tradeOrderTabs');

  // Recompute the amount from the shares field (does not touch the shares field itself)
  function updateAmountFromQty() {
    const qty = parseFloat(qtyInput?.value) || 0;
    if (amountInput) amountInput.value = (qty * price * currencyRate).toFixed(2);
  }

  // Recompute the shares field from the amount field (does not touch the amount field itself).
  // The amount field is in the selected currency, so convert it back to USD before dividing by price.
  function updateQtyFromAmount() {
    const amount = (parseFloat(amountInput?.value) || 0) / currencyRate;
    let qty = price > 0 ? amount / price : 0;
    // Selling the exact value of a position can overshoot by a tiny float
    // fraction — clamp to what's actually owned so it reads as a full sell.
    if (currentAction === 'sell' && holding) qty = Math.min(qty, sharesOwned);
    if (qtyInput) qtyInput.value = formatShareQty(qty);
  }

  function switchTab(action) {
    currentAction = action;
    orderTabs?.querySelectorAll('.trade-order-tab').forEach(t => t.classList.remove('active'));
    orderTabs?.querySelector(`[data-tab="${action}"]`)?.classList.add('active');

    if (confirmBtn) {
      confirmBtn.textContent = action === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`;
      confirmBtn.classList.toggle('sell-btn', action === 'sell');
      confirmBtn.classList.toggle('primary',  action === 'buy');
    }
    if (receiptLabel) receiptLabel.textContent = action === 'buy' ? 'You pay' : 'You receive';
    amountInput?.setAttribute('aria-label', `Amount to ${action === 'buy' ? 'spend' : 'receive'}`);
    if (maxHint) {
      maxHint.innerHTML = action === 'sell' && holding
        ? `Own ${formatShareQty(sharesOwned)}`
        : 'Shares';
    }
    updateAmountFromQty();
  }

  orderTabs?.querySelectorAll('.trade-order-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  qtyInput?.addEventListener('input', updateAmountFromQty);
  amountInput?.addEventListener('input', updateQtyFromAmount);

  document.getElementById('tradeQtyMinus')?.addEventListener('click', () => {
    const v = parseFloat(qtyInput.value) || 0;
    qtyInput.value = formatShareQty(Math.max(0, v - 1));
    updateAmountFromQty();
  });

  document.getElementById('tradeQtyPlus')?.addEventListener('click', () => {
    const v = parseFloat(qtyInput.value) || 0;
    qtyInput.value = formatShareQty(v + 1);
    updateAmountFromQty();
  });

  confirmBtn?.addEventListener('click', async () => {
    // Round once here so the receipt always matches exactly what gets saved
    const qty = parseFloat(formatShareQty(parseFloat(qtyInput?.value) || 0));
    if (qty <= 0) { showToast('Enter a number of shares or an amount greater than zero.'); return; }

    if (currentAction === 'sell' && (!holding || sharesOwned < qty)) {
      showToast(`You only own ${formatShareQty(sharesOwned)} share${sharesOwned !== 1 ? 's' : ''}.`);
      return;
    }

    confirmBtn.disabled = true;
    try {
      if (currentAction === 'sell') {
        await sellShares(symbol, qty);
        showTradeSuccess(container, symbol, companyName, qty, qty * price, false);
      } else {
        await buyShares(symbol, companyName, qty, price);
        showTradeSuccess(container, symbol, companyName, qty, qty * price, true);
      }
    } catch (error) {
      showToast(error.message);
      confirmBtn.disabled = false;
    }
  });
}

