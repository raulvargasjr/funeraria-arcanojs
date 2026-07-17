# Technical Architecture & Code Analysis

This document provides a consolidated technical architecture analysis of the WordPress plugin **The Secret Post Platform**. It breaks down the system structure, hook lifecycles, logical modules, and key algorithmic flows.

---

## 1. System Architectural Overview

The **The Secret Post Platform** is built as a custom object-oriented WordPress plugin integrated deeply with **WooCommerce** and **WooCommerce Subscriptions**. The system coordinates a digital/physical hybrid model where subscription states trigger digital audio content unlocks and physical letter shipping logistics.

```
       ┌────────────────────────────────────────────────────────┐
       │                       WordPress                        │
       └─────┬────────────────────────────────────────────┬─────┘
             │                                            │
             ▼                                            ▼
   ┌───────────────────┐                         ┌───────────────────┐
   │    WooCommerce    │                         │  WC Subscriptions │
   └─────────┬─────────┘                         └─────────┬─────────┘
             │                                             │
             ▼                                             ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                  THE SECRET POST PLATFORM                       │
   ├─────────────────────────────────────────────────────────────────┤
   │                                                                 │
   │  ┌───────────────────────┐           ┌───────────────────────┐  │
   │  │   Core & Schema       │           │  Checkout & Payments  │  │
   │  └───────────────────────┘           └───────────────────────┘  │
   │  ┌───────────────────────┐           ┌───────────────────────┐  │
   │  │  Members & Audio CPT  │           │   Dunning & Logistics │  │
   │  └───────────────────────┘           └───────────────────────┘  │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘
```

The codebase strictly adheres to standard WordPress hooks, utilizing `add_action` and `add_filter` patterns to wire custom business rules without altering the core database structure of WooCommerce. Instead, it utilizes two custom database tables managed dynamically via `dbDelta` to keep tracking robust and high-performing.

---

## 2. Logical Module Decomposition

### Module A: Core & Schema (`core_and_schema`)
* **Primary Entry:** `the-secret-post-platform.php`
* **Core Classes:** 
  * `class-tsp-schema.php` (DB migrations & data backfilling)
  * `class-tsp-rollback.php` (Fallback toggles)
  * `class-tsp-telemetry.php` (Audio listening telemetry endpoint)
* **Purpose:** Handles plugin initialization, sets up global constraints, registers custom DB schemas idempotently, handles v1 to v2 database migrations (backfill), manages the legacy rollback toggle, and provides REST telemetry for audio play completions.

### Module B: Checkout & Payments (`checkout_and_payments`)
* **Primary Entry:** `includes/class-tsp-checkout.php`
* **Core Classes:**
  * `class-tsp-checkout.php` (CartFlows redirection guards & custom checkout forms)
  * `class-tsp-payment-tracker.php` (WooCommerce payment hook interceptors)
* **Purpose:** Ensures a simplified checkout experience by redirecting standard WooCommerce pages directly to single-page CartFlows steps, implements HPOS-compatible gift metadata fields, registers payments, and updates physical letter dispatch states (payment hold, stopped, or pending) on subscription renewals/cancellations.

### Module C: Members & Audio Content (`members_and_audio_content`)
* **Primary Entry:** `includes/class-tsp-member-dashboard.php`
* **Core Classes:**
  * `class-tsp-member-dashboard.php` (Elderly UX overrides & unlock timelines)
  * `class-tsp-audio-engine.php` (HMAC signed streaming & HTTP 206 Partial Content server)
  * `class-tsp-audio-cpt.php` (Audio custom post types metadata)
* **Purpose:** Optimizes the standard "My Account" area for the targeted elderly audience (minimizing dashboard items), computes bi-weekly story unlock limits relative to subscription statuses, generates signed URLs expiring in 120 minutes, and streams audio securely using byte-range Partial Content (206) seeks.

### Module D: Dunning & Admin Operations (`dunning_and_admin_operations`)
* **Primary Entry:** `includes/class-tsp-admin-dashboard.php`
* **Core Classes:**
  * `class-tsp-dunning-bot.php` (Payment chasing daily schedulers)
  * `class-tsp-reminder-bot.php` (Daily morning unlock notifications)
  * `class-tsp-bulk-importer.php` (Direct audio ingestion scanner)
  * `class-tsp-admin-dashboard.php` (Fulfillment panel & picking logs stylesheet)
* **Purpose:** Drives automated cron schedules to manage failed payment chasing (Day 1, 4, 7), drips morning notification emails when a new letter unlocks, processes directory-based audio file ingestion, and renders a logistics board (with Ajax filtering and Pick List layouts) for warehouse packers.

---

## 3. WordPress & WooCommerce Hook Bindings

The following tables trace how the plugin hooks into the hosting platform lifecycle:

