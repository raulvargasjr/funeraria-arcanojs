/* ============================================
   FUNERÁRIA ARCANJOS — Painel Admin
   Gestão de Óbitos + Condolências
   100% client-side. Persistência via
   localStorage + Export/Import JSON.
   ============================================ */

'use strict';

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const CFG = {
  // SHA-256 da senha "arcanjos2024" — altere conforme necessário.
  // Para gerar novo hash: abrir console do browser e executar:
  // crypto.subtle.digest('SHA-256', new TextEncoder().encode('sua-senha')).then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
  PASSWORD_HASH: '0ee7837705297589d61754495c6f2ec04649e1e3ba08188db8861fd786e78e61', // "Arcanjos@Admin2026"
  STORAGE_KEY_OBITOS: 'arcanjos_obitos',
  STORAGE_KEY_COND:   'arcanjos_condolencias',
  SESSION_KEY:        'arcanjos_admin_session',
  MAX_IMG_MB:         5,
  MAX_PDF_MB:         10,
};

/* ─────────────────────────────────────────────
   STATE
───────────────────────────────────────────── */
let STATE = {
  obitos: [],
  condolencias: [],
  editingId: null,       // id do óbito em edição (null = novo)
  currentSection: 'list', // list | form | condolencias
  currentTab: 'publicados',
  condTab: 'pendentes',
  testPage: 0,
  testPerPage: 6,
  imgBase64: null,       // imagem carregada em base64
  pdfBase64: null,       // PDF carregado em base64
  pdfFileName: null,
  pdfFileSize: null,
  imgFileName: null,
  imgFileSize: null,
};

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
function generateId() {
  return 'obito-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso) {
  if (!iso) return '?';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateShort(iso) {
  if (!iso) return '?';
  const [y] = iso.split('-');
  return y;
}

function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'agora';
  if (mins  < 60) return `há ${mins} min`;
  if (hours < 24) return `há ${hours}h`;
  return `há ${days} dia${days > 1 ? 's' : ''}`;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function sanitize(str) {
  return (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tipoCerimoniaLabel(tipo) {
  const map = { velorio: 'Velório', cremacao: 'Cremação', missa: 'Missa', privado: 'Privado' };
  return map[tipo] || tipo || '—';
}

/* ─────────────────────────────────────────────
   HASH DE SENHA (WebCrypto)
───────────────────────────────────────────── */
async function hashPassword(pwd) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ─────────────────────────────────────────────
   PERSISTÊNCIA (localStorage)
───────────────────────────────────────────── */
function saveObitos() {
  // Para evitar estourar o limite de 5MB do localStorage, removemos os Base64 grandes antes de gravar localmente
  const localCleanData = STATE.obitos.map(o => {
    const clean = { ...o };
    delete clean._imgBase64;
    delete clean._pdfBase64;
    return clean;
  });

  try {
    localStorage.setItem(CFG.STORAGE_KEY_OBITOS, JSON.stringify(localCleanData));
  } catch (e) {
    console.warn('Erro ao guardar no localStorage:', e);
  }

  // Enviamos o payload completo (com base64) para o servidor gravar fisicamente
  fetch('save_data.php?type=obitos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(STATE.obitos)
  })
  .then(res => {
    if (res.ok) {
      showToast('Sincronizado com o servidor de produção!', 'success');
      // Recarrega os dados limpos do servidor
      fetch('../data/obituarios.json?t=' + Date.now())
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (data && data.length > 0) {
            STATE.obitos = data;
            try {
              localStorage.setItem(CFG.STORAGE_KEY_OBITOS, JSON.stringify(data));
            } catch (e) {}
            renderListSection();
          }
        });
    } else {
      showToast('Aviso: Falha ao guardar ficheiros no servidor.', 'danger');
    }
  })
  .catch(() => showToast('Aviso: Erro de rede ao gravar no servidor.', 'danger'));
}

function saveCondolencias() {
  localStorage.setItem(CFG.STORAGE_KEY_COND, JSON.stringify(STATE.condolencias));
}


function loadFromStorage() {
  try {
    // Condolências: sempre do localStorage (são geridas localmente)
    const c = localStorage.getItem(CFG.STORAGE_KEY_COND);
    if (c) STATE.condolencias = JSON.parse(c);
  } catch (e) {
    STATE.condolencias = [];
  }

  // Óbitos: SEMPRE buscar do servidor (source of truth)
  // localStorage serve apenas como fallback offline
  fetch('../data/obituarios.json?t=' + Date.now())
    .then(res => res.ok ? res.json() : Promise.reject('fetch failed'))
    .then(data => {
      if (data && data.length > 0) {
        STATE.obitos = data;
        try { localStorage.setItem(CFG.STORAGE_KEY_OBITOS, JSON.stringify(data)); } catch (e) {}
      } else {
        STATE.obitos = [];
        try { localStorage.removeItem(CFG.STORAGE_KEY_OBITOS); } catch (e) {}
      }
      renderListSection();
    })
    .catch(() => {
      // Fallback offline: usar localStorage se disponível
      try {
        const o = localStorage.getItem(CFG.STORAGE_KEY_OBITOS);
        if (o) STATE.obitos = JSON.parse(o);
      } catch (e) {
        STATE.obitos = [];
      }
      renderListSection();
    });
}

/* ─────────────────────────────────────────────
   IMPORT / EXPORT JSON
───────────────────────────────────────────── */
function exportJSON() {
  // Gera obituarios.json com campos completos, sem base64 inline
  // (imagens/PDFs devem ser enviados por FTP na pasta correta)
  const data = STATE.obitos.map(o => {
    const clean = { ...o };
    // Remove base64 do export — só mantém o path
    delete clean._imgBase64;
    delete clean._pdfBase64;
    // Adiciona aliases legacy
    if (o.data_nascimento) clean.ano_nascimento = parseInt(o.data_nascimento.split('-')[0]);
    if (o.data_falecimento) clean.ano_falecimento = parseInt(o.data_falecimento.split('-')[0]);
    return clean;
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'obituarios.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('obituarios.json exportado! Faça upload via FTP.', 'success');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      STATE.obitos = data;
      saveObitos();
      renderListSection();
      showToast(`${data.length} óbitos importados com sucesso!`, 'success');
    } catch {
      showToast('Ficheiro JSON inválido.', 'danger');
    }
  };
  reader.readAsText(file);
}

