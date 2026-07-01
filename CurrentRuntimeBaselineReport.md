# Current Runtime Baseline Report

Generated: 2026-06-02T03:01:32.606Z

## Executive Summary

Phase 1 measurement of **production current runtime** (`runBuddy` → `runMasterBuddyRuntime`) across 4 primary failure/companion threads and 20 additional real-user-style threads.

### Aggregate Source Layer Breakdown (all measured turns)

| Layer | Count | % of turns |
| --- | --- | --- |
| Template-generated | 30 | 60% |
| Responder-generated | 20 | 40% |
| Fallback-generated | 0 | 0% |
| OpenAI-generated | 0 | 0% |

### Diagnosis Check

- OpenAI reasoning ≈ 0%: **CONFIRMED** (0% OpenAI layer)
- Templates dominate: **CONFIRMED** (60% template layer)
- Route-first suppresses model: **CONFIRMED**

## Primary Threads

### Sabbath wording (production failure)

User ID: `baseline-exp-P1-1780369273911`

| Turn | User message (truncated) | Final layer | Route |
| --- | --- | --- | --- |
| 1 | Why should we keep Sunday as the day of worship onto the Lor… | template | sabbath_history |
| 2 | Why do you call it the Roman church instead of the Roman Cat… | template | meta_about_previous_answer |
| 3 | Why are you using the term Roman church when the technical n… | template | meta_about_previous_answer |
| 4 | No, I'm not asking about the shift. I'm asking about your wo… | template | meta_about_previous_answer |
| 5 | Why are you not answering my question? | template | meta_about_previous_answer |
| 6 | No, I'm not asking about history. I'm asking about your word… | template | meta_about_previous_answer |
| 7 | Are you not listening to what I am asking? | template | meta_about_previous_answer |

Thread source mix: template 100%, responder 0%, fallback 0%, OpenAI 0%

**Sample replies:**

> Turn 1 (template/sabbath_history): I hear what you're asking — not what the Sabbath is, but why many people keep Sunday instead.  You are asking why many Christians worship on Sunday rather than the biblical seventh-day Sabbath.  Scripture first:  Genesis 2:2-3 — God rested on the seventh day and blessed it. Exodu…

> Turn 2 (template/meta_about_previous_answer): You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I me…

> Turn 3 (template/meta_about_previous_answer): You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I me…

### Job opportunity

User ID: `baseline-exp-P2-1780369276274`

| Turn | User message (truncated) | Final layer | Route |
| --- | --- | --- | --- |
| 1 | I have a job opportunity. | responder | job_discernment |
| 2 | The company is far away from home. | responder | job_discernment |
| 3 | I'm not sure whether to push or wait on this offer. | responder | job_discernment |

Thread source mix: template 0%, responder 100%, fallback 0%, OpenAI 0%

**Sample replies:**

> Turn 1 (responder/job_discernment): That sounds like an important decision. What feels heaviest right now — the distance, timing, money, or whether this is from God?  Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witne…

> Turn 2 (responder/job_discernment): That distance can feel heavy — it's not just a job, it's a whole life shift. What feels heaviest right now: leaving people behind, the unknown, or whether this timing is from the Lord?  Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37…

> Turn 3 (responder/job_discernment): That sounds like an important decision. What feels heaviest right now — the distance, timing, money, or whether this is from God?  Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witne…

### Alzheimer's caregiver

User ID: `baseline-exp-P3-1780369277078`

| Turn | User message (truncated) | Final layer | Route |
| --- | --- | --- | --- |
| 1 | My mom was recently diagnosed with Alzheimer's. | template | doctrine_general |
| 2 | Some days she doesn't remember who I am. | template | doctrine_general |
| 3 | How do I stay close to God while grieving who she used to be… | responder | grief_support |

Thread source mix: template 66.7%, responder 33.3%, fallback 0%, OpenAI 0%

**Sample replies:**

> Turn 1 (template/doctrine_general): Thank you for sharing about your mother's health. I will hold that gently — we can return to it whenever you want.  I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.

> Turn 2 (template/doctrine_general): I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.  If it would help, we could gently check in on mother's health — only if you want to.

> Turn 3 (responder/grief_support): I'm really sorry for your loss. Tell me about her if you want — we can take this gently, one step at a time.  Psalm 34:18 establishes the matter, and Matthew 5:4 confirms it alongside Scripture. Revelation 21:4 carries the theme forward across the biblical witness.  If you would …

