# Companion Intelligence Validation Suite

**Date:** 2026-05-31  
**Route:** `POST /buddy/chat` (local `runBuddy` — same path as production)  
**Script:** `scripts/companionIntelligenceValidationSuite.js`  
**Results:** `docs/companion-intelligence/validation-results.json`

---

## Run Command

```bash
node scripts/companionIntelligenceValidationSuite.js
```

Optional: `COMPANION_INTEL_MIN_SCORE=95` (default gate)

---

## Latest Results — **READY**

| Metric | Value |
|--------|-------|
| **Total tests** | 35/35 passed |
| **Overall score** | **97** |
| **Min intelligence category** | 96 |
| **Readiness** | **READY** |

---

## Sub-Suites

| Suite | Tests | Score |
|-------|-------|-------|
| Sprint 2.14 Companion Acceptance | 20/20 | 97 |
| Sprint 2.14B Sabbath History Depth | 5/5 | 97 |
| Sprint 2.14C Natural Reasoning | 10/10 | 97 |

---

## Companion Intelligence Categories

Aligned with `services/companionIntelligence.js` signals:

| Category | Score | Maps to |
|----------|-------|---------|
| helpfulness | 96 | helpfulness, accuracy, directness |
| feltUnderstood | 97 | listening, follow-up understanding, question understanding |
| feltPeaceful | 97 | warmth, organic flow, companion tone |
| scriptureBalance | 97 | Scripture grounding, scripture-first |
| memoryIntelligence | 97 | memory recall, memory relevance |
| historicalReasoning | 97 | historical routing, Sabbath history depth |
| naturalConversation | 96 | natural conversation, no canned repetition |
| studyContinuity | 97 | continue study, no premature study prompts |
| reasoningDepth | 97 | reasoning depth, historical directness |
| stability | 97 | all suites pass |

**Gate:** all categories ≥ 95 — **PASSED**

---

## What This Suite Validates

1. **Companion presence** — grief, health, prayer, memory recall, warmth  
2. **Doctrine grounding** — Sabbath definition, Scripture-first answers  
3. **Historical reasoning** — who changed Sabbath, Rome/Catholic, evidence, corrections  
4. **Natural conversation** — question understanding, no canned blocks, no memory bleed on factual answers  
5. **Study continuity** — continue study, journey explanations, topic resume  

---

## Architecture

```
companionIntelligenceValidationSuite.js
├── sprint214AcceptanceHttp.js      (20 tests — companion quality)
├── sprint214bSabbathHistoryHttp.js (5 tests — history depth)
└── sprint214cNaturalReasoningHttp.js (10 tests — reasoning restoration)
```

Each sub-suite exports `runSuite({ userPrefix, quiet })` for isolated runs with unique user IDs per execution.

---

## Individual Suite Commands

```bash
node scripts/sprint214AcceptanceHttp.js
node scripts/sprint214bSabbathHistoryHttp.js
node scripts/sprint214cNaturalReasoningHttp.js
```

Production deploy validation:

```bash
DEPLOY_URL=https://your-app.onrender.com node scripts/sprint2DeployValidation.js
```

---

## Fixes Applied for Suite Reliability

1. **Sub-suite isolation** — `USER_PREFIX` generated inside `runSuite()`, not at module load  
2. **No auto-run on require** — sub-suites only execute when run directly (`require.main === module`)  
3. **Memory vs study session** — suppress memory surfacing on answer-first paths without blocking study session save  
4. **Sabbath history enrichment** — skip full relationship enrichment when `intent === sabbath_history`

---

## Readiness Verdict

**Companion Intelligence Validation: PASS — score 97, all 35 tests, all categories ≥ 95.**
