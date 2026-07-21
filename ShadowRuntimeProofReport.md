# Shadow Runtime Proof Report

Generated: 2026-06-02T03:51:10.947Z

## Purpose

Proof-of-concept comparing **production current runtime** (`runBuddy`) against **shadow reason-first runtime** (`runShadowReasonFirst`) without modifying production routing, buddyBrain, or existing responders.

## Executive Verdict

> **OpenAI was unavailable** during this run. Shadow runtime could not compose responses. Re-run with `OPENAI_API_KEY` set and `openai` package installed for a valid A/B verdict.

Current runtime rubric average: **5.7/10**. Shadow scores **N/A** until OpenAI composition runs.

Production source trace from baseline still shows **0% OpenAI, 60% template, 40% responder** — architecture risk remains regardless of this run.

## Aggregate Rubric Scores (all 24 threads)

| Dimension | Current | Shadow | Delta (Shadow − Current) |
| --- | --- | --- | --- |
| listening | 5.4 | N/A | N/A |
| warmth | 5.9 | N/A | N/A |
| helpfulness | 6 | N/A | N/A |
| biblicalGrounding | 6.7 | N/A | N/A |
| correctionRecovery | 5 | N/A | N/A |
| followUpQuality | 5.4 | N/A | N/A |
| overall | 5.7 | N/A | N/A |

Shadow threads with model composition: **0 / 24**

## Primary Threads — Score Breakdown

### Current Runtime

| Thread | listening | warmth | helpfulness | biblicalGrounding | correctionRecovery | followUpQuality | overall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sabbath conversation (wording failure thread) | 7 | 4.7 | 6.6 | 5 | 6.4 | 5.7 | 5.9 |
| Job opportunity | 6.3 | 5.7 | 6 | 7 | 5 | 6.3 | 6.1 |
| Alzheimer's caregiver | 5 | 7 | 6 | 5.7 | 5 | 5 | 5.6 |
| Feeling distant from God | 5 | 7 | 6 | 5.7 | 5 | 5.3 | 5.7 |

### Shadow Runtime

| Thread | listening | warmth | helpfulness | biblicalGrounding | correctionRecovery | followUpQuality | overall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sabbath conversation (wording failure thread) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Job opportunity | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Alzheimer's caregiver | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Feeling distant from God | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Side-by-Side Transcripts (Primary Threads)

### Sabbath conversation (wording failure thread)

| Metric | Current | Shadow |
| --- | --- | --- |
| Overall | 5.9 | 0 |

#### Turn 1

**User:** Why should we keep Sunday as the day of worship onto the Lord?

**Current** (template / sabbath_history) — turn score 6.2:

```
I hear what you're asking — not what the Sabbath is, but why many people keep Sunday instead.

You are asking why many Christians worship on Sunday rather than the biblical seventh-day Sabbath.

Scripture first:

Genesis 2:2-3 — God rested on the seventh day and blessed it.
Exodus 20:8-11 — the fourth commandment identifies the seventh day as the Sabbath of the LORD your God.
Isaiah 58:13-14 — the Sabbath is connected to delight and honoring the LORD.
Luke 4:16 — Yeshua kept the Sabbath as His custom.
Acts 17:2 — Paul reasoned in the synagogue on the Sabbath.
Hebrews 4:9 — a Sabbath rest remains for the people of God.

Scripture identifies the seventh day as the Sabbath and does not record God changing the Sabbath to Sunday.

Historical chain (secondary to Scripture):

A. Early Christians in some places gathered on the first day for worship and fellowship, while many still honored the seventh-day Sabbath.
B. In AD 321, Emperor Constantine issued a civil law making Sunday — the venerable day of the Sun — a day of rest across the Roman Empire.
C. The Council of Laodicea (circa AD 364) later discouraged Sabbath rest and encouraged Christians to honor the Lord's Day (Sunday).
D. Over time, Roman Catholic canon and liturgical authority made Sunday the normal day of obligation for worship in much of Western Christianity.
E. Sunday observance became established through Roman civil authority and church authority over time — not by an explicit biblical command changing the Sabbath.

Direct answer:
Scripture does not name a person who changed the Sabbath. Historically, the shift toward Sunday happened gradually through early first-day gatherings, Roman civil law (Constantine, AD 321), the Council of Laodicea (circa AD 364), and later Roman Catholic liturgical authority.
So if the question is whether Rome and Roman church authority helped establish Sunday observance, the historical answer is yes — but that is not the same as a biblical command from God.

History can explain how the practice changed, but history cannot override Scripture.

Historical developments are not the same as biblical commands. History may support understanding, but history may not override Scripture.

Sources and references (historical, secondary):
- Constantine, Codex Justinianus 3.12.2 (AD 321 Sunday rest law)
- Council of Laodicea, Canon 29 (circa AD 364)
- Eusebius, Life of Constantine (early first-day imperial favor)
- Roman Catholic catechisms and liturgical tradition on Sunday obligation
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 2

**User:** Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name?

**Current** (template / meta_about_previous_answer) — turn score 5.8:

```
You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I mean. The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 3

