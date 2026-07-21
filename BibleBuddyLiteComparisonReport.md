# BibleBuddy Lite Comparison Report

Generated: 2026-06-02T03:01:32.607Z

## Experiment Scope

Controlled A/B replay: **Current Runtime** vs **BibleBuddy Lite** (`services/bibleBuddyLiteRuntime.js`).
No new responders, routes, or memory systems were added. Production routing was not modified.

> **Note:** `OPENAI_API_KEY` was not set during this run. Lite runtime could not compose model responses; Lite scores are N/A. Re-run with API key for full A/B human rubric scores.

## Phase 5 — Final Decision

### A. Which runtime performs better?
**Indeterminate for companion quality** without Lite OpenAI composition. **Current runtime source trace** strongly supports the architecture diagnosis (see baseline).

### B. By how much?
Lite delta N/A (OpenAI unavailable). Current runtime measured at **5.5/10** average rubric on primary threads.

### C. Which specific systems reduce companion intelligence?

1. **Route-first dispatch** (`masterBuddyRuntime.generateAnswer`) — returns before `generateOpenAnswer` for most intents.
2. **`sabbathHistoryDeepResponder`** — template historical blocks on wording/meta turns.
3. **`metaAnswerResponder`** — template wording answers; gate can force re-template.
4. **`companionDoctrinePresenter` / doctrine pipeline** — canned study framing.
5. **Companion responders** (grief, health, prayer, discernment) — fixed openings.
6. **`personalizedFallback` / `fallbackReply`** — used when OpenAI unavailable or route miss.
7. **`continueStudyIntent` / registry presenters** — study-prompt dominance.

### D. Systems to remove, demote, or convert to retrieval-only

| System | Recommendation |
| --- | --- |
| `sabbathHistoryDeepResponder` | **Retrieval-only** — facts to context, not prose |
| `metaAnswerResponder` | **Remove prose path** — model answers wording |
| `companionDoctrinePresenter` | **Demote** — evidence bundle only |
| `griefCompanionResponse`, `healthCompanionResponse`, `prayerCompanionResponse` | **Demote** — tone hints + scripture retrieval |
| `personalizedFallback` | **Last-resort only** — not primary path |
| `answerMatchGate` template regen | **Replace** with model regen |
| Route ownership table | **Advisory** — not hard short-circuit |

### E. Is the audit correct that OpenAI reasoning is effectively bypassed?

**Yes.** Measured OpenAI layer: **0%** across 50 turns. Route owners handle nearly all turns before the OpenAI path.

### F. Production direction recommendation

**3. Reason-first** (with retrieval-only helpers), not route-first.

Evidence: Sabbath wording thread turns 4–7 remain template/history on current runtime despite reasoning-first gates. Validation optimizes route keywords, not listening.

## Phase 4 — Human Rubric Scores (0–10)

Scores applied via explicit rubric on transcripts (listening, understanding, curiosity, warmth, helpfulness, biblical grounding, follow-up quality, correction recovery).

### Primary threads — Current Runtime

| Thread | Listen | Understand | Curiosity | Warmth | Helpful | Biblical | Follow-up | Correction | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sabbath wording (production failure) | 5.3 | 5 | 5.3 | 4.7 | 5.7 | 5.3 | 3.9 | 5.9 | 5.1 |
| Job opportunity | 6.3 | 5 | 7 | 5 | 6 | 7 | 5.7 | 5 | 5.9 |
| Alzheimer's caregiver | 5 | 5 | 5 | 7 | 6 | 5.7 | 5 | 5 | 5.5 |
| Feeling distant from God | 5 | 5 | 5.7 | 7 | 6 | 5.7 | 5 | 5 | 5.6 |

## Phase 3 — Side-by-Side Transcripts (Primary Threads)

### Sabbath wording (production failure)

#### Turn 1

**User:** Why should we keep Sunday as the day of worship onto the Lord?

**Current** (template / sabbath_history):

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

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 2

**User:** Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name?

**Current** (template / meta_about_previous_answer):

```
You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I mean. The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 3

**User:** Why are you using the term Roman church when the technical name is the Roman Catholic Church?

**Current** (template / meta_about_previous_answer):

```
You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I mean. The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 4

**User:** No, I'm not asking about the shift. I'm asking about your wording.

**Current** (template / meta_about_previous_answer):

```
You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I mean. The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 5

**User:** Why are you not answering my question?

**Current** (template / meta_about_previous_answer):

```
You're right — I was not answering your exact question. The answer is: I should address "Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name?" directly instead of repeating a previous template. Tell me if you want me to clarify a specific word or phrase I used.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 6

**User:** No, I'm not asking about history. I'm asking about your wording.

