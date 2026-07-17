# Payment Event Tracking & State Transitions Flowchart

This document details how **The Secret Post Platform** reacts to passive WooCommerce and WC Subscriptions webhook actions to update relational tables and shift fulfillment logistics.

---

## Technical Flowchart

```mermaid
graph TD
    A[WooCommerce Webhook Event Fired] --> B{Determine event type}
    
    B -->|Payment Succeeded| C[Log success in tsp_payment_events]
    C --> D{Is subscription currently held?}
    D -->|Yes| E[Execute subscription reactivation logical flow]
    D -->|No| F[Keep letters in current pending status]
    
    E --> G[Update status: payment_hold -> pending]
    G --> H[Clear hold_reason details]
    H --> I[Append status change log to status_history via JSON CONCAT]
    
    B -->|Payment Failed| J[Log failure in tsp_payment_events]
    J --> K[Update non-shipped dispatches: pending -> payment_hold]
    K --> L[Set hold_reason = payment_failed]
    L --> I
    
    B -->|Subscription Cancelled / Expired| M[Log cancellation events]
    M --> N[Update non-shipped dispatches: pending/payment_hold -> stopped]
    N --> I
```

---

## Technical Mechanics & Optimization

* **Direct Raw SQL Updates:** Rather than retrieving and saving entire Eloquent/WordPress array payloads which degrades system responsiveness during high-volume payment spikes, the database layers make direct use of bulk operations (`$wpdb->query` statements).
* **Gateway-Agnostic Resolution:** Gateway failure notes (e.g., Stripe card declines, Asaas Pix timeout, PayPal cancellations) are parsed cleanly to populate the `decline_reason` and `decline_code` attributes.