**User:** Why are you using the term Roman church when the technical name is the Roman Catholic Church?

**Current** (template / meta_about_previous_answer) — turn score 5.2:

```
You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I mean. The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 4

**User:** No, I'm not asking about the shift. I'm asking about your wording.

**Current** (template / meta_about_previous_answer) — turn score 5.3:

```
You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I mean. The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 5

**User:** Why are you not answering my question?

**Current** (template / meta_about_previous_answer) — turn score 6.5:

```
You're right — I was not answering your exact question. The answer is: I should address "Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name?" directly instead of repeating a previous template. Tell me if you want me to clarify a specific word or phrase I used.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 6

**User:** No, I'm not asking about history. I'm asking about your wording.

**Current** (template / meta_about_previous_answer) — turn score 6:

```
You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I mean. The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 7

**User:** Are you not listening to what I am asking?

**Current** (template / meta_about_previous_answer) — turn score 6.3:

```
You're right — I was not answering your exact question. The answer is: I should address "No, I'm not asking about the shift. I'm asking about your wording." directly instead of repeating a previous template. Tell me if you want me to clarify a specific word or phrase I used.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

### Job opportunity

| Metric | Current | Shadow |
| --- | --- | --- |
| Overall | 6.1 | 0 |

#### Turn 1

**User:** I have a job opportunity.

**Current** (responder / job_discernment) — turn score 5.8:

```
That sounds like an important decision. What feels heaviest right now — the distance, timing, money, or whether this is from God?

Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witness.

If you want, we can pray through this together or walk through the decision one piece at a time.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 2

**User:** The company is far away from home.

**Current** (responder / job_discernment) — turn score 6:

```
That distance can feel heavy — it's not just a job, it's a whole life shift. What feels heaviest right now: leaving people behind, the unknown, or whether this timing is from the Lord?

Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witness.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 3

**User:** I'm not sure whether to push or wait on this offer.

**Current** (responder / job_discernment) — turn score 6.3:

```
That sounds like an important decision. What feels heaviest right now — the distance, timing, money, or whether this is from God?

Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witness.

If you want, we can pray through this together or walk through the decision one piece at a time.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

### Alzheimer's caregiver

| Metric | Current | Shadow |
| --- | --- | --- |
| Overall | 5.6 | 0 |

#### Turn 1

**User:** My mom was recently diagnosed with Alzheimer's.

**Current** (template / doctrine_general) — turn score 5.5:

```
Thank you for sharing about your mother's health. I will hold that gently — we can return to it whenever you want.

I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 2

**User:** Some days she doesn't remember who I am.

**Current** (template / doctrine_general) — turn score 5.5:

```
I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.

If it would help, we could gently check in on mother's health — only if you want to.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 3

**User:** How do I stay close to God while grieving who she used to be?

**Current** (responder / grief_support) — turn score 5.8:

