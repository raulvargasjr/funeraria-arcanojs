/* ============================================
   FUNERÁRIA ARCANJOS — Óbitos Recentes
   Carrega e renderiza obituários a partir de
   data/obituarios.json (schema v2).
   Suporta schema antigo (ano_nascimento/ano_falecimento)
   e novo (data_nascimento/data_falecimento).
   ============================================ */

(function () {
  'use strict';

  /* SVG placeholder em padrão xadrez dourado */
  const PLACEHOLDER_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 400 240">
      <defs>
        <pattern id="checker" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#e8dcc8"/>
          <rect x="12" y="12" width="12" height="12" fill="#e8dcc8"/>
          <rect x="12" y="0" width="12" height="12" fill="#d4c4a8"/>
          <rect x="0" y="12" width="12" height="12" fill="#d4c4a8"/>
        </pattern>
      </defs>
      <rect width="400" height="240" fill="url(#checker)"/>
      <rect x="140" y="80" width="120" height="28" rx="4" fill="rgba(255,255,255,0.6)"/>
      <text x="200" y="99" text-anchor="middle" font-family="serif" font-size="11" fill="#8a7660">retrato · nome do(a) falecido(a)</text>
    </svg>`;

  /* ─────────────────────────────────────────────
     HELPERS DE SCHEMA (v1 compat + v2)
  ───────────────────────────────────────────── */
  function getAno(iso, legacyField) {
    if (iso) return iso.split('-')[0];
    if (legacyField) return String(legacyField);
    return '?';
  }

  function getAnos(o) {
    const nasc  = getAno(o.data_nascimento,  o.ano_nascimento);
    const falec = getAno(o.data_falecimento, o.ano_falecimento);
    return `${nasc} — ${falec}`;
  }

  function getCondolenciasAprovadas(obitoId) {
    try {
      const all = JSON.parse(localStorage.getItem('arcanjos_condolencias') || '[]');
      return all.filter(c => c.obitoId === obitoId && c.aprovado === true);
    } catch { return []; }
  }

  function addCondolencia(obitoId, autor, email, mensagem) {
    try {
      const all = JSON.parse(localStorage.getItem('arcanjos_condolencias') || '[]');
      all.push({
        id:       'cond-' + Date.now(),
        obitoId,
        autor,
        email,
        mensagem,
        data:     new Date().toISOString(),
        aprovado: false,
      });
      localStorage.setItem('arcanjos_condolencias', JSON.stringify(all));
      return true;
    } catch { return false; }
  }

  function sanitize(str) {
    return (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function tipoCerimoniaIcon(tipo) {
    const map = { velorio: '🕯️', cremacao: '🔥', missa: '⛪', privado: '🔒' };
    return map[tipo] || '◆';
  }

  /* ─────────────────────────────────────────────
     SHARE DROPDOWN
  ───────────────────────────────────────────── */
  function buildShareDropdown(id, nome) {
    const url  = encodeURIComponent(window.location.href.split('?')[0] + '?obito=' + id);
    const text = encodeURIComponent(`Homenagem — ${nome} | Funerária Arcanjos`);
    return `
    <div class="obito-share-dropdown" id="share-${id}">
      <a href="https://wa.me/?text=${text}%20${url}" target="_blank" rel="noopener" class="obito-share-dropdown__item">
        📱 WhatsApp
      </a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener" class="obito-share-dropdown__item">
        📘 Facebook
      </a>
      <button class="obito-share-dropdown__item" onclick="copiarLink('${url}', this)">
        🔗 Copiar link
      </button>
    </div>`;
  }

  /* ─────────────────────────────────────────────
     BUILD CARD
  ───────────────────────────────────────────── */
  function buildCard(o, compact) {
    const nomeSafe   = sanitize(o.nome || '');
    const anos       = getAnos(o);
    const local      = sanitize(o.local_velorio || o.descricao || '');
    const horario    = sanitize(o.horario_velorio || '');
    const tipoIcon   = tipoCerimoniaIcon(o.tipo_cerimonia);
    const condList   = getCondolenciasAprovadas(o.id);
    const condCount  = condList.length;
    const condLabel  = condCount === 1 ? '1 condolência' : `${condCount} condolências`;

    /* Foto */
    const fotoSrc = o._imgBase64 || o.foto;
    const fotoHtml = fotoSrc
      ? `<img src="${fotoSrc}" alt="Retrato de ${nomeSafe}" class="obito-card__image" loading="lazy">`
      : PLACEHOLDER_SVG.replace('nome do(a) falecido(a)', nomeSafe);

    /* Botão PDF */
    const pdfSrc = o._pdfBase64 || o.pdf;
    const pdfBtn = pdfSrc
      ? `<a href="${pdfSrc}" class="obito-card__btn obito-card__btn--primary"
            ${o._pdfBase64 ? '' : 'download'} target="_blank" rel="noopener"
            aria-label="Descarregar PDF de ${nomeSafe}">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
           <span>Descarregar PDF</span>
         </a>`
      : `<button class="obito-card__btn obito-card__btn--primary obito-card__btn--disabled" disabled aria-disabled="true">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
           <span>Sem PDF</span>
         </button>`;

    /* Botão partilhar (apenas versão completa) */
    const shareBtn = !compact
      ? `<button class="obito-card__btn obito-card__btn--share"
              onclick="toggleShare('${o.id}')"
              aria-expanded="false" aria-controls="share-${o.id}"
              aria-label="Partilhar homenagem de ${nomeSafe}">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
           <span>Partilhar</span>
         </button>
         ${buildShareDropdown(o.id, nomeSafe)}`
      : '';

    /* Condolências (apenas versão completa) */
    const condSection = !compact ? `
      <div class="obito-card__cond-section" id="cond-section-${o.id}">
        <button class="obito-card__cond-toggle" onclick="toggleCondolencias('${o.id}', '${nomeSafe}')" aria-expanded="false">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span id="cond-label-${o.id}">${condLabel}</span>
        </button>
        <div class="obito-card__cond-panel" id="cond-panel-${o.id}" hidden>
          <div class="obito-card__cond-list" id="cond-list-${o.id}"></div>
          ${o.condolencias_abertas !== false ? `
          <form class="obito-card__cond-form" onsubmit="submitCondolencia(event, '${o.id}', '${nomeSafe}')">
            <p class="obito-card__cond-form-title">Deixar condolências</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
              <input type="text"  name="autor"    placeholder="O seu nome *"  required maxlength="80"  autocomplete="name">
              <input type="email" name="email"    placeholder="E-mail *"      required maxlength="120" autocomplete="email">
            </div>
            <textarea name="mensagem" rows="3" placeholder="A sua mensagem de condolências…" required maxlength="500"></textarea>
            <p class="obito-card__cond-info">ℹ️ A mensagem será publicada após aprovação.</p>
            <button type="submit" class="obito-card__btn obito-card__btn--primary" style="margin-top:0.5rem;">Enviar</button>
          </form>` : '<p class="obito-card__cond-info">As condolências estão encerradas para este registo.</p>'}
        </div>
      </div>` : '';

    /* Local + horário */
    const localHtml = local ? `
      <p class="obito-card__location">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>${local}</span>
      </p>` : '';

    const horarioHtml = horario ? `
      <p class="obito-card__horario">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${horario}</span>
      </p>` : '';

    return `
    <div class="obito-card reveal reveal--up" id="obito-${o.id}" data-id="${o.id}">
      <div class="obito-card__image-wrap">
        ${fotoHtml}
        ${o.destaque ? '<span class="obito-card__badge">⭐ Destaque</span>' : ''}
        <span class="obito-card__tipo-badge">${tipoIcon} ${sanitize(o.tipo_cerimonia ? (o.tipo_cerimonia.charAt(0).toUpperCase() + o.tipo_cerimonia.slice(1)) : '')}</span>
      </div>
      <div class="obito-card__body">
        <div class="gold-line obito-card__divider"><span class="diamond">◆</span></div>
        <h3 class="obito-card__name">${nomeSafe}</h3>
        <p class="obito-card__dates">✦ ${anos}</p>
        ${localHtml}
        ${horarioHtml}
        ${condSection}
        <div class="obito-card__actions">
          ${pdfBtn}
          <button class="obito-card__btn obito-card__btn--secondary"
                  onclick="openCondolencias('${o.id}', '${nomeSafe}')"
                  aria-label="Condolências para ${nomeSafe}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>Condolências</span>
          </button>
          ${shareBtn}
        </div>
      </div>
    </div>`;
  }

  /* ─────────────────────────────────────────────
     TOGGLE SHARE DROPDOWN
  ───────────────────────────────────────────── */
  window.toggleShare = function (id) {
    const dd  = document.getElementById('share-' + id);
    if (!dd) return;
    const isOpen = dd.classList.contains('open');
    // Fecha todos
    document.querySelectorAll('.obito-share-dropdown.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) dd.classList.add('open');
  };

  window.copiarLink = function (url, btn) {
    navigator.clipboard.writeText(decodeURIComponent(url)).then(() => {
      btn.textContent = '✅ Link copiado!';
      setTimeout(() => { btn.textContent = '🔗 Copiar link'; }, 2000);
    });
  };

  /* Fechar dropdown ao clicar fora */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.obito-card__btn--share') && !e.target.closest('.obito-share-dropdown')) {
      document.querySelectorAll('.obito-share-dropdown.open').forEach(el => el.classList.remove('open'));
    }
  });

  /* ─────────────────────────────────────────────
     TOGGLE / SUBMIT CONDOLÊNCIAS (inline)
  ───────────────────────────────────────────── */
  window.toggleCondolencias = function (id, nome) {
    const panel  = document.getElementById('cond-panel-' + id);
    const btn    = panel?.previousElementSibling;
    if (!panel) return;
    const isHidden = panel.hidden;
    panel.hidden = !isHidden;
    if (btn) btn.setAttribute('aria-expanded', String(isHidden));
    if (isHidden) renderCondList(id);
  };

  function renderCondList(obitoId) {
    const list = document.getElementById('cond-list-' + obitoId);
    if (!list) return;
    const conds = getCondolenciasAprovadas(obitoId);
    if (conds.length === 0) {
      list.innerHTML = '<p class="obito-card__cond-empty">Seja o(a) primeiro(a) a deixar condolências.</p>';
      return;
    }
    list.innerHTML = conds.map(c => `
      <div class="obito-card__cond-msg">
        <strong>${sanitize(c.autor)}</strong>
        <span>${new Date(c.data).toLocaleDateString('pt-PT')}</span>
        <p>"${sanitize(c.mensagem)}"</p>
      </div>`).join('');
  }

  window.submitCondolencia = function (e, obitoId, nome) {
    e.preventDefault();
    const form    = e.target;
    const autor   = form.autor.value.trim();
    const email   = form.email.value.trim();
    const msg     = form.mensagem.value.trim();
    if (!autor || !email || !msg) return;
    const ok = addCondolencia(obitoId, autor, email, msg);
    if (ok) {
      form.reset();
      const info = form.querySelector('.obito-card__cond-info');
      if (info) {
        info.textContent = '✅ Mensagem enviada! Será publicada após aprovação.';
        info.style.color = 'var(--success, #4CAF7D)';
      }
    }
  };

  /* ─────────────────────────────────────────────
     MODAL CONDOLÊNCIAS (fallback para home)
  ───────────────────────────────────────────── */
  window.openCondolencias = function (id, nome) {
    let modal = document.getElementById('condolenciasModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'condolenciasModal';
      modal.className = 'condolencias-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = `
        <div class="condolencias-modal__overlay" onclick="closeCondolencias()"></div>
        <div class="condolencias-modal__box">
          <button class="condolencias-modal__close" onclick="closeCondolencias()" aria-label="Fechar">✕</button>
          <div class="condolencias-modal__diamond">◆</div>
          <h3 class="condolencias-modal__title" id="condolenciasNome"></h3>
          
          <!-- ABAS DO MODAL -->
          <div class="condolencias-modal__tabs">
            <button type="button" class="condolencias-modal__tab active" id="tabWriteCond" onclick="switchCondTab('write')">
              ✏️ Deixar Mensagem
            </button>
            <button type="button" class="condolencias-modal__tab" id="tabViewCond" onclick="switchCondTab('view')">
              💬 Ver Condolências (<span id="condCountBadge">0</span>)
            </button>
          </div>

          <!-- PAINEL DE ESCRITA -->
          <div id="condolenciasWritePanel" class="condolencias-modal__panel active">
            <p class="condolencias-modal__subtitle">Deixe a sua mensagem de carinho à família</p>
            <div id="condolenciasFeedback"></div>
            <form id="condolenciasForm" onsubmit="submitCondolenciaModal(event)">
              <input type="hidden" id="condolenciasId">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
                <input type="text"  id="condolenciasAutor"   placeholder="O seu nome *"  required maxlength="80">
                <input type="email" id="condolenciasEmail"   placeholder="E-mail *"       required maxlength="120">
              </div>
              <textarea id="condolenciasTexto" rows="4" placeholder="Escreva a sua mensagem de conforto..." required maxlength="500"></textarea>
              <p class="condolencias-modal__info">ℹ️ Esta mensagem será publicada após aprovação da família.</p>
              <button type="submit" class="condolencias-modal__submit">Enviar Mensagem</button>
            </form>
          </div>

          <!-- PAINEL DE VISUALIZAÇÃO -->
          <div id="condolenciasViewPanel" class="condolencias-modal__panel">
            <div class="condolencias-modal__approved-list" id="condolenciasApprovedList"></div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    document.getElementById('condolenciasId').value   = id;
    document.getElementById('condolenciasNome').textContent = nome;

    const conds = getCondolenciasAprovadas(id);
    document.getElementById('condCountBadge').textContent = conds.length;

    /* Renderizar a lista de condolências em cards elegantes */
    const listEl = document.getElementById('condolenciasApprovedList');
    if (conds.length > 0) {
      listEl.innerHTML = conds.map(c => {
        const initial = (c.autor ? c.autor[0] : '?').toUpperCase();
        const dateFormatted = c.data ? new Date(c.data).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
        return `
          <div class="cond-card">
            <div class="cond-card__header">
              <div class="cond-card__avatar">${sanitize(initial)}</div>
              <div class="cond-card__meta">
                <strong class="cond-card__author">${sanitize(c.autor)}</strong>
                <span class="cond-card__date">${dateFormatted}</span>
              </div>
            </div>
            <p class="cond-card__text">&ldquo;${sanitize(c.mensagem)}&rdquo;</p>
          </div>`;
      }).join('');
    } else {
      listEl.innerHTML = `
        <div class="cond-empty-state">
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="var(--gold-dark)" fill="none" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <p>Ainda não foram publicadas condolências para este falecido.</p>
          <button type="button" class="btn-link" onclick="switchCondTab('write')">Seja o(a) primeiro(a) a enviar uma mensagem</button>
        </div>`;
    }

    // Abre na aba por padrão: se tiver mensagens, abre em "ver"; se não tiver, em "escrever"
    switchCondTab(conds.length > 0 ? 'view' : 'write');

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  /* Troca de abas no modal de condolências */
  window.switchCondTab = function (tab) {
    const tabWrite = document.getElementById('tabWriteCond');
    const tabView  = document.getElementById('tabViewCond');
    const panelWrite = document.getElementById('condolenciasWritePanel');
    const panelView  = document.getElementById('condolenciasViewPanel');

    if (tab === 'write') {
      tabWrite?.classList.add('active');
      tabView?.classList.remove('active');
      panelWrite?.classList.add('active');
      panelView?.classList.remove('active');
    } else {
      tabView?.classList.add('active');
      tabWrite?.classList.remove('active');
      panelView?.classList.add('active');
      panelWrite?.classList.remove('active');
    }
  };

  window.closeCondolencias = function () {
    const modal = document.getElementById('condolenciasModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.submitCondolenciaModal = function (e) {
    e.preventDefault();
    const id   = document.getElementById('condolenciasId').value;
    const autor = document.getElementById('condolenciasAutor').value.trim();
    const email = document.getElementById('condolenciasEmail').value.trim();
    const texto = document.getElementById('condolenciasTexto').value.trim();
    if (!autor || !email || !texto) return;
    addCondolencia(id, autor, email, texto);
    document.getElementById('condolenciasForm').reset();
    const info = document.querySelector('.condolencias-modal__info');
    if (info) {
      info.textContent = '✅ Mensagem enviada! Será publicada após aprovação.';
      info.style.color = 'var(--success, #4CAF7D)';
    }
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  /* Renderiza no track o array fornecido */
  function renderLista(lista, compact) {
    const track = document.getElementById('obitosTrack');
    if (!track) return;

    if (lista.length === 0) {
      track.innerHTML = '<p class="obitos__empty" data-i18n="obitos.empty">Nenhum obituário recente para apresentar.</p>';
      if (window.translateDOM) window.translateDOM(track);
      return;
    }

    track.innerHTML = lista.map(o => buildCard(o, compact)).join('');
    if (window.translateDOM) window.translateDOM(track);
    if (window._initReveal)  window._initReveal(track.querySelectorAll('.reveal'));
  }

  function renderObituarios(data, compact) {
    const track = document.getElementById('obitosTrack');
    if (!track) return;

    const ativos = data.filter(o => o.ativo !== false);

    // Na home: máx 3, ordenados por destaque depois por data
    let lista = [...ativos].sort((a, b) => {
      if (a.destaque && !b.destaque) return -1;
      if (!a.destaque && b.destaque) return 1;
      return new Date(b.criado_em || 0) - new Date(a.criado_em || 0);
    });

    if (compact) lista = lista.slice(0, 3);

    renderLista(lista, compact);

    /* Emite os dados para a página de óbitos (filtros) */
    if (!compact) {
      document.dispatchEvent(new CustomEvent('arcanjos:dados', { detail: { data: ativos } }));

      /* Escuta pedidos de re-render pelos filtros */
      document.addEventListener('arcanjos:filtrar', function handler(e) {
        const sorted = [...e.detail.data].sort((a, b) => {
          if (a.destaque && !b.destaque) return -1;
          if (!a.destaque && b.destaque) return 1;
          return new Date(b.criado_em || 0) - new Date(a.criado_em || 0);
        });
        renderLista(sorted, false);
      });
    }
  }

  /* ─────────────────────────────────────────────
     FALLBACK DATA
  ───────────────────────────────────────────── */
  const FALLBACK_DATA = [
    {
      id: 'demo-1',
      nome: 'Maria Fernanda Sousa',
      data_nascimento: '1942-03-12',
      data_falecimento: '2026-07-08',
      tipo_cerimonia: 'velorio',
      local_velorio: 'Capela de Portimão',
      horario_velorio: 'Dia 11 de Julho, às 15h00',
      foto: '', pdf: '',
      ativo: true, destaque: false, condolencias_abertas: true,
      criado_em: '2026-07-08T10:30:00Z'
    },
    {
      id: 'demo-2',
      nome: 'António Carvalho Lima',
      data_nascimento: '1938-06-05',
      data_falecimento: '2026-07-10',
      tipo_cerimonia: 'cremacao',
      local_velorio: 'Crematório de Faro',
      horario_velorio: 'Dia 12, às 11h00',
      foto: '', pdf: '',
      ativo: true, destaque: false, condolencias_abertas: true,
      criado_em: '2026-07-10T09:00:00Z'
    },
    {
      id: 'demo-3',
      nome: 'Joaquim Pereira Nunes',
      data_nascimento: '1950-11-20',
      data_falecimento: '2026-07-09',
      tipo_cerimonia: 'missa',
      local_velorio: 'Igreja Matriz de Lagos',
      horario_velorio: 'Dia 10, às 18h00',
      foto: '', pdf: '',
      ativo: true, destaque: true, condolencias_abertas: true,
      criado_em: '2026-07-09T14:00:00Z'
    }
  ];

  /* ─────────────────────────────────────────────
     LOAD
  ───────────────────────────────────────────── */
  function loadObituarios() {
    /* Detecta se estamos na home (compact) ou na página de óbitos */
    const isHome = !document.getElementById('obitosPage');
    const compact = isHome;

    fetch('data/obituarios.json?t=' + Date.now())
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(data => renderObituarios(data, compact))
      .catch(err => {
        console.warn('[Obituários] Utilizando dados de fallback:', err);
        renderObituarios(FALLBACK_DATA, compact);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadObituarios);
  } else {
    loadObituarios();
  }

})();