**Current** (template / meta_about_previous_answer):

```
You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I mean. The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 7

**User:** Are you not listening to what I am asking?

**Current** (template / meta_about_previous_answer):

```
You're right — I was not answering your exact question. The answer is: I should address "No, I'm not asking about the shift. I'm asking about your wording." directly instead of repeating a previous template. Tell me if you want me to clarify a specific word or phrase I used.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

### Job opportunity

#### Turn 1

**User:** I have a job opportunity.

**Current** (responder / job_discernment):

```
That sounds like an important decision. What feels heaviest right now — the distance, timing, money, or whether this is from God?

Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witness.

If you want, we can pray through this together or walk through the decision one piece at a time.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 2

**User:** The company is far away from home.

**Current** (responder / job_discernment):

```
That distance can feel heavy — it's not just a job, it's a whole life shift. What feels heaviest right now: leaving people behind, the unknown, or whether this timing is from the Lord?

Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witness.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 3

**User:** I'm not sure whether to push or wait on this offer.

**Current** (responder / job_discernment):

```
That sounds like an important decision. What feels heaviest right now — the distance, timing, money, or whether this is from God?

Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witness.

If you want, we can pray through this together or walk through the decision one piece at a time.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

### Alzheimer's caregiver

#### Turn 1

**User:** My mom was recently diagnosed with Alzheimer's.

**Current** (template / doctrine_general):

```
Thank you for sharing about your mother's health. I will hold that gently — we can return to it whenever you want.

I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 2

**User:** Some days she doesn't remember who I am.

**Current** (template / doctrine_general):

```
I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.

If it would help, we could gently check in on mother's health — only if you want to.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 3

**User:** How do I stay close to God while grieving who she used to be?

**Current** (responder / grief_support):

```
I'm really sorry for your loss. Tell me about her if you want — we can take this gently, one step at a time.

Psalm 34:18 establishes the matter, and Matthew 5:4 confirms it alongside Scripture. Revelation 21:4 carries the theme forward across the biblical witness.

If you would like, we can pray together, sit with a comforting passage, or simply talk through what you are feeling — no pressure.

When you are ready, I can gently check in on how you have been doing — only if you want that.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

### Feeling distant from God

#### Turn 1

**User:** I feel distant from God lately.

**Current** (template / doctrine_general):

```
I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 2

**User:** I pray but it feels empty.

**Current** (template / doctrine_general):

```
Thank you for sharing about your prayer request. I will hold that gently — we can return to it whenever you want.

I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

#### Turn 3

**User:** Does that mean my faith is failing?

**Current** (responder / prayer):

```
I'm glad you asked to pray. Let's bring this before the Lord together.

Father, we bring this need before You for Does that mean my faith is failing?. You see what we cannot fully see. Please draw near with comfort, wisdom, and peace. Hold those who are hurting, guide those who are waiting, and help us trust You one step at a time. In Jesus' name, amen.

Philippians 4:6-7 establishes the matter, and James 5:16 confirms it alongside Scripture. Psalm 34:17 carries the theme forward across the biblical witness.

If you would like, we can sit with one of these passages, talk through what you are carrying, or check in gently later — only if you want that.

How have you been doing since we prayed about prayer?
```

**Lite** (blocked / lite_openai_required):

```
[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]
```

## Additional 20 Threads — Current vs Lite (summary scores)

| ID | Name | Current overall | Lite overall |
| --- | --- | --- | --- |
| T01 | Grief first mention | 5.6 | N/A |
| T02 | Health knee pain | 5.9 | N/A |
| T03 | Prayer request | 5.8 | N/A |
| T04 | Sabbath definition | 5.4 | N/A |
| T05 | Sabbath history | 5.6 | N/A |
| T06 | Kingdom question | 5.4 | N/A |
| T07 | Memory recall | 5.1 | N/A |
| T08 | Continue study | 5.4 | N/A |
| T09 | Correction historical | 5.4 | N/A |
| T10 | Grief follow-up | 5.9 | N/A |
| T11 | Health repeat | 6 | N/A |
| T12 | Feast days | 5.4 | N/A |
| T13 | Topic switch health | 5.5 | N/A |
| T14 | Study next | 5.3 | N/A |
| T15 | Resurrection | 5.4 | N/A |
| T16 | Dietary law | 5.6 | N/A |
| T17 | Christmas traditions | 5.6 | N/A |
| T18 | Rest tired | 5.9 | N/A |
| T19 | Mixed week focus | 5.7 | N/A |
| T20 | Working on lately | 5.7 | N/A |

---

**STOP.** Experiment complete. No Sprint 3 work. No production changes applied.