// This file runs on every page. It checks which page is open and sets it up.

import { initGeolocation, fetchMarketData, fetchGeneralNews } from './api.js';
import { bindInteractions } from './events.js';
import { FALLBACK_MARKET_ROWS, PROFILE_CACHE_KEY } from './config.js';
import { appState } from './state.js';
import { showToast } from './utils.js';
import { readCache, writeCache } from './cache.js';
import { getCurrency, setCurrency, CURRENCY_CODES } from './currency.js';
import { getTheme, setTheme } from './theme.js';
import { signUp, signIn, sendVerificationEmail, lookupUser, getStoredAuth, getValidIdToken } from './firebaseAuth.js';
import { getUserDoc, createUserDoc } from './db.js';
import { loadPortfolio } from './trade.js';
import {
  renderHomePage,
  renderPortfolioMetrics,
  renderMarketsPage,
  renderStockPage,
  renderPortfolioPage,
  renderNewsPage,
  renderAuthPage,
  renderTradePage,
  renderProPlanStatus,
} from './pages.js';

const page = document.body.dataset.page;

const SECONDS_PER_DAY = 24 * 60 * 60;

// Pages that require the user to be logged in
const PROTECTED_PAGES = ['home', 'markets', 'portfolio', 'news', 'stock', 'pro', 'trade'];

// Check if the user is logged in when the page loads.
// "Logged in" means a Firebase idToken/refreshToken pair is stored — see firebaseAuth.js.
// If they are not logged in and try to open a protected page, send them to the sign-in page.
// If they are already logged in and open the sign-in page, send them to the dashboard.
function checkAuthState() {
  const loggedIn = !!getStoredAuth();

  if (PROTECTED_PAGES.includes(page) && !loggedIn) {
    location.href = 'signin.html';
  }
  if ((page === 'signin' || page === 'signup') && loggedIn) {
    location.href = 'home.html';
  }
}

// Show an inline error message below the form heading
function showFormError(message) {
  const errorBox = document.getElementById('form-error');
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  } else {
    // Fall back to toast if the error div is missing
    showToast(message);
  }
}

// Clear the inline error message
function clearFormError() {
  const errorBox = document.getElementById('form-error');
  if (errorBox) {
    errorBox.textContent = '';
    errorBox.style.display = 'none';
  }
}

// Show an inline success/info message below the form heading
// (e.g. "check your email" after sign-up, or "email verified" after clicking the link)
function showFormNotice(message) {
  const noticeBox = document.getElementById('form-notice');
  if (noticeBox) {
    noticeBox.textContent = message;
    noticeBox.style.display = 'block';
  } else {
    showToast(message);
  }
}

// "Forgot password?" is a demo button — there is no real backend to send an email from
function bindForgotPassword() {
  const forgotButton = document.querySelector('[data-action="forgot"]');
  if (!forgotButton) return;

  forgotButton.addEventListener('click', () => {
    showToast('Password reset is not available in this demo.');
  });
}

