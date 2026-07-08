<?php
// Firebase Identity Toolkit (Auth) + Firestore REST API helper — plain cURL
// calls only. No Composer package, no SDK. This is the PHP mirror of
// js/firebaseAuth.js and js/db.js, so login.php/register.php run the same
// real backend logic PHP-side (testable locally via `php -S`) that main.js
// runs client-side on Vercel.

// Fill these in from Firebase console > Project settings > General > Your apps
// (same values as FIREBASE_CONFIG in js/config.js).
define('FIREBASE_API_KEY', 'YOUR_FIREBASE_WEB_API_KEY');
define('FIREBASE_PROJECT_ID', 'assetsx-b5b19');

// Map Firebase's error codes to messages a user can actually understand
function fb_friendly_error($responseBody) {
    $messages = [
        'EMAIL_EXISTS' => 'An account with that email already exists.',
        'EMAIL_NOT_FOUND' => 'No account found with that email.',
        'INVALID_PASSWORD' => 'Incorrect password.',
        'INVALID_LOGIN_CREDENTIALS' => 'Incorrect email or password.',
        'WEAK_PASSWORD' => 'Password should be at least 6 characters.',
        'TOO_MANY_ATTEMPTS_TRY_LATER' => 'Too many attempts. Please try again later.',
    ];

    $decoded = json_decode($responseBody, true);
    // Firebase sometimes appends extra detail after a colon, e.g. "WEAK_PASSWORD : ..."
    $code = trim(explode(':', $decoded['error']['message'] ?? '')[0]);
    if (isset($messages[$code])) return $messages[$code];

    // Unmapped code — surface it instead of a vague message, so an
    // unexpected error is debuggable without needing server logs.
    error_log('Firebase error: ' . $responseBody);
    return $code ? "Something went wrong ($code). Please try again." : 'Something went wrong. Please try again.';
}

// Shared request helper for every Identity Toolkit/Firestore call below
function fb_request($method, $url, $payload = null, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(['Content-Type: application/json'], $headers));
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status < 200 || $status >= 300) {
        throw new Exception(fb_friendly_error($response));
    }
    return json_decode($response, true);
}

// ── Identity Toolkit (Auth) ─────────────────────────────────────────────────

function fb_sign_up($email, $password) {
    $url = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' . FIREBASE_API_KEY;
    return fb_request('POST', $url, ['email' => $email, 'password' => $password, 'returnSecureToken' => true]);
}

function fb_sign_in($email, $password) {
    $url = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' . FIREBASE_API_KEY;
    return fb_request('POST', $url, ['email' => $email, 'password' => $password, 'returnSecureToken' => true]);
}

// Email Firebase's verification link to the new user — Google's own
// infrastructure sends it, no SMTP server or email API key needed.
function fb_send_verification_email($idToken, $continueUrl) {
    $url = 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' . FIREBASE_API_KEY;
    return fb_request('POST', $url, ['requestType' => 'VERIFY_EMAIL', 'idToken' => $idToken, 'continueUrl' => $continueUrl]);
}

// ── Firestore ────────────────────────────────────────────────────────────────

// Convert a flat PHP array into Firestore's typed REST field format
// ({"stringValue": "..."} etc). Only handles the value types this app
// actually stores: strings and arrays of strings.
function fb_to_firestore_fields($data) {
    $fields = [];
    foreach ($data as $key => $value) {
        if (is_array($value)) {
            $fields[$key] = ['arrayValue' => ['values' => array_map(
                fn($item) => ['stringValue' => $item], $value
            )]];
        } else {
            $fields[$key] = ['stringValue' => (string) $value];
        }
    }
    return $fields;
}

// Create the user's profile doc right after sign-up, seeded with a starter
// watchlist and the free plan — mirrors js/db.js's createUserDoc().
function fb_create_user_doc($uid, $idToken, $fullname, $email, $watchlist) {
    $url = 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID
        . '/databases/(default)/documents/users/' . $uid;

    $body = ['fields' => fb_to_firestore_fields([
        'fullname' => $fullname,
        'email' => $email,
        'plan' => 'free',
        'watchlist' => $watchlist,
    ])];

    return fb_request('PATCH', $url, $body, ["Authorization: Bearer $idToken"]);
}
