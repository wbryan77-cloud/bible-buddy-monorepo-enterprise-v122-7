# Flow Regression Audit

Generated: 2026-06-03  
**Audit only** — no code changes, implementations, runtime changes, deploy, push, or Sprint 3.

**Question:** Across Pre-RACL → RACL → Listening 7.5 → Lite → Conversation experiment, what was removed or bypassed, what moved scores, and what restoration (if any) has measurable support?

**Evidence sources only** — no restoration recommendations without measured support.

---

## Score timeline (same 20-turn suite where available)

| Stage | Date (artifacts) | Listening | Warmth | Follow-up | Rubric | Notes |
|-------|----------------|-----------|--------|-----------|--------|-------|
| Legacy | `ReasonFirstMigrationReport.md` (2026-06-02) | **5.7** | n/a | n/a | Regex | 0% OpenAI |
| Reason-first pre-RACL | `docs/reason-first-migration/validation-results.json` | **5.8** | n/a | n/a | Regex | 100% OpenAI |
| Pre-RACL (human re-score) | `RACLImpactAudit.md` | **6.1** | n/a | n/a | Human 5-dim | Same replies, human rubric |
| RACL | `docs/racl/validation-results.json` (2026-06-02) | **6.4** | **5.7** | **6.6** | Human 5-dim | 20/20 memory hits |
| RACL (earlier report) | `RACLImpactAudit.md` / `PathTo7Point5.md` | **6.3** | **5.5** | **6.8** | Human | Slight rubric/heuristic variance |
| Prompt hierarchy minimal | `PromptHierarchyExperiment.md` | **5.5** | n/a | n/a | Human | vs RF **5.8** pre-RACL current |
| Reason-first Lite | `ReasonFirstSimplificationExperiment.md` (2026-06-02) | **5.9** | **6.1** | **5.4** | Human | Δ vs RACL **−0.4** listen |
| Listening 7.5 validator split | Code: `listeningSpecificityValidator.js` | **No re-run** | — | — | — | Implemented; not re-benchmarked |
| Conversation experiment | `ConversationExperimentReport.md` | **pending** | pending | pending | Human | **INCONCLUSIVE** (no API) |

**Headline:** Only **RACL** has a documented **listening gain** (+0.2 to +0.5 depending on baseline). **Lite simplification** **hurt** listening **−0.4** and follow-up **−1.4**. **Prompt stripping** did not beat full prompt (within ±0.3). **Conversation experiment** not executed live.

---

## Part 1 — Flows removed, reduced, or bypassed

### A. Reason-first path bypasses (vs legacy `masterBuddyRuntime`)

| Flow | Introduced / active | Bypassed when | Still in legacy? |
|------|---------------------|---------------|------------------|
| Route-first responders (`masterBuddyRuntime` compose chain) | Pre-migration | `BUDDY_RUNTIME=reason_first` | **Yes** |
| `applyAnswerMatchGate` + `metaAnswerResponder` regen | Legacy | Reason-first uses OpenAI compose | **Yes** |
| `relationshipRecallEngine` surface in finalize | Legacy enrichment | `skipRelationshipEnrichment: true` in RF | Partial |

**Score evidence:** Migration A/B: legacy **5.7** → RF **5.8** (regex). Job thread legacy **6.3** vs RF **7.0** on migration rubric — **mixed** by thread (`ReasonFirstMigrationReport.md`).

---

### B. RACL additions (not removals — included for regression context)

| Component | Sprint / date | Effect |
|-----------|---------------|--------|
| Thread-local memory | RACL 2026-06-02 | +memory hits 0→20/20 |
| Correction ledger + history suppression | RACL | Sabbath history repeat gate **PASS** |
| Companion scripture stubs | RACL | Job/discernment stubs; triplet repetition side effect |
| Loop-control (overlap / opener) in validator | RACL | History bleed reduced; rationale loop **remains** 37–55% |
| Composer correction lines | RACL | Meta acknowledgment; shallow rationale persists |

**Listening:** **6.1 → 6.3/6.4** (human rubric, `RACLImpactAudit.md`).

---

### C. Listening 7.5 — removed from reason-first **validation chain**

| Component | Was (per `ReasonFirstRestorationCheck.md`, pre-7.5) | Now (`doctrineBoundaryValidator.js`) | Post-change score |
|-----------|------------------------------------------------------|--------------------------------------|-------------------|
| `answerMatchGate` / `validateAnswerMatch` hard regen | Active on meta/correction | **Removed** from `validateReasonFirstReply` | **Not measured** |
| `validateLoopControl` / `replyViolatesLoopControl` hard regen | Active | **Removed** | **Not measured** |
| Listening detail / empathy **hard** fail | Planned in early 7.5 docs | **Soft only** + hard overlap/rationale | **Not measured** |

