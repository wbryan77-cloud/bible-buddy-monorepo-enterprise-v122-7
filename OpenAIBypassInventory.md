# OpenAI Bypass Inventory

**Audit type:** Read-only  
**Generated:** 2026-06-02  
**Objective:** Every location where OpenAI reasoning is bypassed, skipped, discarded, modified, or replaced on the production chat path.

---

## Executive Finding

There is **exactly one** OpenAI call site on the production chat path:

| File | Function | Line region |
|------|----------|-------------|
| `services/masterBuddyRuntime.js` | `generateOpenAnswer` | `openai.chat.completions.create(...)` |

It is reachable only when `generateAnswer()` returns `null`. Baseline measurement: **0 / 50 turns** reached it with model composition.

Additionally, every route in `routeOwnershipTable.js` declares `bypassForbidden: true` — OpenAI bypass is **explicit policy**, not accidental dead code.

---

## Bypass Category A — Hard Bypass (OpenAI Never Invoked)

These paths return final prose without calling `generateOpenAnswer`.

| ID | File | Function | Purpose | Why it exists | Still needed? |
|----|------|----------|---------|---------------|---------------|
| A1 | `routes/buddy.js` | `POST /chat` | HTTP entry | Public API | Yes (entry) — not a bypass itself |
| A2 | `services/buddyBrain.js` | `runBuddy` | Delegate to master runtime | Single orchestration point | Yes — demote to thin wrapper in migration |
| A3 | `services/masterBuddyRuntime.js` | `runMasterBuddyRuntime` | Empty message guard | Prevent blank sends | Yes — keep guard; use composer not fallback |
| A3a | `services/buddyBrain.js` | `fallbackReply` | Empty message prose | UX when no input | **Demote** — minimal prompt, not template engine |
| A4 | `services/masterBuddyRuntime.js` | `runMasterBuddyRuntime` | Crisis short-circuit | Safety — immediate crisis text | **Yes** — fixed safety protocol acceptable |
| A4a | `services/buddyBrain.js` | `fallbackReply` (crisis branch) | Crisis prose | Legal/safety requirement | **Yes** — not general companion reasoning |
| A5 | `services/routeOwnershipTable.js` | `ROUTE_OWNERS[*].bypassForbidden` | Policy: routes own prose | Sprint 2.FINAL route-first design | **No** — remove in reason-first migration |
| A6 | `services/masterBuddyRuntime.js` | Route resolution block (lines 552–602) | Assign `routeKey` before composition | Intent → owner mapping | **No** — replace with advisory retrieval hints |
| A7 | `services/masterBuddyRuntime.js` | `generateAnswer` | Switch dispatch to prose owners | Central route-first gate | **No** — replace with evidence bundle + composer |
| A8 | `services/continueStudyIntent.js` | `buildContinueStudyResponse` | Study continuation prose | Study UX | **Retrieval only** — position/state, not prose |
| A9 | `services/studyConnectionIntent.js` | `buildStudyConnectionResponse` | Study connection prose | Link sessions to study | **Retrieval only** |
| A10 | `services/buddyBrain.js` | `buildMemoryRecallStructured` | Memory dump prose | Recall user history | **Retrieval only** — facts to composer |
| A10a | `services/relationshipRecallEngine.js` | `formatRelationshipRecallResponse` | Formats recall as reply string | Memory presentation | **Retrieval only** |
| A11 | `services/sabbathHistoryDeepResponder.js` | `buildSabbathHistoryDeepResponse` | Full history template block | Sabbath history depth | **Retrieval only** — facts/sources |
| A11a | `services/sabbathHistoryCompanion.js` | `buildSabbathHistoryResponse` | Wrapper to deep responder | Route owner adapter | **Remove prose path** |
| A12 | `services/metaAnswerResponder.js` | `buildMetaAnswerResponse` | Wording/correction template | Meta-question handling | **Remove prose path** |
| A13 | `services/healthCompanionResponse.js` | `buildHealthSupportResponse` | Health companion prose | Wellness companion | **Retrieval only** — tone tags + scriptures |
| A14 | `services/griefCompanionResponse.js` | `buildEmotionalSupportResponse` | Grief/rest prose | Emotional support | **Retrieval only** |
| A15 | `services/prayerCompanionResponse.js` | `buildPrayerCompanionResponse` | Prayer prose | Prayer companion | **Retrieval only** — intent flag |
| A16 | `services/companionDiscernmentResponder.js` | `buildDiscernmentResponse` | Job/life decision prose | Discernment companion | **Retrieval only** |
| A17 | `services/companionDiscernmentResponder.js` | `buildOpenLifeResponse` | Open life question prose | Catch-all responder | **Remove** — composer handles |
| A18 | `services/doctrineRuntimePipeline.js` | `runDoctrineRuntimePipeline` | Doctrine intercept | Topic guard + routing | **Retrieval only** — topic + boundaries |
| A18a | `services/doctrineResponseRouter.js` | `routeDoctrineResponse` | Route to source grounded | Doctrine dispatch | **Retrieval only** |
| A18b | `services/sourceGroundedResponder.js` | `buildSourceGroundedReply` | Doctrine answer templates | Scripture-first answers | **Retrieval only** — scripture refs |
| A19 | `services/companionDoctrinePresenter.js` | `presentCompanionDoctrine` | Study framing + openings | Companion presentation layer | **Remove prose path** |
| A20 | `services/registryStudyPresenter.js` | `presentRegistryStudyResponse` | Registry study template | Catalog study | **Retrieval only** |
| A21 | `services/masterBuddyRuntime.js` | Registry fallback (lines 637–654) | Second template path | Catch registry topics | **Retrieval only** |
| A22 | `services/masterBuddyRuntime.js` | `generateOpenAnswer` (open_question branch) | `buildOpenLifeResponse` inside OpenAI function | Even "open" path uses responder | **Remove** — critical bypass |

