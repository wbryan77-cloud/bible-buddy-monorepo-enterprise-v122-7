# 07 — Stateful Conversation Results

Local runtime via `runBuddy` (`scripts/runBiePhase1dStatefulValidation.js`).

## Summary

```json
{
  "startedAt": "2026-08-04T23:01:32.991Z",
  "elapsedMs": 665187,
  "sequenceCount": 6,
  "paraphraseFamilies": 2,
  "doctrineRouteTurns": 5,
  "fixedStampOnDoctrineTurns": 0,
  "packetCompositionSignals": 2,
  "gates": {
    "noFixedStampOnPacketDoctrine": true,
    "paraphraseGeneralizes": true
  }
}
```

## Family notes

| Family | Key observation |
|---|---|
| A Resurrection | Strict turns use `Direct answer:` + packet-ordered witnesses; follow-ups leave strict for OpenAI/companion when not initial |
| B Satan | Explicit/inference distinction via OpenAI lane; yes/no first turn worked on B2 |
| C Feasts | Zech 14 bible_wide then direct Yes; history holidays last turn |
| D Appearance | Scripture/explicitness handled on OpenAI/bible_wide lanes |
| E Deut 28 / history | History questions leave pure Deuteronomy dump after history-only ask |
| F General | App identity + Lincoln + prayer lanes; difficult-day recall works |

## D1-specific gate

`fixedStampOnDoctrineTurns = 0` → **PASS** (0 on doctrine_final_authority turns)