// Handle the sign-in and sign-up forms.
// Real accounts: signUp()/signIn() call Firebase's Identity Toolkit REST API
// (see firebaseAuth.js) — no SDK, just fetch(), same as the Finnhub calls in
// api.js. The PHP action on the form (login.php / register.php) calls the
// same REST endpoints server-side and runs instead when JavaScript is off.
function bindAuthFormSubmit() {
  if (page !== 'signin' && page !== 'signup') return;

  // If PHP redirected back with an error in the URL, show it right away
  const urlParams = new URLSearchParams(location.search);
  const phpError = urlParams.get('error');
  if (phpError) showFormError(phpError);
  if (urlParams.get('verified') === '1') showFormNotice('Email verified — you can sign in now.');

  const form = document.querySelector(page === 'signin' ? '#loginForm' : '#signupForm');
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    // Stop the browser from submitting to PHP so we can log the user in here instead
    event.preventDefault();
    clearFormError();

    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;

    // Check that fields are filled in and look like a real email before logging in
    if (!email || !password) {
      showFormError('Please fill in all fields.');
      return;
    }

    if (!email.includes('@')) {
      showFormError('Please enter a valid email address.');
      return;
    }

    let fullname = '';
    if (page === 'signup') {
      fullname = form.querySelector('#fullname')?.value.trim() || '';
      const confirmPwd = form.querySelector('#confirm_password')?.value || '';

      if (!fullname) {
        showFormError('Please enter your full name.');
        return;
      }

      if (password.length < 6) {
        showFormError('Password should be at least 6 characters.');
        return;
      }

      // Make sure both password fields match before creating the account
      if (password !== confirmPwd) {
        showFormError('Passwords do not match.');
        return;
      }
    }

    // Disable the button while the network calls run so a slow connection
    // can't be double-submitted
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      if (page === 'signup') {
        // New accounts start with an empty watchlist and $0 portfolio — just
        // like signing up for a real brokerage account
        const { idToken, uid } = await signUp(email, password);
        await createUserDoc(uid, { fullname, email, watchlist: [] });
        await sendVerificationEmail(idToken);
      } else {
        await signIn(email, password);
      }
      location.href = "home.html";
    } catch (error) {
      showFormError(error.message);
      if (submitButton) submitButton.disabled = false;
    }
  });
}

// Load the user's profile (name, watchlist, plan, verified status) — from
// sessionStorage if we already have it, otherwise Firestore/Identity Toolkit.
// Safe to call on every page — it's a no-op when nobody is signed in.
async function loadUserProfile() {
  const auth = getStoredAuth();
  if (!auth) return;

  appState.uid = auth.uid;

  const cached = readCache(PROFILE_CACHE_KEY);
  if (cached) {
    appState.userName = cached.userName;
    appState.userWatchlist = cached.userWatchlist;
    appState.userPlan = cached.userPlan;
    appState.emailVerified = cached.emailVerified;
    return;
  }

  const idToken = await getValidIdToken();
  if (!idToken) return;

  try {
    const [doc, account] = await Promise.all([getUserDoc(auth.uid), lookupUser(idToken)]);
    if (doc) {
      appState.userName = doc.fullname || '';
      appState.userWatchlist = doc.watchlist || [];
      appState.userPlan = doc.plan || 'free';
    }
    appState.emailVerified = !!account?.emailVerified;
    writeCache(PROFILE_CACHE_KEY, {
      userName: appState.userName,
      userWatchlist: appState.userWatchlist,
      userPlan: appState.userPlan,
      emailVerified: appState.emailVerified,
    });
  } catch (error) {
    console.warn('Could not load user profile:', error);
  }
}

// Show a persistent banner on protected pages until the user verifies their
// email. Resending calls the same Identity Toolkit endpoint used at sign-up.
function injectVerifyBanner() {
  document.getElementById('verify-banner')?.remove();
  if (!PROTECTED_PAGES.includes(page) || !appState.uid || appState.emailVerified) return;

  const banner = document.createElement('div');
  banner.id = 'verify-banner';
  banner.className = 'verify-banner';
  banner.innerHTML = `
    <span>Please verify your email — we sent a link to your inbox.</span>
    <button type="button" class="text-link">Resend email</button>
  `;

  banner.querySelector('button').addEventListener('click', async () => {
    try {
      const idToken = await getValidIdToken();
      await sendVerificationEmail(idToken);
      showToast('Verification email sent.');
    } catch (error) {
      showToast(error.message);
    }
  });

  const main = document.querySelector('.main') || document.querySelector('.content');
  main?.prepend(banner);
}

// Run the correct setup function depending on which page is open
function renderCurrentPage(now, monthAgo) {
  switch (page) {
    case 'home':
      renderHomePage(now, monthAgo);
      break;
    case 'markets':
      renderMarketsPage();
      break;
    case 'stock':
      renderStockPage(now, monthAgo);
      break;
    case 'portfolio':
      renderPortfolioPage();
      break;
    case 'news':
      renderNewsPage();
      break;
    case 'signin':
    case 'signup':
      renderAuthPage();
      break;
    case 'trade':
      renderTradePage();
      break;
    case 'pro':
      renderProPlanStatus();
      break;
  }
}