```
I'm really sorry for your loss. Tell me about her if you want — we can take this gently, one step at a time.

Psalm 34:18 establishes the matter, and Matthew 5:4 confirms it alongside Scripture. Revelation 21:4 carries the theme forward across the biblical witness.

If you would like, we can pray together, sit with a comforting passage, or simply talk through what you are feeling — no pressure.

When you are ready, I can gently check in on how you have been doing — only if you want that.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

### Feeling distant from God

| Metric | Current | Shadow |
| --- | --- | --- |
| Overall | 5.7 | 0 |

#### Turn 1

**User:** I feel distant from God lately.

**Current** (template / doctrine_general) — turn score 5.5:

```
I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 2

**User:** I pray but it feels empty.

**Current** (template / doctrine_general) — turn score 5.5:

```
Thank you for sharing about your prayer request. I will hold that gently — we can return to it whenever you want.

I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

#### Turn 3

**User:** Does that mean my faith is failing?

**Current** (responder / prayer) — turn score 6:

```
I'm glad you asked to pray. Let's bring this before the Lord together.

Father, we bring this need before You for Does that mean my faith is failing?. You see what we cannot fully see. Please draw near with comfort, wisdom, and peace. Hold those who are hurting, guide those who are waiting, and help us trust You one step at a time. In Jesus' name, amen.

Philippians 4:6-7 establishes the matter, and James 5:16 confirms it alongside Scripture. Psalm 34:17 carries the theme forward across the biblical witness.

If you would like, we can sit with one of these passages, talk through what you are carrying, or check in gently later — only if you want that.

How have you been doing since we prayed about prayer?
```

**Shadow** (openai_unavailable / shadow_openai_required) — turn score 0:

```
[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]
```

## Additional 20 Threads — Summary

| ID | Name | Current overall | Shadow overall | Delta |
| --- | --- | --- | --- | --- |
| T01 | Grief first mention | 5.8 | 0 | -5.8 |
| T02 | Health knee pain | 5.8 | 0 | -5.8 |
| T03 | Prayer request | 6 | 0 | -6 |
| T04 | Sabbath definition | 5.5 | 0 | -5.5 |
| T05 | Sabbath history | 5.8 | 0 | -5.8 |
| T06 | Kingdom question | 5.5 | 0 | -5.5 |
| T07 | Memory recall | 5.2 | 0 | -5.2 |
| T08 | Continue study | 5.4 | 0 | -5.4 |
| T09 | Correction historical | 5.6 | 0 | -5.6 |
| T10 | Grief follow-up | 6.2 | 0 | -6.2 |
| T11 | Health repeat | 6.2 | 0 | -6.2 |
| T12 | Feast days | 5.5 | 0 | -5.5 |
| T13 | Topic switch health | 5.6 | 0 | -5.6 |
| T14 | Study next | 5.3 | 0 | -5.3 |
| T15 | Resurrection | 5.5 | 0 | -5.5 |
| T16 | Dietary law | 5.5 | 0 | -5.5 |
| T17 | Christmas traditions | 5.5 | 0 | -5.5 |
| T18 | Rest tired | 6.2 | 0 | -6.2 |
| T19 | Mixed week focus | 5.8 | 0 | -5.8 |
| T20 | Working on lately | 5.8 | 0 | -5.8 |

## Shadow Runtime Architecture (POC)

```
User Message
  → Conversation Understanding (reasoningSnapshot + intent)
  → Retrieve Memory (enrichRuntimeContextWithMemory + memory hits)
  → Retrieve Scripture (scriptureChainExpansion)
  → Retrieve History (sabbathHistoryDeepResponder facts only)
  → OpenAI Composer
  → Validation (doctrine boundaries + answerMatchGate logic, model regen)
  → Final Reply
```

## Methodology

- Isolated userIds per thread per runtime (no cross-contamination).
- Shadow uses in-memory session buffer only — does not append production sessions.
- Rubric scores 0–10 on six dimensions via explicit heuristics on transcripts.
- No production files modified; no responders removed.

---

**POC complete.** Not a migration. Not production deployment.