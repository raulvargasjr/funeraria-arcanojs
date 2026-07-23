<?php
ob_start();
session_start();
if (isset($_SESSION['arcanjos_admin']) && $_SESSION['arcanjos_admin'] === true) {
    header('Location: /admin/index.php');
    exit;
}
$ADMIN_HASH = '0ee7837705297589d61754495c6f2ec04649e1e3ba08188db8861fd786e78e61';
$erro = '';
$tentativas_key = 'arcanjos_tentativas';
if (!isset($_SESSION[$tentativas_key])) {
    $_SESSION[$tentativas_key] = 0;
    $_SESSION['arcanjos_bloqueio'] = 0;
}
$bloqueado = false;
$restante = 0;
if ($_SESSION[$tentativas_key] >= 5 && time() < $_SESSION['arcanjos_bloqueio']) {
    $bloqueado = true;
    $restante = ceil(($_SESSION['arcanjos_bloqueio'] - time()) / 60);
    $erro = "Demasiadas tentativas. Aguarde {$restante} minuto(s).";
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$bloqueado) {
    $senha = trim($_POST['senha'] ?? '');
    $hash_input = hash('sha256', $senha);
    if (hash_equals($ADMIN_HASH, $hash_input)) {
        session_regenerate_id(true);
        $_SESSION['arcanjos_admin'] = true;
        $_SESSION[$tentativas_key] = 0;
        header('Location: /admin/index.php');
        exit;
    } else {
        $_SESSION[$tentativas_key]++;
        if ($_SESSION[$tentativas_key] >= 5) {
            $_SESSION['arcanjos_bloqueio'] = time() + 300;
        }
        $tentativas_rest = max(0, 5 - $_SESSION[$tentativas_key]);
        $erro = $tentativas_rest > 0 ? "Senha incorreta. {$tentativas_rest} tentativa(s) restante(s)." : "Demasiadas tentativas. Aguarde 5 minutos.";
    }
}
?>

<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Acesso Restrito — Funerária Arcanjos</title>
  <link rel="icon" type="image/png" href="../img/symbol-arcanjo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --gold:        #C5A55A;
      --gold-light:  #D4B86A;
      --gold-dark:   #A88B3D;
      --gold-border: rgba(197,165,90,0.25);
      --gold-subtle: rgba(197,165,90,0.08);
      --cream:       #FAF7F2;
      --charcoal:    #2D2D2D;
      --bg-dark:     #1a1814;
      --bg-panel:    #211f1b;
      --text-muted:  #9a9080;
      --font-serif:  'Playfair Display', Georgia, serif;
      --font-sans:   'Inter', system-ui, sans-serif;
    }

    html, body {
      height: 100%;
      font-family: var(--font-sans);
      background: var(--bg-dark);
      color: var(--cream);
      overflow: hidden;
    }

    /* ── Background decorativo ── */
    .gate-bg {
      position: fixed;
      inset: 0;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(197,165,90,0.06) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(197,165,90,0.04) 0%, transparent 50%),
        linear-gradient(135deg, #1a1814 0%, #211f1b 50%, #1a1814 100%);
      z-index: 0;
    }

    /* Padrão geométrico sutil */
    .gate-bg::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C5A55A' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }

    /* ── Wrapper centrado ── */
    .gate-wrap {
      position: relative;
      z-index: 1;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }

    /* ── Card de login ── */
    .gate-card {
      background: var(--bg-panel);
      border: 1px solid var(--gold-border);
      border-radius: 20px;
      padding: 2.75rem 2.5rem;
      width: 100%;
      max-width: 420px;
      box-shadow:
        0 0 0 1px rgba(197,165,90,0.08),
        0 24px 64px rgba(0,0,0,0.6),
        0 0 80px rgba(197,165,90,0.04);
      animation: fadeInUp 0.5s ease;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Logo ── */
    .gate-logo {
      text-align: center;
      margin-bottom: 2rem;
    }

    .gate-logo img {
      height: 60px;
      width: auto;
      filter: brightness(0) invert(1);
      opacity: 0.92;
    }

    /* ── Separador ── */
    .gate-divider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .gate-divider::before,
    .gate-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--gold-border);
    }
    .gate-divider__text {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 3px;
      color: var(--gold);
      text-transform: uppercase;
      white-space: nowrap;
    }

    /* ── Título ── */
    .gate-title {
      font-family: var(--font-serif);
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--cream);
      text-align: center;
      margin-bottom: 0.375rem;
      line-height: 1.25;
    }
    .gate-sub {
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 2rem;
    }

    /* ── Campo de senha ── */
    .gate-field {
      position: relative;
      margin-bottom: 1.25rem;
    }

    .gate-field svg {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      stroke: var(--text-muted);
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
      transition: stroke 0.2s;
    }

    .gate-field:focus-within svg { stroke: var(--gold); }

    .gate-input {
      width: 100%;
      padding: 0.875rem 3rem 0.875rem 2.75rem;
      background: rgba(255,255,255,0.04);
      border: 1.5px solid rgba(197,165,90,0.2);
      border-radius: 10px;
      font-family: var(--font-sans);
      font-size: 0.95rem;
      color: var(--cream);
      outline: none;
      transition: all 0.2s ease;
      letter-spacing: 0.5px;
    }
    .gate-input::placeholder { color: var(--text-muted); letter-spacing: 0; }
    .gate-input:focus {
      border-color: var(--gold);
      background: rgba(197,165,90,0.05);
      box-shadow: 0 0 0 3px rgba(197,165,90,0.10);
    }

    /* Toggle mostrar/ocultar senha */
    .gate-toggle-pwd {
      position: absolute;
      right: 1rem;
      top: 0;
      bottom: 0;
      margin: auto 0;
      height: 32px;
      width: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      transition: color 0.2s;
      z-index: 2;
    }
    .gate-toggle-pwd:hover { color: var(--gold); }
    .gate-toggle-pwd svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; display: block; }

    /* ── Botão de acesso ── */
    .gate-btn {
      width: 100%;
      padding: 0.9rem;
      background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
      border: none;
      border-radius: 10px;
      font-family: var(--font-sans);
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      cursor: pointer;
      letter-spacing: 0.5px;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }
    .gate-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.08) 100%);
      opacity: 0;
      transition: opacity 0.25s;
    }
    .gate-btn:hover::before { opacity: 1; }
    .gate-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(197,165,90,0.35); }
    .gate-btn:active { transform: translateY(0); }
    .gate-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    /* ── Mensagem de erro ── */
    .gate-error {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background: rgba(220, 80, 80, 0.08);
      border: 1px solid rgba(220, 80, 80, 0.25);
      border-radius: 8px;
      font-size: 0.82rem;
      color: #e88080;
      line-height: 1.4;
    }
    .gate-error svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; flex-shrink: 0; margin-top: 1px; }

    /* ── Rodapé do card ── */
    .gate-footer {
      margin-top: 2rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--gold-border);
      text-align: center;
      font-size: 0.72rem;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .gate-footer a {
      color: var(--gold);
      text-decoration: none;
      font-weight: 500;
    }
    .gate-footer a:hover { color: var(--gold-light); text-decoration: underline; }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      .gate-card { padding: 2rem 1.5rem; border-radius: 16px; }
      .gate-title { font-size: 1.2rem; }
    }
  </style>
