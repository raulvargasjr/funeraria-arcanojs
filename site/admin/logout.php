<?php
ob_start();
session_start();
session_unset();
session_destroy();

/* Apaga o cookie de sessão no browser */
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(), '',
        time() - 42000,
        $params['path'], $params['domain'],
        $params['secure'], $params['httponly']
    );
}

header('Location: /admin/gate.php');
exit;
?>