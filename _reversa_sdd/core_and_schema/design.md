# Technical Design Specification: Core & Schema

This document details the code architecture, hook listeners, database declarations, and API configurations for the **Core & Schema** module of **The Secret Post Platform**.

---

## 1. Class Architecture

The Core module is structured as follows:

```
  ┌────────────────────────────────────────────────────────┐
  │                      TSP_Platform                      │
  │                  (the-secret-post-platform.php)        │
  └─────┬────────────────────────────────────────────┬─────┘
        │                                            │
        ▼ (Loads)                                    ▼ (Loads)
  ┌───────────────────────────┐                ┌───────────────────────────┐
  │        TSP_Schema         │                │       TSP_Rollback        │
  │ (class-tsp-schema.php)    │                │ (class-tsp-rollback.php)  │
  └───────────────────────────┘                └───────────────────────────┘
        │ (Loads)
        ▼
  ┌───────────────────────────┐
  │       TSP_Telemetry       │
  │ (class-tsp-telemetry.php) │
  └───────────────────────────┘
```

### Key Class Methods

#### `TSP_Schema`
* `install()`: Registers the WordPress activation hook, builds DDL script blocks, and executes `dbDelta`.
* `backfill_from_legacy()`: Scans legacy user meta fields via standard `$wpdb` selects, parses string metrics, and executes high-performance bulk SQL inserts into `tsp_letter_tracking`.
* `detect_series_from_subscription($subscription)`: Resolves active product subscriptions to assign `love_in_wartime` or `black_rose` series keys based on line item metadata.

#### `TSP_Rollback`
* `is_legacy_mode()`: Utility reading constant configurations or database variables.
* `intercept_legacy_hooks()`: Unhooks relational updates if `is_legacy_mode()` returns true, attaching v1 standard metadata callbacks.

#### `TSP_Telemetry`
* `register_routes()`: Binds the custom `wp-json/tsp/v1/telemetry` endpoint.
* `handle_telemetry($request)`: Rest controller validating incoming JSON data, enforcing user authentication check, and storing play states.

---

## 2. Relational Database Declarations (DDL)

The schema declarations executed via `dbDelta` inside `class-tsp-schema.php` are defined as:

```sql
CREATE TABLE tsp_letter_tracking (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    user_id bigint(20) unsigned NOT NULL,
    subscription_id bigint(20) unsigned NOT NULL,
    letter_number int(10) unsigned NOT NULL,
    series varchar(100) NOT NULL,
    status varchar(30) DEFAULT 'pending' NOT NULL,
    due_date datetime DEFAULT NULL,
    pack_date datetime DEFAULT NULL,
    send_date datetime DEFAULT NULL,
    packed_by bigint(20) unsigned DEFAULT NULL,
    sent_by bigint(20) unsigned DEFAULT NULL,
    is_gift tinyint(1) DEFAULT 0 NOT NULL,
    gift_recipient_name varchar(255) DEFAULT NULL,
    shipping_snapshot text DEFAULT NULL,
    hold_reason varchar(100) DEFAULT NULL,
    manual_override tinyint(1) DEFAULT 0 NOT NULL,
    notes text DEFAULT NULL,
    status_history text DEFAULT NULL,
    created_at datetime NOT NULL,
    updated_at datetime NOT NULL,
    PRIMARY KEY (id),
    KEY idx_sub_status (subscription_id, status),
    KEY idx_user_series (user_id, series),
    KEY idx_status_due (status, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tsp_payment_events (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    user_id bigint(20) unsigned NOT NULL,
    subscription_id bigint(20) unsigned NOT NULL,
    order_id bigint(20) unsigned NOT NULL,
    event_type varchar(30) NOT NULL,
    order_type varchar(30) DEFAULT 'subscription' NOT NULL,
    is_refund tinyint(1) DEFAULT 0 NOT NULL,
    amount decimal(10,2) NOT NULL,
    currency varchar(3) DEFAULT 'BRL' NOT NULL,
    status varchar(30) NOT NULL,
    decline_reason varchar(255) DEFAULT NULL,
    decline_code varchar(50) DEFAULT NULL,
    gateway varchar(50) DEFAULT NULL,
    event_date datetime NOT NULL,
    retry_count int(10) unsigned DEFAULT 0 NOT NULL,
    resolved tinyint(1) DEFAULT 0 NOT NULL,
    resolved_at datetime DEFAULT NULL,
    notes text DEFAULT NULL,
    created_at datetime NOT NULL,
    PRIMARY KEY (id),
    KEY idx_sub_order (subscription_id, order_id),
    KEY idx_unresolved_declines (status, resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. WordPress Hooks Integration

```php
// Activation Schema Hook
register_activation_hook( TSP_PLUGIN_FILE, array( 'TSP_Schema', 'install' ) );

// REST API Initializer
add_action( 'rest_api_init', array( 'TSP_Telemetry', 'register_routes' ) );
```

---

## 4. REST Controller Implementation Specification

```php
public static function handle_telemetry( WP_REST_Request $request ) {
    $audio_id  = sanitize_text_field( $request->get_param( 'audio_id' ) );
    $user_id   = absint( $request->get_param( 'user_id' ) );
    $completed = (bool) $request->get_param( 'completed' );

    // Auth Enforcement
    if ( get_current_user_id() !== $user_id ) {
        return new WP_Error( 'tsp_telemetry_forbidden', 'Unauthorized user session', array( 'status' => 403 ) );
    }

    $meta_key = '_tsp_audio_completed_' . md5( $audio_id );
    update_user_meta( $user_id, $meta_key, array(
        'completed'  => $completed,
        'timestamp'  => current_time( 'mysql' )
    ) );

    // Trigger action hooks
    do_action( 'tsp_audio_completion_registered', $user_id, $audio_id, $completed );

    return new WP_REST_Response( array( 'success' => true ), 200 );
}
```
