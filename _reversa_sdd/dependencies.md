# Dependências do Projeto: The Secret Post Platform

Este documento apresenta a análise de dependências críticas e ecossistemas externos de runtime do plugin **The Secret Post Platform**.

## ⚙️ Dependências de Runtime

### 1. WordPress (Núcleo)
* **Status:** Obrigatório (Entry point estruturado com ganchos clássicos do WordPress)
* **Uso:** Gerenciamento de Hooks (`add_action`, `add_filter`), `wpdb` para interações com banco de dados, Custom Post Types e renderização.

### 2. WooCommerce
* **Status:** Condicional / Obrigatório para área de membros lógicas
* **Origem:** Verificado programaticamente no arquivo principal:
  ```php
  if ( class_exists( 'WooCommerce' ) ) {
      new TSP_Member_Dashboard();
  }
  ```
* **Uso:** Vendas de produtos, controle de status das transações e controle de assinantes ativos.

### 3. PHP Run-time
* **Versão Esperada:** PHP 7.4+ ou PHP 8.0+ (utiliza classes, propriedades privadas e array constantes closed list de forma nativa).

---

## 🛠️ Ferramentas de Desenvolvimento e Testes
* **Status:** Nenhum gerenciador de dependências (`composer.json`, `package.json`) ou framework de testes automatizados (`phpunit.xml`) está configurado na raiz do plugin. A gestão das classes é feita por inclusões locais de forma direta.
