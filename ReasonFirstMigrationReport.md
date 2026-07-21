# Reason-First Migration Report

Generated: 2026-06-03T21:51:50.308Z

## Summary

Emergency architecture fix: reason-first runtime behind `BUDDY_RUNTIME=reason_first`. Legacy preserved as `BUDDY_RUNTIME=legacy` (default).

**Release gate:** FAIL

## Files Changed

| File | Purpose |
| --- | --- |
| `services/reasonFirstBuddyRuntime.js` | Reason-first orchestrator |
| `services/retrievalEvidencePack.js` | Memory/scripture/history facts only |
| `services/reasonFirstComposer.js` | OpenAI primary composer |
| `services/doctrineBoundaryValidator.js` | Post-compose doctrine validation |
| `services/reasonFirstTrace.js` | Production trace logging |
| `services/buddyBrain.js` | `BUDDY_RUNTIME` feature flag dispatch |
| `scripts/reasonFirstMigration.js` | A/B comparison + release gate |

## Feature Flag Instructions

```bash
# Legacy (default) — route-first runtime
BUDDY_RUNTIME=legacy node server.js

# Reason-first — OpenAI primary composer
BUDDY_RUNTIME=reason_first OPENAI_API_KEY=sk-... node server.js
```

Default when unset: `legacy`.

## Aggregate A/B Metrics

| Runtime | Turns | OpenAI % | Avg template % | Avg listening |
| --- | --- | --- | --- | --- |
| legacy | 20 | 0% | 4.1% | 5.7/10 |
| reason_first | 20 | 100% | 0.1% | 5.3/10 |

## Release Gate Checks (reason_first only)

| Check | Result | Value |
| --- | --- | --- |
| OpenAI reasoning >= 70% | PASS | 100% |
| Template prose <= 20% | PASS | 0.1% |
| Listening score >= 7/10 | FAIL | 5.3/10 |

## Thread Comparison

### Job opportunity

| | Legacy | Reason-first |
| --- | --- | --- |
| Listening avg | 6.3 | 6.3 |
| OpenAI turns | 0/3 | 3/3 |

<details><summary>Sample turn (last message)</summary>

**User:** I'm not sure whether to push or wait on this offer.

**Legacy:**
```
That sounds like an important decision. What feels heaviest right now — the distance, timing, money, or whether this is from God?

Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witness.

If you want, we can pray through this together or walk through the decision one piece at a time.
```

**Reason-first:**
```
It sounds like you're feeling uncertain about whether to actively pursue this job offer or to wait patiently, which is a natural tension when big decisions loom. Trusting God to guide your timing is important. You might find it helpful to pray specifically for wisdom about the right pace—whether to press forward or to rest in waiting—and to listen quietly for His peace. Sometimes, taking a moment to reflect on where you sense calm and clarity can be the best indicator. Remember, Proverbs 3:5-6 encourages trusting the Lord fully and acknowledging Him in all your ways so He directs your paths.
```

</details>

### Alzheimer's caregiver

| | Legacy | Reason-first |
| --- | --- | --- |
| Listening avg | 5 | 5 |
| OpenAI turns | 0/3 | 3/3 |

<details><summary>Sample turn (last message)</summary>

**User:** How do I stay close to God while grieving who she used to be?

**Legacy:**
```
I'm really sorry for your loss. Tell me about her if you want — we can take this gently, one step at a time.

Psalm 34:18 establishes the matter, and Matthew 5:4 confirms it alongside Scripture. Revelation 21:4 carries the theme forward across the biblical witness.

If you would like, we can pray together, sit with a comforting passage, or simply talk through what you are feeling — no pressure.

When you are ready, I can gently check in on how you have been doing — only if you want that.
```

**Reason-first:**
```
Grieving the change in your mom and who she used to be is deeply painful, and seeking closeness with God in the midst of that shows your heart's longing for comfort and strength. Staying close to God can be like leaning into a friend who understands your sorrow and carries you gently. It’s okay to bring your honest feelings to Him—your confusion, sadness, and love. The Bible assures us that God is near to the brokenhearted and saves those who are crushed in spirit. Taking moments to talk to Him honestly in prayer, even if it’s just a whisper, and resting in His promises can help you feel His p
```

</details>

### Feeling distant from God

| | Legacy | Reason-first |
| --- | --- | --- |
| Listening avg | 5.7 | 5 |
| OpenAI turns | 0/3 | 3/3 |

<details><summary>Sample turn (last message)</summary>

