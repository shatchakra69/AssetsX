// Firestore REST API wrapper — plain fetch() calls only, no Firebase SDK.
// Firestore's REST API represents every value as a typed object (e.g. a
// string is {stringValue: "..."}), so these helpers convert plain JS
// values to and from that shape.

import { FIREBASE_CONFIG } from './config.js';
import { getValidIdToken } from './firebaseAuth.js';

const PROJECT_PATH = `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
const BASE_URL = `https://firestore.googleapis.com/v1/${PROJECT_PATH}`;

// ── Typed value encode/decode ───────────────────────────────────────────────

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  return { mapValue: { fields: toFirestoreFields(value) } };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) fields[key] = toFirestoreValue(value);
  return fields;
}

function fromFirestoreValue(value) {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields) {
  const obj = {};
  for (const [key, value] of Object.entries(fields || {})) obj[key] = fromFirestoreValue(value);
  return obj;
}

// ── Low-level request helper ────────────────────────────────────────────────

async function firestoreRequest(path, { method = 'GET', query = '', body } = {}) {
  const idToken = await getValidIdToken();
  if (!idToken) throw new Error('Not signed in.');

  const response = await fetch(`${BASE_URL}${path}${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // A 404 on GET just means the document doesn't exist yet — not a real error
  if (response.status === 404) return null;

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || `Firestore request failed (${response.status})`);
  }

  return response.json();
}

// ── User profile ─────────────────────────────────────────────────────────────

// Read the signed-in user's profile doc. Returns null if it doesn't exist yet.
export async function getUserDoc(uid) {
  const doc = await firestoreRequest(`/users/${uid}`);
  return doc ? fromFirestoreFields(doc.fields) : null;
}

// Create the user's profile doc right after sign-up, seeded with a starter
// watchlist and the free plan.
export function createUserDoc(uid, { fullname, email, watchlist }) {
  return firestoreRequest(`/users/${uid}`, {
    method: 'PATCH',
    body: { fields: toFirestoreFields({ fullname, email, plan: 'free', watchlist, createdAt: new Date() }) },
  });
}

// Flip the user's plan between "free" and "pro" — used by the Pro checkout.
export function updateUserPlan(uid, plan) {
  return firestoreRequest(`/users/${uid}`, {
    method: 'PATCH',
    query: '?updateMask.fieldPaths=plan',
    body: { fields: toFirestoreFields({ plan }) },
  });
}

// ── Watchlist ────────────────────────────────────────────────────────────────

// Add or remove one symbol using an atomic array transform, so two tabs or
// devices editing the watchlist at the same time can't race and silently
// drop each other's change (a plain read-modify-write PATCH could).
function watchlistTransform(uid, symbol, transformName) {
  return firestoreRequest(':commit', {
    method: 'POST',
    body: {
      writes: [{
        transform: {
          document: `${PROJECT_PATH}/users/${uid}`,
          fieldTransforms: [{
            fieldPath: 'watchlist',
            [transformName]: { values: [{ stringValue: symbol }] },
          }],
        },
      }],
    },
  });
}

export function addToWatchlist(uid, symbol) {
  return watchlistTransform(uid, symbol, 'appendMissingElements');
}

export function removeFromWatchlist(uid, symbol) {
  return watchlistTransform(uid, symbol, 'removeAllFromArray');
}

// ── Portfolio holdings ───────────────────────────────────────────────────────

// List every holding in the user's portfolio subcollection — one doc per symbol.
export async function getHoldings(uid) {
  const result = await firestoreRequest(`/users/${uid}/holdings`);
  if (!result || !result.documents) return [];
  return result.documents.map((doc) => fromFirestoreFields(doc.fields));
}

// Create or fully overwrite one holding doc. No updateMask needed — buy/sell
// always recomputes the complete {symbol, name, shares, avgCost} state first.
export function upsertHolding(uid, symbol, holding) {
  return firestoreRequest(`/users/${uid}/holdings/${symbol}`, {
    method: 'PATCH',
    body: { fields: toFirestoreFields(holding) },
  });
}

// Remove a holding entirely once all its shares are sold.
export function deleteHolding(uid, symbol) {
  return firestoreRequest(`/users/${uid}/holdings/${symbol}`, { method: 'DELETE' });
}

// ── Pro plan orders (cart) ──────────────────────────────────────────────────

// Create an order doc for a Pro plan purchase. POSTing to a collection path
// (instead of a specific document) makes Firestore auto-generate the id.
export function createOrder(uid, order) {
  return firestoreRequest(`/users/${uid}/orders`, {
    method: 'POST',
    body: { fields: toFirestoreFields({ ...order, createdAt: new Date() }) },
  });
}
