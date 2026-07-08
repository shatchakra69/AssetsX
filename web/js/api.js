import { API_CONFIG, WATCHLIST_SYMBOLS, SYMBOL_NAMES, SYMBOL_COUNTRIES, FALLBACK_MARKET_ROWS, FALLBACK_QUOTE } from './config.js';
import { readCache, writeCache } from './cache.js';
import { appState } from './state.js';
import { showToast } from './utils.js';


// ── Market data ──────────────────────────────────────────────────────────────

// Get the current price of one stock from the Finnhub API
function fetchQuote(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_CONFIG.FINNHUB_KEY}`;

  return fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("API Limit");
      return response.json();
    })
    .then((data) => ({ symbol, ...data }))
    .catch(() => ({ symbol, ...FALLBACK_QUOTE }));
}

// Turn a raw API quote into a table row: [symbol, name, price, change%, volume, country]
function buildMarketRow(quote) {
  const price = typeof quote.c === 'number' ? quote.c : FALLBACK_QUOTE.c;
  const change = typeof quote.d === 'number' ? quote.d : 0;
  const changePercent = typeof quote.dp === 'number' ? quote.dp : 0;

  return [
    quote.symbol,
    SYMBOL_NAMES[quote.symbol] || "Company",
    `$${price.toFixed(2)}`,
    `${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
    "N/A",
    SYMBOL_COUNTRIES[quote.symbol] || "Global",
  ];
}

// Load live prices for all stocks and save them. Results are cached for 5 minutes.
export async function fetchMarketData() {
  try {
    const cachedRows = readCache('assetsx_market_data');
    if (cachedRows) {
      appState.marketRows = cachedRows;
      return;
    }

    const quotes = await Promise.all(WATCHLIST_SYMBOLS.map(fetchQuote));
    appState.marketRows = quotes.map(buildMarketRow);
    writeCache('assetsx_market_data', appState.marketRows);
  } catch (error) {
    console.warn("Market data fetch failed:", error);
    appState.marketRows = FALLBACK_MARKET_ROWS;
    showToast("Using static data (Market API limited).");
  }
}


// ── General news ─────────────────────────────────────────────────────────────

// Turn a raw Finnhub article into the format used by news cards:
// [category, headline, summary, image, timestamp, url]
// If Finnhub didn't give us an image, leave it blank — renderNewsCard()
// just skips the image instead of showing a broken placeholder.
function buildGeneralNewsRow(article) {
  return [
    article.category.toUpperCase(),
    article.headline.replace(/&amp;/g, '&'),
    article.summary,
    article.image || '',
    article.datetime,
    article.url,
  ];
}

