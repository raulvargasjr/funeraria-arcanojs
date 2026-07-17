# Site Funerária Arcanjos — Plano de Implementação

## Visão Geral

Site institucional premium para a Funerária Arcanjos em Portugal. Design elegante em tons dourados e preto inspirado nas imagens de referência IA. Público-alvo inclui idosos — priorizando clareza, tamanhos de fonte generosos e navegação intuitiva.

**Stack:** HTML5 + CSS3 + Vanilla JS (zero frameworks)
**Animações:** Fade-in, slide-up, parallax suave via `IntersectionObserver` — CSS transitions, zero libraries
**Multi-idioma:** PT 🇵🇹 | ES 🇪🇸 | EN 🇬🇧 | FR 🇫🇷 — via JSON de traduções + JS switcher
**SEO:** Schema.org (FuneralHome), Open Graph, meta descriptions por página, sitemap.xml, robots.txt

---

## User Review Required

> [!IMPORTANT]
> **Dados Placeholder** — O número de WhatsApp, endereço, telefone, e-mail e redes sociais estão com valores placeholder. Será necessário substituí-los pelos dados reais antes do deploy.

> [!IMPORTANT]
> **Google Reviews** — O link compartilhado (`share.google/bLqpMB3Kytj7ptMKR`) não é uma API. As avaliações serão implementadas inicialmente com dados estáticos extraídos manualmente. Para atualização automática, seria necessário integrar a Google Places API (requer chave de API paga).

> [!NOTE]
> **Seção de Óbitos — RESOLVIDO** — O dono cria artes A4 no Photoshop (as mesmas que coloca na porta da funerária e igrejas). Ele vai subir a imagem + PDF pelo painel admin simples. Exibição em grid visual na página de óbitos com botão de download do PDF.

> [!NOTE]
> **Equipa — RESOLVIDO** — Tatiane Pinheiro e Vini Marcus confirmados como **Diretores** da Funerária Arcanjos. Seção "Quem Somos" com texto institucional.

---

## Open Questions

> [!IMPORTANT]
> 1. **Redes sociais:** Quais são os perfis (Instagram, Facebook, etc.) da Funerária Arcanjos? (placeholder por enquanto)
> 2. **Dados de contacto:** WhatsApp, telefone, endereço, e-mail (placeholder por enquanto)

---

## Design System (refinado a partir das imagens de referência)

### Identidade Visual — "Etéreo Premium"
O site deve transmitir **serenidade, calor e sofisticação**. Inspirado nas imagens de referência, o visual é:
- Tons quentes de **creme, dourado e branco** — nunca brancos frios ou cinzas
- **Glassmorphism suave** — painéis semi-transparentes com blur sobre imagens quentes (sunset, lírios, velas)
- **Ícones de linha fina** dourados sobre fundos claros
- **Bordas e separadores dourados** — linhas finas e losangos (◆) como elementos decorativos
- **Sem preto puro** — usar `#2D2D2D` para textos, `#1A1A1A` apenas para o header/fachada
- **Sombras quentes** — `rgba(197, 165, 90, 0.1)` em vez de cinza frio

### Paleta de Cores
| Token | Cor | Uso |
|-------|-----|-----|
| `--gold` | `#C5A55A` | Botões primários, ícones, linhas decorativas, acentos |
| `--gold-light` | `#D4B96E` | Hover states, destaques, gradientes |
| `--gold-dark` | `#A88B3D` | Texto dourado, labels tipo "ÓBITOS RECENTES" |
| `--gold-glow` | `rgba(197, 165, 90, 0.15)` | Box-shadow glow nos cards e botões |
| `--black` | `#1A1A1A` | Header, footer, fachada — uso restrito |
| `--charcoal` | `#2D2D2D` | Texto principal corpo |
| `--text-body` | `#4A4440` | Texto corpo secundário, parágrafos |
| `--white` | `#FFFDF9` | Fundo principal — branco quente, NUNCA `#FFF` puro |
| `--cream` | `#FAF7F2` | Fundos alternados de seção |
| `--warm-bg` | `#F5F0EB` | Backgrounds de cards, seção de óbitos |
| `--warm-overlay` | `rgba(250, 247, 242, 0.85)` | Overlay frosted glass sobre imagens |
| `--sunset-gradient` | `linear-gradient(135deg, #FAF7F2 0%, #F0E6D3 50%, #E8D5B5 100%)` | Gradiente quente para seções hero |
| `--text-muted` | `#8A8478` | Texto terciário, legendas |

