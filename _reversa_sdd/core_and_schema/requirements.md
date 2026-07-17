# Requirements Specification: Core & Schema

This document outlines the detailed functional and non-functional requirements, execution scenarios, and User Acceptance Testing (UAT) criteria for the **Core & Schema** module of the **The Secret Post Platform**.

---

## 1. Functional Requirements

### FR-CS-001: Idempotent Database Schema Deployment
* **Description:** The system must automatically build and upgrade the custom database schema upon plugin activation or migration triggers without corrupting existing records.
* **Input Parameters:** None (Triggered by WordPress activation hooks).
* **Processing Rules:**
  1. Detect the active database engine character set and collation.
  2. Invoke WordPress standard core database routines (`dbDelta`) to declare two tables: `tsp_letter_tracking` and `tsp_payment_events`.
  3. Ensure constraints, default values, primary keys, and composite indexes match the specifications defined in the Data Dictionary exactly.
  4. Record the current database schema version in the WordPress `wp_options` table.

### FR-CS-002: Safe Legacy User Metadata Backfill (Data Migration)
* **Description:** Legacy physical dispatch records stored in user metadata strings (`_tsp_sent_letters`) must be securely migrated into the custom `tsp_letter_tracking` relational table.
* **Trigger:** Admin-activated capability check or specific `WP_CLI` trigger commands.
* **Processing Rules:**
  1. Scan all WooCommerce active subscriptions.
  2. Map legacy array records back to their corresponding active subscriptions.
  3. Parse series keys from product items.
  4. Build non-overlapping chronological due dates for the sequence of letters, ensuring older dispatches preserve their actual physical package packing/dispatch dates.
  5. Prevent duplicate backfill execution by checking relational records before insertion.

### FR-CS-003: Operational Rollback Capability (Legacy Mode Safeguard)
* **Description:** Provides an instantaneous switch to revert all transaction tracking to version 1.x user meta arrays if relational performance anomalies occur.
* **Toggle Condition:** Constant `TSP_LEGACY_MODE` declared in `wp-config.php` or database flag `tsp_legacy_mode` evaluates to true.
* **Behavior:**
  * Disable all relational database operations.
  * Disconnect hooks updating relational tables.
  * Re-route all progression and logistics fulfillment workflows to the legacy user metadata architecture.
  * Render warning notices inside the admin dashboard notifying that the system is operating in fallback mode.

### FR-CS-004: Rest Telemetry for Audio Completions
* **Description:** Exposes an authenticated REST API route (`wp-json/tsp/v1/telemetry`) to capture client-side audio completion progress.
* **Authentication:** WP REST nonce validation or secure user session matching.
* **Processing Rules:**
  1. Validate incoming JSON request payloads matching parameters: `audio_id` (string), `user_id` (integer), and `completed` (boolean).
  2. Prevent telemetry forgery by ensuring the logged-in session matches the requested `user_id`.
  3. Store telemetry records in the user meta table under `_tsp_audio_completed_[md5(audio_id)]`.
  4. Fire action hook `tsp_audio_completion_registered` to support external integration loops.

---

## 2. Execution Scenarios & Edge Cases

### Scenario A: Table upgrade during live checkout
* **Edge Case:** Database upgrade triggered while concurrent users are performing single-page checkouts.
* **Mitigation:** Wrap the `dbDelta` statement in a lock checkpoint. Ensure the table updates are purely additive (no field deletions or non-nullable field insertions without defaults) to maintain continuous checkout performance.

### Scenario B: Partially corrupted legacy meta formats
* **Edge Case:** Legacy user metadata containing malformed arrays, missing indexes, or corrupted serialized strings.
* **Mitigation:** The backfill parser must validate meta structural signatures. Malformed rows must be logged to a custom administrative debugger file, and the parser must gracefully proceed to the next record without halting the entire migration.

---

## 3. User Acceptance Testing (UAT) Criteria

* **UAT-CS-001 (Idempotent DB Check):**
  * *Given:* An active WordPress environment with v2 tables already present.
  * *When:* Re-triggering plugin activation.
  * *Then:* The system executes without database error codes, and existing data rows are untouched.

* **UAT-CS-002 (Migration Validation):**
  * *Given:* Legacy users with `_tsp_sent_letters` metadata arrays.
  * *When:* Activating the database backfill routine.
  * *Then:* Relational tables are populated matching previous sequence configurations, and total counts match exactly.

* **UAT-CS-003 (Legacy Fallback Verification):**
  * *Given:* The legacy mode override constant is active.
  * *When:* Recording a payment.
  * *Then:* Custom tables remain read-only, and tracking variables are saved directly to user metadata files.
