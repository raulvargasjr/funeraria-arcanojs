# Task Roadmap: Dunning & Admin Operations

This document details the checklist of atomic tasks required to test, verify, and modify the **Dunning & Admin Operations** module of **The Secret Post Platform**.

---

## Technical Checklist

- `[ ]` **TS-DA-001: Three-Stage Dunning Verification**
  - `[ ]` Configure active billing failures on testing client subscription records.
  - `[ ]` Mock system dates to exactly 1 day since suspension. Execute WP-Cron. Verify Day 1 email triggers.
  - `[ ]` Mock system dates to exactly 4 days since suspension. Execute WP-Cron. Verify Day 4 email triggers.
  - `[ ]` Mock system dates to exactly 7 days since suspension. Execute WP-Cron. Verify Day 7 email triggers, digital locks are set, and physical dispatch rows enter `payment_hold`.

- `[ ]` **TS-DA-002: Dynamic Story Unlock Cron Validation**
  - `[ ]` Trigger morning job execution `tsp_daily_unlock_cron`.
  - `[ ]` Verify that clients reaching new progression bounds receive styled email HTML notifications.
  - `[ ]` Validate that the user meta anti-spam baseline key `_tsp_audio_unlock_email_baseline_set` is created cleanly.
  - `[ ]` Re-run the drip cron and ensure that no duplicate email is dispatched.

- `[ ]` **TS-DA-003: Administrative Logistics Board & AJAX Dispatch**
  - `[ ]` Log in as store manager. Load logistics Kanban view dashboard panel.
  - `[ ]` Verify card KPI values represent true database record totals.
  - `[ ]` Click dispatch action triggers on test rows. Verify status shifts to `dispatched` dynamically.
  - `[ ]` Check packer user signature logs written to `tsp_letter_tracking` fields.

- `[ ]` **TS-DA-004: Live Search Cache Verification**
  - `[ ]` Toggle cache engine plugins (e.g. WP Rocket) active in the testing framework.
  - `[ ]` Perform multiple subscriber search entries in the logistics dashboard search bar.
  - `[ ]` Inspect Chrome Network dev-tools to verify queries bypass browser caches completely.
  - `[ ]` Check DOM element update counts and verifying empty state messages display correctly.
