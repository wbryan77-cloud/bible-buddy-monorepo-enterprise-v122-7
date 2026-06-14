# Phase 5A Provider Strategy

**Date:** 2026-06-01  
**Config reviewed:** `project-brain/providers.json`  
**Constraint:** No new paid API dependency unless necessary.

---

## Current Provider Registry

```json
BIBLE_TEXT   — verse lookup / search (placeholder URL)
FOOD_SCAN    — barcode nutrition (Health Buddy lane)
HEALTH_METRICS — steps/sleep (consenting users)
```

All entries are **placeholders** — no production external Bible API is wired as doctrine authority.

---

## Cost Strategy (Preferred Order)

| Priority | Source | Role | Doctrine Authority? |
|----------|--------|------|----------------------|
| 1 | **Local static** — `bibleConceptGraph`, `bibleConceptConcordance`, `doctrineAuthorityContract` | Concept detection, witnesses, strict answers | **Yes** (curated) |
| 2 | **Approved corpus** — evidence cards, witness chains, `approvedEvidenceGraph` | Retrieval support, binding rules | **Yes** (governed) |
| 3 | **OpenAI** — `openAiFirstCompanionRuntime` fallback | Companion tone, non-doctrine synthesis | **No** — gated by strictDoctrineGate |
| 4 | **External Bible APIs** (optional, cached) | Verse text, audio, metadata | **No** — support data only |
| 5 | **Food / Health APIs** | Separate product lanes | **No** |

**Rule:** Never block core strict doctrine answers on external API availability.

---

## OpenAI Usage Rules (Phase 5A)

| Allowed | Blocked |
|---------|---------|
| Emotional companion warmth after orchestrator routes companion lane | Strict doctrine topic answers |
| Clarification phrasing | Witness chain authorship |
| Non-doctrine general chat fallback | Acts 10 / dietary / death reinterpretation |
| Polish after approved answer exists | Per-turn full-corpus retrieval for doctrine |

**Env controls:** `BIBLEBUDDY_DISABLE_OPENAI`, `BUDDY_RUNTIME` flags — strict path must work with OpenAI disabled.

---

## External API Roles (Future — Optional)

| API Role | Use Case | Cache Strategy | Authority |
|----------|----------|----------------|-----------|
| Bible text lookup | Fill verse text when KJV DB insufficient | Redis/file TTL 24h+ per ref | Support only |
| Bible audio | Read-aloud companion feature | CDN/cache per chapter | None |
| Interlinear / Hebrew/Greek | Deep study mode | Cache per verse | None |
| Verse metadata (cross-refs) | Enrich answers | Cache per ref | None |
| Reading plans | Daily plan integration | Cache per plan id | None |
| Devotional plans | Companion prompts | Cache per day | None |

**Implementation pattern:**
```
request → local cache → approved static → API call → cache result → attach as support
```

Fail gracefully: if API down, answer from local witnesses without blocking.

---

## Caching Requirements

- Cache key: `provider + translation + reference`
- Max cache size per instance (Render): env-configurable MB limit
- No full API responses in `reflection-memory.json` or doctrine state
- Use `safeJsonlWriter` for any API telemetry

---

## Paid API Policy

| Scenario | Allow paid API? |
|----------|----------------|
| Strict doctrine answer | **Never required** |
| Companion tone | OpenAI — existing |
| Verse text gap | Only if local KJV insufficient; prefer free/static |
| User-paid premium tier | Optional — user opt-in |
| Per-turn external call | **Avoid** — cache or batch |

---

## Recommendations

1. **Keep `providers.json` placeholders** until a specific feature needs them — do not wire paid Bible APIs into doctrine path.
2. **Expand local graph** (`bibleConceptGraph`) before adding API search — cheaper and authority-safe.
3. **OpenAI:** remain on companion fallback + tone; orchestrator `handled=true` should cover majority of Bible Q&A locally.
4. **BIBLE_TEXT provider:** when enabled, use for **text display only** after witness ref already chosen by authority engine.
5. **Monitor:** `runtimeHealthMonitor` — external API timeouts must not extend `responseGuarantee` past safe window; prefer skip over hang.

---

## API Output vs Doctrine Authority

```
User message
    → bibleCompanionOrchestrator
        → strict / bible-wide answer from APPROVED witnesses
        → optional: fetch verse TEXT from BIBLE_TEXT API for display
    → NEVER: API search result becomes new doctrine witness without governance review
```