### Glassmorphism & Frosted Glass
Efeito visível nas imagens de referência (painéis de texto sobre fotos quentes):
```css
.frosted-panel {
  background: rgba(250, 247, 242, 0.80);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(197, 165, 90, 0.15);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(197, 165, 90, 0.08);
}
```
**Onde usar:** Seções com imagem de fundo (hero, atendimento humanizado, agradecimento), cards de serviços sobre imagens, overlay de texto sobre fotografias.

### Botões
| Tipo | Estilo | Uso |
|------|--------|-----|
| **Primário** | Fundo dourado (`--gold`), texto branco, border-radius 8px, hover: `--gold-light` + glow | CTAs principais: WhatsApp, Descarregar PDF |
| **Secundário** | Outline dourado (borda `--gold`, fundo transparente), texto dourado, hover: fundo dourado suave | Condolências, Ver mais, links de ação |
| **Ghost** | Sem borda, texto dourado, hover: underline animado | Links de navegação, "Ver todos os óbitos →" |

**Todos os botões:** min 48x48px (acessibilidade), padding generoso (16px 32px), transição suave 0.3s.

### Tipografia
| Elemento | Font | Peso | Tamanho | Cor |
|----------|------|------|---------|-----|
| H1 (Hero) | Playfair Display | 700 | 56px → 36px mobile | `--charcoal` |
| H2 (Seção) | Playfair Display | 600 | 42px → 28px mobile | `--charcoal` |
| H3 (Card) | Playfair Display | 500 | 24px → 20px mobile | `--charcoal` |
| Label | Inter | 600 | 12px, letter-spacing: 3px | `--gold-dark` (uppercase) |
| Body | Inter | 400 | 18px → 16px mobile | `--text-body` |
| Small | Inter | 400 | 14px | `--text-muted` |
| Nav | Inter | 500 | 15px | `--charcoal` |
| Destaque/Citação | Playfair Display | 400 italic | 22px → 18px mobile | `--gold-dark` |

### Ícones
- Estilo: **Linha fina** (stroke, não filled) — dourados sobre fundo claro
- Tamanho: 48x48px nos cards de features, 24px inline
- Cor: `--gold` com hover `--gold-light`
- Referência: ícones do estilo das imagens (coração, mãos, escudo, balão, etc.)

### Elementos Decorativos
- **Losango dourado** (◆) como separador entre seções e títulos
- **Linha fina dourada** horizontal sob títulos (como nas imagens)
- **Logo dourado** (pena/anjo) presente em seções-chave
- **Aspas decorativas** em citações: `" "` grandes, douradas, estilo Playfair

### Animações Premium
- **Fade-up:** Elementos aparecem de baixo com `translateY(30px)` → `translateY(0)` + opacidade 0.8s ease-out
- **Fade-in:** Opacidade 0 → 1 com 0.6s ease-out (para textos)
- **Scale hover:** Cards com `scale(1.02)` + sombra dourada crescente
- **Gold line draw:** Linhas decorativas que "desenham" da esquerda para direita ao entrar no viewport
- **Parallax suave:** Background images com velocidade 0.3x no scroll
- **Smooth scroll:** `scroll-behavior: smooth` global
- **Glow pulse:** Botão WhatsApp com pulso suave dourado (`box-shadow` animado)
- **Glassmorphism reveal:** Painéis frosted que ganham opacidade ao entrar no viewport

---

## Proposed Changes

### Estrutura de Ficheiros