// Download the latest market news and save it. We only keep 12 articles.
export async function fetchGeneralNews() {
  try {
    const cachedNews = readCache('assetsx_market_news');
    if (cachedNews) {
      appState.newsItems = cachedNews;
      return;
    }

    const url = `https://finnhub.io/api/v1/news?category=general&token=${API_CONFIG.FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (Array.isArray(data)) {
      appState.newsItems = data.slice(0, 12).map(buildGeneralNewsRow);
      writeCache('assetsx_market_news', appState.newsItems);
    }
  } catch (error) {
    console.warn("News fetch failed:", error);
  }
}


// ── Stock detail page ─────────────────────────────────────────────────────────

// Turn a company news article into the format used by news cards.
// If Finnhub gives us a broken link, we fall back to a Google search for the headline.
function buildStockNewsRow(article) {
  const articleUrl = article.url && !article.url.includes('finnhub.io')
    ? article.url
    : `https://www.google.com/search?q=${encodeURIComponent(`${article.source} ${article.headline}`)}`;

  return [
    article.source,
    article.headline,
    article.summary,
    article.image || '',
    article.datetime,
    articleUrl,
  ];
}

// Download the company profile, current price, key stats, and recent news for a stock.
// Everything is cached so clicking the same stock twice doesn't make duplicate API calls.
export async function fetchStockDetails(symbol) {
  try {
    const cacheKey = `assetsx_stock_details_${symbol}`;
    const cachedDetails = readCache(cacheKey);
    if (cachedDetails && cachedDetails.profile && cachedDetails.quote) {
      return cachedDetails;
    }

    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Make all 4 API calls at the same time to save loading time
    const [profile, quote, metrics, news] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_CONFIG.FINNHUB_KEY}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_CONFIG.FINNHUB_KEY}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metricType=all&token=${API_CONFIG.FINNHUB_KEY}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${monthAgo}&to=${today}&token=${API_CONFIG.FINNHUB_KEY}`).then(r => r.json()),
    ]);

    // If the API returned empty data (usually because we hit the rate limit), stop here
    if (!profile || !profile.name || !quote || !quote.c) {
      showToast(`Could not load details for ${symbol}. API limit?`);
      return null;
    }

    const details = {
      profile,
      quote,
      metrics: metrics.metric,
      news: news.slice(0, 6).map(buildStockNewsRow),
    };

    writeCache(cacheKey, details);
    return details;
  } catch (error) {
    console.warn(`Could not load stock details for ${symbol}:`, error);
    return null;
  }
}


// ── Price history charts ──────────────────────────────────────────────────────

// Use the stock symbol letters to generate a stable starting price for the demo chart.
// This way the chart looks the same every time the page is refreshed.
function seedPriceFromSymbol(symbol) {
  let total = 0;
  for (const char of symbol) total += char.charCodeAt(0);
  return 50 + (total % 300);
}

// Deterministic PRNG (mulberry32) so a given symbol always produces the same
// believable-looking demo chart instead of jumping around on every reload,
// while still looking different from one company to the next.
function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0; state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let hash = 0;
  for (const char of str) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return hash >>> 0;
}

// Standard timeframe presets used by every range-tab UI in the app.
// Centralized here so the stock detail page and the Buy/Sell page can't drift apart.
export const RANGE_PRESETS = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'];

const SECONDS_PER_DAY = 86400;

// Turn a range key (e.g. "6M") into the from/resolution pair fetchStockCandles needs.
export function getRangeWindow(rangeKey, now = Math.floor(Date.now() / 1000)) {
  switch (rangeKey) {
    case '1D':  return { from: now - 1    * SECONDS_PER_DAY, resolution: 'D' };
    case '1W':  return { from: now - 7    * SECONDS_PER_DAY, resolution: 'D' };
    case '3M':  return { from: now - 90   * SECONDS_PER_DAY, resolution: 'D' };
    case '6M':  return { from: now - 182  * SECONDS_PER_DAY, resolution: 'W' };
    case '1Y':  return { from: now - 365  * SECONDS_PER_DAY, resolution: 'W' };
    case '5Y':  return { from: now - 1825 * SECONDS_PER_DAY, resolution: 'M' };
    case 'ALL': return { from: now - 3650 * SECONDS_PER_DAY, resolution: 'M' };
    default:    return { from: now - 30   * SECONDS_PER_DAY, resolution: 'D' }; // 1M
  }
}

// Decide how many candles to generate and how volatile they should be,
// scaled to how much time the chart is covering — short ranges get tight
// intraday-style ticks, long ranges get a smoother, longer-run shape.
function pickSeriesShape(from, to) {
  const spanDays = Math.max((to - from) / SECONDS_PER_DAY, 1);

  if (spanDays <= 1.5)   return { points: 48,  volatility: 0.0022 };
  if (spanDays <= 9)     return { points: 56,  volatility: 0.006 };
  if (spanDays <= 35)    return { points: 30,  volatility: 0.012 };
  if (spanDays <= 100)   return { points: 60,  volatility: 0.016 };
  if (spanDays <= 200)   return { points: 78,  volatility: 0.02 };
  if (spanDays <= 420)   return { points: 90,  volatility: 0.024 };
  if (spanDays <= 2000)  return { points: 110, volatility: 0.03 };
  return                        { points: 130, volatility: 0.036 };
}

// Generate believable price history for the demo chart (the real history
// endpoint needs a paid Finnhub plan, so we simulate it). Walks BACKWARD from
// today's real price so the chart always lines up with the price shown
// elsewhere on the page, blending a slow-moving trend with momentum and the
// occasional larger move so it reads as organic movement instead of static.
function generateFallbackCandles(symbol, referencePrice, from, to) {
  const endPrice = referencePrice || seedPriceFromSymbol(symbol);
  const { points, volatility } = pickSeriesShape(from, to);
  const stepSeconds = (to - from) / Math.max(points - 1, 1);

  // Re-seed every few days so long-lived demo data doesn't look frozen
  // forever, while staying stable for the length of a normal session.
  const seedBucket = Math.floor(to / (SECONDS_PER_DAY * 3));
  const random = createSeededRandom(hashString(`${symbol}-${seedBucket}`));

  const prices = new Array(points);
  let drift = (random() - 0.5) * volatility;   // slow-moving trend bias
  let momentum = 0;                             // short-term carry-over

  let price = endPrice;
  prices[points - 1] = Number(endPrice.toFixed(2));

  for (let i = points - 2; i >= 0; i--) {
    // Let the bias wander slowly so the chart has multiple up/down legs
    // instead of one straight diagonal line.
    drift += (random() - 0.5) * volatility * 0.3;
    drift = Math.max(-volatility * 1.5, Math.min(volatility * 1.5, drift));

    momentum = momentum * 0.7 + (random() - 0.5) * volatility;

    // Occasional larger move so the chart has believable peaks and pullbacks
    const shock = random() < 0.08 ? (random() - 0.5) * volatility * 3 : 0;

    const change = drift + momentum + shock;
    price = price / (1 + change);
    price = Math.max(price, endPrice * 0.15); // never let the walk go degenerate

    prices[i] = Number(price.toFixed(2));
  }

  const labels = new Array(points);
  for (let i = 0; i < points; i++) {
    const timestamp = to - (points - 1 - i) * stepSeconds;
    labels[i] = new Date(timestamp * 1000).toISOString();
  }

  return { labels, prices };
}

// Get the price history data for the stock chart.
// Each time range is cached separately so switching tabs is instant.
export async function fetchStockCandles(symbol, resolution, from, to, referencePrice) {
  const cacheKey = `assetsx_stock_candles_${symbol}_${resolution}_${from}`;
  const cachedCandles = readCache(cacheKey);
  if (cachedCandles && cachedCandles.labels && cachedCandles.prices) {
    return cachedCandles;
  }

  // Use generated data since the history endpoint needs a paid Finnhub plan
  const fallbackChart = generateFallbackCandles(symbol, referencePrice, from, to);
  writeCache(cacheKey, fallbackChart);
  return fallbackChart;
}


// ── User location ─────────────────────────────────────────────────────────────

// Update the city and date shown in the page header
function updateHeaderSubtitle() {
  const subtitle = document.getElementById('header-subtitle');
  if (subtitle) {
    subtitle.textContent = `${appState.userLocation} • Market open • ${new Date().toLocaleDateString()}`;
  }
}

// Ask the browser for the device's real location (GPS/WiFi) — much more
// accurate than guessing from the IP address, but the user has to allow it.
function getBrowserCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      reject,
      { timeout: 5000 }
    );
  });
}

// Turn GPS coordinates into a city name using OpenStreetMap's free Nominatim API
async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  const response = await fetch(url);
  const data = await response.json();
  const address = data.address || {};
  const city = address.city || address.town || address.village || address.municipality;
  if (!city) throw new Error('No city in reverse geocode result');
  return `${city}, ${(address.country_code || '').toUpperCase()}`;
}

// Guess the city from the visitor's IP address — less accurate than GPS, but
// doesn't need permission, so this is the fallback if GPS is denied or unavailable.
async function getLocationFromIP() {
  const response = await fetch('https://ipapi.co/json/');
  const data = await response.json();
  if (!data.city) throw new Error('No city in IP lookup result');
  return `${data.city}, ${data.country_code}`;
}

// Detect the user's real location and show it in the header: try the
// browser's GPS first (accurate, needs permission), fall back to guessing
// from the IP address if that's denied. Cached so this only runs once per
// browser session, not on every page.
export async function initGeolocation() {
  try {
    const cachedLocation = sessionStorage.getItem('assetsx_user_location');
    if (cachedLocation) {
      appState.userLocation = cachedLocation;
      updateHeaderSubtitle();
      return;
    }

    try {
      const { latitude, longitude } = await getBrowserCoords();
      appState.userLocation = await reverseGeocode(latitude, longitude);
    } catch {
      appState.userLocation = await getLocationFromIP();
    }

    sessionStorage.setItem('assetsx_user_location', appState.userLocation);
    updateHeaderSubtitle();
  } catch (error) {
    console.warn("Could not detect location:", error);
    updateHeaderSubtitle();
  }
}