**Added:** `buildListeningComposerSignals`, `validateCorrectionHardFailures` (40%/35% thresholds), soft `evaluateListeningRecommendations`.

---

### D. Lite experiment — bypassed on test path only (not production RF)

| Removed on Lite path | Kept |
|----------------------|------|
| `buildRuntimeInstructions` + full `buildSystemPrompt` | Full RACL retrieval |
| `answerMatchGate`, `responseContract` | `validateDoctrineBoundaries` |
| Loop-control regen | Crisis guard |
| Polish / sanitize / `normalizeStructured` stack | Correction facts in payload |
| RACL addendum compression fields | Thread-local memory |

**Measured vs current RACL:** Listening **−0.4**, warmth **+0.6**, follow-up **−1.4** (`ReasonFirstSimplificationExperiment.md`). **Verdict: NO** — do not treat Lite removals as listening improvements.

---

### E. Conversation experiment — test-only (not deployed)

| Added | Status |
|-------|--------|
| Explore-before-advise rules (`companionConversationBehavior.js`) | Harness only |
| Live 20-turn benchmark | **INCONCLUSIVE** |

---

## Part 2 — Measurable gains

| Change | Listening Δ | Other metrics | Confidence |
|--------|-------------|---------------|------------|
| **OpenAI reason-first compose** (pre-RACL) | **+0.1** vs legacy (5.7→5.8) | Template ↓ | Medium (regex rubric) |
| **RACL retrieval** | **+0.2** vs pre-RACL human (6.1→6.3); **+0.5** vs legacy headline | Memory 20/20; alz T3 **7.8** | **High** |
| **RACL** per-thread | Job **+0.5**, alz **+0.3**, distant **+0.3**, grief **+0.3**, health **+0.3**, Sabbath **0.0** | `RACLImpactAudit.md` | High |
| **Lite** warmth | n/a | **+0.6** warmth | High (live run) |
| **Prompt minimal** | **−0.3** vs RF current in hierarchy exp | Within ±0.3 rule | High |

---

## Part 3 — Measurable losses

| Change | Listening Δ | Other metrics | Confidence |
|--------|-------------|---------------|------------|
| **Lite runtime** (aggregate) | **−0.4** | Follow-up **−1.4** | **High** |
| **Lite** job thread | **−0.7** thread avg | T3 **−1.3** | High |
| **Lite** alz thread | **−0.9** | Follow-up **−4** on T2–T3 | High |
| **RACL** Sabbath T2 | **−0.6** vs pre-RACL | `feltHeard: 2` | Medium (single turn) |
| **Prompt minimal** | **−0.3** vs pre-RACL RF | 5.5 vs 5.8 | Medium |

---

## Part 4 — Restoration candidates (evidence-only)

Only components **removed or bypassed** with **measurable** before/after or **live experiment** outcomes.

| Component | Introduced | Removed / bypassed | Score before | Score after | Restore for listening? | Confidence |
|-----------|------------|-------------------|--------------|-------------|------------------------|------------|
| **RACL thread-local + stubs** | 2026-06-02 RACL | Never removed | 6.1 | 6.3–6.4 | Already active — N/A | **High** (keep) |
| **`buildRuntimeInstructions` + legacy system prompt** | RF migration | Lite only | RACL **6.3** | Lite **5.9** (−0.4) | **No** — restoring Lite stack hurts listening | **High** |
| **`answerMatchGate` hard regen** | RF (pre-7.5) | Listening 7.5 | No A/B | No A/B | **Insufficient evidence** — planned demotion in `Listening75RefinementPlan.md` (boilerplate risk) | **Low** |
| **`loopControl` hard regen** | RACL | Listening 7.5 | Overlap 47% with gate ON | No post-removal run | **Insufficient evidence** — did not fix rationale loop when present | **Low** |
| **`skipRelationshipEnrichment`** | RF migration | Active | Unknown | Unknown | **No measured support** | **None** |
| **Legacy route responders** | Legacy | RF bypass | 5.7 legacy | 5.8–6.4 RF | **Not comparable** (different author) | N/A |
| **Explore-before-advise (conversation exp)** | 2026-06-03 test | Not in production | 6.4 baseline | **pending** | **Unknown** — pre-reg: +0.2 listen if exploratory Qs ≥5 | **None** until live run |
| **Listening 7.5 soft compose signals** | 2026-06-02 code | N/A (added) | 6.3–6.4 | **not re-run** | **Planned +0.2–0.4** (`PathTo7Point5.md` arithmetic, not measured) | **Low** until validated |
| **Diagnostic question (legacy job T1 pattern)** | Legacy | Not in RF prose | Pre-RACL job T1 **5.0**; legacy migration sample asks question | RACL T1 **5.8** without question | **+0.075 to +0.15 global** extrapolated (`PathTo7Point5.md`); not a restored *module* | **Low** |