/* ─────────────────────────────────────────────
   FILE → BASE64
───────────────────────────────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Erro ao ler ficheiro'));
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────────────────────────────
   TOAST
───────────────────────────────────────────── */
function showToast(msg, type = 'info') {
  const icons = {
    success: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    danger:  '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    info:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></svg>',
  };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = (icons[type] || icons.info) + sanitize(msg);
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ─────────────────────────────────────────────
   CONFIRM DIALOG
───────────────────────────────────────────── */
function showConfirm(title, text, onConfirm) {
  const overlay = document.getElementById('confirmOverlay');
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent  = text;
  overlay.classList.add('show');

  document.getElementById('confirmOk').onclick = () => {
    overlay.classList.remove('show');
    onConfirm();
  };
  document.getElementById('confirmCancel').onclick = () => {
    overlay.classList.remove('show');
  };
}

/* ─────────────────────────────────────────────
   SESSION
───────────────────────────────────────────── */
function isLoggedIn() {
  return window.ARCANJOS_PHP_AUTH === true || sessionStorage.getItem(CFG.SESSION_KEY) === '1';
}

function login() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  sessionStorage.setItem(CFG.SESSION_KEY, '1');
  renderListSection();
  updateCondBadge();
}

function logout() {
  if (window.ARCANJOS_PHP_AUTH === true) {
    window.location.href = '/admin/logout.php';
    return;
  }
  sessionStorage.removeItem(CFG.SESSION_KEY);
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('loginPwd').value = '';
}

