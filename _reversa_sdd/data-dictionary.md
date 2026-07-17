# Relational Database Schema & Data Dictionary

This document details the custom relational database schema implemented by the **The Secret Post Platform** plugin. The system utilizes two primary custom tables (`tsp_letter_tracking` and `tsp_payment_events`) to manage physical letter fulfillment and tracking of WooCommerce payment histories.

---

## 1. Entity Relationship Overview

The custom tables establish logical foreign relationships with standard WordPress and WooCommerce tables as described below:

```
  ┌────────────────────────────────────────────────────────┐
  │                        wp_users                        │
  └─────┬──────────────────────────────────────────────────┘
        │ (1)
        │
        │ (N)
  ┌─────▼────────────────────────┐        ┌────────────────────────┐
  │     tsp_letter_tracking      │        │   tsp_payment_events   │
  ├──────────────────────────────┤        ├────────────────────────┤
  │ id (PK)                      │        │ id (PK)                │
  │ user_id (FK -> wp_users)     │◄───────┼─ user_id (FK)          │
  │ subscription_id (FK -> post) │◄───────┼─ subscription_id (FK)  │
  │ letter_number                │        │ order_id (FK -> posts) │
  │ status                       │        │ status                 │
  └──────────────────────────────┘        └────────────────────────┘
```

---

## 2. Table: `tsp_letter_tracking`

Tracks the lifecycle of physical letter progression, packaging, and dispatch. It holds physical warehouse shipping snapshots, gift directives, and fulfillment tracking variables.

### Schema Blueprint

| Column Name | Data Type | Nullable | Default | Key | Description / Logic |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`id`** | `bigint(20) unsigned` | No | *Auto Increment* | **PK** | Unique row identifier. |
| **`user_id`** | `bigint(20) unsigned` | No | *None* | **FK** | Links to `wp_users.ID`. The client receiving the story progression. |
| **`subscription_id`** | `bigint(20) unsigned` | No | *None* | **FK** | Links to `wp_posts.ID` CPT `shop_subscription`. Track origin subscription. |
| **`letter_number`** | `int(10) unsigned` | No | *None* | | The letter index within the story progression (e.g., 1 to 25). |
| **`series`** | `varchar(100)` | No | *None* | | Closed enum indicating story code: `love_in_wartime` or `black_rose`. |
| **`status`** | `varchar(30)` | No | `'pending'` | **IDX** | Current state: `pending`, `packed`, `dispatched`, `payment_hold`, `stopped`. |
| **`due_date`** | `datetime` | Yes | `NULL` | | Calculated timestamp when the letter becomes unlocked / pack-ready. |
| **`pack_date`** | `datetime` | Yes | `NULL` | | Timestamp indicating when the parcel was physically packed by staff. |
| **`send_date`** | `datetime` | Yes | `NULL` | | Timestamp indicating when the parcel was shipped or collected by courier. |
| **`packed_by`** | `bigint(20) unsigned` | Yes | `NULL` | | Links to `wp_users.ID` of the warehouse staff member who packed it. |
| **`sent_by`** | `bigint(20) unsigned` | Yes | `NULL` | | Links to `wp_users.ID` of the warehouse staff member who marked it shipped. |
| **`is_gift`** | `tinyint(1)` | No | `0` | | Boolean boolean flag (`1` = active gift, `0` = normal dispatch). |
| **`gift_recipient_name`** | `varchar(255)` | Yes | `NULL` | | Name of the person designated to receive the letters if marked as gift. |
| **`shipping_snapshot`** | `text` | Yes | `NULL` | | Locked JSON string copy of billing/shipping addresses at packing time. |
| **`hold_reason`** | `varchar(100)` | Yes | `NULL` | | If status is `payment_hold`, defines the trigger (e.g., `payment_failed`). |
| **`manual_override`** | `tinyint(1)` | No | `0` | | Flag indicating if status transitions were forced manually by administrators. |
| **`notes`** | `text` | Yes | `NULL` | | Free text input for custom logistical instructions or packing observations. |
| **`status_history`** | `text` | Yes | `NULL` | | Serialized JSON string array recording status logs (`[{"status":...,"time":...}]`). |
| **`created_at`** | `datetime` | No | *Current Timestamp*| | Row creation timestamp. |
| **`updated_at`** | `datetime` | No | *Current Timestamp*| | Auto-updates when any column changes. |

