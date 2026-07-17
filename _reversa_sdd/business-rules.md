# Business Rules, Permissions & Retroactive ADRs

This document details the core business logic, capability-based permission matrices, and Retroactive Architecture Decision Records (ADRs) mapped from the codebase of **The Secret Post Platform**.

---

## 1. Core Business Rules Matrix

The table below outlines the primary functional requirements, triggers, operations, and technical locations of the platform's core business logic:

| Rule ID | Title / Target | Logical Requirement | Failure Recovery / State | Location |
| :--- | :--- | :--- | :--- | :--- |
| **BR-001** | Bi-weekly Drip Unlocks | Day 0 unlocks Letter #1. Every subsequent 15 days unlocks the next letter in the subscription sequence. | If subscription is `on-hold` or `failed`, the unlock timer freezes until reactivated. | `class-tsp-member-dashboard.php` |
| **BR-002** | Story Series Boundaries | Pre-defined boundaries restricting progression limits: `love_in_wartime` has 25 letters; `black_rose` has 24 letters. | Subscriptions cannot request or unlock indexes beyond series bounds. | `the-secret-post-platform.php` |
| **BR-003** | Logistics Fulfillment | Physical letters move sequentially through states: `pending` $\to$ `packed` $\to$ `dispatched`. | Failed payment cancels packing, routing letters to `payment_hold`. | `class-tsp-payment-tracker.php` |
| **BR-004** | Dunning Schedule | Chasing intervals are executed at Day 1 (immediate), Day 4 (reminder), and Day 7 (final notice + freeze). | On Day 7, both digital unlocks and physical packing pipelines are locked. | `class-tsp-dunning-bot.php` |
| **BR-005** | Anti-Spam Drip Baseline | Daily drip emails check meta flag `_tsp_audio_unlock_email_baseline_set` on initial deployment. | Bypasses sending notifications to pre-existing unlocked letters to avoid spam. | `class-tsp-reminder-bot.php` |
| **BR-006** | Administrator God Mode | Users with store manager capabilities bypass all timeline calculations. | Unlocked sequence count is overridden to return `9999` instantly. | `class-tsp-member-dashboard.php` |

---

## 2. Capability & Permission Matrix

Access control is strictly mapped to standard WordPress roles and specific WooCommerce capabilities:

| Endpoint / View | WordPress Capability | Allowed Roles | System Logic / Restrictive Actions |
| :--- | :--- | :--- | :--- |
| **Fulfillment Dashboard** | `manage_woocommerce` | `administrator`, `shop_manager` | Access pick lists, print packing sheets, execute Ajax mark-as-sent status updates. |
| **Telemetry rest API** | *Public* | *Any Role* | REST POST requests must match a valid `user_id` context to record listening completions. |
| **Signed Audio Streaming** | *Active Sub Token* | `subscriber`, `customer` | Requires HMAC signature verification and validation of an active subscription matching `uid`. |
| **My Account (Stories)** | `read` | `subscriber`, `customer` | View unlocked list. Simplified dashboard elements optimized for elderly layouts. |
| **Legacy Backfill tool** | `manage_woocommerce` or `WP_CLI` | `administrator`, `cli_runner` | Triggered via schema migration to perform raw user meta translation into tables. |

---

## 3. Retroactive Architecture Decision Records (ADRs)

### Retroactive ADR-001: Relational Schema vs. User Meta Store
* **Status:** Approved (Active)
* **Context:** Version 1.x of the platform recorded dispatch sequences, dates, and packing histories using multiple standard WordPress user metadata arrays (`_tsp_sent_letters`). As the customer base expanded, queries evaluating packing lists and daily drip progressions required massive nested meta joins, causing database thread exhaustion and performance degradation.
* **Decision:** Introduce two custom relational database tables (`tsp_letter_tracking` and `tsp_payment_events`) to handle logistical states. Declare tables idempotently using `dbDelta` during plugin activation, and implement a robust backfill migration utility (`class-tsp-schema.php`) to move existing legacy metadata seamlessly into the new relational model.
* **Consequences:**
  * Performance: Retrieval times for warehouse logistics reports dropped by over 90%.
  * Reliability: Relational primary keys and indexes ensure complete data integrity.
  * Rollback Requirement: Added a global `class-tsp-rollback.php` safeguard using the `TSP_LEGACY_MODE` override constant, allowing admins to instantly fall back to v1 metadata storage in the event of database synchronization issues.

### Retroactive ADR-002: Signed Base64 Streaming vs. Public Directory Paths
* **Status:** Approved (Active)
* **Context:** Audio files (mp3 format) represent highly valuable private copyright material. Storing them in public uploads directories (`wp-content/uploads`) allowed users to inspect page source codes, extract direct paths, and download files directly, bypassing subscription paywalls.
* **Decision:** Store mp3 files inside a secure, protected directory outside the public web root (or protected via custom `.htaccess` directives). Serve assets exclusively through an authenticated rewrite endpoint `/secret-audio/{file_id}/` requiring a time-limited (120 minutes) HMAC-SHA256 URL signature. Serve streams using high-performance HTTP 206 Partial Content seeks to support native mobile players without loading entire media files into the server's RAM.
* **Consequences:**
  * Security: Complete asset protection. Shared links expire automatically after 2 hours.
  * Server Health: HTTP 206 byte-ranges allow smooth seeking and scrubbing on mobile devices, drastically lowering bandwidth costs and concurrent server memory utilization.

### Retroactive ADR-003: Intercepted Checkout vs. Standard WooCommerce Flows
* **Status:** Approved (Active)
* **Context:** The plugin targets an elderly demographic. The standard WooCommerce multi-stage checkout path (Shop $\to$ Single Product $\to$ Cart $\to$ Checkout) created heavy cognitive load, resulting in high shopping cart abandonment rates.
* **Decision:** Enqueue frontend script guards (`class-tsp-checkout.php`) to intercept mini-carts, footer links, and product cards, bypassing standard WooCommerce cart templates entirely. Force resolve checkout routes using custom CartFlows step URLs corresponding to the selected subscription product package.
* **Consequences:**
  * Conversion: Drastically simplified purchasing path down to a single checkout screen.
  * Customization: Added HPOS-compatible gift options (`_tsp_is_gift` and `_tsp_gift_message`) directly into standard WooCommerce billing checkout forms.
