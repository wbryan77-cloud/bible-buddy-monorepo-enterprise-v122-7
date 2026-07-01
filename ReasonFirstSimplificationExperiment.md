# Reason-First Simplification Experiment

Generated: 2026-06-02T20:59:24.622Z

**Test only.** `reasonFirstLiteRuntime` is not wired to production.

## Hypothesis

Companion suppression occurs **after retrieval** (prompt structure, validation, normalization) — not from RACL retrieval itself.

## What Lite Removes

| Removed | Kept |
| --- | --- |
| `buildRuntimeInstructions` | Full `buildRetrievalEvidencePack` (RACL) |
| `buildSystemPrompt` legacy stack | Doctrine boundary validator |
| `responseContract` / answerMatchGate | Crisis protection |
| Polish / sanitize / normalizeStructured | Thread-local memory |
| Scripture triplet in payload (max 1 ref) | History when included |
| RACL addendum + ledger compression fields | Correction facts (quote + intent only) |
| Loop-control + overlap regen | — |

## Aggregate Scores (20 turns, human listening rubric)

| Variant | Listening | Warmth | Follow-up |
| --- | --- | --- | --- |
| Current RF (cached RACL validation) | 6.3 | 5.5 | 6.8 |
| Lite RF (live) | 5.9 | 6.1 | 5.4 |
| Delta (Lite − Current) | -0.4 | +0.6 | -1.4 |

## Part D — Did removing structural pressure improve human quality?

**Answer: NO**

Lite did not beat current RF on human listening at aggregate level. Suppression may be partially in retrieval shaping or model behavior, not only post-retrieval pressure.

## Per-Thread Comparison

### Job opportunity

Thread avg listening: Current **5.6** → Lite **4.9** (-0.7)

| Turn | Listen Δ | Warmth Δ | Follow-up Δ |
| --- | --- | --- | --- |
| 1 | +0 | +2 | pending |
| 2 | -0.8 | +0 | -2 |
| 3 | -1.3 | +0 | +0 |

<details><summary>Last turn — Current vs Lite</summary>

**User:** I'm not sure whether to push or wait on this offer.

**Current RF:**
```
You're weighing whether to actively pursue this job offer or to wait patiently, which can feel uncertain especially with the distance involved. It’s good to remember Proverbs 3:5-6, which encourages trusting the LORD fully rather than relying only on our own understanding, and Psalm 37:7 advises being still before the Lord and waiting patiently for Him. Sometimes waiting is an act of faith, allowing God to guide the timing. You might find it helpful to spend time in prayer, asking God for clear …
```

**Lite RF:**
```
It sounds like you're facing a tough decision about whether to push forward or wait on this offer. Proverbs reminds us to "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." Maybe take some time to pray and ask God for clear guidance and peace about the timing. Sometimes waiting quietly on His wisdom can bring the clarity you need. How does your heart feel when you consider each option?
```

</details>

### Alzheimer's caregiver

Thread avg listening: Current **7** → Lite **6.1** (-0.9)

| Turn | Listen Δ | Warmth Δ | Follow-up Δ |
| --- | --- | --- | --- |
| 1 | +0 | +0 | pending |
| 2 | -1 | +0 | -4 |
| 3 | -1.8 | +0 | -4 |

<details><summary>Last turn — Current vs Lite</summary>

**User:** How do I stay close to God while grieving who she used to be?

**Current RF:**
```
Grieving the loss of who your mom used to be while she faces Alzheimer's is deeply painful and can feel isolating. Staying close to God in this season means bringing your honest feelings to Him—your sadness, confusion, and even anger—and trusting that He understands and holds you tenderly. Remember, God is near to the brokenhearted and saves those who are crushed in spirit. You can lean into His presence through simple moments of prayer, quiet reflection, or even just sitting in His peace. It’s …
```

**Lite RF:**
```
I'm so sorry you're going through this pain. Staying close to God while grieving who she used to be can feel overwhelming, but remember that God is near to the brokenhearted and saves those who are crushed in spirit. You can bring your honest feelings to Him in prayer, trusting that He understands your sorrow deeply. Holding onto His promises and seeking Him in Scripture can be a source of comfort and strength. Let yourself grieve, but also lean into God's presence, knowing He walks with you thr…
```

</details>

### Feeling distant from God

Thread avg listening: Current **6.2** → Lite **6** (-0.2)

| Turn | Listen Δ | Warmth Δ | Follow-up Δ |
| --- | --- | --- | --- |
| 1 | +0 | -1 | pending |
| 2 | +0.5 | +2 | +2 |
| 3 | -1 | +0 | -4 |

<details><summary>Last turn — Current vs Lite</summary>

**User:** Does that mean my faith is failing?

