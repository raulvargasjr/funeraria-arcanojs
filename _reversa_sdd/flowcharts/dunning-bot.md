# Dunning Automated Bot & Chasing Flowchart

This document details the automated dunning sequence executed daily by **The Secret Post Platform** to process payment chasing notices for failed subscription renewals.

---

## Technical Flowchart

```mermaid
graph TD
    A[Daily Cron Trigger: tsp_daily_dunning_cron] --> B[Fetch unresolved payment failures]
    B --> C{Begin iteration over subscriptions}
    
    C -->|Loop: For each sub| D[Calculate days in on-hold state]
    
    D --> E{Days elapsed?}
    
    E -->|Exactly Day 1| F[Send Immediate Chasing Email]
    F --> G[Log dunning attempt in DB]
    
    E -->|Exactly Day 4| H[Send Reminder Chasing Email]
    H --> G
    
    E -->|Exactly Day 7| I[Send Final Suspension Warning Email]
    I --> J[Freeze digital audio story progression]
    J --> K[Freeze physical packaging fulfillment queues]
    K --> G
    
    E -->|Other days| L[No action required]
    
    G --> M{Has iteration finished?}
    M -->|No| C
    M -->|Yes| N[End cron execution]
```

---

## Dunning Schedule Specifications

The chasing schedule is structured as a three-stage email layout to optimize recovery rates for the elderly target audience:
* **Stage 1 (Day 1 - Immediate Chasing):** Friendly initial notification providing direct checkout links to update billing credentials.
* **Stage 2 (Day 4 - Middle Chasing):** Warning alert emphasizing potential disruption to physical deliveries and story unlocks.
* **Stage 3 (Day 7 - Suspension Chasing):** Formal notification confirming full progression freeze (both digital listenings and physical packaging are frozen until accounts are settled).