```
D:\FUNERÁRIA ARCANJO\site\
├── index.html                    ← Página principal (Single Page com âncoras)
├── obitos.html                   ← Página de Óbitos/Falecimentos
├── css/
│   ├── variables.css             ← Design tokens e custom properties
│   ├── base.css                  ← Reset, tipografia, utilitários
│   ├── components.css            ← Botões, cards, modais
│   ├── layout.css                ← Grid, seções, header, footer
│   ├── animations.css            ← Keyframes e classes de animação
│   └── responsive.css            ← Media queries (mobile-first)
├── js/
│   ├── main.js                   ← Inicialização, scroll, animations
│   ├── i18n.js                   ← Sistema de tradução multi-idioma
│   ├── translations.js           ← Dicionário PT/ES/EN/FR
│   ├── reviews.js                ← Carousel de avaliações Google
│   └── obitos.js                 ← Renderiza grid de óbitos a partir do JSON
├── data/
│   ├── obitos.json               ← Lista de óbitos (gerada pelo painel admin)
│   └── reviews.json              ← Avaliações do Google (estáticas)
├── obitos/                       ← Pasta dos ficheiros de óbitos
│   ├── imagens/                  ← Artes A4 em JPG/PNG (subidas pelo dono)
│   └── pdfs/                     ← PDFs para download (subidos pelo dono)
├── img/                          ← Imagens do projeto (copiadas de "imagens projeto")
├── admin-obitos.html             ← Painel simples para o dono gerir óbitos
├── sitemap.xml                   ← Sitemap para Google
├── robots.txt                    ← Directivas para crawlers
└── manifest.json                 ← PWA manifest (ícone na home do telemóvel)
```

---

### Página Principal (`index.html`) — Seções em ordem

#### 1. **Top Bar** (info de contacto rápido)
- Telefone 24h | Email | Redes sociais
- Seletor de idioma (🇵🇹 PT | 🇪🇸 ES | 🇬🇧 EN | 🇫🇷 FR)

#### 2. **Header / Navegação**
- Logo Arcanjos (dourado sobre fundo preto/branco)
- Menu: Início | Serviços | Sobre Nós | Óbitos | Avaliações | Contacto
- Menu hamburger elegante no mobile
- Header sticky com redução suave no scroll

#### 3. **Hero Section**
- Imagem de fundo: `chamada.jpg` (paisagem com lírio)
- Título: "Cuidamos de cada detalhe. Onde quer que a despedida aconteça."
- Subtítulo: "Agência Funerária"
- Botão CTA WhatsApp dourado: "Fale Connosco"
- Overlay gradiente para legibilidade

#### 4. **Soluções Completas** (ref: `solucoes.jpg`)
- Título: "Tranquilidade em Cada Escolha"
- Grid 2x4 com ícones dourados:
  - Atendimento 24 Horas
  - Equipa Especializada
  - Planos Personalizados
  - Segurança e Transparência
  - Estrutura Completa
  - Suporte Internacional
  - Personalização e Detalhes
  - Acolhimento que Conforta
- Frase de destaque em itálico

#### 5. **Serviços** (cards com imagens de referência)
- Título: "Os Nossos Serviços"
- Grid de cards com as imagens reais:
  - **Cremação** (`cremacao.jpg`) — "Uma escolha de amor, respeito e consciência"
  - **Ornamentação Floral** (`ornamentacao.jpg`) — "Um tributo de amor, respeito e eternidade"
  - **Tanatopraxia** (`tanatopraxia.jpg`) — "Cuidado, dignidade e respeito"
  - **Funeral em Vida** (`funeral em vida.jpg`) — "Planeie hoje, ofereça tranquilidade"
  - **Funeral Internacional** (`funeraria internacional.jpg`) — "Onde quer que esteja, cuidamos de tudo"
- Cada card com hover elegante + botão WhatsApp

#### 6. **Atendimento Humanizado** (ref: `atendimento humanizado.jpg`)
- Layout split: texto esquerda, imagem direita
- 6 ícones com descrições curtas
- Frase em destaque: "Acolher é o nosso propósito. Cuidar é o nosso compromisso."

