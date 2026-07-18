/* ============================================
   FUNERÁRIA ARCANJOS — Main JS
   Scroll animations, Mobile menu, Reviews,
   Scroll-Scrub Hero Video
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initScrollScrubVideo();
  initScrollReveal();
  initStickyHeader();
  initMobileMenu();
  initReviews();
  initSmoothScroll();
  initActiveNav();
  initCoverflow();
  initI18n();
});

/* === Scroll-Scrub Hero Video === */
/* WHY: The video plays forward as the user scrolls down and
   rewinds as they scroll up. The hero stays pinned (sticky)
   until the video reaches its end, then the page scrolls
   normally to the next section. */
function initScrollScrubVideo() {
  const wrapper = document.getElementById('heroWrapper');
  const video = document.getElementById('heroVideo');
  const scrollHint = document.getElementById('heroScrollHint');

  if (!wrapper || !video) return;

  // Pixels of scroll per second of video.
  // Higher = more scroll needed to play the full video.
  const SCROLL_PX_PER_SECOND = 500;

  let videoDuration = 0;
  let ticking = false;

  // Wait for video metadata to know duration
  function onMetadataReady() {
    videoDuration = video.duration;

    // Set wrapper height: viewport + scroll room for the video
    const scrollRoom = videoDuration * SCROLL_PX_PER_SECOND;
    wrapper.style.height = (window.innerHeight + scrollRoom) + 'px';

    // Force first frame visible
    video.currentTime = 0;

    // Start listening
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial position
  }

  if (video.readyState >= 1) {
    onMetadataReady();
  } else {
    video.addEventListener('loadedmetadata', onMetadataReady, { once: true });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateVideo);
  }

  function updateVideo() {
    ticking = false;

    // How far into the wrapper have we scrolled?
    const wrapperTop = wrapper.offsetTop;
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollIntoWrapper = scrollY - wrapperTop;

    // Total scrollable distance within the wrapper
    const maxScroll = wrapper.offsetHeight - window.innerHeight;

    if (maxScroll <= 0 || videoDuration <= 0) return;

    // Progress: 0 → 1
    const progress = Math.max(0, Math.min(1, scrollIntoWrapper / maxScroll));

    // Map to video time
    const targetTime = progress * videoDuration;

    // Only update if meaningfully different (avoids jitter)
    if (Math.abs(video.currentTime - targetTime) > 0.02) {
      video.currentTime = targetTime;
    }

    // Hide scroll hint after user starts scrolling
    if (scrollHint) {
      if (progress > 0.02) {
        scrollHint.classList.add('hidden');
      } else {
        scrollHint.classList.remove('hidden');
      }
    }
  }

  // Recalculate on resize
  window.addEventListener('resize', () => {
    if (videoDuration > 0) {
      const scrollRoom = videoDuration * SCROLL_PX_PER_SECOND;
      wrapper.style.height = (window.innerHeight + scrollRoom) + 'px';
    }
  });
}

/* === Scroll Reveal (IntersectionObserver) === */
let globalObserver = null;

function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger');

  globalObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        globalObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  if (reveals.length) {
    reveals.forEach(el => globalObserver.observe(el));
  }

  // Expõe a função globalmente para registrar novos elementos inseridos dinamicamente
  window._initReveal = function (elements) {
    if (!globalObserver) return;
    elements.forEach(el => globalObserver.observe(el));
  };
}

/* === Sticky Header === */
function initStickyHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  const scrollThreshold = 50;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > scrollThreshold) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
  }, { passive: true });
}

/* === Mobile Menu === */
function initMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mobileNav');
  const overlay = document.getElementById('mobileOverlay');

  if (!toggle || !nav || !overlay) return;

  function closeMenu() {
    toggle.classList.remove('active');
    nav.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openMenu() {
    toggle.classList.add('active');
    nav.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  toggle.addEventListener('click', () => {
    if (nav.classList.contains('active')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener('click', closeMenu);

  // Close on link click
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.classList.contains('mobile-nav__link--dropdown')) {
        e.preventDefault();
        const dropdown = link.nextElementSibling;
        if (dropdown) {
          dropdown.classList.toggle('active');
          link.classList.toggle('active');
        }
      } else {
        closeMenu();
      }
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('active')) {
      closeMenu();
    }
  });
}