### Feeling distant from God

User ID: `baseline-exp-P4-1780369278392`

| Turn | User message (truncated) | Final layer | Route |
| --- | --- | --- | --- |
| 1 | I feel distant from God lately. | template | doctrine_general |
| 2 | I pray but it feels empty. | template | doctrine_general |
| 3 | Does that mean my faith is failing? | responder | prayer |

Thread source mix: template 66.7%, responder 33.3%, fallback 0%, OpenAI 0%

**Sample replies:**

> Turn 1 (template/doctrine_general): I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.

> Turn 2 (template/doctrine_general): Thank you for sharing about your prayer request. I will hold that gently — we can return to it whenever you want.  I'm here with you. We can pray together, open a Scripture that fits what you're carrying, or take one small step for today — whichever would help most right now.

> Turn 3 (responder/prayer): I'm glad you asked to pray. Let's bring this before the Lord together.  Father, we bring this need before You for Does that mean my faith is failing?. You see what we cannot fully see. Please draw near with comfort, wisdom, and peace. Hold those who are hurting, guide those who a…

## Additional 20 Threads (summary)

| ID | Name | Turns | Template% | Responder% | Fallback% | OpenAI% | Dominant routes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | Grief first mention | 1 | 0% | 100% | 0% | 0% | grief_support(1) |
| T02 | Health knee pain | 1 | 0% | 100% | 0% | 0% | health_support(1) |
| T03 | Prayer request | 1 | 0% | 100% | 0% | 0% | prayer(1) |
| T04 | Sabbath definition | 1 | 100% | 0% | 0% | 0% | sabbath_definition(1) |
| T05 | Sabbath history | 2 | 100% | 0% | 0% | 0% | sabbath_definition(1), sabbath_history(1) |
| T06 | Kingdom question | 1 | 100% | 0% | 0% | 0% | doctrine_general(1) |
| T07 | Memory recall | 1 | 0% | 100% | 0% | 0% | memory_recall(1) |
| T08 | Continue study | 2 | 100% | 0% | 0% | 0% | sabbath_definition(1), continue_study(1) |
| T09 | Correction historical | 3 | 100% | 0% | 0% | 0% | sabbath_history(2), sabbath_definition(1) |
| T10 | Grief follow-up | 2 | 0% | 100% | 0% | 0% | grief_support(2) |
| T11 | Health repeat | 2 | 0% | 100% | 0% | 0% | health_support(2) |
| T12 | Feast days | 1 | 100% | 0% | 0% | 0% | doctrine_general(1) |
| T13 | Topic switch health | 3 | 66.7% | 33.3% | 0% | 0% | sabbath_definition(1), health_support(1) |
| T14 | Study next | 2 | 100% | 0% | 0% | 0% | doctrine_general(2) |
| T15 | Resurrection | 1 | 100% | 0% | 0% | 0% | doctrine_general(1) |
| T16 | Dietary law | 1 | 100% | 0% | 0% | 0% | doctrine_general(1) |
| T17 | Christmas traditions | 1 | 100% | 0% | 0% | 0% | doctrine_general(1) |
| T18 | Rest tired | 1 | 0% | 100% | 0% | 0% | health_support(1) |
| T19 | Mixed week focus | 4 | 25% | 75% | 0% | 0% | sabbath_definition(1), prayer(1) |
| T20 | Working on lately | 3 | 33.3% | 66.7% | 0% | 0% | doctrine_general(1), prayer(1) |

## Route Ownership Frequency (all turns)

| Route | Count |
| --- | --- |
| doctrine_general | 12 |
| meta_about_previous_answer | 6 |
| health_support | 6 |
| sabbath_definition | 6 |
| sabbath_history | 4 |
| grief_support | 4 |
| prayer | 4 |
| job_discernment | 3 |
| memory_recall | 3 |
| continue_study | 2 |

## Methodology

- Each turn executed via `runBuddy` with isolated `userId` per thread.
- Source classification via `services/replySourceClassifier.js` using `runtime.masterRoute` + reply text signatures.
- OpenAI layer only when `masterRoute === open_general` and reply is not a fallback signature.
- No production code paths were altered for measurement.
