# Golden Companion Examples Report

Generated: 2026-06-03T23:55:43.859Z

A/B: **Current RACL** (reason-first) vs **RACL + `BUDDY_EXAMPLES=golden`** (few-shot library).

OpenAI available: **true**

## Success criteria (Part E)

| Criterion | Result |
| --- | --- |
| Listening +0.4 | FAIL (+0.1) |
| Naturalness improves | PASS (+0.5) |
| Felt heard improves | PASS (+0.3) |
| Over-explaining decreases (score up) | PASS (+0.5) |
| Sabbath T7 no regression | PASS |
| Biblical boundaries intact (≥5) | PASS |
| Target listening ≥6.8 | FAIL (golden 6.5) |
| **Overall** | **FAIL** |

## Aggregate metrics

| Metric | Control RACL | Golden examples | Δ |
| --- | ---: | ---: | ---: |
| listening | 6.4 | 6.5 | +0.1 |
| warmth | 5.7 | 5.9 | +0.2 |
| feltHeard | 5.6 | 5.9 | +0.3 |
| threadSpecific | 5.3 | 5.4 | +0.1 |
| naturalness | 6.2 | 6.7 | +0.5 |
| companionPresence | 5.7 | 6.5 | +0.8 |
| biblicalGrounding | 5.6 | 5.3 | -0.3 |
| overExplaining | 6.4 | 6.9 | +0.5 |
| correctionRecovery | 6.2 | 7 | +0.8 |

## Thread-level listening deltas

| Thread | Control | Golden | Δ |
| --- | ---: | ---: | ---: |
| Job opportunity | 5.3 | 5.8 | +0.5 |
| Alzheimer's caregiver | 6.7 | 7 | +0.3 |
| Feeling distant from God | 6.1 | 6.1 | +0 |
| Sabbath wording thread | 6.8 | 6.8 | +0.1 |
| Grief thread | 6.7 | 6.2 | -0.5 |
| Health thread | 6.4 | 6.3 | -0.1 |

## Part D — Qualitative comparison (T1 sample per thread)

## Implementation (Parts A–B)

- **Library:** `services/goldenCompanionExamples.js` — 12 examples (2 × 6 areas)
- **Test flag:** `BUDDY_EXAMPLES=golden` injects 1–2 matched examples into reason-first system prompt (`buildComposerSystemPrompt`)
- **Route:** `reason_first_openai_golden` when examples enabled
- **Unchanged:** RACL, RESPONSE STRUCTURE, correction ledger, doctrine validation, listening signals, production default `legacy`

## Baseline reference (prior audits)

| Metric | Prior RACL run | This control (rescored) |
| --- | ---: | ---: |
| Listening | 6.3 | 6.4 |
| Opening-detail util. | ~51% | pending golden run |

### Job opportunity

**1. Current RACL reply (baseline)**
```
It sounds like this job opportunity is an important step for you, and it’s natural to want to seek wise guidance about it. A good place to start is to trust in the LORD with all your heart, as Proverbs 3:5-6 encourages, and to ask God for wisdom in making this decision, just as James 1:5 invites us to do. Remember, Psalm 37:23 reminds us that the steps of a good man are ordered by the LORD. Would you like to talk about what’s on your heart regarding this opportunity or any specific concerns you 
```

**2. Golden-example arm reply**
```
A new job opportunity can bring a mix of excitement and uncertainty. It’s okay to take time to consider what this means for your life and peace of mind. When you pray, you might share with God what draws you to this job and what concerns you have. Proverbs 3:5-6 reminds us to trust the LORD with all our heart and lean not on our own understanding. Asking God for wisdom, like James 1:5 encourages, can be a gentle way to seek clarity without pressure.
```

**Library golden reference**
```
A new job opportunity can stir a lot at once — hope, worry, and questions about timing. You do not have to decide today. When you pray, you might simply tell God what drew you to this offer and what you are afraid of losing. James 1:5 is a good place to start if you want wisdom without pressure.
```

**3. Trusted companion (library golden vs current RACL):** **Golden arm**

Drops It-sounds-like template; more concrete.

**4. Golden arm live reply:** see block 2 above

Drops It-sounds-like template; more concrete.

### Alzheimer's caregiver

**1. Current RACL reply (baseline)**
```
I'm truly sorry to hear about your mom's diagnosis. Alzheimer's can be such a difficult journey for both her and you. Remember that God honors those who care for their parents, as Exodus 20:12 reminds us to honor our father and mother. He is also close to us in every season of life, carrying us gently even into old age, as Isaiah 46:4 assures. Would you like to pray together for strength and peace for you and your mom, or perhaps talk about some ways Scripture can comfort you now?
```

**2. Golden-example arm reply**
```
Learning that your mom has Alzheimer's is a hard turn — for her and for you. You are still her son or daughter in God's eyes, and honoring her can look like showing up even when the days are confusing. You do not need a perfect speech; steady presence and prayer in small moments count.
```

**Library golden reference**
```
Learning that your mom has Alzheimer's is a hard turn — for her and for you. You are still her son or daughter in God's eyes, and honoring her can look like showing up even when the days are confusing. You do not need a perfect speech; steady presence and prayer in small moments count.
```

**3. Trusted companion (library golden vs current RACL):** **Golden arm**

Shorter, less over-explaining.

