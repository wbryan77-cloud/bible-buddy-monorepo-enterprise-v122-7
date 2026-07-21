# RACL Implementation Report

Generated: 2026-06-03T22:51:12.016Z

## Summary

Retrieval-Anchored Correction Loop (RACL) — reason-first path only. No production default change.

**Validation gate:** FAIL

## RACL Components Implemented

| Part | Component | File |
| --- | --- | --- |
| A | Thread-local memory snippets | `services/retrievalEvidencePack.js` |
| B | Correction ledger | `services/correctionLedger.js` |
| C | Prior assistant quote on meta/correction turns | `services/retrievalEvidencePack.js` |
| D | Loop-control (no sentence reuse) | `services/doctrineBoundaryValidator.js` |
| E | Companion thread context repair | `services/retrievalEvidencePack.js` |
| F | Companion scripture stubs | `services/retrievalEvidencePack.js` |
| G | Composer RACL addendum | `services/reasonFirstComposer.js` |
| H | Human listening rubric | `scripts/raclValidation.js` |

## Aggregate Metrics

| Metric | Value |
| --- | --- |
| Turns | 20 |
| OpenAI % | 100% |
| Avg template % | 0% |
| Avg human listening | 6.4/10 |
| In-thread memory hit turns | 20/20 |

## Success Criteria

| Check | Result | Value |
| --- | --- | --- |
| Sabbath T7 human listening >= 8/10 | FAIL | 7.2/10 |
| No repeated Roman church paragraph after correction | PASS | PASS |
| Alzheimer's thread references mom/Alzheimer's/caregiver | PASS | PASS |
| In-thread memory hits on follow-ups | PASS | 20/20 turns |
| Average human listening >= 7/10 | FAIL | 6.4/10 |
| OpenAI usage >= 70% | PASS | 100% |
| Template prose <= 20% | PASS | 0% |

## Per-Thread Results

### Job opportunity

Avg human listening: **5.5/10**

| Turn | Listening | OpenAI | Thread mem | Correction | Overlap % |
| --- | --- | --- | --- | --- | --- |
| 1 | 5.8/10 | yes | 1 | no | 0 |
| 2 | 4.8/10 | yes | 3 | no | 33 |
| 3 | 6/10 | yes | 5 | no | 30 |

<details><summary>Last turn sample</summary>

**User:** I'm not sure whether to push or wait on this offer.

**Reply:**
```
It’s understandable to feel uncertain about whether to push forward or wait on this offer, especially with the distance involved. Sometimes, waiting can provide clarity and peace, while pushing might be necessary if the timing feels right. Proverbs 3:5-6 encourages trusting the LORD wholeheartedly, not relying solely on our own understanding, so seeking God in prayer for wisdom is key. You might consider calmly asking the company for more time if needed, while spending time in prayer to discern God’s peace about next steps. Would you like to pray together for that clarity now?
```

</details>

### Alzheimer's caregiver

Avg human listening: **7/10**

| Turn | Listening | OpenAI | Thread mem | Correction | Overlap % |
| --- | --- | --- | --- | --- | --- |
| 1 | 6.5/10 | yes | 1 | no | 0 |
| 2 | 6.8/10 | yes | 3 | no | 23 |
| 3 | 7.8/10 | yes | 5 | no | 23 |

<details><summary>Last turn sample</summary>

**User:** How do I stay close to God while grieving who she used to be?

**Reply:**
```
Grieving who your mom used to be while walking this difficult path with Alzheimer's is deeply challenging. Staying close to God in this grief can come through honest prayer sharing your sorrow with Him, remembering He understands our pain and is near. It’s okay to bring your feelings and questions to Him as they are. You can also lean on the truth that God is a friend who loves at all times, even when things feel lost or confusing. Holding onto His promises and presence can help carry you through the heaviness. Would you like to pray together for God’s comfort and strength in this moment?
```

</details>

### Feeling distant from God

Avg human listening: **6.5/10**