/* ─────────────────────────────────────────────
   NAVEGAÇÃO (seções)
───────────────────────────────────────────── */
function showSection(section) {
  STATE.currentSection = section;
  document.querySelectorAll('.main__section').forEach(s => s.style.display = 'none');
  const el = document.getElementById(`section-${section}`);
  if (el) el.style.display = 'block';

  document.querySelectorAll('.sidebar__nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });

  const titles = { list: 'Gestão de Óbitos', form: STATE.editingId ? 'Editar Óbito' : 'Novo Óbito', condolencias: 'Condolências', testemunhos: 'Testemunhos' };
  document.getElementById('sectionTitle').textContent = titles[section] || '';
}

/* ─────────────────────────────────────────────
   SEÇÃO: LISTA DE ÓBITOS
───────────────────────────────────────────── */
function renderListSection() {
  showSection('list');
  const search   = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const tab      = STATE.currentTab;
  const listEl   = document.getElementById('obitosList');
  const emptyEl  = document.getElementById('listEmpty');

  let filtered = STATE.obitos.filter(o => {
    const matchSearch = !search || (o.nome || '').toLowerCase().includes(search) || (o.local_velorio || '').toLowerCase().includes(search);
    const matchTab = tab === 'publicados' ? o.ativo : !o.ativo;
    return matchSearch && matchTab;
  });

  // Ordem: destaques primeiro, depois por data de criação desc
  filtered.sort((a, b) => {
    if (a.destaque && !b.destaque) return -1;
    if (!a.destaque && b.destaque) return 1;
    return new Date(b.criado_em || 0) - new Date(a.criado_em || 0);
  });

  // Contagem das tabs
  document.getElementById('tabCountPublicados').textContent = STATE.obitos.filter(o => o.ativo).length;
  document.getElementById('tabCountRascunhos').textContent  = STATE.obitos.filter(o => !o.ativo).length;

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';
  listEl.innerHTML = filtered.map(renderObitoCard).join('');
}

function renderObitoCard(o) {
  const nome  = sanitize(o.nome || 'Sem nome');
  const anos  = `${formatDateShort(o.data_nascimento) || o.ano_nascimento || '?'} — ${formatDateShort(o.data_falecimento) || o.ano_falecimento || '?'}`;
  const local = sanitize(o.local_velorio || '');
  const hora  = sanitize(o.horario_velorio || '');
  const condCount = STATE.condolencias.filter(c => c.obitoId === o.id).length;
  const pendCount = STATE.condolencias.filter(c => c.obitoId === o.id && !c.aprovado && c.aprovado !== 'rejeitada').length;

  let imgSrc = o._imgBase64 || o.foto;
  if (imgSrc && !imgSrc.startsWith('data:') && !imgSrc.startsWith('http') && !imgSrc.startsWith('../')) {
    imgSrc = '../' + imgSrc;
  }

  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${nome}" style="width:100%;height:100%;object-fit:cover;">`
    : `<div class="obito-list-card__thumb-placeholder"><svg viewBox="0 0 24 24" style="width:28px;height:28px;stroke:#B0A89E;fill:none;stroke-width:1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

  const pdfIcon = o._pdfBase64 || o.pdf
    ? `<svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:#4CAF7D;fill:none;stroke-width:2;stroke-linecap:round;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> PDF`
    : '';
    
  const noPdfIcon = `<svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:#B0A89E;fill:none;stroke-width:2;stroke-linecap:round;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg> Sem PDF`;

  const dataCriacao = o.criado_em ? new Date(o.criado_em).toLocaleDateString('pt-PT', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'Desconhecida';

  return `
  <div class="obito-list-card" id="card-${o.id}">
    <div class="obito-list-card__thumb">${imgHtml}</div>
    <div class="obito-list-card__info">
      <div class="obito-list-card__name">${nome}</div>
      <div class="obito-list-card__dates">✦ ${anos}</div>
      <div class="obito-list-card__meta">
        ${local ? `<span><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${local}</span>` : ''}
        ${hora ? `<span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${hora}</span>` : ''}
        <span>${o._pdfBase64 || o.pdf ? pdfIcon : noPdfIcon}</span>
        <span><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>${condCount} condolência${condCount !== 1 ? 's' : ''}${pendCount > 0 ? ` <span style="color:var(--danger);font-weight:700;">(${pendCount} pendente${pendCount > 1 ? 's' : ''})</span>` : ''}</span>
        <span>📅 Pub: ${dataCriacao}</span>
        ${o.destaque ? '<span class="status-badge status-badge--highlight">⭐ Destaque</span>' : ''}
        <span class="status-badge ${o.ativo ? 'status-badge--published' : 'status-badge--draft'}">${o.ativo ? 'Publicado' : 'Rascunho'}</span>
      </div>
    </div>
    <div class="obito-list-card__actions">
      <button class="btn btn-ghost btn-sm" onclick="editObito('${o.id}')" title="Editar">
        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn btn-ghost btn-sm" onclick="togglePublish('${o.id}')" title="${o.ativo ? 'Despublicar' : 'Publicar'}">
        <svg viewBox="0 0 24 24">${o.ativo ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>' : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'}</svg>
      </button>
      <button class="btn btn-danger btn-sm" onclick="removeObito('${o.id}')" title="Remover">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
      </button>
    </div>
  </div>`;
}

/* ─────────────────────────────────────────────
   CRUD ÓBITOS
───────────────────────────────────────────── */
function newObito() {
  STATE.editingId = null;
  STATE.imgBase64 = null;
  STATE.pdfBase64 = null;
  STATE.pdfFileName = null;
  STATE.imgFileName = null;
  clearForm();
  showSection('form');
  updatePreview();
}

function editObito(id) {
  const o = STATE.obitos.find(x => x.id === id);
  if (!o) return;
  STATE.editingId = id;
  STATE.pdfDeleted = false;
  STATE.imgDeleted = false;
  STATE.imgBase64 = o._imgBase64 || null;
  STATE.pdfBase64 = o._pdfBase64 || null;
  STATE.pdfFileName = o._pdfFileName || null;
  STATE.imgFileName = o._imgFileName || null;
  fillForm(o);
  showSection('form');
  updatePreview();
}

function fillForm(o) {
  setValue('fNome', o.nome || '');
  setValue('fNascimento', o.data_nascimento || '');
  setValue('fFalecimento', o.data_falecimento || '');
  setValue('fLocal', o.local_velorio || '');
  setValue('fHorario', o.horario_velorio || '');
  setValue('fObservacoes', o.observacoes || '');
  setValue('fFotoPath', o.foto || '');
  setValue('fPdfPath', o.pdf || '');

  // Radio tipo cerimónia
  document.querySelectorAll('.radio-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.value === (o.tipo_cerimonia || 'velorio'));
  });

  // Toggles
  setToggle('toggleAtivo', o.ativo !== false);
  setToggle('toggleDestaque', !!o.destaque);
  setToggle('toggleCondolencias', o.condolencias_abertas !== false);

  // Preview da imagem carregada
  if (STATE.imgBase64 || o.foto) {
    showImgPreview(STATE.imgBase64 || o.foto, o._imgFileName || o.foto);
  } else {
    clearImgPreview();
  }

  // Preview do PDF carregado
  if (STATE.pdfBase64 || o.pdf) {
    showPdfPreview(o._pdfFileName || o.pdf, o._pdfFileSize || null);
  } else {
    clearPdfPreview();
  }
}

function clearForm() {
  ['fNome','fNascimento','fFalecimento','fLocal','fHorario','fObservacoes','fFotoPath','fPdfPath'].forEach(id => setValue(id, ''));
  document.querySelectorAll('.radio-option').forEach((opt, i) => opt.classList.toggle('selected', i === 0));
  setToggle('toggleAtivo', true);
  setToggle('toggleDestaque', false);
  setToggle('toggleCondolencias', true);
  clearImgPreview();
  clearPdfPreview();
  // Reset file inputs
  ['fileImagem', 'filePdf'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function getValue(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function setToggle(id, checked) {
  const item = document.getElementById(id);
  if (!item) return;
  item.classList.toggle('checked', checked);
  const input = item.querySelector('input[type="checkbox"]');
  if (input) input.checked = checked;
}

function getToggle(id) {
  const item = document.getElementById(id);
  return item ? item.classList.contains('checked') : false;
}

function getRadioValue(name) {
  const selected = document.querySelector(`.radio-option.selected[data-name="${name}"]`);
  return selected ? selected.dataset.value : 'velorio';
}

function saveForm(publish = null) {
  const nome = getValue('fNome');
  if (!nome) { showToast('O nome é obrigatório.', 'danger'); return; }

  const localPath = getValue('fFotoPath');
  const pdfPath   = getValue('fPdfPath');

  const isAtivo = publish !== null ? publish : getToggle('toggleAtivo');

  const obitoData = {
    id:                  STATE.editingId || generateId(),
    nome,
    data_nascimento:     getValue('fNascimento'),
    data_falecimento:    getValue('fFalecimento'),
    ano_nascimento:      getValue('fNascimento') ? parseInt(getValue('fNascimento').split('-')[0]) : null,
    ano_falecimento:     getValue('fFalecimento') ? parseInt(getValue('fFalecimento').split('-')[0]) : null,
    tipo_cerimonia:      getRadioValue('tipoCerimonia'),
    local_velorio:       getValue('fLocal'),
    horario_velorio:     getValue('fHorario'),
    foto:                localPath || (STATE.imgBase64 ? `obitos/imagens/${nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.jpg` : ''),
    pdf:                 STATE.pdfDeleted ? '' : (pdfPath || (STATE.pdfBase64 ? `obitos/pdfs/${STATE.pdfFileName || nome.toLowerCase().replace(/\s+/g, '-') + '.pdf'}` : '')),
    ativo:               isAtivo,
    destaque:            getToggle('toggleDestaque'),
    condolencias_abertas: getToggle('toggleCondolencias'),
    observacoes:         getValue('fObservacoes'),
    nota:                getValue('fNota'), // Nova pequena nota para o site
    // Dados em base64 (usados apenas localmente para preview; não vão para o JSON final)
    _imgBase64:          STATE.imgBase64,
    _pdfBase64:          STATE.pdfBase64,
    _pdfFileName:        STATE.pdfFileName,
    _imgFileName:        STATE.imgFileName,
    _pdfFileSize:        STATE.pdfFileSize,
    _imgFileSize:        STATE.imgFileSize,
    criado_em:           STATE.editingId ? (STATE.obitos.find(o => o.id === STATE.editingId)?.criado_em || new Date().toISOString()) : new Date().toISOString(),
    atualizado_em:       new Date().toISOString(),
  };

  if (STATE.editingId) {
    const idx = STATE.obitos.findIndex(o => o.id === STATE.editingId);
    if (idx !== -1) STATE.obitos[idx] = obitoData;
  } else {
    STATE.obitos.unshift(obitoData);
  }

  saveObitos();
  showSection('list');
  renderListSection();
  showToast(STATE.editingId ? 'Óbito atualizado!' : (isAtivo ? 'Óbito publicado!' : 'Rascunho guardado!'), 'success');
  STATE.editingId = null;
}

function togglePublish(id) {
  const o = STATE.obitos.find(x => x.id === id);
  if (!o) return;
  o.ativo = !o.ativo;
  o.atualizado_em = new Date().toISOString();
  saveObitos();
  renderListSection();
  showToast(o.ativo ? 'Publicado!' : 'Despublicado.', 'info');
}

function removeObito(id) {
  const o = STATE.obitos.find(x => x.id === id);
  if (!o) return;
  showConfirm(
    'Remover Óbito',
    `Tem a certeza que quer remover "${o.nome}"? Esta ação não pode ser revertida.`,
    () => {
      STATE.obitos = STATE.obitos.filter(x => x.id !== id);
      saveObitos();
      renderListSection();
      showToast('Óbito removido.', 'danger');
    }
  );
}

/* ─────────────────────────────────────────────
   UPLOAD — IMAGEM
───────────────────────────────────────────── */
async function handleImgUpload(file) {
  if (!file) return;
  if (!file.type.match(/image\/(jpeg|png|webp)/)) {
    showToast('Formato inválido. Use JPG, PNG ou WebP.', 'danger'); return;
  }
  if (file.size > CFG.MAX_IMG_MB * 1024 * 1024) {
    showToast(`Imagem muito grande. Máx. ${CFG.MAX_IMG_MB}MB.`, 'danger'); return;
  }
  try {
    STATE.imgBase64 = await fileToBase64(file);
    STATE.imgFileName = file.name;
    STATE.imgFileSize = file.size;
    showImgPreview(STATE.imgBase64, file.name);
    updatePreview();
    showToast('Imagem carregada!', 'success');
  } catch {
    showToast('Erro ao carregar imagem.', 'danger');
  }
}

function showImgPreview(src, name) {
  const zone    = document.getElementById('imgUploadZone');
  const preview = document.getElementById('imgPreview');
  const img     = document.getElementById('imgPreviewEl');
  if (!zone || !preview || !img) return;
  zone.style.display    = 'none';
  preview.classList.add('show');
  
  // Se o caminho for relativo (ex: obitos/imagens/...) e estivermos dentro de /admin/,
  // precisamos de recuar um nível (../obitos/imagens/...) para carregar corretamente no painel.
  if (src && !src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('../')) {
    img.src = '../' + src;
  } else {
    img.src = src;
  }
  img.alt = name || 'Foto do óbito';
}

function clearImgPreview() {
  const zone    = document.getElementById('imgUploadZone');
  const preview = document.getElementById('imgPreview');
  const input   = document.getElementById('fileImagem');
  if (zone)    zone.style.display = 'block';
  if (preview) preview.classList.remove('show');
  if (input)   input.value = '';
  setValue('fFotoPath', '');
  STATE.imgBase64 = null;
  STATE.imgFileName = null;
  STATE.imgFileSize = null;
  updatePreview();
}

/* ─────────────────────────────────────────────
   UPLOAD — PDF
───────────────────────────────────────────── */
async function handlePdfUpload(file) {
  if (!file) return;
  if (file.type !== 'application/pdf') {
    showToast('Apenas ficheiros PDF são aceites.', 'danger'); return;
  }
  if (file.size > CFG.MAX_PDF_MB * 1024 * 1024) {
    showToast(`PDF muito grande. Máx. ${CFG.MAX_PDF_MB}MB.`, 'danger'); return;
  }
  try {
    STATE.pdfBase64   = await fileToBase64(file);
    STATE.pdfFileName = file.name;
    STATE.pdfFileSize = file.size;
    showPdfPreview(file.name, file.size);
    showToast('PDF carregado! Estará disponível para download.', 'success');
  } catch {
    showToast('Erro ao carregar PDF.', 'danger');
  }
}

function showPdfPreview(name, size) {
  const zone    = document.getElementById('pdfUploadZone');
  const preview = document.getElementById('pdfPreview');
  const nameEl  = document.getElementById('pdfPreviewName');
  const sizeEl  = document.getElementById('pdfPreviewSize');
  if (!zone || !preview) return;
  zone.style.display = 'none';
  preview.classList.add('show');
  if (nameEl) nameEl.textContent = name || 'documento.pdf';
  if (sizeEl) sizeEl.textContent = formatBytes(size);
}

function clearPdfPreview() {
  const zone    = document.getElementById('pdfUploadZone');
  const preview = document.getElementById('pdfPreview');
  const input   = document.getElementById('filePdf');
  if (zone)    zone.style.display = 'block';
  if (preview) preview.classList.remove('show');
  if (input)   input.value = '';
  setValue('fPdfPath', '');
  STATE.pdfBase64 = null;
  STATE.pdfFileName = null;
  STATE.pdfFileSize = null;
  STATE.pdfDeleted  = true;
  updatePreview();
}

/* ─────────────────────────────────────────────
   DOWNLOAD DO PDF (para o admin pré-visualizar)
───────────────────────────────────────────── */
function downloadPdfPreview() {
  if (!STATE.pdfBase64) { showToast('Nenhum PDF carregado.', 'danger'); return; }
  const a = document.createElement('a');
  a.href = STATE.pdfBase64;
  a.download = STATE.pdfFileName || 'documento.pdf';
  a.click();
}

/* ─────────────────────────────────────────────
   PREVIEW DO CARD EM TEMPO REAL
───────────────────────────────────────────── */
function updatePreview() {
  const nome     = getValue('fNome') || 'Nome do(a) Falecido(a)';
  const nasc     = getValue('fNascimento');
  const falec    = getValue('fFalecimento');
  const local    = getValue('fLocal') || 'Local do velório';
  const hora     = getValue('fHorario') || 'Horário';
  const anoNasc  = nasc ? nasc.split('-')[0] : '????';
  const anoFalec = falec ? falec.split('-')[0] : '????';
  const temPdf   = !!(STATE.pdfBase64 || getValue('fPdfPath'));

  let imgSrc   = STATE.imgBase64 || getValue('fFotoPath') || null;

  document.getElementById('prevName').textContent  = nome;
  document.getElementById('prevDates').textContent = `✦ ${anoNasc} — ${anoFalec}`;
  document.getElementById('prevLocal').innerHTML = `
    <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:var(--gold);fill:none;stroke-width:2;flex-shrink:0;margin-top:2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
    <span>${sanitize(local)}</span>`;
  document.getElementById('prevHora').innerHTML = `
    <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:var(--gold);fill:none;stroke-width:2;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    <span>${sanitize(hora)}</span>`;

  const imgWrap = document.getElementById('prevImgWrap');
  if (imgSrc) {
    // Corrige caminho relativo para o preview lateral se estiver no admin
    if (imgSrc && !imgSrc.startsWith('data:') && !imgSrc.startsWith('http') && !imgSrc.startsWith('../')) {
      imgSrc = '../' + imgSrc;
    }
    imgWrap.innerHTML = `<img src="${imgSrc}" alt="${sanitize(nome)}" style="width:100%;height:160px;object-fit:cover;display:block;">`;
  } else {
    imgWrap.innerHTML = `<div class="preview-card__img-placeholder"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Carregue uma foto</div>`;
  }

  const pdfBtn = document.getElementById('prevPdfBtn');
  if (pdfBtn) {
    pdfBtn.style.opacity = temPdf ? '1' : '0.45';
    pdfBtn.title = temPdf ? 'PDF disponível para download' : 'Sem PDF carregado';
  }
}

/* ─────────────────────────────────────────────
   CONDOLÊNCIAS
───────────────────────────────────────────── */
function updateCondBadge() {
  const pending = STATE.condolencias.filter(c => !c.aprovado && c.aprovado !== 'rejeitada').length;
  const badge   = document.getElementById('condBadge');
  if (badge) {
    badge.textContent = pending;
    badge.classList.toggle('show', pending > 0);
  }
}

function renderCondSection() {
  showSection('condolencias');
  const tab = STATE.condTab;
  const container = document.getElementById('condList');

  let filtered;
  if (tab === 'pendentes')   filtered = STATE.condolencias.filter(c => !c.aprovado && c.aprovado !== 'rejeitada');
  else if (tab === 'aprovadas') filtered = STATE.condolencias.filter(c => c.aprovado === true);
  else                           filtered = STATE.condolencias.filter(c => c.aprovado === 'rejeitada');

  document.getElementById('condTabPendentes').textContent  = STATE.condolencias.filter(c => !c.aprovado && c.aprovado !== 'rejeitada').length;
  document.getElementById('condTabAprovadas').textContent  = STATE.condolencias.filter(c => c.aprovado === true).length;
  document.getElementById('condTabRejeitadas').textContent = STATE.condolencias.filter(c => c.aprovado === 'rejeitada').length;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><h3>Nenhuma condolência</h3><p>Não há mensagens nesta categoria.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const obito = STATE.obitos.find(o => o.id === c.obitoId);
    return `
    <div class="condolencia-card">
      <div class="condolencia-card__header">
        <div>
          <div class="condolencia-card__author">${sanitize(c.autor)}</div>
          <div class="condolencia-card__email">📧 ${sanitize(c.email)}</div>
        </div>
        ${obito ? `<span class="condolencia-card__for">Para: ${sanitize(obito.nome)}</span>` : ''}
      </div>
      <div class="condolencia-card__date">${relativeTime(c.data)} · ${new Date(c.data).toLocaleString('pt-PT')}</div>
      <div class="condolencia-card__message">"${sanitize(c.mensagem)}"</div>
      <div class="condolencia-card__actions">
        ${tab === 'pendentes' ? `
          <button class="btn btn-success btn-sm" onclick="approveCondolencia('${c.id}')">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Aprovar
          </button>
          <button class="btn btn-danger btn-sm" onclick="rejectCondolencia('${c.id}')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Rejeitar
          </button>` : ''}
        <a href="mailto:${sanitize(c.email)}?subject=Condolências — ${sanitize(obito?.nome || '')}" class="btn btn-ghost btn-sm">
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Responder
        </a>
        <button class="btn btn-danger btn-sm" onclick="deleteCondolencia('${c.id}')">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          Eliminar
        </button>
      </div>
    </div>`;
  }).join('');
}

function approveCondolencia(id) {
  const c = STATE.condolencias.find(x => x.id === id);
  if (c) { c.aprovado = true; saveCondolencias(); renderCondSection(); updateCondBadge(); showToast('Condolência aprovada!', 'success'); }
}

function rejectCondolencia(id) {
  const c = STATE.condolencias.find(x => x.id === id);
  if (c) { c.aprovado = 'rejeitada'; saveCondolencias(); renderCondSection(); updateCondBadge(); showToast('Condolência rejeitada.', 'info'); }
}

function deleteCondolencia(id) {
  showConfirm('Eliminar Condolência', 'Tem a certeza? Esta ação não pode ser revertida.', () => {
    STATE.condolencias = STATE.condolencias.filter(x => x.id !== id);
    saveCondolencias();
    renderCondSection();
    updateCondBadge();
    showToast('Condolência eliminada.', 'danger');
  });
}

/* ─────────────────────────────────────────────
   DRAG & DROP HELPERS
───────────────────────────────────────────── */
function setupDragDrop(zoneId, handler) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handler(file);
  });
}

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  try {
    loadFromStorage();
  } catch(e) {
    console.error("Erro no loadFromStorage:", e);
  }

  // Se sessão ativa, mostrar app diretamente
  if (isLoggedIn()) {
    try {
      const loginScreen = document.getElementById('login-screen');
      const appEl = document.getElementById('app');
      if (loginScreen) loginScreen.style.display = 'none';
      if (appEl) appEl.classList.add('visible');
    } catch(e) {
      console.error("Erro ao alternar visibilidade inicial:", e);
    }
    
    try {
      renderListSection();
    } catch(e) {
      console.error("Erro no renderListSection:", e);
    }
    
    try {
      updateCondBadge();
    } catch(e) {
      console.error("Erro no updateCondBadge:", e);
    }
  }

  /* --- Login --- */
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd  = document.getElementById('loginPwd').value;
    const hash = await hashPassword(pwd);
    const errEl = document.getElementById('loginError');
    if (hash === CFG.PASSWORD_HASH) {
      errEl.classList.remove('show');
      login();
    } else {
      errEl.textContent = 'Senha incorreta. Tente novamente.';
      errEl.classList.add('show');
      document.getElementById('loginPwd').value = '';
      document.getElementById('loginPwd').focus();
    }
  });

  /* --- Navegação sidebar --- */
  document.querySelectorAll('.sidebar__nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      if (section === 'list') renderListSection();
      else if (section === 'condolencias') renderCondSection();
      else if (section === 'testemunhos') renderTestSection();
      else showSection(section);
    });
  });

  /* --- Logout --- */
  document.getElementById('btnLogout').addEventListener('click', logout);

  /* --- Novo Óbito --- */
  document.getElementById('btnNewObito').addEventListener('click', newObito);

  /* --- Pesquisa --- */
  document.getElementById('searchInput').addEventListener('input', renderListSection);

  /* --- Tabs lista --- */
  document.querySelectorAll('[data-list-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.currentTab = btn.dataset.listTab;
      document.querySelectorAll('[data-list-tab]').forEach(b => b.classList.toggle('active', b === btn));
      renderListSection();
    });
  });

  /* --- Tabs condolências --- */
  document.querySelectorAll('[data-cond-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.condTab = btn.dataset.condTab;
      document.querySelectorAll('[data-cond-tab]').forEach(b => b.classList.toggle('active', b === btn));
      renderCondSection();
    });
  });

  /* --- Radio tipo cerimónia --- */
  document.querySelectorAll('.radio-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      updatePreview();
    });
  });

  /* --- Toggles --- */
  document.querySelectorAll('.toggle-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Impede propagação duplicada se o clique vier do checkbox nativo invisível
      if (e.target.tagName === 'INPUT') return;
      
      e.preventDefault();
      item.classList.toggle('checked');
      const input = item.querySelector('input[type="checkbox"]');
      if (input) {
        input.checked = item.classList.contains('checked');
        // Força preview a atualizar
        updatePreview();
      }
    });
  });

  /* --- Upload Imagem --- */
  document.getElementById('fileImagem').addEventListener('change', e => handleImgUpload(e.target.files[0]));
  setupDragDrop('imgUploadZone', handleImgUpload);
  document.getElementById('btnRemoveImg').addEventListener('click', clearImgPreview);

  /* --- Upload PDF --- */
  document.getElementById('filePdf').addEventListener('change', e => handlePdfUpload(e.target.files[0]));
  setupDragDrop('pdfUploadZone', handlePdfUpload);
  document.getElementById('btnRemovePdf').addEventListener('click', clearPdfPreview);
  document.getElementById('btnDownloadPdfPreview').addEventListener('click', downloadPdfPreview);

  /* --- Preview em tempo real --- */
  ['fNome','fNascimento','fFalecimento','fLocal','fHorario'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });

  /* --- Formulário: guardar / publicar --- */
  document.getElementById('btnSaveDraft').addEventListener('click', () => saveForm(false));
  document.getElementById('btnPublish').addEventListener('click', () => saveForm(true));
  document.getElementById('btnCancelForm').addEventListener('click', () => { renderListSection(); });

  /* --- Exportar JSON --- */
  document.getElementById('btnExport').addEventListener('click', exportJSON);

  /* --- Importar JSON --- */
  document.getElementById('fileImportJson').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importJSON(file);
    e.target.value = '';
  });

  /* --- Confirmar overlay: fechar ao clicar fora --- */
  document.getElementById('confirmOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('confirmOverlay')) {
      document.getElementById('confirmOverlay').classList.remove('show');
    }
  });

  /* --- Mobile: toggle sidebar --- */
  document.getElementById('btnMenuToggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('open');
  });

  /* --- Campo path manual (FTP) dispara preview --- */
  document.getElementById('fFotoPath')?.addEventListener('input', () => {
    const val = getValue('fFotoPath');
    if (val) showImgPreview(val, val.split('/').pop());
    else clearImgPreview();
    updatePreview();
  });
});

