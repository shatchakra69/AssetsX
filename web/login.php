<?php
// Handle the login form submission.
// This runs server-side when PHP is available. With JavaScript on, main.js
// handles the form submit instead so the page doesn't reload.

require_once 'session_handler.php';
require_once 'firebase_helper.php';

// Only process POST requests — reject direct browser access
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: signin.html');
    exit;
}

// Collect and clean up form data
$email    = trim($_POST['email']    ?? '');
$password = $_POST['password']         ?? '';

// --- Validation ---

// Check that both fields have a value before doing anything else
if (empty($email) || empty($password)) {
    header('Location: signin.html?error=' . urlencode('Please fill in all fields.'));
    exit;
}

// Check that the email is in a valid format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Location: signin.html?error=' . urlencode('Please enter a valid email address.'));
    exit;
}

// --- Authentication ---
// Sign in against the same Firebase account the JS track uses (see
// firebase_helper.php) — this actually checks the password now.
try {
    $auth = fb_sign_in($email, $password);
} catch (Exception $e) {
    header('Location: signin.html?error=' . urlencode($e->getMessage()));
    exit;
}

// Save the login state to the PHP session
$_SESSION['logged_in']  = true;
$_SESSION['user_email'] = $email;
$_SESSION['uid']        = $auth['localId'];

// Redirect to the main dashboard after login
header('Location: home.html');
exit;
