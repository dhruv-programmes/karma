# System Design v1 — Workflow Diagram

```
SIGNUP / ONBOARDING
    |
    v
[Routine Qs: transport + shopping] --> [totalKg = transport + shopping + 20]
    |                                          |
[Goal %]                                       v
    |                              [Provisional Karma Score]
    +----> [Target = totalKg * (1-%/100)]       |
              (budget only)            capped 680, badge Provisional*, conf Low
                                               |
                                    POST /onboarding/baseline (store hash)
                                               |
                        +----------------------+----------------------+
                        |                                             |
                  TRACK A: REWARDS                          TRACK B: KARMA SCORE
                  (Day 1, immediate)                        (waits for data)
                        |                                             |
            [Repair/Recycle/Donate/                    [Upload bills: elec + shop
             Resell/Refurbish/Reduce]                   + food + travel]
                        |                               (receipt/import/scan)
                        v                                             |
               [Check-in complete]                                    v
                        |                               [Server: categorize + kg
                        v                                via estimate_from_spend]
               [+100/+150 pts -> Redeem]                              |
                  (no bills needed)                                   v
                                                        [DATA METER: 12 signals?]
                                                        [4/5 cats? 5 merchants?]
                                                        [3-week variety? (quiet)]
                                                        /               \
                                                  NO (stay)           YES
                                                   |                    |
                                          [Provisional* +          [Verified Score]
                                           x/12 + missing]          same scale,
                                                   |                badge Verified,
                                          [14d since baseline       conf High]
                                           AND still NO?]
                                            /       \
                                          NO        YES
                                          |          |
                                       (silent)  [NUDGE BANNER:
                                                  Need more data
                                                  (upload elec/shop/
                                                  food/travel) + Upload]
```

Notes on diagram:
- TRACK A and TRACK B never mix. Baseline edits = 0 pts.
- Shopping fix inside totalKg box: shopping = frequent + selective_rev - repair_credit.
- Interim scale in both score boxes: 650 + (110-kg)*2.2, clamp 480-820.
- Final Karma mapping slot left open for your logic later.
```
