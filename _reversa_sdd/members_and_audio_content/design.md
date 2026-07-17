# Technical Design Specification: Members & Audio Content

This document details the code architecture, hook listeners, database declarations, and API configurations for the **Members & Audio Content** module of **The Secret Post Platform**.

---

## 1. Class Architecture

The Members & Audio Content module is structured as follows:

```
  ┌────────────────────────────────────────────────────────┐
  │                      TSP_Platform                      │
  │                  (the-secret-post-platform.php)        │
  └─────┬────────────────────────────────────────────┬─────┘
        │                                            │
        ▼ (Loads)                                    ▼ (Loads)
  ┌───────────────────────────┐                ┌───────────────────────────┐
  │   TSP_Member_Dashboard    │                │     TSP_Audio_Engine      │
  │ (class-tsp-member-db.php) │                │ (class-tsp-audio-eng.php) │
  └───────────────────────────┘                └───────────────────────────┘
        │ (Loads)
        ▼
  ┌───────────────────────────┐
  │       TSP_Audio_CPT       │
  │  (class-tsp-audio-cpt.php)│
  └───────────────────────────┘
```

### Key Class Methods

#### `TSP_Member_Dashboard`
* `custom_menu_items($items)`: Filters standard WooCommerce profile tabs, mapping only clean sections.
* `get_unlocked_stories($user_id)`: Calculates unlocked story indicators using active subscription timelines and holds.
* `render_my_letters_endpoint()`: Renders the custom stories overview list.

#### `TSP_Audio_Engine`
* `generate_signed_url($file_id, $expiration_minutes)`: Generates time-limited signed links with SHA256 signatures.
* `serve_secure_audio()`: Intercepts custom rewrites, validates signatures, checks subscriptions, and starts playback streaming.
* `stream_audio_file($file)`: Handles byte range HTTP headers, sets up 206 status parameters, and streams content using 8KB buffer loops.

#### `TSP_Audio_CPT`
* `register_cpt()`: Registers the custom post type `tsp_letter` and sets up sequence and media file attachments.

---

## 2. Dynamic Progression & Offset Algorithm

The logic inside `get_unlocked_stories` uses the following formula to compute net active membership days:

```php
public static function calculate_net_active_days( $subscription_id ) {
    global $wpdb;
    
    $start_date = $wpdb->get_var( $wpdb->prepare(
        "SELECT start_date FROM {$wpdb->prefix}wc_subscriptions WHERE ID = %d",
        $subscription_id
    ) );
    
    if ( ! $start_date ) return 0;
    
    $total_days = floor( ( time() - strtotime( $start_date ) ) / DAY_IN_SECONDS );
    
    // Sum duration of all payment suspensions
    $freeze_seconds = $wpdb->get_var( $wpdb->prepare(
        "SELECT SUM(TIMESTAMPDIFF(SECOND, created_at, resolved_at)) 
         FROM {$wpdb->prefix}tsp_payment_events 
         WHERE subscription_id = %d AND status = 'failed' AND resolved = 1",
        $subscription_id
    ) );
    
    $freeze_days = $freeze_seconds ? floor( $freeze_seconds / DAY_IN_SECONDS ) : 0;
    
    return max( 0, $total_days - $freeze_days );
}
```

---

## 3. Secure HTTP 206 Partial Content Stream Controller

The logic inside `class-tsp-audio-engine.php` executes the following Partial Content stream:

```php
public static function stream_audio_file( $filepath ) {
    if ( ! file_exists( $filepath ) ) {
        status_header( 404 );
        exit;
    }

    $filesize = filesize( $filepath );
    $file     = fopen( $filepath, 'rb' );
    $start    = 0;
    $end      = $filesize - 1;

    // Process range headers
    if ( isset( $_SERVER['HTTP_RANGE'] ) ) {
        $c_start = $start;
        $c_end   = $end;

        list( , $range ) = explode( '=', $_SERVER['HTTP_RANGE'], 2 );
        if ( strpos( $range, ',' ) !== false ) {
            status_header( 416 );
            exit;
        }
        
        if ( $range == '-' ) {
            $c_start = $filesize - substr( $range, 1 );
        } else {
            $range   = explode( '-', $range );
            $c_start = $range[0];
            $c_end   = ( isset( $range[1] ) && is_numeric( $range[1] ) ) ? $range[1] : $filesize - 1;
        }
        
        $c_end = ( $c_end > $end ) ? $end : $c_end;
        if ( $c_start > $c_end || $c_start > $filesize - 1 || $c_end >= $filesize ) {
            status_header( 416 );
            exit;
        }
        
        $start = $c_start;
        $end   = $c_end;
        $length = $end - $start + 1;
        
        fseek( $file, $start );
        status_header( 206 );
        header( "Content-Range: bytes $start-$end/$filesize" );
        header( "Content-Length: $length" );
    } else {
        header( "Content-Length: $filesize" );
    }

    header( "Content-Type: audio/mpeg" );
    header( "Accept-Ranges: bytes" );

    // Stream byte loops
    $buffer = 8192;
    while ( ! feof( $file ) && ( $p = ftell( $file ) ) <= $end ) {
        if ( $p + $buffer > $end ) {
            $buffer = $end - $p + 1;
        }
        echo fread( $file, $buffer );
        flush();
    }
    fclose( $file );
    exit;
}
```

---

## 4. WordPress Hooks & Rewrite Registrations

```php
// Custom Menu Items
add_filter( 'woocommerce_account_menu_items', array( 'TSP_Member_Dashboard', 'custom_menu_items' ) );

// Intercept Rewrites
add_action( 'init', array( 'TSP_Audio_Engine', 'serve_secure_audio' ) );
```