/* === Google Reviews === */
function initReviews() {
  const track = document.getElementById('reviewsTrack');
  const prevBtn = document.getElementById('reviewsPrev');
  const nextBtn = document.getElementById('reviewsNext');

  if (!track) return;

  // Static reviews data
  const reviews = [
    {
      name: 'Ana Rodrigues',
      initial: 'A',
      rating: 5,
      text: 'Um serviço impecável num momento tão difícil. Toda a equipa foi extraordinariamente profissional e humana. Recomendo sem hesitação.'
    },
    {
      name: 'Carlos Mendes',
      initial: 'C',
      rating: 5,
      text: 'Ficámos muito agradecidos pelo cuidado e atenção dedicados à nossa família. Tudo foi tratado com dignidade e respeito.'
    },
    {
      name: 'Maria Santos',
      initial: 'M',
      rating: 5,
      text: 'Profissionais excecionais. Ajudaram-nos em tudo, desde a documentação até à cerimónia. Eternamente gratos.'
    },
    {
      name: 'João Ferreira',
      initial: 'J',
      rating: 5,
      text: 'Num momento de grande dor, a equipa da Arcanjos fez toda a diferença. Atendimento 24h, disponíveis e presentes.'
    },
    {
      name: 'Sofia Almeida',
      initial: 'S',
      rating: 5,
      text: 'Excelente serviço. A ornamentação floral ficou linda e toda a cerimónia foi conduzida com muito respeito e profissionalismo.'
    },
    {
      name: 'Pedro Costa',
      initial: 'P',
      rating: 5,
      text: 'Recomendo a Funerária Arcanjos a todas as famílias. Transparência, profissionalismo e um calor humano admirável.'
    }
  ];

  // Render reviews
  track.innerHTML = reviews.map(review => `
    <div class="review-card">
      <div class="review-card__header">
        <div class="review-card__avatar">${review.initial}</div>
        <div>
          <div class="review-card__name">${review.name}</div>
          <div class="review-card__stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
        </div>
      </div>
      <p class="review-card__text">"${review.text}"</p>
    </div>
  `).join('');

  // Carousel navigation
  if (prevBtn && nextBtn) {
    const scrollAmount = 360;

    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
  }
}

/* === Smooth Scroll === */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerHeight = document.getElementById('header')?.offsetHeight || 0;
        const topbarHeight = document.getElementById('topbar')?.offsetHeight || 0;
        const offset = headerHeight + topbarHeight;

        window.scrollTo({
          top: target.offsetTop - offset,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* === Active Nav Highlight === */
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link, .mobile-nav__link');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.remove('active');
          const href = link.getAttribute('href');
          if (href === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });

  sections.forEach(section => observer.observe(section));
}

