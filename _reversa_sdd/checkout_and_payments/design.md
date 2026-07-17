# Technical Design Specification: Checkout & Payments

This document details the code architecture, hook listeners, database declarations, and API configurations for the **Checkout & Payments** module of **The Secret Post Platform**.

---

## 1. Class Architecture

The Checkout & Payments module is structured as follows:

```
  ┌────────────────────────────────────────────────────────┐
  │                      TSP_Platform                      │
  │                  (the-secret-post-platform.php)        │
  └─────┬────────────────────────────────────────────┬─────┘
        │                                            │
        ▼ (Loads)                                    ▼ (Loads)
  ┌───────────────────────────┐                ┌───────────────────────────┐
  │       TSP_Checkout        │                │    TSP_Payment_Tracker    │
  │ (class-tsp-checkout.php)  │                │ (class-payment-tracker.php)│
  └───────────────────────────┘                └───────────────────────────┘
```

### Key Class Methods

#### `TSP_Checkout`
* `enqueue_mini_cart_link_guard()`: Registers custom jQuery scripts to hijack Elementor mini-carts and standard page redirection.
* `resolve_cartflows_checkout_url()`: Interacts with custom post type systems to find active `cartflows_step` funnels matching the product SKU.
* `add_gift_fields()`: Hooks into `woocommerce_after_checkout_shipping_form` to render the UI components.
* `save_gift_fields_hpos($order, $data)`: Extracts variables during submission and maps them to WooCommerce HPOS settings.

#### `TSP_Payment_Tracker`
* `on_payment_complete($subscription)`: Resolves active dispatches, updating state parameters from `'payment_hold'` back to `'pending'`.
* `on_payment_failed($subscription, $last_order)`: Parses gateway declines. Executes raw updates changing active sequences to `'payment_hold'`.
* `on_status_updated($subscription, $new_status, $old_status)`: Global hook listening to WC Subscriptions status modifications (`active`, `on-hold`, `cancelled`, `expired`).

---

## 2. Dynamic Redirection Guard Script

To guarantee Cart Interception (FR-CP-001) is executed even when caching tools are active on the site, the following jQuery wrapper is loaded dynamically:

```javascript
jQuery(document).ready(function($) {
    // Intercept mini-cart, footer, and widget links to prevent WooCommerce page route loads
    $(document).on('click', '.wc-forward, a[href*="/cart/"]', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Redirect directly to the CartFlows solved URL passed via localized variables
        window.location.href = tsp_checkout_vars.cartflows_url;
    });
});
```

---

## 3. High-Performance JSON status_history Append

To bypass standard PHP load models and prevent concurrent webhook transaction locks, the `status_history` column updates make use of raw SQL injections:

```sql
UPDATE tsp_letter_tracking 
SET status_history = CONCAT(
    SUBSTRING(status_history, 1, CHAR_LENGTH(status_history) - 1),
    ',{"status":"payment_hold","timestamp":"', NOW(), '","reason":"payment_failed"}]'
),
status = 'payment_hold',
hold_reason = 'payment_failed',
updated_at = NOW()
WHERE subscription_id = %d AND status = 'pending';
```

---

## 4. WordPress & WooCommerce Hook Bindings

```php
// Intercept Redirects
add_action( 'template_redirect', array( 'TSP_Checkout', 'enqueue_mini_cart_link_guard' ) );

// Form Fields Injection
add_action( 'woocommerce_after_checkout_shipping_form', array( 'TSP_Checkout', 'add_gift_fields' ) );

// HPOS Persistence
add_action( 'woocommerce_checkout_create_order', array( 'TSP_Checkout', 'save_gift_fields_hpos' ), 10, 2 );

// Payment Failure Tracker
add_action( 'woocommerce_subscription_payment_failed', array( 'TSP_Payment_Tracker', 'on_payment_failed' ), 10, 2 );

// Status Change Tracker
add_action( 'woocommerce_subscription_status_updated', array( 'TSP_Payment_Tracker', 'on_status_updated' ), 10, 3 );
```
