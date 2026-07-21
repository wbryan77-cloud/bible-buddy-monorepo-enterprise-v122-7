# Architecture Rollback Analysis

**Date:** 2026-06-01  
**Priority:** CRITICAL  
**Scope:** Analysis only — no implementation, deploy, push, beta, or Sprint 3.  
**Evidence:** Git trees at `37c59c3`, `5a2bc02`, `e5d388e`, plus `FullRegressionRootCauseReport.md` and local reproduction.

---

## Direct answers (executive)

| # | Question | Answer |
|---|----------|--------|
| 1 | What made `37c59c3` natural? | **Single path:** crisis check → **OpenAI JSON compose** with runtime context + memory in prompt. No health/grief/job prose modules, no route ownership, no active-topic routing. |
| 2 | What did `5a2bc02` add for template bypass? | **Dedicated responders** (`healthCompanionResponse`, `griefCompanionResponse`, prayer, sabbath) that **return final prose before** `openai.chat.completions.create`, plus **`scriptureWitnessEngine`** triplets on those replies. |
| 3 | What did `e5d388e` add for sticky loops? | **`masterBuddyRuntime`** + **`activeConversationManager`** + **`routeOwnershipTable`**: inherited `health` topic routes follow-ups without re-classifying the **current** message; **`generateAnswer` runs before `generateOpenAnswer`**. |
| 4 | Are master / activeConversation / routeOwnership still necessary? | **Not for normal companion chat.** Partially useful for **Sabbath history / doctrine intercept / crisis** only. |
| 5 | If not necessary? | **Bypass** master for default `/buddy/chat`; **remove route forcing** from active conversation; **demote** health/grief/job to retrieval hints. |
| 6 | Minimum worth keeping? | Crisis guard, doctrine pipeline + presenter (Sabbath), optional retrieval pack as **context** (RACL), post-compose **doctrine validator** (local/untracked), session logging. |

---

## PART A — Architecture comparison

### Comparison matrix

| Dimension | `37c59c3` (LKG) | `5a2bc02` | `e5d388e` | Current (`e5d388e` + local) |
|-----------|-----------------|-----------|-----------|---------------------------|
| **`/buddy/chat` entry** | `routes/buddy` → `buddyBrain.runBuddy` | Same | Same → **`masterBuddyRuntime`** only | Same; `BUDDY_RUNTIME=reason_first` → `reasonFirstBuddyRuntime` (local, not on `e5d388e` tree) |
| **OpenAI composes by default** | **Yes** — next step after crisis | **No** — many early returns | **No** — `generateAnswer` first | **No** (legacy default) |
| **Templates bypass OpenAI** | No dedicated bypass arms | **Yes** — health, grief, prayer, sabbath history | **Yes** — via route owners + same modules | **Yes** |
| **Active topic overrides message** | N/A (no active conversation file) | N/A | **Yes** — `resolveRouteKey` inherits `health`/`grief`/etc. | **Yes** |
| **Correction resets topic** | N/A | Per-message re-classify (no sticky file) | **Partial** — correction inherits topic; meta path separate | Same as `e5d388e` + stricter local `reasoningSnapshot` (untracked) |
| **Health/grief/job before OpenAI** | **No** modules | **Yes** — explicit early returns | **Yes** — `generateAnswer` cases | **Yes** |
| **Doctrine boundaries protected** | Prompt + quality score only | **`runDoctrineRuntimePipeline`** intercept + presenters | Doctrine cases in `generateAnswer` | Same + local `doctrineBoundaryValidator` on reason_first only |
| **`buddyBrain.js` size** | ~440 lines | ~1251 lines | ~963 lines (delegates) | ~976 lines |
| **Key new files** | — | `healthCompanionResponse`, `griefCompanionResponse`, `scriptureWitnessEngine`, … | `masterBuddyRuntime`, `activeConversationManager`, `routeOwnershipTable`, `companionDiscernmentResponder` | + `reasoningSnapshot`, `reasonFirst*`, `doctrineBoundaryValidator` (mostly **untracked**) |

### Entry path diagrams

**`37c59c3` — OpenAI-first**

```text
POST /buddy/chat
  → buddyBrain.runBuddy
      → classifySafety → crisis? → fallback (crisis copy)
      → openai.chat.completions.create (system + runtimeContext + sessions)
      → normalizeStructured → appendSession → updateUserMemory
```

**`5a2bc02` — Template-first ladder**

```text
POST /buddy/chat
  → buddyBrain.runBuddy
      → crisis → continue study → study connection → memory recall
      → classifyHealthCompanion → buildHealthSupportResponse → RETURN
      → prayer → RETURN
      → classifyEmotionalSupport → buildEmotionalSupportResponse → RETURN
      → sabbath history → RETURN
      → runDoctrineRuntimePipeline → intercept? → RETURN
      → registry / other branches
      → openai.chat.completions.create (only if nothing matched)
```

**`e5d388e` / current legacy — Route-first master**