#### 7. **Quem Somos**
- Título: "Quem Somos"
- Texto institucional sobre a história, missão e valores da Funerária Arcanjos
- Foco em: tradição familiar, presença em Portugal, compromisso com dignidade
- Subtítulo: "A Nossa Direção"
- **Tatiane Pinheiro** — Diretora | Foto profissional, breve texto sobre liderança e visão
- **Vini Marcus** — Diretor | Foto profissional, breve texto sobre compromisso e gestão
- Cards elegantes com bordas douradas, fotos circulares ou retangulares com cantos suaves
- Background com tom creme/warm-gray para destacar

#### 8. **Avaliações Google** (carousel)
- Título: "O Que Dizem Sobre Nós"
- Cards com: foto/inicial, nome, estrelas, texto da avaliação
- Nota média e selo Google
- Auto-scroll suave + navegação por setas

#### 9. **Agradecimento** (ref: `agradecimentos.jpg`)
- Seção emocional com fundo quente
- "O Nosso Mais Profundo Agradecimento"
- Valores: Respeito, Confiança, Cuidado, Dignidade, Excelência
- Frase: "A vossa confiança é o que nos inspira a ser melhores, todos os dias."

#### 10. **CTA Final / Contacto**
- Fundo escuro elegante
- Botão grande WhatsApp
- Telefone, e-mail, endereço completo
- Mapa Google Maps embed
- Horário de funcionamento

#### 11. **Footer**
- Logo, links de navegação, idiomas
- Redes sociais, informações legais
- © 2025 Funerária Arcanjos — Todos os direitos reservados

#### 12. **WhatsApp Floating Button**
- Botão fixo canto inferior direito
- Animação de pulso suave
- Tooltip: "Precisa de ajuda?"
- Link direto para WhatsApp com mensagem pré-preenchida

---

### Página de Óbitos (`obitos.html`)

#### Como funciona:
O dono da funerária cria artes A4 no Photoshop (as mesmas que imprime e coloca na porta da funerária e igrejas). O fluxo é:

#### Fluxo de trabalho:
1. **Dono abre `admin-obitos.html`** no browser (protegido com senha)
2. **Preenche o formulário completo** (ver campos abaixo)
3. **Clica "Publicar"** — dados salvos no Firebase (grátis), imagem e PDF enviados para hosting
4. **A página `obitos.html`** renderiza automaticamente o grid com dados do Firebase
5. **Visitantes podem deixar condolências** — ficam pendentes até o admin aprovar

#### Layout (inspirado na referência visual aprovada):

**Background:** Fundo creme/bege (`#F5F0EB`) com padrão de listras diagonais subtis

**Cabeçalho da seção:**
- Label superior: "ÓBITOS RECENTES" (small-caps, dourado, tracking largo)
- Título: "Homenagens e Velórios" (Playfair Display, grande)
- Link à direita: "Ver todos os óbitos →" (dourado)

**Grid: 3 colunas desktop | 2 tablet | 1 mobile**

**Cada card (expandido):**
```
┌─────────────────────────────────┐
│                                 │
│   [Foto/Arte A4 do Photoshop]   │  ← Imagem principal
│                                 │     (aspect ratio preservado)
│                                 │
├─────────────────────────────────┤
│                                 │
│  Nome Completo do Falecido      │  ← Playfair Display, bold
│  ✦ 12/03/1942 — 08/07/2026     │  ← Dourado, datas nasc./falec.
│                                 │
│  📍 Velório na Capela de São    │  ← Local + horário
│     Pedro, dia 11, às 15h00    │     (ícone dourado)
│                                 │
│  ─────── ◆ ───────             │  ← Separador decorativo
│                                 │
│  💬 3 Condolências              │  ← Link para ver/deixar
│                                 │     mensagens aprovadas
│                                 │
│  [📥 Descarregar PDF]           │  ← Botão dourado sólido
│  [📤 Partilhar ▾]              │  ← Dropdown: WhatsApp,
│                                 │     Facebook, Copiar Link
└─────────────────────────────────┘
```