**4. Golden arm live reply:** see block 2 above

Shorter, less over-explaining.

### Feeling distant from God

**1. Current RACL reply (baseline)**
```
Feeling distant from God can be a heavy and lonely place, and it's okay to be honest about that. The Bible reminds us that God’s presence is always near, even when we feel far. Psalm 139 beautifully says there is nowhere we can flee from God's Spirit, showing His constant closeness. A gentle next step could be to simply invite God into your feelings in prayer, asking Him to draw you near as James 4:8 encourages. If you want, I can help you pray or reflect on a passage to renew your heart and spi
```

**2. Golden-example arm reply**
```
Feeling distant from God lately can be a heavy and confusing experience. It doesn’t mean God has left you; often it means your heart is tired or wrestling with something unseen. Sometimes just honestly sharing that feeling with Him, even without words, can be a quiet way to begin drawing near again. Would you like, I can share a gentle verse and a simple prayer you might try in this season?
```

**Library golden reference**
```
Feeling distant from God lately does not mean He has left you — it often means your heart is tired or guarded. You can tell Him plainly that prayer feels dry and that you miss closeness. Sometimes the next step is not trying harder, but showing up honestly for five quiet minutes without fixing the feeling first.
```

**3. Trusted companion (library golden vs current RACL):** **Golden arm**

Shorter, less over-explaining.

**4. Golden arm live reply:** see block 2 above

Shorter, less over-explaining.

### Sabbath wording thread

**1. Current RACL reply (baseline)**
```
The Bible itself designates the seventh day (Saturday) as the Sabbath, a day blessed and sanctified by God (Genesis 2:2-3; Exodus 20:8-11). Early Christians often met on the first day of the week (Sunday) to commemorate Jesus Christ's resurrection, but the Bible does not explicitly command changing the Sabbath to Sunday. Historically, Sunday worship became widespread due to a combination of early Christian practice, Roman civil law under Emperor Constantine in AD 321, and church councils like La
```

**2. Golden-example arm reply**
```
The Bible explicitly identifies the seventh day, the Sabbath, as the day God blessed and set apart for rest and worship (Genesis 2:2-3; Exodus 20:8-11). Early Christians met on the first day of the week (Sunday) to commemorate Jesus' resurrection, but Scripture does not command changing the Sabbath to Sunday as the official day of worship. Historically, Sunday observance developed over time through civil laws like Emperor Constantine's AD 321 decree making Sunday a rest day, and church councils 
```

**Library golden reference**
```
You are right to ask about the name. I used “Roman church” as shorthand for the church centered in Rome in historical discussions — not to avoid the full title. I can say Roman Catholic Church when you prefer that precision. My aim is clarity about history and Scripture, not debating labels for their own sake.
```

**3. Trusted companion (library golden vs current RACL):** **Golden arm**

Shorter, less over-explaining.

**4. Golden arm live reply:** see block 2 above

Compare person-detail and correction directness on the live replies above.

### Grief thread

**1. Current RACL reply (baseline)**
```
I'm truly sorry for your loss. Losing a friend is deeply painful, and it's completely natural to feel brokenhearted right now. The Lord is close to those who are hurting, and even Jesus showed His own sorrow when He wept over loss. If you’d like, I can gently pray with you or simply be here to listen as you remember your friend.
```

**2. Golden-example arm reply**
```
Losing a friend Wednesday—this fresh loss must feel heavy and raw. It's okay to feel the weight of it deeply. You don't have to have it all figured out or be 'over it.' I'm here with you in this moment, and when you're ready, we can simply pray together for comfort and peace, without trying to rush healing.
```

**Library golden reference**
```
Losing a friend Wednesday — that is fresh grief, and it makes sense that it is still heavy. You do not have to be over it or explain it well. I am here with you in it; when you want, we can pray simply for comfort, without trying to fix the hurt today.
```

**3. Trusted companion (library golden vs current RACL):** **Golden arm**

Names Wednesday; baseline generic loss opener.

**4. Golden arm live reply:** see block 2 above

Names Wednesday; baseline generic loss opener.

### Health thread

**1. Current RACL reply (baseline)**
```
I'm sorry to hear your knees hurt. That kind of pain can really weigh on you. It could help to rest them gently and maybe use some ice if there's swelling. Also, I can pray with you for healing and relief if you'd like.
```

**2. Golden-example arm reply**
```
Knee pain can be really wearing, and it’s important to listen to what your body is telling you. Resting your knees and seeking medical advice can be wise steps. Meanwhile, you can bring this honestly before God in prayer, asking for His comfort and healing strength as you wait.
```

**Library golden reference**
```
Knee pain can wear on your body and your spirit — especially when it keeps showing up. Rest and a clinician’s check are wise, not a lack of faith. You can tell God plainly that your knees hurt and ask for strength and healing in His time.
```

**3. Trusted companion (library golden vs current RACL):** **Mixed / read both**

Compare person-detail and correction directness on the live replies above.

**4. Golden arm live reply:** see block 2 above

Compare person-detail and correction directness on the live replies above.

## Library

**12** examples in services/goldenCompanionExamples.js (2 per benchmark area).

## Stop conditions

- No deploy, push, Sprint 3, new routes, or architecture experiments
- Enable test path: `BUDDY_EXAMPLES=golden`

