# Requirements Specification: Dunning & Admin Operations

This document outlines the detailed functional and non-functional requirements, execution scenarios, and User Acceptance Testing (UAT) criteria for the **Dunning & Admin Operations** module of the **The Secret Post Platform**.

---

## 1. Functional Requirements

### FR-DA-001: Three-Stage Failed Payment Dunning Sequence
* **Description:** Automates chasing procedures when subscription payments fail, preventing unpaid fulfillment dispatches while guiding elderly customers through payment recovery.
* **Interval Chasing Rules:**
  1. **Day 1 (Immediate Notice):** Send initial chasing email alert containing simple links to update card/Pix payment credentials.
  2. **Day 4 (Warning Reminder):** Send warning notice reminding of imminent physical delivery suspension.
  3. **Day 7 (Suspension & Progression Freeze):** Send final notification. Freeze physical logistics packaging lines and lock digital audio progressions instantly in the database.

### FR-DA-002: Dynamic Story Unlock Morning Notifications
* **Description:** Schedules a daily automated script to inform active customers about newly unlocked stories.
* **Processing Rules:**
  1. Register a daily job triggered exactly at 9:00 AM (`tsp_daily_unlock_cron`).
  2. Iterate through active subscriptions. Compute current unlocked story indexes.
  3. If a new story has unlocked since the previous check, dispatch an HTML notification email containing signed links to listen to the new chapter.
  4. **Retro-Spamming Mitigation:** On first deployment, set the user profile metadata flag `_tsp_audio_unlock_email_baseline_set`. Do not trigger emails for letters unlocked prior to this date.

### FR-DA-003: Physical Logistics & Ajax Fulfillment Dashboard
* **Description:** Provides a centralized board for warehouse packers to review subscriber states, pack items, and record dispatches.
* **Fulfillment Board Features:**
  1. **Logistics KPIs:** Render visual card components tracking overall active subscribers, letters pending packaging, items ready for shipment, and accounts currently on hold.
  2. **Kanban Logistics Columns:** Organize records into visual lists: *To Pack*, *Packed*, *Dispatched*, and *Payment Hold*.
  3. **Fulfillment Action (Ajax):** Clicking "Mark as Dispatched" must capture the active warehouse packer ID, update relational dispatch tables, and append status logs in real-time.
  4. **Access Limitation:** Restrict view capability to `manage_woocommerce`.

### FR-DA-004: Anti-Cache AJAX Live Customer Search
* **Description:** Provides a search bar allowing warehouse operators to find subscribers instantly, bypassing standard WordPress page caching engines.
* **Processing Rules:**
  1. Listen to keyup input events in the admin panel search bar.
  2. Execute direct Ajax queries searching client first names, last names, billing addresses, and subscription emails.
  3. Bypass third-party cache engines (e.g., WP Rocket, Cloudflare) by utilizing custom nonced dynamic query signatures.
  4. Perform immediate jQuery DOM updates to render matching rows, showing total counts and empty transition interfaces in real-time.

---

## 2. Execution Scenarios & Edge Cases

### Scenario A: Warehouse packer clicks dispatch concurrently
* **Edge Case:** Multiple packers logged into the logistics panel attempt to check off the same physical parcel simultaneously.
* **Mitigation:** Wrap the Ajax fulfillment update query in a database transaction block. The database driver must enforce row-locking to ensure only the first packer's record is persisted, returning a warning code to subsequent concurrent clickers.

### Scenario B: WP-Cron queue delays
* **Edge Case:** The standard WP-Cron mechanism depends on web traffic to trigger, leading to daily morning email alerts firing hours late on low-traffic sites.
* **Mitigation:** Recommend transitioning system task triggers from standard WP-Cron web events to system-level cron jobs executed natively via the server's OS daemon.

---

## 3. User Acceptance Testing (UAT) Criteria

* **UAT-DA-001 (Dunning Schedule Trigger):**
  * *Given:* A failed billing payment set on a testing subscription.
  * *When:* Days in hold reaches exactly 1, 4, or 7.
  * *Then:* The chasing emails are cleanly dispatched, and attempts are logged in the `tsp_payment_events` table.

* **UAT-DA-002 (Anti-Spam Baseline):**
  * *Given:* Legacy customers with multiple pre-existing unlocked stories.
  * *When:* Activating the unlock drip cron for the first time.
  * *Then:* The baseline meta key is set, and zero emails are triggered for previously unlocked stories.

* **UAT-DA-003 (Fulfillment AJAX Dispatch):**
  * *Given:* Warehouse packer viewing the Kanban columns.
  * *When:* Packer clicks "Mark as Dispatched" on a packed letter row.
  * *Then:* Status transitions to `dispatched` in the custom table, packer ID is recorded, and the row moves visually across columns without page reloads.