/* === Coverflow Stage (Services) === */
function initCoverflow() {
  const stage = document.getElementById('stage');
  if (!stage) return;

  const services = [
    { key: 'item0', title: 'Funerais', url: 'funerais.html', img: 'img/funerais-carrossel.webp' },
    { key: 'item1', title: 'Funeral em Vida', url: 'funeral-em-vida.html', img: 'img/funeral-em-vida-carrossel.webp' },
    { key: 'item2', title: 'Planos Funerários', url: 'planos-funerarios.html', img: 'img/planos-funerarios-carrossel.webp' },
    { key: 'item3', title: 'Cremação', url: 'cremacao.html', img: 'img/cremacao-carrossel.webp' },
    { key: 'item4', title: 'Tanatoplastia (Reconstrução Facial)', url: 'tanatoplastia.html', img: 'img/tanatoplastia-carrossel.webp' },
    { key: 'item5', title: 'Ornamentação Floral', url: 'ornamentacao-floral.html', img: 'img/ORNAMENTACAO-CARROSSEL-SERVICOS.webp' },
    { key: 'item6', title: 'Tanatopraxia', url: 'tanatopraxia.html', img: 'img/tanatopraxia-carrossel.webp' },
    { key: 'item7', title: 'Transladações', url: 'transladacoes.html', img: 'img/transladacoes-carrossel.webp' },
    { key: 'item8', title: 'Funerais Internacionais', url: 'funerais-internacionais.html', img: 'img/funerais-internacionais-carrossel.webp' },
    { key: 'item9', title: 'Cerimónias Personalizadas', url: 'cerimonias-personalizadas.html', img: 'img/cerimonias-personalizadas-carrossel.webp' },
    { key: 'item10', title: 'Assessoria Documental', url: 'assessoria-documental.html', img: 'img/assessoria-documental-carrossel.webp' },
    { key: 'item12', title: 'Tanatoestética', url: 'tanatoestetica.html' }
  ];

  const n = services.length;
  const step = 'min(212px, 44vw)'; // Horizontal card spacing
  let rot = 0;        // Central card index (changes on hover, click or autoplay)
  let hovered = null; // Card currently hovered
  let autoplayTimer = null;

  const cards = services.map((s, i) => {
    const el = document.createElement('div');
    el.className = 'cf-card';
    
    // Use real image if defined, otherwise fall back to stripe pattern decoration
    let photoHtml = '<div class="cf-photo"><span>foto · ' + s.title + '</span></div>';
    if (s.img) {
      photoHtml = '<div class="cf-photo-img-wrapper"><img src="' + s.img + '" alt="' + s.title + '" class="cf-photo-img" loading="lazy" decoding="async"></div>';
    }
    
    el.innerHTML =
      photoHtml +
      '<div class="cf-scrim"></div>' +
      '<div class="cf-caption"><div class="cf-rule"></div>' +
      '<div class="cf-title" data-i18n="services.items.' + s.key + '">' + s.title + '</div></div>';
      
    el.addEventListener('mouseenter', () => { 
      hovered = i; 
      layout(); 
      stopAutoplay(); // Pause autoplay while mouse is over any card
    });
    
    el.addEventListener('mouseleave', () => { 
      hovered = null; 
      layout(); 
      startAutoplay(); // Resume autoplay when mouse leaves
    });

    el.addEventListener('click', () => {
      const r = ((rot % n) + n) % n;
      if (r === i) {
        window.location.href = s.url;
      } else {
        rot = i; // Center the clicked card (supports click & touch navigation)
        layout();
        startAutoplay(); // Reset autoplay timer
      }
    });
    
    stage.appendChild(el);
    return el;
  });

  // Prev/Next Navigation Buttons
  const prevBtn = document.getElementById('cfPrev');
  const nextBtn = document.getElementById('cfNext');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop click from triggering card click behind the button
      rot--;
      layout();
      startAutoplay(); // Reset autoplay timer
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      rot++;
      layout();
      startAutoplay(); // Reset autoplay timer
    });
  }

  function layout() {
    const r = ((rot % n) + n) % n;
    cards.forEach((el, i) => {
      const rel = ((i - r) % n + n) % n;
      const diff = rel <= n / 2 ? rel : rel - n; // Signed distance to center
      const abs = Math.abs(diff);
      const scale = Math.max(1 - abs * 0.11, 0.56);
      const isHover = hovered === i;
      const hoverScale = Math.min(scale + 0.28, 1.32);

      el.style.transform =
        'translate(-50%, -50%) translateX(calc(' + diff + ' * ' + step + ')) scale(' +
        (isHover ? hoverScale : scale) + ')';
      el.style.zIndex = isHover ? 300 : 100 - abs;
      el.style.opacity = abs > 3 ? 0 : 1;
      el.style.filter = (isHover || abs === 0) ? 'none'
        : 'brightness(' + (1 - abs * 0.09).toFixed(2) + ')';
      el.style.pointerEvents = abs > 3 ? 'none' : 'auto';
      el.style.boxShadow = isHover
        ? '0 36px 84px rgba(40, 30, 15, 0.46)'
        : (abs === 0 ? '0 24px 60px rgba(40, 30, 15, 0.30)'
                     : '0 14px 36px rgba(40, 30, 15, 0.18)');
    });
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(() => {
      rot++;
      layout();
    }, 4500); // Rotates slowly every 4.5 seconds
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  layout();
  startAutoplay();
}

/* === Internacionalização (i18n) === */
let translations = null;
let currentLang = localStorage.getItem('arcanjos_lang') || 'pt';

async function initI18n() {
  const switcherBtns = document.querySelectorAll('.lang-switcher .lang-switcher__btn');
  if (!switcherBtns.length) return;

  switcherBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const lang = e.currentTarget.getAttribute('data-lang');
      if (lang) {
        await setLanguage(lang);
      }
    });
  });

  await setLanguage(currentLang);
}

async function fetchTranslations() {
  if (translations) return translations;
  try {
    const response = await fetch('data/translations.json?v=' + Date.now());
    if (!response.ok) throw new Error('Falha ao carregar as traduções');
    translations = await response.json();
    return translations;
  } catch (err) {
    console.error('[i18n] Erro de carregamento:', err);
    return null;
  }
}

async function setLanguage(lang) {
  const dict = await fetchTranslations();
  if (!dict || !dict[lang]) return;

  currentLang = lang;
  localStorage.setItem('arcanjos_lang', lang);

  window.translateDOM();

  document.querySelectorAll('.lang-switcher').forEach(switcher => {
    switcher.querySelectorAll('.lang-switcher__btn').forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  });

  const htmlLangMap = {
    'pt': 'pt-PT',
    'es': 'es-ES',
    'en': 'en-US',
    'fr': 'fr-FR'
  };
  document.documentElement.setAttribute('lang', htmlLangMap[lang] || 'pt-PT');
}

function getNestedValue(obj, key) {
  return key.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : null;
  }, obj);
}

window.translateDOM = function(container = document) {
  if (!translations || !translations[currentLang]) return;
  container.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    let text = getNestedValue(translations[currentLang], key);
    if (text !== undefined && text !== null) {
      if (el.tagName.toLowerCase() === 'meta') {
        el.setAttribute('content', text);
      } else if (text.indexOf('<') !== -1 || key.endsWith('_html')) {
        el.innerHTML = text;
      } else {
        el.textContent = text;
      }
    }
  });
};
