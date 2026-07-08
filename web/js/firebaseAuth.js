// Firebase Identity Toolkit REST API wrapper — plain fetch() calls only.
// No Firebase SDK is imported anywhere in this app; this hand-builds the same
// request/response handling api.js already does for Finnhub and ipapi.co.

import { FIREBASE_CONFIG } from './config.js';

const AUTH_KEY = 'assetsx_auth';
const IDENTITY_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts';
const TOKEN_URL = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`;

// Where the emailed verification link sends the user back to. Hardcoded to
// the production URL rather than location.origin — Firebase requires every
// continueUrl domain to be pre-authorized in the console, and this app gets
// tested from all sorts of local dev hosts/ports (127.0.0.1, localhost, etc).
const CONTINUE_URL = 'https://assetsx-web.vercel.app/signin.html?verified=1';

// Map Firebase's error codes to messages a user can actually understand
const ERROR_MESSAGES = {
  EMAIL_EXISTS: 'An account with that email already exists.',
  EMAIL_NOT_FOUND: 'No account found with that email.',
  INVALID_PASSWORD: 'Incorrect password.',
  INVALID_LOGIN_CREDENTIALS: 'Incorrect email or password.',
  WEAK_PASSWORD: 'Password should be at least 6 characters.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please try again later.',
};

function friendlyError(errorBody) {
  // Firebase sometimes appends extra detail after a colon, e.g. "WEAK_PASSWORD : ..."
  const code = (errorBody?.error?.message || '').split(':')[0].trim();
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];

  // Unmapped code — log the full response and surface the code itself instead
  // of a vague message, so an unexpected error is debuggable from the UI alone.
  console.error('Firebase error:', errorBody);
  return code ? `Something went wrong (${code}). Please try again.` : 'Something went wrong. Please try again.';
}

async function identityRequest(method, payload) {
  const response = await fetch(`${IDENTITY_BASE}:${method}?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(friendlyError(data));
  return data;
}

// Save the tokens from signUp/signInWithPassword/refresh so the rest of the
// app can read them without the user signing in again on every page.
function storeAuth({ idToken, refreshToken, localId }) {
  const auth = {
    idToken,
    refreshToken,
    uid: localId,
    // idTokens expire after 1 hour — refresh a little early to be safe
    expiresAt: Date.now() + 55 * 60 * 1000,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  return auth;
}

export function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

// Create a new account. Returns the stored {idToken, refreshToken, uid}.
export async function signUp(email, password) {
  const data = await identityRequest('signUp', { email, password, returnSecureToken: true });
  return storeAuth(data);
}

// Sign in to an existing account.
export async function signIn(email, password) {
  const data = await identityRequest('signInWithPassword', { email, password, returnSecureToken: true });
  return storeAuth(data);
}

// Email Firebase's verification link to the signed-in user. Google's own
// infrastructure sends the email — no SMTP server or email API key needed.
export function sendVerificationEmail(idToken) {
  return identityRequest('sendOobCode', {
    requestType: 'VERIFY_EMAIL',
    idToken,
    continueUrl: CONTINUE_URL,
  });
}

// Look up the signed-in user's latest account info — used to check emailVerified.
export async function lookupUser(idToken) {
  const data = await identityRequest('lookup', { idToken });
  return data.users?.[0] || null;
}

// Swap a refresh token for a brand new idToken once the old one expires.
async function refreshIdToken(refreshToken) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(friendlyError(data));

  // The refresh endpoint uses snake_case field names, unlike the rest of Identity Toolkit
  return storeAuth({ idToken: data.id_token, refreshToken: data.refresh_token, localId: data.user_id });
}

// Get a valid idToken for the current session, refreshing it first if expired.
// Every call into db.js goes through this instead of reading localStorage directly.
export async function getValidIdToken() {
  const auth = getStoredAuth();
  if (!auth) return null;
  if (Date.now() < auth.expiresAt) return auth.idToken;

  try {
    const refreshed = await refreshIdToken(auth.refreshToken);
    return refreshed.idToken;
  } catch {
    clearAuth();
    return null;
  }
}
