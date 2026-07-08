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
  INVALID_EMAIL: 'Please enter a valid email address.',
  WEAK_PASSWORD: 'Password should be at least 6 characters.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please try again later.',
  USER_DISABLED: 'This account has been disabled.',
  OPERATION_NOT_ALLOWED: 'That sign-in method is not enabled for this Firebase project yet (Firebase console → Authentication → Sign-in method).',
  INVALID_IDP_RESPONSE: 'The sign-in provider returned an invalid response. Please try again.',
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

// ── Social sign-in (Google / Apple) ─────────────────────────────────────────
// Same REST-only approach as everything else in this file. createAuthUri
// returns the provider's own OAuth page, the provider redirects back to the
// page that started the flow, and signInWithIdp exchanges that redirect for
// Firebase tokens. No SDK and no provider client id in the code — Firebase
// manages the OAuth app for each provider enabled in the console.

const OAUTH_SESSION_KEY = 'assetsx_oauth_session';

// Kick off the provider's OAuth flow by leaving the page. The sessionId has
// to survive the round trip, so it waits in sessionStorage until the
// provider sends the user back and finishSocialSignIn() picks it up.
export async function startSocialSignIn(providerId) {
  const data = await identityRequest('createAuthUri', {
    providerId,
    // Firebase checks this against the project's authorized domains
    // (localhost and the production domain are both authorized).
    continueUri: `${location.origin}${location.pathname}`,
    oauthScope: 'email profile',
  });
  sessionStorage.setItem(OAUTH_SESSION_KEY, JSON.stringify({ sessionId: data.sessionId }));
  location.href = data.authUri;
}

// Complete a social sign-in after the provider redirects back. Returns null
// on a normal page load (no OAuth round trip in progress), otherwise stores
// the tokens and returns what the caller needs to set up a first-time profile.
export async function finishSocialSignIn() {
  const pending = sessionStorage.getItem(OAUTH_SESSION_KEY);
  if (!pending) return null;

  const params = new URLSearchParams(location.search);
  if (!params.has('code')) {
    // The user backed out of the provider's consent screen
    if (params.has('error')) {
      sessionStorage.removeItem(OAUTH_SESSION_KEY);
      throw new Error('Sign-in was cancelled.');
    }
    return null;
  }

  sessionStorage.removeItem(OAUTH_SESSION_KEY);
  const { sessionId } = JSON.parse(pending);
  const data = await identityRequest('signInWithIdp', {
    requestUri: location.href,
    sessionId,
    returnSecureToken: true,
  });
  storeAuth(data);

  return {
    uid: data.localId,
    email: data.email || '',
    fullname: data.displayName || '',
    isNewUser: !!data.isNewUser,
  };
}

// Email Firebase's password-reset link to the given address. Like the
// verification email, Google's own infrastructure sends it.
export function sendPasswordResetEmail(email) {
  return identityRequest('sendOobCode', { requestType: 'PASSWORD_RESET', email });
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
