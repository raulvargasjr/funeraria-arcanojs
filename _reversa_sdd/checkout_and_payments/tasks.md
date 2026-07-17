# Task Roadmap: Checkout & Payments

This document details the checklist of atomic tasks required to test, verify, and modify the **Checkout & Payments** module of **The Secret Post Platform**.

---

## Technical Checklist

- `[ ]` **TS-CP-001: Cart Interception Testing**
  - `[ ]` Add subscription products to checkout cart.
  - `[ ]` Attempt access to `/cart/` page. Verify immediate redirect to `/checkout/` or CartFlows funnel views.
  - `[ ]` Click the Elementor Header mini-cart drawer review links. Verify they are hijacked by JavaScript guards.

- `[ ]` **TS-CP-002: Dynamic Step Resolution Verification**
  - `[ ]` Inject new custom post types of class `cartflows_step`.
  - `[ ]` Perform Cart Checkout actions under multiple series parameters.
  - `[ ]` Check backend routing variables inside localized scripts `tsp_checkout_vars` to confirm matching logic operates.

- `[ ]` **TS-CP-003: HPOS Gift Variable Validation**
  - `[ ]` Proceed to checkout. Fill in shipping address options.
  - `[ ]` Toggle the "Purchase as Gift" options. Input a test message.
  - `[ ]` Submit transaction payment.
  - `[ ]` Run administrative SQL commands checking custom HPOS order schemas: `SELECT * FROM wp_wc_orders_meta WHERE meta_key = '_tsp_is_gift';`.
  - `[ ]` Confirm details render inside administrative order detail sidebars.

- `[ ]` **TS-CP-004: Payment Failure Transitions Validation**
  - `[ ]` Inject test subscriptions into `tsp_letter_tracking` with status `pending`.
  - `[ ]` Simulate a webhook renewal billing transaction payment failure event.
  - `[ ]` Confirm status attributes updated from `pending` to `payment_hold`.
  - `[ ]` Verify column `hold_reason` contains `"payment_failed"`.
  - `[ ]` Confirm the JSON string array `status_history` is updated cleanly.