// Show a time-appropriate greeting using the signed-in user's name
function updateGreeting() {
  const el = document.getElementById('greeting-text');
  if (!el) return;

  const hour = new Date().getHours();
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const name = appState.userName || '';
  el.textContent = `Good ${time}${name ? `, ${name}` : ''}`;
}

// Add a currency dropdown to the top bar so the user can switch between USD, EUR, GBP, and JPY
function injectCurrencySelector() {
  const actions = document.querySelector('.top-actions');
  if (!actions) return;

  const current = getCurrency().code;
  const select = document.createElement('select');
  select.className = 'currency-select';
  select.innerHTML = CURRENCY_CODES.map(code =>
    `<option value="${code}" ${code === current ? 'selected' : ''}>${code}</option>`
  ).join('');

  select.addEventListener('change', () => {
    setCurrency(select.value);
    location.reload();
  });

  actions.prepend(select);
}

// Add a button that switches between light and dark mode.
// Most pages have a top bar to put it in; the auth pages don't, so it
// goes next to the logo there instead.
function injectThemeToggle() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'theme-toggle';
  button.setAttribute('aria-label', 'Switch between light and dark mode');
  button.textContent = getTheme() === 'light' ? '☾' : '☀';

  button.addEventListener('click', () => {
    const next = getTheme() === 'light' ? 'dark' : 'light';
    setTheme(next);
    button.textContent = next === 'light' ? '☾' : '☀';
    // Charts read their colors once when drawn, so reload to redraw them correctly
    location.reload();
  });

  const actions = document.querySelector('.top-actions');
  if (actions) {
    actions.prepend(button);
    return;
  }

  const brand = document.querySelector('.brand');
  if (brand) brand.appendChild(button);
}

// Give each API call a time limit so the page doesn't get stuck waiting forever
function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise(resolve => setTimeout(resolve, ms))]);
}

// Keep portfolio-derived UI in sync without needing a page refresh —
// trade.js dispatches this after every buy/sell.
function bindPortfolioSync() {
  window.addEventListener('portfolio:updated', () => {
    if (page === 'home') renderPortfolioMetrics();
    if (page === 'portfolio') renderPortfolioPage();
  });
}

// Start the app — this runs as soon as the page loads
async function initApp() {
  checkAuthState();
  bindAuthFormSubmit();
  bindForgotPassword();
  injectCurrencySelector();
  injectThemeToggle();

  const now = Math.floor(Date.now() / 1000);
  const monthAgo = now - 30 * SECONDS_PER_DAY;

  // Show placeholder data right away so the page isn't blank while data loads
  appState.marketRows = FALLBACK_MARKET_ROWS;

  // The uid is already known locally (no network needed)
  const auth = getStoredAuth();
  if (auth) appState.uid = auth.uid;

  // trade.html only renders once (see renderTradePage's dataset.loaded
  // guard), so it needs real data before that render. Every other page
  // renders instantly with placeholder data and updates once it arrives.
  if (page === 'trade') {
    await withTimeout(Promise.all([loadUserProfile(), loadPortfolio()]), 5000);
  }

  updateGreeting();
  renderCurrentPage(now, monthAgo);
  bindInteractions();
  bindPortfolioSync();

  // Firestore is usually quick — update the page as soon as it's ready,
  // without waiting on the slower market data/news calls below.
  if (page !== 'trade') {
    withTimeout(Promise.all([loadUserProfile(), loadPortfolio()]), 8000).then(() => {
      renderCurrentPage(now, monthAgo);
      bindInteractions();
      updateGreeting();
      injectVerifyBanner();
    });
  }

  // Market data, news, and location come from separate external APIs and
  // can take longer — update the page again once those are ready too.
  Promise.all([
    withTimeout(initGeolocation(), 8000),
    withTimeout(fetchMarketData(), 8000),
    withTimeout(fetchGeneralNews(), 8000),
  ]).then(() => {
    renderCurrentPage(now, monthAgo);
    bindInteractions();
  });
}

initApp();
