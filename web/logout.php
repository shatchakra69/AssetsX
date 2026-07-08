<?php
// Destroy the user's session and redirect them to the sign-in page.
// This is the server-side logout used when PHP sessions are active.
// With JavaScript on, the logout link is handled in events.js instead.

require_once 'session_handler.php';

// Remove all data saved in the current session
$_SESSION = [];

// Delete the session cookie from the browser
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,  // Expire the cookie in the past to force the browser to delete it
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

// Destroy the session on the server
session_destroy();

// Send the user back to the sign-in page
header('Location: signin.html');
exit;