**Current RF:**
```
It’s understandable to wonder if feeling distant and having empty prayers means your faith is failing, but the Bible shows that faith can go through seasons of struggle without being lost. Even the heroes of faith experienced doubts and dryness at times. What matters is not how you feel but continuing to seek God honestly, as James 4:8 encourages us to draw near and He will draw near to us. Faith is often strengthened through these challenging moments rather than undone by them. Holding on and p…
```

**Lite RF:**
```
Feeling distant or struggling doesn't mean your faith is failing. Even David cried out about feeling far from God, yet he trusted that there is nowhere he can go to escape God's presence and love. Psalm 139 reminds us that God is always near, ready to guide and support us. Faith can have seasons of doubt or weakness, but God's grace is bigger than our struggles. It's okay to be honest with Him and seek His strength anew.
```

</details>

### Sabbath wording thread

Thread avg listening: Current **6.5** → Lite **6.3** (-0.2)

| Turn | Listen Δ | Warmth Δ | Follow-up Δ |
| --- | --- | --- | --- |
| 1 | +0 | +0 | pending |
| 2 | +0.6 | +0 | +0 |
| 3 | +0.2 | +0 | +2 |
| 4 | -0.2 | +0 | -3 |
| 5 | -1.4 | +2 | -5 |
| 6 | +1 | +0 | +0 |
| 7 | -1.6 | +0 | +0 |

<details><summary>Last turn — Current vs Lite</summary>

**User:** Are you not listening to what I am asking?

**Current RF:**
```
I hear your frustration and realize I have not directly answered your question about why I use the specific wording “Roman church” instead of the full term “Roman Catholic Church.” My choice of the shorter term is to keep our conversations focused and clear, avoiding the weight of formal titles that carry extra historical and theological associations beyond Scripture. It’s meant as a neutral, simple label rather than a judgment or endorsement. But I want to respect your preference, so I’m happy …
```

**Lite RF:**
```
I hear you, and I’m here to listen carefully to what you're asking. Please feel free to share again or clarify, so I can respond in the way you need.
```

</details>

### Grief thread

Thread avg listening: Current **5.9** → Lite **5.3** (-0.6)

| Turn | Listen Δ | Warmth Δ | Follow-up Δ |
| --- | --- | --- | --- |
| 1 | +0 | +2 | pending |
| 2 | -1.2 | +0 | -2 |

<details><summary>Last turn — Current vs Lite</summary>

**User:** It is still bothering me.

**Current RF:**
```
It’s completely understandable that your friend’s loss is still weighing heavily on your heart. Grief often lingers and can surface in waves, even days after a loss. Remember, it’s okay to feel this way and to give yourself grace through this process. God’s presence is close to those who are brokenhearted, and He understands your pain deeply. When you feel ready, sharing memories or simply talking about what you’re feeling can sometimes bring a measure of peace. I’m here to listen with you as lo…
```

**Lite RF:**
```
I'm truly sorry that this is still weighing on you. Remember, the LORD is near to the brokenhearted and saves those who are crushed in spirit. You're not alone in this, and it's okay to feel this way. Would you like to share more about what's bothering you? I'm here to listen and pray with you.
```

</details>

### Health thread

Thread avg listening: Current **6.4** → Lite **6.4** (+0)

| Turn | Listen Δ | Warmth Δ | Follow-up Δ |
| --- | --- | --- | --- |
| 1 | +0 | +2 | pending |
| 2 | +0 | +2 | +0 |

<details><summary>Last turn — Current vs Lite</summary>

**User:** My knees are hurting again today.

**Current RF:**
```
It’s tough to face that knee pain again today. Your body is precious to God, and ongoing discomfort can weigh on your spirit as well as your body. Continuing to care gently for your knees—resting them when you can, using ice if swollen, and seeking medical advice if needed—are important steps. You might also find comfort in praying for relief and strength, trusting God’s care even through repeated struggles.
```

**Lite RF:**
```
I'm sorry to hear your knees are hurting again today. It can be really tough to deal with ongoing pain. Remember, James encourages us to call on the elders of the church to pray over the sick and anoint them with oil in the name of the Lord for healing. If you haven’t already, maybe you could reach out for prayer support. Also, please take care of yourself and consider what practical steps might help ease the pain today. I'm here to listen and pray with you if you'd like.
```

</details>

## Prompt size (same RACL retrieval, Sabbath T1)

| | Current RF system | Lite RF system |
| --- | --- | --- |
| Est. tokens | ~3,509 | ~313 |
| Characters | ~14,036 | ~1,249 |
| Lite user payload (facts) | — | ~2,285 chars |

## Stop conditions

- No production wiring, deploy, or push
- Evidence only — see `docs/reason-first-lite-experiment/results.json`