### Indexes & Constraints
* **Primary Key:** `PRIMARY KEY (id)`
* **Indexes:**
  * `idx_sub_status (subscription_id, status)`: Accelerates WooCommerce payments update runs.
  * `idx_user_series (user_id, series)`: Optimizes dashboard retrieval calculations.
  * `idx_status_due (status, due_date)`: Maximizes daily dunning logic evaluations.

---

## 3. Table: `tsp_payment_events`

Maintains logs of WooCommerce payments, renewals, gateway responses, and decline reasons to support daily dunning cron automation.

### Schema Blueprint

| Column Name | Data Type | Nullable | Default | Key | Description / Logic |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`id`** | `bigint(20) unsigned` | No | *Auto Increment* | **PK** | Unique row identifier. |
| **`user_id`** | `bigint(20) unsigned` | No | *None* | **FK** | Links to `wp_users.ID`. The client paying for the subscription. |
| **`subscription_id`** | `bigint(20) unsigned` | No | *None* | **FK** | Links to `wp_posts.ID` of type `shop_subscription`. |
| **`order_id`** | `bigint(20) unsigned` | No | *None* | **FK** | Links to `wp_posts.ID` of type `shop_order`. The triggering payment order. |
| **`event_type`** | `varchar(30)` | No | *None* | | Type: `renewal`, `signup`, `dunning_retry`, `manual_payment`. |
| **`order_type`** | `varchar(30)` | No | `'subscription'`| | Class of transaction (`subscription` or `prepaid_plan`). |
| **`is_refund`** | `tinyint(1)` | No | `0` | | Flag indicating if this represents a refund reversal (`1` = yes). |
| **`amount`** | `decimal(10,2)` | No | `0.00` | | The numerical currency transaction value. |
| **`currency`** | `varchar(3)` | No | `'BRL'` | | Active ISO-4217 transaction currency identifier. |
| **`status`** | `varchar(30)` | No | *None* | **IDX** | Transaction outcome: `paid`, `failed`, `refunded`, `pending`. |
| **`decline_reason`** | `varchar(255)` | Yes | `NULL` | | Gateway error text (e.g., `"Insufficient funds"`, `"Card expired"`). |
| **`decline_code`** | `varchar(50)` | Yes | `NULL` | | System/Stripe error code (e.g., `card_declined`). |
| **`gateway`** | `varchar(50)` | Yes | `NULL` | | Active payment method used (e.g., `stripe`, `asaas`, `paypal`). |
| **`event_date`** | `datetime` | No | *Current Timestamp*| | Datetime of the payment gateway transaction. |
| **`retry_count`** | `int(10) unsigned` | No | `0` | | Index tracker representing retry count for this specific renewal billing. |
| **`resolved`** | `tinyint(1)` | No | `0` | | Boolean tracker showing if the decline was fixed by a later successful transaction. |
| **`resolved_at`** | `datetime` | Yes | `NULL` | | Timestamp when a subsequent recovery transaction succeeded. |
| **`notes`** | `text` | Yes | `NULL` | | Internal admin notes or tracking variables. |
| **`created_at`** | `datetime` | No | *Current Timestamp*| | Timestamp marking event generation. |

### Indexes & Constraints
* **Primary Key:** `PRIMARY KEY (id)`
* **Indexes:**
  * `idx_sub_order (subscription_id, order_id)`: Quick transaction retrieval.
  * `idx_unresolved_declines (status, resolved)`: Boosts performance of daily cron chasing.

---

## 4. Key Status Lifecycle Workflows

### Physical Letter (`status` transitions)
* **`pending`**: Default state. Letter is assigned and waiting for its dynamic unlock timeline to pass.
* **`packed`**: Fulfillment packing script marks letter as packed. Shipping snapshot is generated.
* **`dispatched`**: Courier dispatch AJAX event completes. Tracking entries are logged.
* **`payment_hold`**: WooCommerce renewal payment failed. Progression freezes and packing stops.
* **`stopped`**: Subscription cancelled or expired. Physical letter fulfillment process permanently halts.

```
       ┌───────────┐
       │  pending  │
       └─────┬─────┘
             │
      ┌──────┼───────────────┐
      │      │ (Payment      │ (Cancel / Expire)
      ▼      ▼  Fail)        ▼
 ┌────────┐ ┌──────────────┐┌───────────┐
 │ packed │ │ payment_hold ││  stopped  │
 └───┬────┘ └──────┬───────┘└───────────┘
     │             │
     │             │ (Payment Success)
     ▼             ▼
┌────────────┐ ┌───────────┐
│ dispatched │ │  pending  │
└────────────┘ └───────────┘
```
