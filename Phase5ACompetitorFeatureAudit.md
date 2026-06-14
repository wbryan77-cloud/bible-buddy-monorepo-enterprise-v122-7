# Phase 5A Competitor Feature Audit

**Date:** 2026-06-01  
**Purpose:** Position BibleBuddy against common Bible AI / study / devotional products.

---

## Competitors Reviewed

| Product | Primary Positioning |
|---------|---------------------|
| **Bible Chat** (and similar Bible AI chat apps) | Natural-language Q&A, verse lookup, devotional tone |
| **Logos Study Assistant** | Deep library-linked study, commentaries, interlinear, sermon prep |
| **YouVersion** (and Bible.com ecosystem) | Reading plans, prayer, community, verse-of-day, multi-translation |
| **Other Bible AI apps** (Hallow-adjacent prayer, Glorify, ChatGPT Bible plugins) | Prayer prompts, simplified answers, general LLM fluency |

---

## Feature Comparison

| Capability | Bible Chat–style | Logos | YouVersion | BibleBuddy Phase 5A |
|------------|------------------|-------|------------|---------------------|
| Everyday-language Bible Q&A | **Strong** — LLM-first | Moderate — scholar-oriented | Light — search + plans | **Strong** — concept graph + line-upon-line |
| Prayer help | Moderate | Low | **Strong** — plans & prompts | **Growing** — companionStateEngine listener/prayer modes |
| Daily reading plans | Moderate | Strong (library) | **Core product** | Optional via API — not core Phase 5A |
| Verse references in answers | Yes | **Excellent** | Yes | **Required** — witness chains + concordance |
| Denomination / translation prefs | Some apps | **Excellent** | **Excellent** | Session prefs + correction memory (translation prefs planned) |
| Library-based referenced answers | Weak — often LLM | **Core** | Moderate | **Approved evidence graph** + witness chains |
| Memory / personalization | Light chat history | Notes & highlights | Account history | **Reflection memory** + doctrine session state |
| Emotional / life support | Generic empathy | Minimal | Devotional framing | **Companion lane** — listen first, optional Scripture |
| Doctrine consistency | **Weak** — model drift | Strong — curated libraries | Mixed | **Strict doctrine authority layer** |
| Cost to operator | API-heavy | Subscription | Ads / premium | **Local-first graph** — OpenAI for tone only |
| Correction learning | Rare | User notes | None in chat | **User correction memory** + learning candidates |

---

## BibleBuddy Differentiation (Phase 5A)

### 1. Strict Doctrine Authority Layer
Competitors typically let the LLM author doctrine. BibleBuddy routes explicit topics (Acts 10, dietary law, death state, Sabbath, etc.) through **approved witness chains** and `doctrineFinalAuthorityEngine` — OpenAI cannot override.

### 2. Line-Upon-Line Reasoning Plan
`bibleReasoningEngine` builds a **concept path** and **witness plan** before prose — not keyword → template. Continuation ("show me another verse") rotates witnesses on the active concept.

### 3. Correction Learning Without Doctrine Mutation
`reflectionMemoryEngine` stores style prefs and synonym **candidates** (`pending_review`) — never auto-promotes user text to doctrine authority.

### 4. Companion State Engine
`companionStateEngine` distinguishes listener / teacher / prayer / clarifier — emotional turns do not repeat stale doctrine topics (Phase 4M release).

### 5. Bible Concept Graph
`bibleConceptGraph` maps natural phrases ("sleeping together before marriage", "kingdom coming here") to curated concepts with witnesses — reduces orphan "Which Bible topic?" failures.

### 6. User-Controlled Memory
Bounded `reflection-memory.json`, session doctrine state, pending question resolver — personalization without storing sensitive facts globally.

### 7. OpenAI Tone, Bible Authority
OpenAI used for companion warmth and non-doctrine synthesis **after** orchestrator routing — not as doctrine source.

### 8. Cost-Controlled Provider Strategy
Local static graph → approved corpus → OpenAI → optional cached external Bible APIs (see `Phase5AProviderStrategy.md`).

---

## Gaps vs Competitors (Honest)

| Gap | Priority | Notes |
|-----|----------|-------|
| Reading plans / streaks | Medium | YouVersion strength — optional API integration |
| Multi-translation picker UI | Medium | KJV-first; prefs in memory layer |
| Audio Bible | Low–Medium | Provider slot in `providers.json` |
| Interlinear / Greek/Hebrew | Low for companion | Logos territory — API optional |
| Social / groups | Out of scope | Not Phase 5A |
| Commentaries library | Partial | Evidence cards — not full Logos library |

---

## Competitive Positioning Statement

**BibleBuddy is not "ChatGPT with a Bible skin."** It is a **Bible-first companion** that listens, remembers safe preferences, reasons line upon line from Genesis to Revelation, and **verifies doctrine from approved evidence** — while competitors optimize for fluent LLM answers without an authority layer.

**Best fit user:** Someone who wants warmth and natural conversation **without** doctrine drift on sensitive topics (dietary law, sexual ethics, death, Sabbath, Acts 10, kingdom).

**Not trying to beat:** Logos on seminary-depth library search or YouVersion on daily plan ecosystem — unless integrated via optional cached APIs later.