---

## Bypass Category B — Soft Bypass (OpenAI Path Exists But Preempted)

| ID | File | Function | Purpose | Why it exists | Still needed? |
|----|------|----------|---------|---------------|---------------|
| B1 | `services/reasoningSnapshot.js` | `buildReasoningSnapshot` | Pre-route understanding | Sprint 2.FINAL-C "reason first" | **Yes** — feed composer, not route table |
| B1a | `services/reasoningSnapshot.js` | `deriveRecommendedRoute` | Outputs route key | Routes to template owners | **No** — replace with evidence hints |
| B2 | `services/questionIntentResolver.js` | `resolveQuestionIntent` | Classify question type | Intent detection | **Yes** — advisory for composer |
| B3 | `services/sabbathIntentRouter.js` | `resolveSabbathCompanionIntent` | Sabbath sub-intent | History vs definition | **Retrieval only** |
| B4 | `services/doctrineGuard.js` | `shouldInterceptDoctrine` | Keyword intercept | Prevent off-topic doctrine | **Yes** — boundary signal |
| B5 | `services/masterBuddyRuntime.js` | Companion classifiers on `open_general` | Capture life intents | Regex routing | **No** — composer classifies from context |
| B6 | `services/activeConversationManager.js` | `getActiveConversation` | Thread lock state | Follow-up continuity | **Yes** — state for composer |
| B7 | `services/routeOwnershipTable.js` | `getRoutePermissions` | Memory/study suppression | Active conversation lock | **Partial** — rules move to validation |

---

## Bypass Category C — Fallback Bypass (No OpenAI Client)

| ID | File | Function | Purpose | Why it exists | Still needed? |
|----|------|----------|---------|---------------|---------------|
| C1 | `services/openaiClient.js` | module init | Lazy OpenAI client | Optional dependency | **Yes** — required for reason-first |
| C2 | `services/masterBuddyRuntime.js` | `generateOpenAnswer` | `if (!openai)` branch | Graceful degradation | **Last resort only** — not primary |
| C2a | `services/personalizedFallback.js` | `buildPersonalizedFallback` | Template fallback prose | No API key / package | **Last resort only** |
| C3 | `services/masterBuddyRuntime.js` | `generateOpenAnswer` catch | API error handler | Resilience | **Last resort only** |
| C3a | `services/buddyBrain.js` | `fallbackReply` | Generic fallback | Error recovery | **Last resort only** |
| C4 | `services/buddyBrain.js` | `applyFallbackLoopGuard` | Loop detection replacement | Prevent repetitive fallback | **Replace** — composer regen |
| C5 | `services/masterBuddyRuntime.js` | Final `if (!structured)` | Last-resort fallback | Null safety | **Last resort only** |

**Baseline:** 0% fallback in measured sample (OpenAI client null, but routes never reached `generateOpenAnswer` anyway).

---

## Bypass Category D — OpenAI Called But Output Discarded or Replaced

These apply **only when** `generateOpenAnswer` runs and OpenAI client is available.

