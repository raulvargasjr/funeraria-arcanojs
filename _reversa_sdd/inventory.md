# Inventário do Projeto: The Secret Post Platform

Este documento apresenta o inventário completo de arquivos mapeados pelo **Reversa Scout**.

## 📊 Estatísticas Gerais
* **Total de Arquivos:** 21 arquivos (excluindo configurações do Git e do Reversa)
* **Linguagem Principal:** PHP (85.7% dos arquivos)
* **Tecnologias Encontradas:** PHP, JavaScript, CSS, HTML (dentro dos templates)
* **Arquitetura:** Estrutura clássica de Plugin do WordPress com separação de templates, assets estáticos e classes lógicas.

---

## 🗂️ Árvore de Diretórios
```
the-secret-post-platform/
├── assets/
│   ├── css/
│   │   ├── admin-dashboard.css
│   │   └── dashboard.css
│   └── js/
│       └── admin-dashboard.js
├── includes/
│   ├── class-tsp-admin-dashboard.php
│   ├── class-tsp-audio-cpt.php
│   ├── class-tsp-audio-engine.php
│   ├── class-tsp-bulk-importer.php
│   ├── class-tsp-checkout.php
│   ├── class-tsp-dunning-bot.php
│   ├── class-tsp-member-dashboard.php
│   ├── class-tsp-payment-tracker.php
│   ├── class-tsp-reminder-bot.php
│   ├── class-tsp-rollback.php
│   ├── class-tsp-schema.php
│   └── class-tsp-telemetry.php
├── templates/
│   └── dashboard/
│       ├── my-letters.php
│       ├── my-products.php
│       ├── my-stories.php
│       ├── my-subscription.php
│       └── welcome.php
└── the-secret-post-platform.php
```

---

## 🏷️ Detalhamento dos Arquivos

### 1. Ponto de Entrada (Plugin Core)
* **[the-secret-post-platform.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/the-secret-post-platform.php)**
  * Ponto de inicialização do plugin. Define as constantes do sistema (como `TSP_SERIES` e `TSP_LETTER_INTERVAL_DAYS`), inclui todas as classes de serviço e registra os ganchos do ciclo de vida do WordPress.

### 2. Classes Lógicas (`includes/`)
* **[class-tsp-admin-dashboard.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-admin-dashboard.php)**
  * Painel administrativo customizado com visualização de métricas de vendas, assinantes e inadimplência.
* **[class-tsp-audio-cpt.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-audio-cpt.php)**
  * Registra o Custom Post Type `tsp_audio` para gerenciar as faixas e audiolivros do sistema.
* **[class-tsp-audio-engine.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-audio-engine.php)**
  * Motor de áudio seguro. Trata da criptografia de URLs de streaming e previne o download pirata dos arquivos.
* **[class-tsp-bulk-importer.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-bulk-importer.php)**
  * Importador de dados em massa (membros e assinaturas) a partir de arquivos estruturados CSV/JSON.
* **[class-tsp-checkout.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-checkout.php)**
  * Lógica customizada de checkout integrada ao WooCommerce e gateways.
* **[class-tsp-dunning-bot.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-dunning-bot.php)**
  * Motor de cobrança (Dunning) responsável por processar e congelar contas de assinaturas inadimplentes.
* **[class-tsp-member-dashboard.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-member-dashboard.php)**
  * Controla o fluxo de renderização e segurança da área de membros do usuário.
* **[class-tsp-payment-tracker.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-payment-tracker.php)**
  * Rastreia eventos de pagamento do WooCommerce para ativar ou congelar acessos em tempo real.
* **[class-tsp-reminder-bot.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-reminder-bot.php)**
  * Disparador de lembretes automáticos e notificações de cartas prontas.
* **[class-tsp-rollback.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-rollback.php)**
  * Mecanismo de tolerância a falhas que permite desativar a versão 2 e reverter o comportamento para a versão legada v1 com segurança total.
* **[class-tsp-schema.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-schema.php)**
  * Definição e migrações idempotentes das tabelas customizadas no banco de dados do WordPress.
* **[class-tsp-telemetry.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/includes/class-tsp-telemetry.php)**
  * Rastreamento leve de uso do plugin e performance operacional.

### 3. Visões e Templates (`templates/dashboard/`)
* **[welcome.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/templates/dashboard/welcome.php)**: Tela de boas-vindas do assinante.
* **[my-stories.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/templates/dashboard/my-stories.php)**: Vitrine principal contendo as histórias e áudios disponíveis para o membro.
* **[my-letters.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/templates/dashboard/my-letters.php)**: Exibição das cartas desbloqueadas.
* **[my-products.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/templates/dashboard/my-products.php)**: Gerenciamento dos produtos adquiridos na plataforma.
* **[my-subscription.php](file:///C:/Users/comun/.gemini/antigravity-ide/scratch/the-secret-post-platform/templates/dashboard/my-subscription.php)**: Informações e controle da assinatura ativa.
