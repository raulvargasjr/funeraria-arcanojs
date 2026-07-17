/* ============================================
   FUNERÁRIA ARCANJOS — Óbitos Recentes
   Carrega e renderiza os obituários a partir
   de data/obituarios.json
   ============================================ */

(function () {
  'use strict';

  /* SVG placeholder em padrão xadrez dourado (usado quando não há foto) */
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

  function buildCard(obituario) {
    const nomeSafe = (obituario.nome || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const descSafe = (obituario.descricao || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const anos = `${obituario.ano_nascimento || '?'} — ${obituario.ano_falecimento || '?'}`;

    const fotoHtml = obituario.foto
      ? `<img src="${obituario.foto}" alt="Retrato de ${nomeSafe}" class="obito-card__image" loading="lazy">`
      : PLACEHOLDER_SVG.replace('nome do(a) falecido(a)', nomeSafe);

    const pdfBtn = obituario.pdf
      ? `<a href="${obituario.pdf}" class="obito-card__btn obito-card__btn--primary" download target="_blank" rel="noopener">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
           <span>Baixar PDF</span>
         </a>`
      : `<button class="obito-card__btn obito-card__btn--primary obito-card__btn--disabled" disabled>
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
           <span>Baixar PDF</span>
         </button>`;

    return `
    <div class="obito-card reveal reveal--up">
      <div class="obito-card__image-wrap">
        ${fotoHtml}
      </div>
      <div class="obito-card__body">
        <div class="gold-line obito-card__divider"><span class="diamond">◆</span></div>
        <h3 class="obito-card__name">${nomeSafe}</h3>
        <p class="obito-card__dates">${anos}</p>
        <p class="obito-card__details">${descSafe}</p>
        <div class="obito-card__actions">
          ${pdfBtn}
          <button class="obito-card__btn obito-card__btn--secondary" onclick="openCondolencias('${obituario.id}', '${nomeSafe}')">
            <span>Condolências</span>
          </button>
        </div>
      </div>
    </div>`;
  }

  function renderObituarios(data) {
    const track = document.getElementById('obitosTrack');
    if (!track) return;

    const ativos = data.filter(o => o.ativo !== false);

    if (ativos.length === 0) {
      track.innerHTML = '<p class="obitos__empty" data-i18n="obitos.empty">Nenhum obituário recente para apresentar.</p>';
      if (window.translateDOM) {
        window.translateDOM(track);
      }
      return;
    }

    track.innerHTML = ativos.map(buildCard).join('');

    /* Traduzir os cartões criados dinamicamente se necessário */
    if (window.translateDOM) {
      window.translateDOM(track);
    }

    /* Activar reveal nos cartões recém-criados */
    if (window._initReveal) {
      window._initReveal(track.querySelectorAll('.reveal'));
    }
  }

  const FALLBACK_DATA = [
    {
      "id": "demo-1",
      "nome": "Maria Fernanda Sousa",
      "ano_nascimento": 1942,
      "ano_falecimento": 2026,
      "foto": "",
      "descricao": "Velório na Capela de Portimão · Funeral dia 11, 15h00.",
      "pdf": "",
      "ativo": true
    },
    {
      "id": "demo-2",
      "nome": "António Carvalho Lima",
      "ano_nascimento": 1938,
      "ano_falecimento": 2026,
      "foto": "",
      "descricao": "Cerimónia de cremação · Dia 12, 11h00. Homenagem aberta à família.",
      "pdf": "",
      "ativo": true
    },
    {
      "id": "demo-3",
      "nome": "Joaquim Pereira Nunes",
      "ano_nascimento": 1950,
      "ano_falecimento": 2026,
      "foto": "",
      "descricao": "Velório e missa · Igreja Matriz, dia 10, 18h00.",
      "pdf": "",
      "ativo": true
    }
  ];

  function loadObituarios() {
    fetch('data/obituarios.json?t=' + Date.now())
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(renderObituarios)
      .catch(err => {
        console.warn('[Obituários] Erro de rede ou CORS local. Utilizando dados de fallback:', err);
        renderObituarios(FALLBACK_DATA);
      });
  }

  /* Modal de Condolências simples */
  window.openCondolencias = function (id, nome) {
    let modal = document.getElementById('condolenciasModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'condolenciasModal';
      modal.className = 'condolencias-modal';
      modal.innerHTML = `
        <div class="condolencias-modal__overlay" onclick="closeCondolencias()"></div>
        <div class="condolencias-modal__box">
          <button class="condolencias-modal__close" onclick="closeCondolencias()" aria-label="Fechar">✕</button>
          <div class="condolencias-modal__diamond">◆</div>
          <h3 class="condolencias-modal__title" id="condolenciasNome"></h3>
          <p class="condolencias-modal__subtitle">Deixe a sua mensagem de condolências</p>
          <textarea class="condolencias-modal__textarea" id="condolenciasTexto" rows="5" placeholder="Escreva a sua mensagem..."></textarea>
          <p class="condolencias-modal__info">Esta mensagem será entregue à família.</p>
          <button class="condolencias-modal__submit" onclick="submitCondolencias('${id}')">Enviar Mensagem</button>
        </div>`;
      document.body.appendChild(modal);
    }

    document.getElementById('condolenciasNome').textContent = nome;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeCondolencias = function () {
    const modal = document.getElementById('condolenciasModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.submitCondolencias = function (id) {
    const texto = document.getElementById('condolenciasTexto')?.value?.trim();
    if (!texto) return;
    /* Aqui seria enviado para o backend. Por agora, apenas confirma. */
    alert('Mensagem enviada. Obrigado pela sua homenagem.');
    window.closeCondolencias();
  };

  /* Inicializar quando DOM estiver pronto */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadObituarios);
  } else {
    loadObituarios();
  }

})();
