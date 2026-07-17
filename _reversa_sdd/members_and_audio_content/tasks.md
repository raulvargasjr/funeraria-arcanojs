# Task Roadmap: Members & Audio Content

This document details the checklist of atomic tasks required to test, verify, and modify the **Members & Audio Content** module of **The Secret Post Platform**.

---

## Technical Checklist

- `[ ]` **TS-MA-001: Simplified Account Dashboard Testing**
  - `[ ]` Log in as a standard subscriber client.
  - `[ ]` Access the WooCommerce profile dashboard menu.
  - `[ ]` Verify that standard tabs like Orders, Downloads, and Payment Methods are hidden.
  - `[ ]` Confirm that clicking "Dashboard" routes directly to `my-stories`.

- `[ ]` **TS-MA-002: Bi-weekly Progression Algorithm Validation**
  - `[ ]` Register a test subscription with start date = `now` - 45 days.
  - `[ ]` Confirm that exactly 4 stories are unlocked (Letter 1 on Day 0, Letter 2 on Day 15, Letter 3 on Day 30, Letter 4 on Day 45).
  - `[ ]` Inject billing failure records simulating a subscription freeze duration of 18 days.
  - `[ ]` Verify that the progression recalculates and returns exactly 2 unlocked stories (Day 45 - Day 18 = Day 27 elapsed. Letter 1 on Day 0, Letter 2 on Day 15).
  - `[ ]` Access as an administrator. Verify that the unlock count overrides to 9999.

- `[ ]` **TS-MA-003: Signed Audio Key Security Check**
  - `[ ]` Generate a signed url for a specific media file ID.
  - `[ ]` Attempt access with modified URL query variables (change `uid`, `exp`, or signatures). Verify response is HTTP `403 Forbidden`.
  - `[ ]` Manually configure `exp` to represent a timestamp 1 minute in the past. Verify access fails.
  - `[ ]` Request the link from an unauthenticated browser instance. Verify session authentication filters block it.

- `[ ]` **TS-MA-004: HTTP 206 Byte Ranges Validation**
  - `[ ]` Trigger audio file streaming requests via curl, injecting range headers: `curl -i -H "Range: bytes=0-1023" {signed_url}`.
  - `[ ]` Verify that response headers return status `206 Partial Content`.
  - `[ ]` Confirm `Content-Range` matches exactly `bytes 0-1023/{total_size}`.
  - `[ ]` Verify response byte payload size matches exactly 1024 bytes.
