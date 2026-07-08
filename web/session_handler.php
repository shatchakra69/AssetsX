<?php
// Start and configure the user session
// This file is included by every other PHP file that needs session access

session_set_cookie_params([
    'lifetime' => 3600,       // Session lasts 1 hour
    'path'     => '/',
    'httponly' => true,        // Cookie cannot be read by JavaScript (XSS protection)
    'samesite' => 'Strict',    // Protects against CSRF attacks
]);

session_start();
