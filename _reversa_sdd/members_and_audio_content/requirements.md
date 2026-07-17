# Requirements Specification: Members & Audio Content

This document outlines the detailed functional and non-functional requirements, execution scenarios, and User Acceptance Testing (UAT) criteria for the **Members & Audio Content** module of the **The Secret Post Platform**.

---

## 1. Functional Requirements

### FR-MA-001: Simplified Elderly Dashboard (WooCommerce My Account Override)
* **Description:** Bypasses standard WooCommerce dashboard sections to provide a cleaner layout tailored specifically for an elderly audience.
* **Layout Simplification rules:**
  1. Hide default dashboard tabs: Downloads, Orders, Addresses, Payment Methods, and general dashboard intros.
  2. Map navigation to exactly four options: My Products (`my-stories`), My Subscription (`my-subscription`), Listen to My Letters (`my-letters`), and Account Details.
  3. Clicking "Dashboard" redirects users directly to the `my-stories` grid interface.

### FR-MA-002: Bi-weekly Progression Timeline Logic
* **Description:** Computes how many physical/digital stories a user can access based on active billing days.
* **Processing Rules:**
  1. Base Unlock Rule: Letter #1 unlocks instantly at Day 0. Every subsequent 15 days (`TSP_LETTER_INTERVAL_DAYS`) unlocks the next letter in sequence.
  2. Timeline Freeze: If a subscription enters `on-hold`, `cancelled`, or `failed` statuses, progression is frozen. The duration of the suspension must be deducted from the calculated total active days.
  3. Administration Bypass (God Mode): Users possessing the capability `manage_woocommerce` bypass all chronological filters, allowing full immediate access (unlocked story index mapped to `9999`).

### FR-MA-003: Signed HMAC-SHA256 Streaming Links
* **Description:** Media file paths must be hidden and served exclusively through encrypted rewrite endpoint URLs expiring in 120 minutes.
* **Processing Rules:**
  1. Generate access URLs containing `file_id`, `uid` (user ID), `exp` (timestamp), and a secure timing-attack resistant signature `sig`.
  2. Verify parameter authenticity using `hash_equals` comparison against local HMAC calculations using the site `AUTH_SALT`.
  3. Link verification must fail if current time surpasses `exp` or if the requesting user session does not match `uid`.

### FR-MA-004: Secure HTTP 206 Partial Content Streaming Engine
* **Description:** Protect system memory and reduce bandwidth usage by streaming encrypted audio exclusively in byte range segments.
* **Processing Rules:**
  1. Detect incoming `Range: bytes={start}-{end}` headers sent by browser media players.
  2. Parse boundary constraints and send HTTP `206 Partial Content` response headers.
  3. Stream binary media data blocks in small 8KB chunk loops directly from secure directories to support seeking and scrubbing on mobile players.

---

## 2. Execution Scenarios & Edge Cases

### Scenario A: Shared audio URL leak
* **Edge Case:** An active customer shares their signed audio link with an unauthenticated external user.
* **Mitigation:** The streaming validation engine must confirm that the requesting browser session has a valid login that matches the user ID embedded in the signature. Unauthenticated requests must instantly return an HTTP `403 Forbidden` error.

### Scenario B: Multiple concurrent holds and reactivations
* **Edge Case:** A subscription is suspended, reactivated, suspended again, and reactivated, causing complex timeline calculations.
* **Mitigation:** The system must record and aggregate all suspension intervals in the relational tracking database. The progression calculator must query the sum of all suspension logs to determine net active days accurately.

---

## 3. User Acceptance Testing (UAT) Criteria

* **UAT-MA-001 (Elderly Dashboard Navigation):**
  * *Given:* An active customer accesses their WooCommerce Account area.
  * *When:* Loading the profile panel.
  * *Then:* Standard downloads/orders navigation tabs are hidden, and the interface displays simplified buttons.

* **UAT-MA-002 (Signed Link Expiration):**
  * *Given:* A generated signed media stream link.
  * *When:* Re-requesting the streaming link after 120 minutes.
  * *Then:* The engine returns an HTTP `403 Forbidden` response confirming link expiration.

* **UAT-MA-003 (Byte-Range Seek Check):**
  * *Given:* An active stream session inside a mobile Safari browser player.
  * *When:* The user scrubs or seeks to a middle timestamp on the play bar.
  * *Then:* The server successfully transmits an HTTP `206 Partial Content` status header and processes playback smoothly without reloading from byte 0.