**Botões do card:**
- **"Descarregar PDF"** — botão dourado sólido (`--gold`), texto branco, ícone de download
- **"Partilhar"** — dropdown elegante com opções:
  - 📱 WhatsApp (abre com mensagem + link pré-preenchido)
  - 📘 Facebook (share dialog)
  - 🔗 Copiar link (copia URL para clipboard + feedback visual)

**Seção de Condolências (dentro de cada card, expansível):**
- Clique em "X Condolências" abre/expande a lista
- Mensagens aprovadas pelo admin exibidas com nome do autor e data
- Formulário: "Deixe a sua mensagem de condolências"
  - **Nome** (obrigatório)
  - **Email** (obrigatório, validação de formato)
  - **Mensagem** (obrigatório, max 500 caracteres)
- Aviso: "A sua mensagem será publicada após aprovação"
- Mensagens ficam como "pendente" até o admin aprovar
- **Email NÃO é exibido publicamente** — visível apenas no painel admin

**Comportamento:**
- Cards com hover: sombra suave dourada + leve elevação
- Imagem com hover: overlay sutil
- Máximo ~10 por mês, scroll natural
- Filtro por mês/ano (dropdown elegante)

**Na Homepage (seção 8.5 — preview):**
- Mostra os 3 óbitos mais recentes em grid
- Link "Ver todos os óbitos →" leva para `obitos.html`
- Versão compacta dos cards (sem condolências expandidas)

---

#### Painel Admin (`admin-obitos.html`):

**Proteção:** Senha de acesso (localStorage + hash simples)

**Formulário de novo óbito:**
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome completo do falecido | Texto | ✅ |
| Foto / Arte A4 | Upload imagem (JPG/PNG) | ✅ |
| PDF para download | Upload PDF | ✅ |
| Data de nascimento | Date picker | ✅ |
| Data de falecimento | Date picker | ✅ |
| Local do velório/funeral | Texto | ✅ |
| Horário do velório/funeral | Texto | ✅ |
| Observações (opcional) | Textarea | ❌ |

**Preview:** Ao preencher, mostra preview do card exatamente como aparecerá no site

**Gestão de óbitos:**
- Lista de todos os óbitos publicados
- Botões: Editar | Remover | Despublicar
- Ordenação por data (mais recente primeiro)

**Moderação de condolências:**
- Aba separada: "Condolências Pendentes (X)"
- Lista com: nome do autor, **email**, mensagem, data, a qual óbito pertence
- Botões: ✅ Aprovar | ❌ Rejeitar
- Histórico de aprovadas/rejeitadas
- Email do autor visível para contacto se necessário

---

#### Backend — Firebase (Free Tier)

> [!IMPORTANT]
> As funcionalidades de condolências moderadas e gestão dinâmica de óbitos requerem persistência de dados. Usaremos **Firebase Realtime Database** (plano gratuito) — zero custo, sem servidor, SDK JavaScript direto no browser.

**Free tier cobre com folga:** 1GB armazenamento, 10GB/mês transferência, 100 conexões simultâneas — mais que suficiente para ~10 óbitos/mês.

**Estrutura de dados no Firebase:**
```json
{
  "obitos": {
    "obito-001": {
      "nome": "Maria da Silva Santos",
      "dataNascimento": "1942-03-12",
      "dataFalecimento": "2026-07-08",
      "local": "Capela de São Pedro, Lisboa",
      "horario": "Dia 11 de Julho, às 15h00",
      "imagem": "obitos/imagens/maria-da-silva.jpg",
      "pdf": "obitos/pdfs/maria-da-silva.pdf",
      "observacoes": "",
      "publicado": true,
      "criadoEm": "2026-07-08T10:30:00Z"
    }
  },
  "condolencias": {
    "condolencia-001": {
      "obitoId": "obito-001",
      "autor": "João Mendes",
      "email": "joao.mendes@email.pt",
      "mensagem": "As minhas mais sinceras condolências à família.",
      "data": "2026-07-09T14:20:00Z",
      "aprovado": false
    }
  }
}
```

**Ficheiros estáticos (imagens + PDFs):** Hospedados na pasta `obitos/` do hosting tradicional (FTP ou gestor de ficheiros). O Firebase guarda apenas os caminhos/referências.