/* ═══════════════════════════════════════════════════
   MÓDULO: TESTEMUNHOS
   CRUD completo — localStorage → exportar JSON → FTP.
═══════════════════════════════════════════════════ */

const STORAGE_KEY_TEST = 'arcanjos_testemunhos';
let testEditingId = null;

function loadTestemunhos() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_TEST)) || getDefaultTestemunhos(); }
  catch { return getDefaultTestemunhos(); }
}

// Busca testemunhos do servidor (source of truth) e atualiza localStorage
function syncTestemunhosFromServer() {
  fetch('../data/testemunhos.json?t=' + Date.now())
    .then(res => res.ok ? res.json() : Promise.reject('fetch failed'))
    .then(data => {
      if (data && data.length > 0) {
        localStorage.setItem(STORAGE_KEY_TEST, JSON.stringify(data));
        renderTestListCards();
      }
    })
    .catch(() => { /* offline — usa localStorage como está */ });
}
function saveTestemunhos(list) {
  localStorage.setItem(STORAGE_KEY_TEST, JSON.stringify(list));
  fetch('save_data.php?type=testemunhos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list)
  })
  .then(r => r.ok ? showToast('Sincronizado com o servidor!', 'success') : showToast('Aviso: Falha ao sincronizar testemunhos com o servidor.', 'danger'))
  .catch(() => showToast('Aviso: Erro de rede ao sincronizar testemunhos.', 'danger'));
}

