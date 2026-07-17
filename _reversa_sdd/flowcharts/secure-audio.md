# Secure Audio Streaming Engine Flowchart

This document maps the complete verification and streaming lifecycle for **The Secret Post Platform** secure audio engine, detailing step-by-step signature verification and dynamic byte-range streaming logic.

---

## Technical Flowchart

```mermaid
graph TD
    A[Client requests audio URL] --> B[Rewrite intercept /secret-audio/{encoded_file_id}/]
    B --> C{Extract query params}
    C -->|Params missing| D[Return 403 Forbidden]
    C -->|Params present| E{Is user logged in?}
    
    E -->|No| F[Redirect to My Account Login]
    E -->|Yes| G{Check exp timestamp}
    
    G -->|Expired: now > exp| H[Return 403 Expired Link]
    G -->|Valid: now <= exp| I{Re-calculate local HMAC-SHA256}
    
    I --> J{Does signature match sig?}
    J -->|No mismatch| K[Return 403 Invalid Signature]
    J -->|Yes matches| L{Validate Active Subscription}
    
    L -->|Inactive or hold| M[Return 403 Access Denied]
    L -->|Active subscription| N{Inspect HTTP Headers}
    
    N -->|No Range Header| O[Stream entire file 200 OK]
    N -->|Range: bytes=start-end| P[Compute requested offset boundaries]
    
    P --> Q[Send HTTP 206 Partial Content]
    Q --> R[Stream requested byte chunk to player]
    R --> S[Enable scrub & seeking on mobile players]
```

---

## Architectural Details

1. **HMAC Signature Formulation:**
   * Calculated dynamically: `hash_hmac('sha256', "file_id={$file_id}&uid={$user_id}&exp={$expiration}", AUTH_SALT)`.
   * Timing-attack mitigation is guaranteed using WordPress's `hash_equals()` string comparison wrapper.

2. **HTTP 206 Seek Algorithm:**
   * Utilizes basic standard PHP filesystems (`fopen`, `fseek`) to retrieve requested stream bounds.
   * Transmits response headers: `Content-Range: bytes {start}-{end}/{total_size}`.
   * Keeps server RAM impact extremely low, streaming chunks in small buffers (typically 8KB blocks).
