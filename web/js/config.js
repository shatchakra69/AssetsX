// Central config file — API keys, app settings, and fallback data live here.

export const API_CONFIG = {
  FINNHUB_KEY: 'YOUR_FINNHUB_API_KEY',
  CACHE_DURATION: 1000 * 60 * 5, // 5 minutes
};

// Cache keys for the signed-in user's own data (see cache.js) — every page
// is a full reload, so without this every page would re-fetch what the
// last page just loaded.
export const PROFILE_CACHE_KEY = 'assetsx_profile_cache';
export const PORTFOLIO_CACHE_KEY = 'assetsx_portfolio_cache';

// Firebase project used as a REST-only database + auth backend (see README —
// no Firebase SDK is loaded anywhere, this is called with plain fetch()
// exactly like the Finnhub/ipapi.co calls in api.js).
// Fill these in from Firebase console > Project settings > General > Your apps.
export const FIREBASE_CONFIG = {
  apiKey: 'YOUR_FIREBASE_WEB_API_KEY',
  projectId: 'assetsx-b5b19',
};

// Stocks tracked in the watchlist and market table.
// Mixed countries so the "search by country" feature has something to filter.
export const WATCHLIST_SYMBOLS = ["AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "SAP", "TM", "SHEL", "BABA"];

// Free-plan accounts are capped at 5 watchlist symbols (matches the limit
// already advertised on the Pro comparison table); Pro accounts are unlimited.
// New accounts start with an empty watchlist, not pre-filled with these.
export const FREE_WATCHLIST_LIMIT = 5;

export const SYMBOL_NAMES = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  TSLA: "Tesla Inc.",
  NVDA: "NVIDIA Corp.",
  AMZN: "Amazon.com",
  SAP:  "SAP SE",
  TM:   "Toyota Motor",
  SHEL: "Shell plc",
  BABA: "Alibaba Group",
};

// Maps each symbol to its home country so the market table can show and filter by country
export const SYMBOL_COUNTRIES = {
  AAPL: "United States",
  MSFT: "United States",
  TSLA: "United States",
  NVDA: "United States",
  AMZN: "United States",
  SAP:  "Germany",
  TM:   "Japan",
  SHEL: "United Kingdom",
  BABA: "China",
};

// Used when the Finnhub API is unavailable or rate-limited.
// Each row: [symbol, name, price, change%, volume, country]
export const FALLBACK_MARKET_ROWS = [
  ["AAPL", "Apple Inc.",      "$173.50",   "+1.25%", "58.2M", "United States"],
  ["MSFT", "Microsoft Corp.", "$420.21",   "+0.85%", "31.8M", "United States"],
  ["TSLA", "Tesla Inc.",      "$175.22",   "+4.50%", "92.1M", "United States"],
  ["NVDA", "NVIDIA Corp.",    "$1,037.99", "+2.18%", "45.7M", "United States"],
  ["AMZN", "Amazon.com",      "$182.12",   "-0.44%", "27.3M", "United States"],
  ["SAP",  "SAP SE",          "$225.40",   "+0.65%",  "1.2M", "Germany"],
  ["TM",   "Toyota Motor",    "$185.20",   "-0.32%",  "0.8M", "Japan"],
  ["SHEL", "Shell plc",       "$68.90",    "+0.42%",  "3.5M", "United Kingdom"],
  ["BABA", "Alibaba Group",   "$115.30",   "+1.85%",  "8.7M", "China"],
];

export const FALLBACK_QUOTE = { c: 150.0, d: 1.25, dp: 0.85 };

// Small illustrative trend line shown behind a user's portfolio value once
// they own at least one stock. Not real price history — there's no daily
// snapshot tracking — just a decorative curve, same idea as a loading skeleton.
export const DEMO_PORTFOLIO_CHART = {
  labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
  prices: [22300, 22450, 22380, 22600, 22750, 22680, 22900, 23100, 23050, 23200,
           23350, 23280, 23500, 23600, 23450, 23700, 23850, 23780, 24000, 23900,
           24100, 24050, 24200, 24300, 24180, 24350, 24280, 24400, 24250, 24140],
};