**User:** Does that mean my faith is failing?

**Legacy:**
```
I'm glad you asked to pray. Let's bring this before the Lord together.

Father, we bring this need before You for Does that mean my faith is failing?. You see what we cannot fully see. Please draw near with comfort, wisdom, and peace. Hold those who are hurting, guide those who are waiting, and help us trust You one step at a time. In Jesus' name, amen.

Philippians 4:6-7 establishes the matter, and James 5:16 confirms it alongside Scripture. Psalm 34:17 carries the theme forward across the biblical witness.

If you would like, we can sit with one of these passages, talk through what you are c
```

**Reason-first:**
```
Feeling distant from God and experiencing emptiness in prayer does not automatically mean your faith is failing. The Bible shows us that even the most faithful can go through seasons of dryness or struggle, yet God remains steadfast and near. Faith is often about continuing to seek Him honestly, even when feelings falter. Remember that God welcomes our honest hearts and draws near to those who draw near to Him (James 4:8). It's okay to bring your doubts and feelings to God in prayer and ask Him to strengthen your faith.
```

</details>

### Sabbath wording thread

| | Legacy | Reason-first |
| --- | --- | --- |
| Listening avg | 5.6 | 5 |
| OpenAI turns | 0/7 | 7/7 |

<details><summary>Sample turn (last message)</summary>

**User:** Are you not listening to what I am asking?

**Legacy:**
```
You're right — I was not answering your exact question. The answer is: I should address "No, I'm not asking about the shift. I'm asking about your wording." directly instead of repeating a previous template. Tell me if you want me to clarify a specific word or phrase I used.
```

**Reason-first:**
```
I hear you clearly now and want to assure you that I am listening to your question about my choice of wording. My intention in using "Roman church" was to keep things straightforward and avoid assumptions about denominational labels, but I understand you want a direct acknowledgment of that choice. Thank you for your patience; I’m here to respect your preferences and communicate as clearly as possible.
```

</details>

### Grief thread

| | Legacy | Reason-first |
| --- | --- | --- |
| Listening avg | 6 | 6 |
| OpenAI turns | 0/2 | 2/2 |

<details><summary>Sample turn (last message)</summary>

**User:** It is still bothering me.

**Legacy:**
```
I hear you — it's still weighing on you. That kind of grief doesn't lift quickly, and it makes sense that it's still bothering you.

You mentioned recently that the loss you shared is still weighing on you.

Psalm 34:18 establishes the matter, and Matthew 5:4 confirms it alongside Scripture. Revelation 21:4 carries the theme forward across the biblical witness.

If you would like, we can pray together, sit with a comforting passage, or simply talk through what you are feeling — no pressure.
```

**Reason-first:**
```
I hear you—it’s really hard when the pain from losing your friend lingers like this. Grief often stays with us longer than we expect, and that’s okay. Be gentle with yourself as you walk through these feelings. If it helps, you might find comfort in knowing that God is very near in times like this, holding your heart even when it feels heavy.
```

</details>

### Health thread

| | Legacy | Reason-first |
| --- | --- | --- |
| Listening avg | 6 | 5 |
| OpenAI turns | 0/2 | 2/2 |

<details><summary>Sample turn (last message)</summary>

**User:** My knees are hurting again today.

**Legacy:**
```
I hear you — your knees are hurting again today. That matters, and I'm glad you told me. Let's take this gently — I'm not a doctor, but we can bring this before the Lord together.

Psalm 103:1-5 establishes the matter, and 3 John 1:2 confirms it alongside Scripture. Matthew 11:28-30 carries the theme forward across the biblical witness.

If you would like, we can pray for strength and peace, sit with a gentle passage, or take one small step for today — no pressure.
```

**Reason-first:**
```
I'm sorry your knees are hurting again today. That ongoing discomfort can be really discouraging. Remember to give them gentle rest and avoid strain if you can. If you feel up to it, I can pray with you now for comfort and healing.
```

</details>

## Rollback Plan

1. Unset `BUDDY_RUNTIME` or set `BUDDY_RUNTIME=legacy` — immediate return to route-first runtime.
2. No database migration required; session format unchanged.
3. Trace log preserved at `data/reason-first-trace.jsonl` for post-mortem.
4. Legacy modules untouched — zero deletion rollback risk.

## Human Testing Readiness

**NOT READY for production human testing** — release gate failed. Keep flag off in production; continue tuning composer/validation locally.

---

Local validation only. **Do not push. Do not deploy.**