| ID | File | Function | What happens to OpenAI output | Still needed? |
|----|------|----------|------------------------------|---------------|
| D1 | `services/masterBuddyRuntime.js` | `generateOpenAnswer` | `safeJsonParse(raw) \|\| fallback` — parse fail discards raw model text, uses fallback | **Replace** — regen via model |
| D2 | `services/buddyBrain.js` | `normalizeStructured` | `parsed?.reply \|\| fallback.reply` — empty reply field discards model | **Keep** — with composer contract |
| D3 | `services/buddyBrain.js` | `applyFallbackLoopGuard` | May replace model reply with alternate fallback | **Remove** for composer path |
| D4 | `services/masterBuddyRuntime.js` | `applyAnswerMatchGate` | On fail: `buildMetaAnswerResponse` **replaces entire reply** with template | **Replace** — model regen |
| D5 | `services/masterBuddyRuntime.js` | Contract validation fail | `buildMetaAnswerResponse` **replaces entire reply** | **Replace** — model regen |
| D6 | `services/answerMatchGate.js` | `buildStrictRegeneration` | Calls `metaAnswerResponder` not OpenAI | **Remove** |
| D7 | `services/answerMatchGate.js` | `buildConciseCorrectedAnswer` | Template wrapper on meta response | **Remove** |

**Baseline:** Categories D1–D7 did not execute (OpenAI never called).

---

## Bypass Category E — OpenAI Output Modified (Not Replaced)

Post-composition modifications apply to **all** prose sources including theoretical OpenAI output.

| ID | File | Function | Modification type | Still needed? |
|----|------|----------|-------------------|---------------|
| E1 | `services/runtimeLabelStripper.js` | `stripInternalRuntimeLabels` | Removes internal labels | **Yes** — light post-process |
| E2 | `services/runtimeResponseSanitizer.js` | `sanitizeDoctrineResponse` | Strips forbidden doctrine phrases | **Yes** — or move to validation regen |
| E3 | `services/companionReplyPolish.js` | `polishCompanionReply` | Tone/phrasing rewrite | **Optional** — single pass max |
| E4 | `services/companionRelationshipOrchestrator.js` | `enrichResponseWithRelationshipIntelligence` | Appends memory/reflection/study lines | **No** — composer integrates memory |
| E5 | `services/companionNextSteps.js` | `buildCompanionNextSteps` | Appends study suggestions | **No** — only if user asks |
| E6 | `services/companionDeliveryLayer.js` | `applyDeliveryToReply` | Delivery mode trimming | **Review** — may truncate model output |
| E7 | `services/buddyBrain.js` | `finalizeBuddyResponse` | Second polish + enrichment pass | **Simplify** — validate then send |

---

## Bypass Category F — Architectural Policy Flags

| Location | Flag | Effect |
|----------|------|--------|
| `routeOwnershipTable.js` | `bypassForbidden: true` on **all 17 routes** | Documents intentional OpenAI bypass per route |
| `routeOwnershipTable.js` | `open_general.owner = 'personalizedFallback'` | Even the "open" route owner is fallback, not OpenAI-first |
| `masterBuddyRuntime.js` | `generateAnswer` before `generateOpenAnswer` | Route-first ordering |
| `masterBuddyRuntime.js` | `buildOpenLifeResponse` inside both `generateAnswer` default AND `generateOpenAnswer` | Double bypass of OpenAI for open questions |

---

## OpenAI Call Site Detail

```javascript
// services/masterBuddyRuntime.js — generateOpenAnswer()
const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  temperature: 0.72,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify({ message, userId, mode, personaKey, safety,
      companionProfile: profile, runtimeContext, recentSessions, recentInsights,
      projectSnapshot: snapshot }, null, 2) },
  ],
});
```

** Preconditions that must ALL fail for this to run on a typical turn:**
1. `generateAnswer(routeKey)` returns `null`
2. Registry fallback returns `null`
3. `questionType !== 'open_question'` OR caller didn't hit open_question branch in generateAnswer
4. `openai` client is non-null
5. No uncaught API error

**Observed in baseline:** Steps 1–2 never satisfied for 50/50 turns.

---

## Non-Chat OpenAI (Out of Scope for Bypass Inventory)

These modules call OpenAI but are **not** on the `POST /buddy/chat` path:

| File | Purpose |
|------|---------|
| `services/adminBrain.js` | Admin console |
| `services/contentInsight.js` | Content insight generation |

---

## Bypass Count Summary

| Category | Count | Baseline impact |
|----------|-------|-----------------|
| Hard bypass (prose without OpenAI) | 22+ | **100%** of measured turns |
| Soft bypass (preempt OpenAI path) | 7 | Enables hard bypass |
| Fallback bypass | 5 | 0% measured; latent when OpenAI path reached |
| Discard/replace OpenAI output | 7 | 0% measured; latent |
| Modify output post-compose | 7 | Applies to all prose |

---

## Migration Principle (Audit Recommendation)

**Do not add bypasses.** Remove bypass layers in this order:

1. Retire `generateAnswer` prose switch → evidence adapters
2. Make `generateOpenAnswer` the single composer (rename to `composeReply`)
3. Replace `answerMatchGate` template regen with model regen
4. Remove post-compose enrichment appenders
5. Keep crisis protocol + last-resort fallback only
6. Keep doctrine boundary validation

**No production changes in this audit.**
