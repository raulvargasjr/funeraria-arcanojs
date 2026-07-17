# Task Roadmap: Core & Schema

This document details the checklist of atomic tasks required to test, verify, and modify the **Core & Schema** module of **The Secret Post Platform**.

---

## Technical Checklist

- `[ ]` **TS-CS-001: Idempotent DB Verifications**
  - `[ ]` Execute clean activation and verify tables `tsp_letter_tracking` and `tsp_payment_events` are created.
  - `[ ]` Validate engine collation settings match `utf8mb4_unicode_ci`.
  - `[ ]` Check composite index configurations via SQL statements: `SHOW INDEX FROM tsp_letter_tracking;`.
  - `[ ]` Re-activate the plugin to ensure activation is fully idempotent.

- `[ ]` **TS-CS-002: Metadata Backfill Integration Testing**
  - `[ ]` Inject legacy mocked meta arrays `_tsp_sent_letters` into a target user metadata row.
  - `[ ]` Trigger the database backfill script execution via command-line or WP-CLI tools.
  - `[ ]` Confirm data matches target fields inside `tsp_letter_tracking`.
  - `[ ]` Verify duplicate scans are skipped cleanly.

- `[ ]` **TS-CS-003: Operational Legacy Mode Reversals**
  - `[ ]` Configure `define('TSP_LEGACY_MODE', true);` in testing setup files.
  - `[ ]` Confirm administrative warning banners render within the WordPress backend workspace.
  - `[ ]` Test transactions to confirm that zero SQL queries are made against custom tables while active.

- `[ ]` **TS-CS-004: REST Telemetry Authentication Validation**
  - `[ ]` Trigger unauthenticated `POST` requests to `/wp-json/tsp/v1/telemetry`. Verify an HTTP `403 Forbidden` response is returned.
  - `[ ]` Send forged requests mismatching user sessions to verify session blocking logic.
  - `[ ]` Execute successful telemetry post requests, confirming that correct MD5 keys are logged in user profiles.