### Rules applied

- **Do not restore** Lite removals for listening (**measured −0.4**).
- **Do not recommend** `answerMatchGate` or `loopControl` restoration **without** a controlled re-run vs current **6.4** baseline.
- **Do not recommend** relationship enrichment restore without A/B.
- **Conversation experiment** — no restoration decision until live benchmark completes.

---

## Highest-probability improvements (if “restored” or activated)

**Important:** The largest gains are **not** from restoring removed flows but from **new behavior never in production** (conversation shape) or **unvalidated** compose signals (Listening 7.5 soft).

| Rank | Candidate | Type | Est. listening impact | Evidence |
|------|-----------|------|----------------------|----------|
| 1 | **Compose-time specificity + thread detail in opening** (Listening 7.5 soft signals) | **Added, not restored** | **+0.2 to +0.4** (arithmetic on dimension caps, `PathTo7Point5.md`) | Not measured post-implementation |
| 2 | **Explore-before-advise turn shape** (conversation experiment) | **Test harness** | **+0.2 to +0.6** if pre-registered criteria met (`ConversationExperimentReport.md`) | **INCONCLUSIVE** |
| 3 | **RACL (already present)** | Active | **+0.2** (achieved) | `RACLImpactAudit.md` |
| 4 | **Legacy-style diagnostic question** (behavior, not module) | Partially in legacy transcripts | **+0.075 global** extrapolated | Weak — 3 turns (`PathTo7Point5.md`) |
| 5 | **`answerMatchGate` restore** | Removed 7.5 | Unknown; risk boilerplate | **No support** |
| 6 | **`loopControl` restore** | Removed 7.5 | Unlikely; failed at 47% overlap with ON | **Negative support** |
| 7 | **Full Lite stack restore** | Test only | **−0.4** | **Measured harm** |

**Companion presence / warmth:** Lite **+0.6** warmth suggests polish removal can feel warmer while **hurting** follow-up (**−1.4**) and listening — **not** a recommended restoration bundle for companion quality.

---

## Final ranking — remaining bottlenecks (all experiments to date)

Based on: RACL validation, impact audit, shape audit, complexity audit, Lite NO, prompt hierarchy NOT primary, conversation experiment inconclusive, PathTo7.5 dimension analysis.

| Rank | Bottleneck | Est. share of companion-feel gap | Evidence |
|------|------------|----------------------------------|----------|
| **1** | **Conversation shape / turn objective** (monologue deliver-mode, ~0% exploratory asking, advise-before-explore) | **~38%** | `ConversationShapeAudit.md`: deliver-mode **84.7%**, asking **0%**, 0/20 exploratory Qs; aligns with `RelationshipObjectiveAudit.md` |
| **2** | **Compose gap** (evidence in pack, weak prose specificity) | **~22%** | 20/20 memory hits, `threadSpecific` **5.4–5.5**, grief “Wednesday” missing |
| **3** | **Emotional specificity / felt heard** (shallow reflect, generic sympathy) | **~22%** | `feltHeard` **5.7**; 10 turns low emotional specificity (`PathTo7Point5.md`) |

**Fourth (honorable):** **Reasoning focus on meta/correction** (~18%) — Sabbath rationale loop, invented wording intent (`RACLImpactAudit.md`, shape audit).

**Deprioritized by experiment:** **Prompt volume alone** (minimal within ±0.3 of RF); **Lite stack removal** (hurts listening).

---

## Summary answers

**If we restored previously removed flow components, which have the highest probability of improving companion quality?**

1. **None of the removed hard validators** (`answerMatchGate`, `loopControl`) have measured support for restoration; loop-control did not prevent 47% rationale overlap when active.

2. **Do not restore** the Lite bypass bundle — **listening −0.4**, follow-up **−1.4**.

3. **Highest probability** improvements come from **activating unmeasured additions** (Listening 7.5 soft compose guidance) and **conversation-shape experiment** (if live run confirms asking ↑ and deliver-mode ↓) — not from rewinding the RF validation chain.

4. **Keep RACL** — only change with consistent positive listening evidence.

**By how much (evidence-bound):**

| Lever | Listening |
|-------|-----------|
| RACL (already applied) | **+0.2 to +0.5** (achieved) |
| Listening 7.5 soft (unvalidated) | **+0.2 to +0.4** (estimated) |
| Conversation experiment (pending) | **+0.2 to +0.6** (pre-registered, not observed) |
| Restore Lite / answerMatch / loopControl | **Not supported** or **negative** |

---

*No fixes. No implementation. Evidence: cited repo artifacts only.*
