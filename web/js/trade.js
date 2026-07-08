// Simulated trading — each signed-in account has its own real portfolio,
// stored in Firestore (one holding doc per symbol under /users/{uid}/holdings).
// No real money is involved, it's just a demo, but the data is per-account
// and survives logout exactly like a real brokerage would.

import { appState } from './state.js';
import { getHoldings, upsertHolding, deleteHolding } from './db.js';
import { readCache, writeCache } from './cache.js';
import { PORTFOLIO_CACHE_KEY } from './config.js';

// Read the portfolio from memory. Buy/sell update this directly so every
// page reads it instantly, no waiting needed.
export function getPortfolio() {
  return appState.portfolio;
}

// Save the portfolio in memory and in sessionStorage, so the next page
// doesn't have to fetch it from Firestore again.
function setPortfolio(portfolio) {
  appState.portfolio = portfolio;
  writeCache(PORTFOLIO_CACHE_KEY, portfolio);
  window.dispatchEvent(new Event('portfolio:updated'));
}

// Load the holdings — from sessionStorage if we already have them, otherwise Firestore.
export async function loadPortfolio() {
  if (!appState.uid) return;

  const cached = readCache(PORTFOLIO_CACHE_KEY);
  if (cached) {
    appState.portfolio = cached;
    return;
  }

  try {
    appState.portfolio = await getHoldings(appState.uid);
    writeCache(PORTFOLIO_CACHE_KEY, appState.portfolio);
  } catch (error) {
    console.warn('Could not load portfolio:', error);
  }
}

// Find a single holding by stock symbol (e.g. "AAPL")
export function getHolding(symbol) {
  return getPortfolio().find(h => h.symbol === symbol) || null;
}

// Get the current market price of a stock from data we already downloaded.
// Falls back to the original purchase price if live data is not available.
export function getLivePrice(symbol) {
  const row = appState.marketRows.find(([s]) => s === symbol);
  if (row) return parseFloat(row[2].replace(/[^0-9.-]/g, ''));
  const holding = getHolding(symbol);
  return holding ? holding.avgCost : 0;
}

// Add shares to the portfolio.
// If the user already owns this stock, recalculate the average purchase price.
export async function buyShares(symbol, name, sharesToBuy, pricePerShare) {
  if (!appState.uid) throw new Error('Please sign in to trade.');

  const portfolio = getPortfolio();
  const existingIndex = portfolio.findIndex(h => h.symbol === symbol);
  let updated;

  if (existingIndex >= 0) {
    // Already own this stock — blend the new purchase into the average cost
    const existing = portfolio[existingIndex];
    const totalShares = existing.shares + sharesToBuy;
    const totalCost = existing.shares * existing.avgCost + sharesToBuy * pricePerShare;
    updated = { ...existing, shares: totalShares, avgCost: totalCost / totalShares };
  } else {
    // New stock — add it as a fresh holding
    updated = { symbol, name, shares: sharesToBuy, avgCost: pricePerShare };
  }

  await upsertHolding(appState.uid, symbol, updated);

  const next = existingIndex >= 0
    ? portfolio.map((h, i) => (i === existingIndex ? updated : h))
    : [...portfolio, updated];
  setPortfolio(next);
}

// Remove shares from the portfolio after a sale.
// If all shares are sold, the holding is removed from Firestore entirely.
export async function sellShares(symbol, sharesToSell) {
  if (!appState.uid) throw new Error('Please sign in to trade.');

  const portfolio = getPortfolio();
  const index = portfolio.findIndex(h => h.symbol === symbol);
  if (index < 0) return false;

  if (sharesToSell >= portfolio[index].shares) {
    await deleteHolding(appState.uid, symbol);
    setPortfolio(portfolio.filter((_, i) => i !== index));
  } else {
    const updated = { ...portfolio[index], shares: portfolio[index].shares - sharesToSell };
    await upsertHolding(appState.uid, symbol, updated);
    setPortfolio(portfolio.map((h, i) => (i === index ? updated : h)));
  }

  return true;
}

// Calculate the total portfolio value, amount invested, and overall gain
export function calcPortfolioTotals() {
  const portfolio = getPortfolio();
  let totalValue = 0;
  let totalInvested = 0;

  portfolio.forEach(({ symbol, shares, avgCost }) => {
    totalValue += shares * getLivePrice(symbol);
    totalInvested += shares * avgCost;
  });

  const gain = totalValue - totalInvested;
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
  return { totalValue, totalInvested, gain, gainPct };
}

// Calculate today's dollar change across the whole portfolio using each
// holding's live percent change (the same %change already shown on the
// markets table). Holdings whose symbol isn't in marketRows are skipped —
// we have no live %change to work with for those.
//
// Finnhub gives us price + %change, not yesterday's close, but we can get
// the exact $ change algebraically: if dp = (price - prevClose) / prevClose * 100,
// then change = price * dp / (100 + dp).
export function calcPortfolioDailyChange() {
  const portfolio = getPortfolio();
  let dailyChange = 0;

  portfolio.forEach(({ symbol, shares }) => {
    const row = appState.marketRows.find(([s]) => s === symbol);
    if (!row) return;

    const pct = parseFloat(row[3]);
    if (isNaN(pct) || pct === -100) return;

    const price = getLivePrice(symbol);
    dailyChange += shares * price * pct / (100 + pct);
  });

  return dailyChange;
}

// Trim a fractional share quantity to a clean, human-friendly string
// (up to 4 decimal places, no trailing zeros) — e.g. 0.33330000 -> "0.3333", 12.0 -> "12"
export function formatShareQty(shares) {
  return parseFloat((shares || 0).toFixed(4)).toString();
}
