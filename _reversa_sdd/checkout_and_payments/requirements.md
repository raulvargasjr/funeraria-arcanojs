# Requirements Specification: Checkout & Payments

This document outlines the detailed functional and non-functional requirements, execution scenarios, and User Acceptance Testing (UAT) criteria for the **Checkout & Payments** module of the **The Secret Post Platform**.

---

## 1. Functional Requirements

### FR-CP-001: Direct Checkout Enforcement (Cart Interception)
* **Description:** To optimize purchasing funnels for the elderly audience, the standard WooCommerce cart pages must be completely bypassed, forcing a redirect directly to single-page checkout templates.
* **Processing Rules:**
  1. Catch and intercept all requests targeting native cart templates (`/cart/` page URLs).
  2. Block WooCommerce mini-cart triggers, sidebar overlays, and Elementor cart buttons.
  3. Resolve the active cart item product slug and forward the client directly to the associated CartFlows checkout screen.

### FR-CP-002: Dynamic CartFlows Checkout Resolution
* **Description:** Seamlessly detect and fetch matching single-page CartFlows step URLs corresponding to the selected product series (prepaid or monthly subscriptions).
* **Processing Rules:**
  1. Inspect the active WooCommerce cart line items.
  2. Search for custom CartFlows steps (`cartflows_step` custom post type entries) having tags or taxonomy mappings matching the cart product.
  3. If no explicit post relationship exists, perform a query fallback matching product titles or database configurations to identify the correct funnel checkout URL.

### FR-CP-003: HPOS-Compliant Gift Metadata Storage
* **Description:** Provide custom shipping options at checkout allowing users to designate purchases as gifts, writing records cleanly inside High-Performance Order Storage (HPOS).
* **Fulfillment Fields:**
  * `tsp_is_gift`: Boolean toggle indicating gift purchase.
  * `tsp_gift_message`: Textarea storing custom messages.
* **Processing Rules:**
  1. Render gift form items dynamically within WooCommerce checkout templates (shipping address sub-sections).
  2. During checkout validation, serialize and save these attributes directly in the HPOS database table layouts using custom metadata keys `_tsp_is_gift` and `_tsp_gift_message`.
  3. Render the processed gift entries inside the WordPress admin order overview pages.

### FR-CP-004: Subscription State Synchronization
* **Description:** Automatically update physical letter dispatches (`tsp_letter_tracking` database table rows) on subscription billing status shifts.
* **State Mapping Matrix:**
  * **Failed Renewal Transaction:** Shift all pending non-shipped letters to status `'payment_hold'` with hold reason `'payment_failed'`.
  * **Subscription Reactivation:** Clear hold statuses. Shift `'payment_hold'` entries back to `'pending'`.
  * **Subscription Cancelled / Expired:** Halt progression permanently. Update all non-shipped letters (`pending`, `packed`, or `payment_hold`) to status `'stopped'`.

---

## 2. Execution Scenarios & Edge Cases

### Scenario A: Gift checkout without shipping details
* **Edge Case:** Client checks the "Purchase as Gift" toggle but bypasses entering recipient names or addresses.
* **Mitigation:** Checkout validation filters must enforce shipping address inputs if `tsp_is_gift` evaluates to true, rendering prominent error notifications at the top of the form layout.

### Scenario B: Simultaneous billing renewal hook spikes
* **Edge Case:** Concurrent payment gateway transactions firing multiple webhook web requests, leading to database race conditions.
* **Mitigation:** State synchronization routines must execute atomic SQL commands using raw MySQL queries instead of loading, mutating, and writing sequential PHP ORM array models.

---

## 3. User Acceptance Testing (UAT) Criteria

* **UAT-CP-001 (Bypass Verification):**
  * *Given:* An active WooCommerce cart with subscription items.
  * *When:* User attempts to click a mini-cart review link or manually access `/cart/`.
  * *Then:* The client is instantaneously routed to the resolved CartFlows single-page checkout.

* **UAT-CP-002 (HPOS Verification):**
  * *Given:* A completed checkout containing custom gift parameters.
  * *When:* Checking the generated order inside the administrative dashboard.
  * *Then:* Fields `_tsp_is_gift` and `_tsp_gift_message` are stored cleanly within standard HPOS layouts, bypassing legacy postmeta schemas.

* **UAT-CP-003 (State Transitions Verification):**
  * *Given:* Customer letters inside database tables set as `pending`.
  * *When:* A renewal payment fails and the WC Subscription changes to `on-hold`.
  * *Then:* Letter logs update to `payment_hold` in real-time, and hold reasons are correctly set to `payment_failed`.