</head>
<body>

<div class="gate-bg"></div>

<div class="gate-wrap">
  <div class="gate-card">

    <!-- Logo -->
    <div class="gate-logo">
      <img src="../img/logo-funeraria-arcanjo--horizontal.png" alt="Funerária Arcanjos">
    </div>

    <!-- Divisor -->
    <div class="gate-divider">
      <span class="gate-divider__text">Acesso Restrito</span>
    </div>

    <!-- Título -->
    <h1 class="gate-title">Painel Administrativo</h1>
    <p class="gate-sub">Introduza a senha para continuar</p>

    <!-- Formulário -->
    <form method="POST" action="gate.php" autocomplete="off" novalidate id="gateForm">
      <div class="gate-field">
        <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        <input
          type="password"
          name="senha"
          id="senhaInput"
          class="gate-input"
          placeholder="Senha de acesso"
          required
          autofocus
          <?php if ($bloqueado): ?>disabled<?php endif; ?>
        >
        <button type="button" class="gate-toggle-pwd" onclick="togglePwd()" aria-label="Mostrar/ocultar senha" tabindex="-1">
          <svg id="eyeIcon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <button type="submit" class="gate-btn" id="gateBtn" <?php if ($bloqueado): ?>disabled<?php endif; ?>>
        Entrar no Painel
      </button>

      
      <?php if (!empty($erro)): ?>
      <div class="gate-error" role="alert">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <?= htmlspecialchars($erro) ?>
      </div>
      <?php endif; ?>
      
    </form>

    <!-- Rodapé -->
    <div class="gate-footer">
      <a href="https://arcanjos.pt/" target="_blank">← Voltar ao site</a><br>
      <span style="margin-top:0.4rem;display:block;">© 2026 Funerária Arcanjos — Área privada</span>
    </div>

  </div>
</div>

<script>
function togglePwd() {
  const input = document.getElementById('senhaInput');
  const icon  = document.getElementById('eyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

/* Micro-animação no submit */
document.getElementById('gateForm').addEventListener('submit', function() {
  const btn = document.getElementById('gateBtn');
  btn.textContent = 'A verificar…';
  btn.disabled = true;
});
</script>

</body>
</html>

