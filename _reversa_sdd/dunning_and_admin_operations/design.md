# Technical Design Specification: Dunning & Admin Operations

This document details the code architecture, hook listeners, database declarations, and API configurations for the **Dunning & Admin Operations** module of **The Secret Post Platform**.

---

## 1. Class Architecture

The Dunning & Admin Operations module is structured as follows:

```
  ┌────────────────────────────────────────────────────────┐
  │                      TSP_Platform                      │
  │                  (the-secret-post-platform.php)        │
  └─────┬────────────────────────────────────────────┬─────┘
        │                 │                │               │
        ▼ (Loads)         ▼ (Loads)        ▼ (Loads)       ▼ (Loads)
  ┌───────────┐     ┌───────────┐    ┌───────────┐   ┌───────────┐
  │TSP_Dunning│     │TSP_Remind │    │TSP_Import │   │ TSP_Admin │
  └───────────┘     └───────────┘    └───────────┘   └───────────┘
```

### Key Class Methods

#### `TSP_Dunning_Bot`
* `start_hold_clock($subscription)`: Sets up metadata stamps representing the start of billing failure.
* `process_reminders()`: Evaluates hold durations. Dispatches targeted HTML notices based on Day 1, 4, 7 chronologies.

#### `TSP_Reminder_Bot`
* `process_reminders()`: Initiates daily drips. Checks active subscriptions at 9:00 AM, sets up baselines, and sends story notifications.

#### `TSP_Bulk_Importer`
* `handle_import_request()`: Scans protected server directories. Parses file naming standards, loads files to the media library, and registers custom post type sequence items.

#### `TSP_Admin_Dashboard`
* `get_active_subscribers_data()`: Pulls fulfillment statistics, logistics queue matrices, and subscriber address logs.
* `ajax_mark_letter_sent()`: Handles inline updates. Updates SQL status columns and appends packer tracking signatures.

---

## 2. Dynamic AJAX Live Search Controller

To bypass third-party page caching plugins, search triggers perform direct queries against the database layers:

```php
public static function handle_live_search() {
    check_ajax_referer( 'tsp_admin_search_nonce', 'security' );
    
    if ( ! current_user_can( 'manage_woocommerce' ) ) {
        wp_send_json_error( 'Forbidden', 403 );
    }

    global $wpdb;
    $term = sanitize_text_field( $_POST['search_term'] );
    $like = '%' . $wpdb->esc_like( $term ) . '%';

    // Direct performance optimized query
    $results = $wpdb->get_results( $wpdb->prepare(
        "SELECT t.*, u.user_email, u.display_name 
         FROM {$wpdb->prefix}tsp_letter_tracking t
         JOIN {$wpdb->users} u ON t.user_id = u.ID
         WHERE u.display_name LIKE %s 
            OR u.user_email LIKE %s 
            OR t.shipping_snapshot LIKE %s
         LIMIT 50",
        $like, $like, $like
    ) );

    wp_send_json_success( $results );
}
```

---

## 3. Logistics Pick List Print-Friendly Layout

To enable warehouse packer checks on physical sheets, dynamic `@media print` rules are loaded inside admin stylesheets:

```css
@media print {
    /* Hide all admin navigational panels and layouts */
    #adminmenuback,
    #adminmenuwrap,
    #wpadminbar,
    #wpfooter,
    .logistics-kpis,
    .fulfillment-actions,
    .nav-tab-wrapper {
        display: none !important;
    }

    body {
        background: #fff !important;
        color: #000 !important;
        font-size: 12pt;
    }

    .logistics-print-container {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    table.logistics-pick-table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: auto;
    }

    table.logistics-pick-table tr {
        page-break-inside: avoid;
        page-break-after: auto;
    }

    table.logistics-pick-table th, 
    table.logistics-pick-table td {
        border: 1px solid #000 !important;
        padding: 8px !important;
        text-align: left !important;
    }
}
```

---

## 4. WordPress Hooks & Cron Bindings

```php
// Dunning Bot Cron Hook
add_action( 'tsp_daily_dunning_cron', array( 'TSP_Dunning_Bot', 'process_reminders' ) );

// Drip Reminder Cron Hook
add_action( 'tsp_daily_unlock_cron', array( 'TSP_Reminder_Bot', 'process_reminders' ) );

// Ajax Live Search Route
add_action( 'wp_ajax_tsp_live_search', array( 'TSP_Admin_Dashboard', 'handle_live_search' ) );

// Ajax Mark Dispatched Hook
add_action( 'wp_ajax_mark_letter_sent', array( 'TSP_Admin_Dashboard', 'ajax_mark_letter_sent' ) );
```
