# Story Progression & Unlocking Mechanism Flowchart

This document details the bi-weekly progression calculation logic used by **The Secret Post Platform** to determine which physical letters and associated audio files are accessible to a customer.

---

## Technical Flowchart

```mermaid
graph TD
    A[Start: Request story progression index] --> B{Does user have manage_woocommerce?}
    B -->|Yes: Admin / Shop Manager| C[Enable God Mode: Unlock count = 9999]
    B -->|No: Regular customer| D[Retrieve Active Subscriptions]
    
    D --> E{Are any subscriptions active?}
    E -->|No active subscription| F[Return 0 unlocked letters]
    E -->|Yes active subscription| G[Get subscription start date]
    
    G --> H[Retrieve billing freeze records]
    H --> I[Compute net active days elapsed]
    
    I --> J[Calculate base unlocked count]
    NoteOverJ["Formula: 1 + floor(ActiveDays / 15)"]
    
    J --> K{Inspect Subscription Series}
    
    K -->|love_in_wartime| L[Bound maximum unlock count to 25]
    K -->|black_rose| M[Bound maximum unlock count to 24]
    
    L --> N[Return final unlocked story count]
    M --> N
    N --> O[Render audio dashboard and packaging queues]
```

---

## Net Active Days Formula

To prevent users from gaining unauthorized access to letters while their payments are failing, the progression timeline calculations perform dynamic offsets:

$$\text{Net Active Days} = \text{Total Elapsed Days} - \text{Total Freeze Duration}$$

Where:
* **Total Elapsed Days:** Days between `subscription_start_date` and `current_time`.
* **Total Freeze Duration:** Sum of days accumulated between status change logs of `active` $\to$ `on-hold` and subsequent reactivations `on-hold` $\to$ `active` in relational databases.
* **God Mode Override:** Safely bypasses the entire equation for admin QA testing environments, returning immediate full platform capability.