| Hook Type | Hook Name | Triggered Class/Method | Action Performed |
| :--- | :--- | :--- | :--- |
| **Action** | `plugins_loaded` | `TSP_Platform::init_modules` | Standard class loading and runtime initialization. |
| **Action** | `register_activation_hook` | `TSP_Schema::install` | Runs `dbDelta` schema creations and registers backfill hooks. |
| **Filter** | `template_redirect` | `TSP_Checkout::enqueue_mini_cart_link_guard` | Intercepts WooCommerce cart views, executing single-page CartFlows redirect. |
| **Action** | `woocommerce_checkout_update_order_meta` | `TSP_Checkout::save_gift_fields_hpos` | Persists gift variables to order metadata in High-Performance Order Storage (HPOS). |
| **Action** | `woocommerce_subscription_payment_failed` | `TSP_Payment_Tracker::on_payment_failed` | Flags physical letters as `payment_hold` and tracks GATEWAY error codes. |
| **Action** | `woocommerce_subscription_status_updated` | `TSP_Payment_Tracker::on_status_updated` | Reactivates locked tracks or halts pending dispatches on cancellation. |
| **Filter** | `woocommerce_account_menu_items` | `TSP_Member_Dashboard::custom_menu_items` | Simplifies standard customer profile buttons for elderly-friendly navigation. |
| **Action** | `init` | `TSP_Audio_Engine::serve_secure_audio` | Listens to rewritten `/secret-audio/` URLs to validate signatures and serve media. |
| **Action** | `tsp_daily_dunning_cron` | `TSP_Dunning_Bot::process_reminders` | Standard daily cron executing three-stage payment chasing notifications. |
| **Action** | `tsp_daily_unlock_cron` | `TSP_Reminder_Bot::process_reminders` | Triggered at 9:00 AM daily to drip notifications about newly unlocked stories. |
| **Action** | `wp_ajax_mark_letter_sent` | `TSP_Admin_Dashboard::ajax_mark_letter_sent` | Standard Ajax action updating fulfillment log structures in real-time. |

---

## 4. Key Algorithm Implementations

### A. Bi-weekly Progression Timeline Unlock
Used in `class-tsp-member-dashboard.php` to calculate which physical letters are unlocked for digital viewing:
1. **Initial Access (Day 0):** Letter #1 is unlocked instantly.
2. **Standard Progression:** Unlocks 1 letter every 15 days (`TSP_LETTER_INTERVAL_DAYS`).
3. **Suspension/Hold Mitigation:** If the subscription has a status of `on-hold` or `failed`, the algorithm freezes progression by adjusting the starting timeline calculation. The formula offsets the total time elapsed by the exact duration the user was suspended.
4. **God Mode Override:** If the active user possesses the `manage_woocommerce` capability (Admins & Shop Managers), the sequence unlock calculation immediately overrides and returns `9999` (absolute instant access).

### B. Signed HMAC-SHA256 Streaming Verification
Implemented in `class-tsp-audio-engine.php` to protect assets stored in non-public directories:
1. **Generation:** Generates a secure base64-encoded URL containing:
   * `file_id` (The database audio identifier)
   * `uid` (The active user ID)
   * `exp` (A UNIX expiration timestamp set at `now` + 120 minutes)
   * `sig` (An HMAC-SHA256 signature calculated over the query string parameters using the site's unique `AUTH_SALT`).
2. **Verification:** When `/secret-audio/{file_id}/` is requested:
   * Decodes query parameters.
   * Compares the `exp` timestamp against current server time.
   * Validates the active user session matching `uid`.
   * Re-calculates the local HMAC-SHA256 using `AUTH_SALT` and performs a timing-attack safe comparison (`hash_equals`) against `sig`.
   * Checks that the user has an active WooCommerce subscription associated with the requested content.
   * If any step fails, serves a standard HTTP `403 Forbidden` response.

### C. Fast Relational JSON Status Splicing
Used in `class-tsp-payment-tracker.php` to append log entries directly into the tracking databases without PHP round-tripping overhead:
* Instead of mapping, parsing, modifying, and stringifying the `status_history` JSON column back and forth using PHP arrays (which consumes server memory), the tracking class executes a direct, atomic SQL update utilizing MySQL's native string operations:
  ```sql
  UPDATE tsp_letter_tracking 
  SET status_history = CONCAT(
      SUBSTRING(status_history, 1, CHAR_LENGTH(status_history) - 1),
      ',{"status":"payment_hold","timestamp":"', NOW(), '","reason":"payment_failed"}]'
  )
  WHERE subscription_id = %d AND status = 'pending';
  ```
* This achieves absolute thread safety and prevents race conditions when concurrent payment webhooks hit the webserver.
