<?php
// Handle the registration form submission.
// This runs server-side when PHP is available. With JavaScript on, main.js
// handles the form submit instead so the page doesn't reload.

require_once 'session_handler.php';
require_once 'firebase_helper.php';

// Only process POST requests — reject direct browser access
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: signup.html');
    exit;
}

// Collect and clean up form data
$fullname = trim($_POST['fullname'] ?? '');
$email    = trim($_POST['email']    ?? '');
$password = $_POST['password']         ?? '';
$confirm  = $_POST['confirm_password'] ?? '';

// --- Validation ---

// Check that all required fields are filled in
if (empty($fullname) || empty($email) || empty($password) || empty($confirm)) {
    header('Location: signup.html?error=' . urlencode('All fields are required.'));
    exit;
}

// Check that the email address is a valid format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Location: signup.html?error=' . urlencode('Please enter a valid email address.'));
    exit;
}

// Check that the password is long enough
if (strlen($password) < 6) {
    header('Location: signup.html?error=' . urlencode('Password must be at least 6 characters.'));
    exit;
}

// Check that both password fields match
if ($password !== $confirm) {
    header('Location: signup.html?error=' . urlencode('Passwords do not match.'));
    exit;
}

// --- Create the account ---
// Sign up in Firebase, save the profile to Firestore (free plan, empty
// watchlist — new users start with nothing, just like a real broker), and
// email a verification link. Same REST calls js/firebaseAuth.js and js/db.js
// make from the browser, just run here with PHP's curl instead.
try {
    $auth = fb_sign_up($email, $password);
    $uid  = $auth['localId'];

    fb_create_user_doc($uid, $auth['idToken'], $fullname, $email, []);

    // Hardcoded to the production URL, not the current host — Firebase
    // requires every continueUrl domain to be pre-authorized in the console,
    // and this would otherwise break on whatever host PHP happens to run on.
    fb_send_verification_email($auth['idToken'], 'https://assetsx-web.vercel.app/signin.html?verified=1');
} catch (Exception $e) {
    header('Location: signup.html?error=' . urlencode($e->getMessage()));
    exit;
}

// --- Session registration ---
// Save the user details to the PHP session so the app knows they are logged in.
$_SESSION['logged_in']  = true;
$_SESSION['user_email'] = $email;
$_SESSION['user_name']  = $fullname;
$_SESSION['uid']        = $uid;

// Redirect to the dashboard after successful registration
header('Location: home.html');
exit;
