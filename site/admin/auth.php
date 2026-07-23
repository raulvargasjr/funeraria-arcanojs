<?php
/* ============================================
   FUNERÁRIA ARCANJOS — Verificação de Sessão
   Inclua no topo de qualquer página protegida.
   ============================================ */
session_start();
if (!isset($_SESSION['arcanjos_admin']) || $_SESSION['arcanjos_admin'] !== true) {
    header('Location: /admin/gate.php');
    exit;
}
?>