function getSortedTestemunhos() {
  return loadTestemunhos().slice().sort((a, b) => {
    const activeA = a.ativo === false ? 0 : 1;
    const activeB = b.ativo === false ? 0 : 1;
    if (activeA !== activeB) return activeB - activeA;
    return new Date(b.criado_em || 0) - new Date(a.criado_em || 0);
  });
}

function getTestemunhoPageCount(list) {
  return Math.max(1, Math.ceil(list.length / STATE.testPerPage));
}

function clampTestemunhoPage(totalPages) {
  STATE.testPage = Math.min(Math.max(STATE.testPage, 0), totalPages - 1);
}

function goTestPage(page) {
  const list = getSortedTestemunhos();
  const totalPages = getTestemunhoPageCount(list);
  STATE.testPage = Math.min(Math.max(page, 0), totalPages - 1);
  renderTestListCards();
}

function changeTestPage(delta) {
  goTestPage(STATE.testPage + delta);
}

function formatTestemunhoDate(iso) {
  if (!iso) return 'Data não informada';
  try {
    return new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function buildTestemunhoPageButtons(totalPages) {
  if (totalPages <= 1) return '';

  const current = STATE.testPage;
  const last = totalPages - 1;
  const pages = new Set([0, last]);
  for (let i = Math.max(1, current - 1); i <= Math.min(last - 1, current + 1); i++) {
    pages.add(i);
  }

  const ordered = [...pages].sort((a, b) => a - b);
  const buttons = [];
  let prev = -1;

  ordered.forEach((page) => {
    if (page - prev > 1) {
      buttons.push('<span class="pagination-ellipsis">...</span>');
    }
    buttons.push(
      `<button class="pagination-btn${page === current ? ' is-active' : ''}" type="button" onclick="goTestPage(${page})" aria-label="Página ${page + 1}">${page + 1}</button>`
    );
    prev = page;
  });

  return buttons.join('');
}

function getDefaultTestemunhos() {
  return [
    { id:'test-001', nome:'Ana Rodrigues',  inicial:'A', avaliacao:5, texto:'Um serviço impecável num momento tão difícil. Toda a equipa foi extraordinariamente profissional e humana. Recomendo sem hesitação.', ativo:true, criado_em:'2024-11-10' },
    { id:'test-002', nome:'Carlos Mendes',  inicial:'C', avaliacao:5, texto:'Ficámos muito agradecidos pelo cuidado e atenção dedicados à nossa família. Tudo foi tratado com dignidade e respeito.', ativo:true, criado_em:'2024-12-03' },
    { id:'test-003', nome:'Maria Santos',   inicial:'M', avaliacao:5, texto:'Profissionais excecionais. Ajudaram-nos em tudo, desde a documentação até à cerimónia. Eternamente gratos.', ativo:true, criado_em:'2025-01-15' },
    { id:'test-004', nome:'João Ferreira',  inicial:'J', avaliacao:5, texto:'Num momento de grande dor, a equipa da Arcanjos fez toda a diferença. Atendimento 24h, disponíveis e presentes.', ativo:true, criado_em:'2025-02-20' },
    { id:'test-005', nome:'Sofia Almeida',  inicial:'S', avaliacao:5, texto:'Excelente serviço. A ornamentação floral ficou linda e toda a cerimónia foi conduzida com muito respeito e profissionalismo.', ativo:true, criado_em:'2025-03-08' },
    { id:'test-006', nome:'Pedro Costa',    inicial:'P', avaliacao:5, texto:'Recomendo a Funerária Arcanjos a todas as famílias. Transparência, profissionalismo e um calor humano admirável.', ativo:true, criado_em:'2025-04-01' }
  ];
}

function renderTestSection() {
  showSection('testemunhos');
  document.getElementById('sectionTitle').textContent = 'Testemunhos';
  renderTestListCards();
  wireTestButtons();
  syncTestemunhosFromServer(); // Busca dados reais do servidor
}

function wireTestButtons() {
  document.getElementById('btnNovoTest').onclick   = () => openTestForm(null);
  document.getElementById('btnCancelarTest').onclick = closeTestForm;
  document.getElementById('btnSalvarTest').onclick = saveTestemunho;
  document.getElementById('btnExportTest').onclick = exportTestJSON;
}

function renderTestList() {
  const list = loadTestemunhos();
  const el   = document.getElementById('testList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<p class="empty-state">Nenhum testemunho ainda. Adicione o primeiro!</p>';
    return;
  }
  el.innerHTML = list.map(t => {
    const stars = '★'.repeat(t.avaliacao) + '☆'.repeat(5 - t.avaliacao);
    const badge = t.ativo
      ? '<span class="status-badge status-badge--active">Publicado</span>'
      : '<span class="status-badge status-badge--draft">Rascunho</span>';
    return `
      <div class="obito-card" style="margin-bottom:12px;">
        <div class="obito-card__info">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;font-size:1rem;border-radius:50%;background:var(--gold);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${t.inicial || t.nome[0]}</div>
            <div>
              <div style="font-weight:600;color:var(--charcoal);font-size:.95rem;">${t.nome}</div>
              <div style="color:var(--gold);font-size:.8rem;letter-spacing:2px;">${stars}</div>
            </div>
          </div>
          <p style="margin-top:8px;font-size:.875rem;color:var(--text-muted);font-style:italic;">&ldquo;${t.texto}&rdquo;</p>
          <div style="margin-top:8px;">${badge}</div>
        </div>
        <div class="obito-card__actions">
          <button class="btn btn-ghost btn-sm" onclick="editTest('${t.id}')">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="btn btn-ghost btn-sm" onclick="toggleTest('${t.id}')">
            ${t.ativo ? '⏸ Ocultar' : '▶ Publicar'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteTest('${t.id}')">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            Apagar
          </button>
        </div>
      </div>`;
  }).join('');
}

function renderTestListCards() {
  const list = getSortedTestemunhos();
  const el = document.getElementById('testList');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<p class="empty-state">Nenhum testemunho ainda. Adicione o primeiro!</p>';
    return;
  }

  const totalPages = getTestemunhoPageCount(list);
  clampTestemunhoPage(totalPages);

  const start = STATE.testPage * STATE.testPerPage;
  const pageItems = list.slice(start, start + STATE.testPerPage);
  const end = start + pageItems.length;

  el.innerHTML = `
    <div class="testimonials-toolbar">
      <div class="testimonials-toolbar__summary">
        Mostrando <strong>${start + 1}-${end}</strong> de <strong>${list.length}</strong> testemunhos
      </div>
      <div class="testimonials-toolbar__meta">
        ${totalPages} página${totalPages > 1 ? 's' : ''} disponível${totalPages > 1 ? 'eis' : ''}
      </div>
    </div>
    <div class="testimonials-grid">
      ${pageItems.map(t => {
        const rating = Math.max(1, Math.min(5, Number(t.avaliacao) || 5));
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        const badge = t.ativo
          ? '<span class="status-badge status-badge--published">Publicado</span>'
          : '<span class="status-badge status-badge--draft">Rascunho</span>';
        const initial = (t.inicial || t.nome?.[0] || '?').toUpperCase();
        const text = t.texto || '';
        const excerpt = sanitize(text).slice(0, 220);
        return `
          <article class="testimonial-card">
            <div class="testimonial-card__top">
              <div class="testimonial-card__head">
                <div class="testimonial-card__identity">
                  <div class="testimonial-card__avatar" aria-hidden="true">${sanitize(initial)}</div>
                  <div>
                    <div class="testimonial-card__name">${sanitize(t.nome || 'Sem nome')}</div>
                    <div class="testimonial-card__rating" aria-label="${rating} de 5 estrelas">${stars}</div>
                  </div>
                </div>
                ${badge}
              </div>
              <div class="testimonial-card__meta">
                <span>${formatTestemunhoDate(t.criado_em)}</span>
                <span>•</span>
                <span>${t.ativo ? 'Visível no site' : 'Oculto do site'}</span>
              </div>
            </div>
            <div class="testimonial-card__text">
              &ldquo;${excerpt}${text.length > 220 ? '…' : ''}&rdquo;
            </div>
            <div class="testimonial-card__footer">
              <div class="testimonial-card__actions">
                <button class="btn btn-ghost btn-sm" onclick="editTest('${t.id}')">
                  <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editar
                </button>
                <button class="btn btn-ghost btn-sm" onclick="toggleTest('${t.id}')">
                  ${t.ativo ? 'Ocultar' : 'Publicar'}
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteTest('${t.id}')">
                  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  Apagar
                </button>
              </div>
            </div>
          </article>
        `;
      }).join('')}
    </div>
    <div class="testimonials-pagination">
      <button class="pagination-btn" type="button" onclick="changeTestPage(-1)" ${STATE.testPage === 0 ? 'disabled' : ''}>
        Anterior
      </button>
      <div class="testimonials-pagination__pages">
        ${buildTestemunhoPageButtons(totalPages)}
      </div>
      <button class="pagination-btn" type="button" onclick="changeTestPage(1)" ${STATE.testPage >= totalPages - 1 ? 'disabled' : ''}>
        Próxima
      </button>
    </div>
  `;
}

function openTestForm(id) {
  testEditingId = id;
  const form = document.getElementById('testForm');
  form.style.display = 'block';
  document.getElementById('testFormTitle').textContent = id ? 'Editar Testemunho' : 'Novo Testemunho';
  if (id) {
    const t = loadTestemunhos().find(x => x.id === id);
    if (!t) return;
    document.getElementById('testNome').value      = t.nome;
    document.getElementById('testAvaliacao').value = t.avaliacao;
    document.getElementById('testTexto').value     = t.texto;
    document.getElementById('testAtivo').value     = String(t.ativo);
  } else {
    document.getElementById('testNome').value      = '';
    document.getElementById('testAvaliacao').value = '5';
    document.getElementById('testTexto').value     = '';
    document.getElementById('testAtivo').value     = 'true';
  }
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeTestForm() {
  document.getElementById('testForm').style.display = 'none';
  testEditingId = null;
}

function saveTestemunho() {
  const nome  = document.getElementById('testNome').value.trim();
  const texto = document.getElementById('testTexto').value.trim();
  if (!nome || !texto) { showToast('Preencha o nome e o testemunho.', 'error'); return; }
  const list = loadTestemunhos();
  if (testEditingId) {
    const idx = list.findIndex(x => x.id === testEditingId);
    if (idx > -1) {
      list[idx].nome = nome; list[idx].inicial = nome[0].toUpperCase();
      list[idx].avaliacao = Number(document.getElementById('testAvaliacao').value);
      list[idx].texto = texto;
      list[idx].ativo = document.getElementById('testAtivo').value === 'true';
    }
  } else {
    list.push({ id:'test-'+Date.now(), nome, inicial:nome[0].toUpperCase(),
      avaliacao:Number(document.getElementById('testAvaliacao').value), texto,
      ativo:document.getElementById('testAtivo').value==='true',
      criado_em:new Date().toISOString().split('T')[0] });
  }
  saveTestemunhos(list); closeTestForm(); renderTestListCards();
  showToast('Testemunho guardado!', 'success');
}

function editTest(id)   { openTestForm(id); }

function toggleTest(id) {
  const list = loadTestemunhos(), t = list.find(x => x.id === id);
  if (!t) return;
  t.ativo = !t.ativo;
  saveTestemunhos(list); renderTestListCards();
  showToast(t.ativo ? 'Testemunho publicado.' : 'Testemunho ocultado.', 'success');
}

function deleteTest(id) {
  showConfirm('Apagar testemunho?', 'Esta ação não pode ser desfeita.', () => {
    const next = loadTestemunhos().filter(x => x.id !== id);
    saveTestemunhos(next);
    const totalPages = getTestemunhoPageCount(next);
    clampTestemunhoPage(totalPages);
    renderTestListCards(); showToast('Testemunho apagado.', 'success');
  });
}

function exportTestJSON() {
  const blob = new Blob([JSON.stringify(loadTestemunhos(), null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href:url, download:'testemunhos.json' });
  a.click(); URL.revokeObjectURL(url);
  showToast('testemunhos.json exportado! Envie para data/ no servidor via FTP.', 'success');
}