```text
POST /buddy/chat
  → buddyBrain.runBuddy (BUDDY_RUNTIME=legacy)
      → masterBuddyRuntime.runMasterBuddyRuntime
          → getActiveConversation + resolveQuestionIntent + resolveFollowUp
          → resolveRouteKey / reasoningSnapshot (local only)
          → generateAnswer(routeKey)  ← health, grief, job_discernment, doctrine, sabbath
          → if null → generateOpenAnswer (OpenAI)
          → answerMatchGate / responseContract (local only)
          → finalizeBuddyResponse → updateActiveConversation (locks topic)
```

### What “natural” meant at `37c59c3`

1. **One composer** — OpenAI saw `message`, `recentSessions`, `runtimeContext`, `profile` and wrote JSON reply.
2. **No competing authors** — no `buildHealthSupportResponse` prose.
3. **No sticky route state** — each turn evaluated on its own text (only session history in prompt).
4. **Simpler failure mode** — without API key, generic `fallbackReply`; no repeated health block from route lock.

### What `5a2bc02` broke (template ownership)

| Addition | Effect |
|----------|--------|
| `healthCompanionResponse` | Final answer with fixed openings + `scriptureWitnessEngine` |
| `griefCompanionResponse` | Same pattern for grief/rest |
| `prayerCompanionResponse` | Fixed prayer script |
| `sabbathHistoryCompanion` | Historical template path (works for Sabbath — intentional) |
| `runDoctrineRuntimePipeline` | Doctrine intercept **before** OpenAI (good for Scripture Qs, bad if over-broad) |
| Broad classifiers | `detectHealthConcern`: `/hurt|pain|ache/` → relationship “heart hurts” can become health **on that turn** |

Still **no** `activeConversationManager` — wrong topic did not **persist** across turns unless memory/session bled.

### What `e5d388e` broke (sticky loops)

| Addition | Effect |
|----------|--------|
| `masterBuddyRuntime` | Central **route-first** dispatcher; OpenAI is **fallback** |
| `activeConversationManager` | 60m `topic` lock (`health`, `grief`, `sabbath`, …) |
| `routeOwnershipTable` | `followUp.inheritedTopic === 'health'` → **`health_support`** without current-message health check |
| `messageStartsNewTopic()` | Does not detect relationship loss / “listen first” as leaving `health` |
| `companionDiscernmentResponder` | `/what do I do/i` → **job_discernment** for Alzheimer’s / grief phrasing |
| Removed monolithic OpenAI block | `buddyBrain` delegates entirely to master |

**Reproduced:** `activeConversation.topic = 'health'` + relationship message → identical health template on correction and short follow-ups (`FullRegressionRootCauseReport.md`).

### Doctrine protection across versions

| Version | Mechanism |
|---------|-----------|
| `37c59c3` | System prompt + `scoreCompanionQuality`; **no** `doctrineRuntimePipeline` in tree |
| `5a2bc02` | Pipeline intercept + `presentCompanionDoctrine` + witness blocks on doctrine paths |
| `e5d388e` | Same, routed through `generateAnswer` doctrine cases |
| Current | Above + optional `doctrineBoundaryValidator` on **`reason_first`** path only (not default legacy) |

Sabbath **still works** in `e5d388e` because doctrine/history routes are **designed** template paths — not a sign that master runtime is healthy for open life chat.

---

## PART B — Component necessity decisions

**Rule:** Any component that can emit **final user-visible prose** without OpenAI is **DANGEROUS** unless **crisis/safety** or **explicit doctrine/history** (Sabbath, definition, registry).