---

### SEO Strategy

#### [NEW] `sitemap.xml`
- Todas as páginas com lastmod, changefreq, priority

#### [NEW] `robots.txt`
- Allow all, reference sitemap

#### Meta Tags por página:
```html
<title>Funerária Arcanjos | Agência Funerária em Portugal — Serviço 24h</title>
<meta name="description" content="Funerária Arcanjos — serviço funerário completo em Portugal. Cremação, ornamentação floral, tanatopraxia, funeral internacional. Atendimento 24 horas com dignidade e respeito.">
```

#### Schema.org (JSON-LD):
```json
{
  "@type": "FuneralHome",
  "name": "Funerária Arcanjos",
  "telephone": "+351...",
  "address": { ... },
  "openingHours": "Mo-Su 00:00-23:59",
  "aggregateRating": { ... }
}
```

#### Palavras-chave alvo (PT-PT):
- funerária portugal
- agência funerária
- cremação portugal
- funeral internacional
- serviços funerários
- tanatopraxia
- ornamentação floral funeral
- funeral em vida
- funerária 24 horas

#### hreflang tags para multi-idioma:
```html
<link rel="alternate" hreflang="pt" href="...?lang=pt">
<link rel="alternate" hreflang="es" href="...?lang=es">
<link rel="alternate" hreflang="en" href="...?lang=en">
<link rel="alternate" hreflang="fr" href="...?lang=fr">
```

---

### Sistema Multi-idioma

#### [NEW] `js/translations.js`
- Objeto com 4 idiomas: `{ pt: {...}, es: {...}, en: {...}, fr: {...} }`
- Cada seção do site traduzida
- Elementos HTML com `data-i18n="chave"` são traduzidos via JS

#### [NEW] `js/i18n.js`
- Detecta idioma do browser ou `localStorage`
- Aplica traduções via querySelectorAll `[data-i18n]`
- Atualiza `<html lang="">` e `document.title`
- Persiste preferência no `localStorage`

---

### Acessibilidade para Idosos

| Requisito | Implementação |
|-----------|---------------|
| Fontes grandes | Body 18px mínimo, botões 16px+ |
| Contraste alto | Dourado sobre preto ≥ 4.5:1, preto sobre branco ≥ 7:1 |
| Botões grandes | Min 48x48px, padding generoso |
| Navegação simples | Máximo 6-7 itens no menu |
| WhatsApp visível | Botão flutuante sempre presente + CTAs em cada seção |
| Sem scroll horizontal | 100% responsive, sem overflow |
| Touch-friendly | Espaçamento entre links ≥ 8px |
| Feedback visual | Hover/focus states claros em todos os interativos |

---

## Verification Plan

### Manual Verification
1. **Visual:** Abrir no browser e comparar com imagens de referência
2. **Mobile:** Testar em viewport 375px (iPhone) e 390px
3. **Multi-idioma:** Alternar entre PT/ES/EN/FR e validar todas as traduções
4. **Óbitos:** Adicionar dados de teste no JSON e verificar renderização
5. **WhatsApp:** Verificar que todos os botões abrem o WhatsApp correto
6. **Animações:** Scroll suave, fade-in nos elementos, parallax no hero
7. **SEO:** Validar meta tags, schema.org, sitemap com ferramentas online
8. **Lighthouse:** Score ≥ 90 em Performance, Accessibility, Best Practices, SEO
9. **Cross-browser:** Chrome, Firefox, Safari, Edge

### Fases de Entrega
| Fase | Entrega | Estimativa |
|------|---------|------------|
| 1 | Design system CSS + HTML skeleton | — |
| 2 | Hero + Header + Navigation + Footer | — |
| 3 | Todas as seções da homepage | — |
| 4 | Animações e interações premium | — |
| 5 | Sistema multi-idioma completo | — |
| 6 | Página de Óbitos | — |
| 7 | SEO, Schema.org, sitemap | — |
| 8 | Avaliações Google | — |
| 9 | Polish final, responsive, testes | — |