| Turn | Listening | OpenAI | Thread mem | Correction | Overlap % |
| --- | --- | --- | --- | --- | --- |
| 1 | 6/10 | yes | 1 | no | 0 |
| 2 | 6/10 | yes | 3 | no | 36 |
| 3 | 7.5/10 | yes | 5 | no | 19 |

<details><summary>Last turn sample</summary>

**User:** Does that mean my faith is failing?

**Reply:**
```
Feeling distant or having prayers that seem empty doesn’t necessarily mean your faith is failing. The Bible shows us that faith can go through seasons of struggle or dryness. Even great believers faced times of doubt or feeling far from God. What matters is the heart’s posture—if you keep seeking God honestly, He is present and working in you. James 1:3-4 explains that trials can develop perseverance, which matures our faith. Would you like to talk more about ways to gently nourish your faith during this time?
```

</details>

### Sabbath wording thread

Avg human listening: **6.7/10**

| Turn | Listening | OpenAI | Thread mem | Correction | Overlap % |
| --- | --- | --- | --- | --- | --- |
| 1 | 5.8/10 | yes | 1 | no | 0 |
| 2 | 6.2/10 | yes | 3 | yes | 10 |
| 3 | 6.8/10 | yes | 5 | yes | 56 |
| 4 | 6.8/10 | yes | 7 | yes | 44 |
| 5 | 7.4/10 | yes | 9 | yes | 23 |
| 6 | 6.6/10 | yes | 9 | yes | 22 |
| 7 | 7.2/10 | yes | 9 | yes | 31 |

<details><summary>Last turn sample</summary>

**User:** Are you not listening to what I am asking?

**Reply:**
```
I hear your concern clearly, and I want to respect exactly what you're asking. My choice to use the term "Roman church" is simply to keep language straightforward and easy to follow, without intending to diminish or alter the official title "Roman Catholic Church." It's a way to avoid adding denominational emphasis or complexity in our discussion. If you prefer, I can use the full term going forward.
```

</details>

### Grief thread

Avg human listening: **5.9/10**

| Turn | Listening | OpenAI | Thread mem | Correction | Overlap % |
| --- | --- | --- | --- | --- | --- |
| 1 | 5.8/10 | yes | 1 | no | 0 |
| 2 | 6/10 | yes | 3 | no | 22 |

<details><summary>Last turn sample</summary>

**User:** It is still bothering me.

**Reply:**
```
It makes sense that your friend's passing is still weighing heavily on you. Grief often lingers and can catch us unexpectedly. Remember, it's okay to feel this way, and you’re not alone in it. The Bible shows us that even Jesus felt deep sorrow and tears, and God is very near to those who are hurting. If it helps, you might find comfort in quietly sharing your feelings with God or simply sitting in His presence when the pain feels strong.
```

</details>

### Health thread

Avg human listening: **6.1/10**

| Turn | Listening | OpenAI | Thread mem | Correction | Overlap % |
| --- | --- | --- | --- | --- | --- |
| 1 | 6.3/10 | yes | 1 | no | 0 |
| 2 | 5.8/10 | yes | 3 | no | 57 |

<details><summary>Last turn sample</summary>

**User:** My knees are hurting again today.

**Reply:**
```
I'm sorry your knees are hurting again today. That persistent pain can really weigh on you. It might help to rest them gently and avoid putting strain on them as much as possible. If the pain keeps coming back or worsens, please consider reaching out to a healthcare provider for guidance. Meanwhile, if you'd like, I can pray with you for relief and strength.
```

</details>

## Human Listening Rubric

Five dimensions (0-10 each), averaged:

1. Answered the latest user message
2. Used specific thread details
3. Avoided repeating prior answer
4. Recovered when corrected (correction turns only)
5. Would a human feel heard

Shallow "I hear" / "It sounds like" without thread details are penalized.

## Stop Conditions

- No deploy, no push, no Sprint 3
- Production default remains `BUDDY_RUNTIME=legacy`