| Component | Verdict | Rationale |
|-----------|---------|-----------|
| **masterBuddyRuntime** | **BYPASS** (default chat) / **KEEP ONLY FOR DOCTRINE QUESTIONS** | Route-first design causes bypass; keep thin wrapper for sabbath/doctrine/crisis only |
| **activeConversationManager** | **DEMOTE TO RETRIEVAL ONLY** | Pass `topic` as **hint** in OpenAI context; **never** `resolveRouteKey` input |
| **routeOwnershipTable** | **REMOVE** from companion path | Inherited-topic → route mapping is root of sticky loops |
| **healthCompanionResponse** | **DEMOTE TO RETRIEVAL ONLY** | Facts: issue, recurring flag; **no** `buildHealthSupportResponse` as final reply |
| **griefCompanionResponse** | **DEMOTE TO RETRIEVAL ONLY** | Grief/rest **signals** only; OpenAI composes |
| **companionDiscernmentResponder** | **DEMOTE TO RETRIEVAL ONLY** | Job/decision **hints** only; remove `/what do I do/i` as route owner |
| **prayerCompanionResponse** | **KEEP ONLY BEHIND FLAG** or demote | Fixed prayer prose; optional explicit `mode=PRAYER` |
| **scriptureWitnessEngine** | **KEEP ONLY FOR DOCTRINE QUESTIONS** | Triplet OK on Sabbath definition; **dangerous** on health/grief/job |
| **scriptureChainExpansion** / `orchestrateBuddyRuntime` | **KEEP ONLY FOR DOCTRINE QUESTIONS** | Scripture-first study paths, not open life |
| **responseContract** | **BYPASS** (local untracked) | Post-processor on meta/correction; adds rigidity |
| **answerMatchGate** | **BYPASS** (local untracked) | Regenerates/replaces with meta templates |
| **doctrineBoundaryValidator** | **KEEP** (post-compose guard) | Does not own prose; validates after compose |
| **reasoningSnapshot** | **REMOVE** from routing (local untracked) | Pre-route `health`/`discernment` typing competes with message |
| **RACL / reasonFirst runtime** | **KEEP** retrieval / **BYPASS** as default route | `retrievalEvidencePack` + composer OK if **default** path; **do not** replace legacy master as default without OpenAI-first guard |
| **metaAnswerResponder** | **KEEP ONLY FOR DOCTRINE/META** or **BYPASS** | Useful for Sabbath wording corrections; dangerous on “listen first” |
| **questionIntentResolver** (routing use) | **DEMOTE** — use for **hints** only | `HEALTH_PATTERNS` `/hurt|pain|ache/` too broad for routing |
| **classifySafety / crisis** | **KEEP** | Required |
| **runDoctrineRuntimePipeline** | **KEEP ONLY FOR DOCTRINE QUESTIONS** | Sabbath/registry |
| **sabbathHistoryDeepResponder / companion** | **KEEP ONLY FOR DOCTRINE QUESTIONS** | Historical depth |
| **relationshipRecallEngine** | **KEEP** (retrieval) | Memory recall; fix empty hits separately |
| **personalizedFallback** | **KEEP** (no OpenAI only) | Must not be looped as “answer” when API available |

### Dangerous prose paths (current legacy)

| Route key | Module | OpenAI bypass |
|-----------|--------|---------------|
| `health_support` | `healthCompanionResponse` | **Yes** |
| `grief_support` / `rest_support` | `griefCompanionResponse` | **Yes** |
| `job_discernment` | `companionDiscernmentResponder` | **Yes** |
| `prayer` | `prayerCompanionResponse` | **Yes** |
| `sabbath_history` / `historical_*` | `sabbathHistoryCompanion` | **Yes** (acceptable) |
| `sabbath_definition` / `doctrine_general` | doctrine pipeline + presenter | **Yes** (acceptable) |
| `meta_about_previous_answer` | `metaAnswerResponder` | **Yes** (narrow use) |
| `open_general` | `generateOpenAnswer` | **No** (composer) |

---

## PART C — Strategy choice

### Options scored

| Option | Summary | Safety | Simplicity | Keeps Sabbath | Risk |
|--------|---------|--------|------------|---------------|------|
| **1** | Full rollback to `37c59c3` + re-add doctrine/RACL | High for natural chat | Medium (re-integration work) | Must re-wire | Large git churn |
| **2** | Bypass master; normal → `reason_first` | Medium | Low code if RF fixed | RF may still template | Ties default to experimental stack |
| **3** | Master **only** doctrine/history; life → OpenAI-first | **High** | **High** | **Yes** | Small surgical change |
| **4** | Keep architecture; responders → facts only | High | Medium | Yes | Many files to touch |

### **Recommended: Option 3** (refined)

**Keep current repo. Bypass `masterBuddyRuntime` for normal companion chat. Route life/relationship/grief/health/general/correction to OpenAI-first composer. Keep master (or extracted doctrine handler) only for doctrine/history/Sabbath/registry/crisis.**

Why not full `37c59c3` revert (Option 1)?

- Loses two years of doctrine intercept, Sabbath depth, and memory bridges in one revert.
- Re-adding them is the same work as Option 3, with more git risk.

Why not Option 2 (default `reason_first`)?

- `reason_first` is not on production `e5d388e` tree; composer + validators are local/evolving.
- Still risk of template markers if retrieval drives posture.
- User asked to restore **`/buddy/chat` natural behavior**, not swap experiments.

Why Option 3 is safest/simplest:

- **One behavioral switch** in `buddyBrain.runBuddy` (default path).
- Sabbath/doctrine paths **unchanged** (already working).
- Eliminates sticky topic + health template loop **without** new routing rules.
- Aligns with preferred direction in restoration plan (OpenAI-first + keep doctrine validator + RACL as retrieval).

**Do not** add more `if` rules to `messageStartsNewTopic` — that is symptom patching.

---

## PART D — Alignment with “no more routing rules”

Option 3 is **subtractive**:

- Remove **route ownership** from default path (architecture bypass, not new rules).
- Demote responders from **authors** to **retrieval** (delete bypass arms, not add classifiers).
- Active conversation → **context field only** (stop forcing `resolveRouteKey`).

---

## Related artifacts

- `FullRegressionRootCauseReport.md`
- `scripts/traceBuddyChatPath.js`
- `OpenAIFirstRestorationPlan.md` (implementation steps — pending approval)

---

## Stop line

Analysis complete. **No code changes** in this document.
