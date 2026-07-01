# Bible Learning Engine — Implementation Recommendation

**Date:** 2026-06-01  
**Mode:** Planning only — no implementation until approved.

---

## PART H — Answers

### 1. Which existing files should become Evidence Cards?

**Migrate content (not prose) from these into structured cards:**

| Priority | Source file(s) | Target card(s) |
|----------|----------------|----------------|
| **P0** | `doctrineEvidenceSnippets.js` | All six proto-topics (expand in place first, then split files) |
| **P0** | `bibleTopicCatalog.js` | Sabbath, dietary, feasts, traditions, jesusInBible, resurrectionTimeline |
| **P0** | `genesisToRevelationContinuityRegistry.js` | Per-topic `primaryScriptures` / `supportingScriptures` tiers |
| **P0** | `deathResurrectionKingdomCatalog.js` | deathState, heavens, millennium |
| **P0** | `cleanUncleanSymbolismCatalog.js` | dietaryLaw (cautionPassages) |
| **P1** | `feastsAndProphecyCatalog.js` | feasts, abominationDesolation |
| **P1** | `priesthoodAndLawCatalog.js` | lawCommandments |
| **P1** | `genealogyCaptivityIdentityCatalog.js` | israelCaptivity (Deut 28:68) |
| **P1** | `sabbathHistoryDeepResponder.js` | sabbathHistory — **facts only** in `historySecondaryNotes` |
| **P2** | `marriageChurchTonguesAndLineageCatalog.js` | tongues, fornication, esauEdom |
| **P2** | `treeOfLifeDoctrineCatalog.js` | serpentSatan, treeOfLife |
| **P2** | `prophecyCharacterAndAngelsCatalog.js` | serpentSatan, tribulation |

**Do not card-ify as prose:** `sourceGroundedResponder.js` reply functions — extract facts/refs only, discard canned paragraphs.

---

### 2. Which systems should never return final prose?

| System | Reason |
|--------|--------|
| `sourceGroundedResponder.js` | Full canned doctrine paragraphs |
| `companionDoctrinePresenter.js` | Witness blocks + study prompts |
| `registryStudyPresenter.js` | Registry template answers |
| `sabbathHistoryDeepResponder.js` (as author) | Historical chain prose; facts OK in cards |
| `scriptureWitnessEngine.js` (visible triplet) | "Establishes the matter…" template language |
| `continueStudyEngine.js` / `studyConnectionIntent.js` | Study continuation openers |
| `personalizedFallback.js` / `companionLearningLayer` | "You've been studying…" speaker |
| `applyFallbackLoopGuard` → alternate fallback | Ownership swap loops |
| All `runtimeScripture*ContinuityEngine.js` (103+) | Duplicative; must not surface as reply text |
| `doctrineRuntimePipeline.js` / `doctrineCompanionPath.js` | Template intercept on default path |
| `masterBuddyRuntime.js` | Rollback only (`BUDDY_OPENAI_FIRST=0`) |

**Allowed non-OpenAI prose exceptions:**

- Crisis protocol (`buddyBrain.fallbackReply` crisis branch)
- Connection error message (`buildConnectionErrorReply`)
- Optional **post-answer** next-step hint (one line, not study-loop)

---

### 3. Which learning systems should stay disabled?

| System / flag | Status | Rationale |
|---------------|--------|-----------|
| `BUDDY_TEMPLATE_PROSE=0` | **Keep enforced** | Blocks study fallback speaker |
| `BUDDY_DISABLE_STUDY_FALLBACK=1` | **Keep enforced** | No personalizedFallback study lines |
| `BUDDY_OPENAI_FIRST=0` | **Rollback only** | Re-enables template authors |
| `companionLearningLayer` as answer driver | **Disabled** | Profile bleed → wrong topic |
| `studyJourneyEngine` in answer opener | **Disabled** | Study script loops |
| `enrichResponseWithRelationshipIntelligence` on core | **Already skipped** | Template enrichment bleed |
| Learning log → live answer override | **Never enable** | Human review required |
| Runtime Scripture engine expansion | **Frozen** | Complexity debt; no new engines |

---

### 4. What is the safest first implementation?

**Phase 1 only — Evidence Cards without composer churn:**

1. Create `services/evidenceCards/` with **6 P0 cards** (dietary, sabbath, heavens, deathState, messiahLogos, traditions).
2. Add `evidenceCardRegistry.js` with `retrieveEvidenceCards(message, topic, questionType)`.
3. Wire into `retrievalEvidencePack.js` as `evidencePack.cards` — parallel to existing `doctrine.snippets` (deprecate snippets after parity).
4. **No composer prompt changes yet** — cards flow as JSON facts; existing `CORE_RESTORATION_INSTRUCTION` already sufficient.
5. Run `ownershipAuditBattery.js` (60 tests) — must stay 60/60.
6. Add `bibleLearningEngineAudit.js` (40+ tests) with `evidenceUsed` + `witnessCount` assertions.

**Why safest:** Builds on proven ownership cleanup (60/60 pass). Cards are additive. No new runtime engines. No template path changes.

**Estimated touch surface:** ~8 new files, ~2 modified (`retrievalEvidencePack.js`, `coreRestorationDebug.js` for `evidenceCardsUsed`).

---

### 5. What should not be rebuilt because it caused loops?

| Do not rebuild | What happened | Alternative |
|----------------|---------------|-------------|
| **Witness triplet visible prose** | OpenAI pasted "establishes/confirms/carries" blocks | Internal evidence labels only; validator hard-fail |
| **Genesis-to-Revelation study path as answer opener** | "Would you like to continue studying…" hijacked turns | Post-answer optional hint only |
| **personalizedFallback + learning profile** | Shared `chat-html-user` → "studying traditions" on heaven Q | Per-user ID + minimal fallback |
| **applyFallbackLoopGuard → alternate fallback** | Good OpenAI answer swapped for study script | Strip in place; no swap |
| **103 runtime Scripture continuity engines** | Overlap, unclear ownership, maintenance burden | Evidence Cards + 2–3 traversal helpers |
| **masterBuddyRuntime template routing** | Multiple authors fighting OpenAI | Rollback flag only |
| **Folder-based responders as default** | `sourceGroundedResponder` canned paragraphs | Mine refs into cards; disable on default path |
| **Study continuation as correction response** | User correction → same study loop | `suppressPriorStudyTopic` + active conversation lock |
| **History chain on HOW questions** | Sabbath HOW → Constantine/Laodicea | `forbidSabbathHistoryChain` + gated `historySecondaryNotes` |

---

## Recommended approval sequence

1. **Approve** this plan + `BibleLearningAssetInventory.md`.
2. **Implement Phase 1** (P0 Evidence Cards only).
3. **Run** ownership battery + new learning engine audit.
4. **Approve Phase 2** (composer instruction upgrade) if witness-count gaps appear.
5. **Plan concordance upload** (Part I) after P0 cards stable.

---

## Current baseline (post-ownership cleanup)

| Metric | Status |
|--------|--------|
| Default author | OpenAI (`openAiFirstCompanionRuntime`) |
| Ownership battery | **60/60 pass** |
| Study fallback | Disabled via env |
| Evidence proto-layer | `doctrineEvidenceSnippets.js` |
| Anti-override guard | `ownershipAntiOverrideGuard.js` |

The Scripture Learning Engine extends this foundation — it does not replace the ownership model.

---

## Stop condition

Planning complete. **No implementation, beta, deploy, push, or Sprint 3 work** until explicit approval.

**Part I (Bible Concordance upload):** Specified in plan; deferred until Evidence Cards v1 is approved and stable.
