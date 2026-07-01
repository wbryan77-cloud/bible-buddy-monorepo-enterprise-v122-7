# Beta Readiness Root Cause Audit

**Generated:** 2026-06-03  
**Scope:** Audit only — no code, deploy, push, Sprint 3, fixes, or experiments.

**Evidence source (latest successful OpenAI run only):**

| Artifact | Timestamp (UTC) | Key metrics |
|----------|-----------------|-------------|
| `docs/racl/validation-results.json` | 2026-06-03T21:49:12Z | Listening **6.3**, OpenAI **100%**, memory **20/20** |
| `docs/reason-first-migration/validation-results.json` | 2026-06-03T21:51:50Z | Reason-first listening **5.3** (script rubric), OpenAI **100%** |
| `docs/companion-intelligence/validation-results.json` | 2026-06-03T21:56:54Z | **Overall 86** (reported as 87 in places — same run), **readiness NEEDS_REVIEW**, **stability 70** |
| `docs/sprint214/acceptance-results.json` | 2026-06-03T21:54:58Z | **14/20** passed |
| `docs/sprint214b/sabbath-history-depth-results.json` | 2026-06-03T21:55:41Z | **2/5** passed |
| `docs/sprint214c/natural-reasoning-results.json` | 2026-06-03T21:56:54Z | **6/10** passed |

**Not used:** 2026-06-03T18:47Z batch (401 auth failures) or pre-P1 stale archives.

---

## Executive summary

| Metric | Value | Primary driver |
|--------|-------|----------------|
| RACL listening | **6.3/10** | Composer shape + **benchmark rubric** (`feltHeard` / `threadSpecific`), not retrieval failure |
| Companion overall | **86/100** | **13/35** HTTP tests failed; category scores are partly **heuristic** |
| Readiness | **NEEDS_REVIEW** | `minCategoryScore` = **70** (stability); requires **95+** on all intelligence categories **and** all tests pass |
| **Stability = 70** | `round(14/20 × 100)` | **Not** infra stability — **Sprint 2.14 pass rate** mislabeled |

**Dominant root-cause bucket:** **B. Composer** (~60% of failure units), then **D. Benchmark** (~30%), then **A. Retrieval** (~8%), **C. Validation** (~2% as primary, but amplifies readiness gate).

---

## Why stability is exactly 70

From `scripts/companionIntelligenceValidationSuite.js`:

```javascript
stability: sprint214.passed === sprint214.total ? 97 : Math.round((sprint214.passed / sprint214.total) * 100)
```

| Input | Value |
|-------|-------|
| `sprint214.passed` | **14** |
| `sprint214.total` | **20** |
| Calculation | `round(14/20 × 100)` = **70** |

**Stability is wholly determined by Sprint 2.14 companion acceptance pass rate.** It does not measure API errors, doctrine, or RACL listening.

Because **70** is the **minimum** intelligence category, it sets `minCategoryScore: 70` and forces **`readiness: NEEDS_REVIEW`** regardless of overall **86**.

---

## Categories below 95 — score formulas and drivers

| Category | Score | Formula / driver | Main drag |
|----------|------:|------------------|-----------|
| **stability** | **70** | S214 pass rate 14/20 | 6 failed S214 tests (see §3) |
| **reasoningDepth** | **76** | `(S214C depth 97 + S214B directness 55) / 2` | S214B directness **55** (3/5 tests failed) |
| **historicalRouting** | **55** | `t5.passed ? 96 : 55` (binary) | **TEST 5 — Sabbath history** only |
| **scriptureBalance** | **80** | avg(S214 Scripture 78, S214C scripture 97, S214B scriptureFirst 65) | S214 **78**, S214B **65** |
| **studyContinuity** | **86** | avg(S214 Continue Study 75, S214C noPrematureStudy 97) | S214 **Continue Study 75** |
| **helpfulness** | **90** | avg(S214 Accuracy 78, Companion Presence 96, S214C directness 97) | S214 **Accuracy 78** |
| **feltUnderstood** | **88** | avg(S214 Listening 97, Follow-Up 97, S214C questionUnderstanding 70) | S214C **questionUnderstanding 70** |
| **accuracy** | **78** | S214 heuristic: `passedCount >= 18 ? 96 : >= 15 ? 92 : 78` | 14 passed → stuck at **78** |
| **questionUnderstanding** | **70** | S214C: `passed >= 9 ? 97 : >= 7 ? 88 : 70` | 6/10 passed → **70** |

Note: S214 **Listening 97** in suite heuristics **does not** equal RACL human listening **6.3** — different rubrics.

---

## Failure frequency table

Attribution per **failed test** (13 total) or **RACL turn pattern** where it drives listening. Primary bucket only.

| Failure source | Count | Impact | Notes |
|----------------|------:|--------|-------|
| **B. Composer** | **9** | **High** | Wrong mode (grief/comfort vs study/history), correction deflection, missing phrases, no legacy intercept |
| **D. Benchmark** | **8** | **High** | Regex gates (`\bYes\b`, `reflection`, `historyIntercept`), binary Historical Routing, inflated category heuristics |
| **B + D overlap** | **4** | **High** | Same Sabbath/history tests fail both content and regex |
| **A. Retrieval** | **2** | **Medium** | Sunday question pulls `historyIncluded: true`; no `intercept` in runtime payload |
| **C. Validation** | **1** | **Medium** | Readiness gate structurally blocked by stability label + minCategory 95 rule |
| **RACL rubric (benchmark)** | **12 turns** | **High** | `feltHeard`/`threadSpecific` penalties — not separate HTTP tests |

**Composer sub-themes (within B):**

| Theme | Failed tests / turns | Count |
|-------|---------------------|------:|
| Sabbath history prose without `sabbath_history_companion` intercept | S214 T5, S214b T1 | 2 |
| Correction → “please restate” instead of repair | S214b T5, S214c T5 | 2 |
| Study/continue → companion grief mode | S214 T9, T11, T14, T18 | 4 |
| Nuanced historical answer without leading “Yes” | S214b T3, S214c T3 | 2 |
| Definition missing reflection regex | S214 T4 | 1 |
| “It sounds like” + weak thread token overlap (RACL) | job, grief, health turns | 8+ turns |

---

## Root-cause groups (A / B / C / D only)

### A. Retrieval problem

| Issue | Evidence | Tests affected |
|-------|----------|----------------|
| History chain included on Sunday worship question | RACL sabbath T1: `historyIncluded: true`, reply leads Constantine | RACL T1 listening **5.8** |
| Runtime does not surface `intercept: sabbath_history_companion` on reason-first | All S214/S214b history tests: `intercept: null`, `intent: doctrinal_study` | S214 T5 `historyIntercept`, S214b T1 `intercept` |

Retrieval/memory **worked** (RACL 20/20 memory hits). Failures are **routing/evidence gating** and **missing legacy intercept metadata**, not empty packs.

### B. Composer problem

| Issue | Evidence | Tests affected |
|-------|----------|----------------|
| Reason-first composes generic historical essay vs structured history intercept | T5 reply: historical narrative, no intercept | S214 T5, S214b T1 |
| Correction turns deflect with clarify prompt | “Could you please restate your exact question” | S214b T5, S214c T5 |
| Cross-thread/session bleed on “Continue” | T11 grief comfort; T14 knees; T9 generic Sabbath companion | S214 T9, T11, T14, T18 |
| Template openers hurt human rubric | “It sounds like…” job T1–3, health, grief | RACL job **5.0**, grief **5.8**, health **5.8–6.3** |
| Sabbath correction loops wording rationale | T2–T7 high overlap 33–40% | RACL sabbath T7 **6.8** (gate wants ≥8) |
| Missing explicit “Yes” on RCC change questions | Historically accurate but no `\bYes\b` | S214b T3, S214c T3 |

### C. Validation problem

| Issue | Evidence | Effect |
|-------|----------|--------|
| `readiness` requires **all** categories ≥95 **and** 35/35 tests | 86 overall but min=70 | NEEDS_REVIEW |
| S214 “Listening 97” vs RACL “6.3” | Same run, different instruments | Misleading green category |
| Category scores decoupled from individual test failures | e.g. Natural Conversation **96** with 6 S214 fails | Inflated confidence |

### D. Benchmark problem

| Issue | Evidence | Tests affected |
|-------|----------|----------------|
| `Historical Routing = 55` if **any** T5 fail | Single test flips entire category | historicalRouting **55** |
| T4 requires `/thoughtful\|explore\|walk\|Scripture/i` | Reply is direct definition only | S214 T4 `reflection` |
| T5 `distinction` exact phrase | Reply may not include exact “not the same as a biblical command” | S214 T5 |
| S214c T2 needs `Direct answer\|who changed` + specific scripture line | Composer uses different wording | S214c T2 |
| S214c T6 `companionTone` regex triple | Empathetic Sunday answer fails one leg | S214c T6 |
| S214b T3 `yesHistorically` requires `\bYes\b` | Nuanced “historically…early Christians” fails | S214b T3 |
| RACL `threadSpecific` needs keyword overlap | Memory hits present but phrasing generic | Low listening despite retrieval |

---

## Per-category analysis (below 95)

### stability — **70**

**Driver:** 6 failed Sprint 2.14 tests (see §3). Not OpenAI or auth in this run.

| Est. if fixed | Listening | Readiness |
|---------------|-----------|-----------|
| Pass 4 more S214 tests (18/20) | +0.0 (separate rubric) | stability **90**, still NEEDS_REVIEW unless other cats pass |
| Pass all 20 (97 stability) | — | Removes min-category blocker from stability |

---

### historicalRouting — **55**

**Driver:** **Only** S214 **TEST 5 — Sabbath history** failed.

#### TEST 5 — Sabbath history (FAILED)

| | |
|---|---|
| **User message** | `Who changed the Sabbath and why?` |
| **Expected** | Scripture-first ordering; `historical` wording; distinction “not the same as a biblical command”; route/intercept `sabbath_history_companion` or equivalent |
| **Actual reply (preview)** | “You’re asking who changed the Sabbath and why… The Bible itself does not record any direct command… Early Christians often gathered… In AD 321, Roman Emperor Constantine…” |
| **Failures** | `scriptureFirst`, `distinction`, `historyIntercept` |
| **Primary cause** | **B** Composer (OpenAI historical essay, no intercept metadata) + **D** Benchmark (regex/intercept expects legacy shape) |

---

### reasoningDepth — **76**

**Driver:** S214B **directness 55** (3/5 failed) averaged with S214C depth **97**.

Failed S214b tests: T1, T3, T5 — see §3.

| Est. if S214b passes 4/5 | reasoningDepth | Readiness |
|-------------------------|----------------|-----------|
| directness ~90+ | **~93–94** | Still blocked by stability 70 until S214 passes improve |

---

### scriptureBalance — **80**

**Drivers:** S214 **Scripture Grounding 78** (14/20 pass heuristic); S214B **scriptureFirst 65** (T1 fail).

Key fail: **S214b TEST 1** — missing exact `Scripture identifies the seventh day` / `does not record God changing` phrases in composer wording; **intercept** null.

| Est. if T1+T5 Sabbath tests pass | scriptureBalance |
|--------------------------------|------------------|
| scriptureFirst 97, Scripture Grounding 96 | **~92–95** |

---

### studyContinuity — **86**

**Driver:** S214 **Continue Study 75** — failed continue/journey tests **9, 11, 14, 18**.

| Test | Expected | Actual (pattern) | Cause |
|------|----------|------------------|-------|
| T9 Continue | continue/last time/next step | Companion reflection on Sabbath, no continue keywords | **B** |
| T11 Sabbath journey | 2+ distinct progression strings; continue/Isaiah/study | Grief comfort, no study progression | **B** |
| T14 Resume | Resume Sabbath after topic switch | Knees/comfort, no Sabbath resume | **B** session bleed |
| T18 Continue journey | journey + significance | Gentle Sabbath reflection only | **B** |

| Est. if 3 continue tests pass | studyContinuity |
|------------------------------|-----------------|
| Continue Study 96 | **~96** |

---

### helpfulness — **90**

**Driver:** S214 **Accuracy 78** (`passedCount` 14 → middle tier).

Fails correlate with **accuracy** failures: history, continue, definition reflection — composer did not meet test assertions; heuristic lowers Accuracy.

| Est. if 18/20 S214 pass | helpfulness |
|-------------------------|-------------|
| Accuracy 96 | **~96** |

---

### feltUnderstood — **88**

**Driver:** S214C **questionUnderstanding 70** (4/10 S214c tests failed).

| Est. if S214c 9/10 pass | feltUnderstood |
|-------------------------|----------------|
| questionUnderstanding 97 | **~97** |

---

### accuracy — **78**

**Driver:** Sprint 2.14 scoring: 14 passed → fixed tier **78** (needs ≥15 for 92, ≥18 for 96).

Same 6 failed tests as **stability** drag.

---

### questionUnderstanding — **70**

**Driver:** 6/10 passed on S214C → heuristic tier **70**.

#### Failed S214C tests (detail in §3)

---

## All failed HTTP tests (13) — full detail

### Sprint 2.14 Companion (6 failures)

#### TEST 4 — Sabbath definition

| Field | Content |
|-------|---------|
| **Failures** | `reflection` |
| **Expected** | Scripture terms **and** reflection cue: `/thoughtful\|explore\|walk\|Scripture/i` |
| **Actual** | Direct seventh-day definition; no “thoughtful/explore/walk” phrasing |
| **Reply (preview)** | “The Sabbath is a special seventh day of rest and worship that God established at creation…” |
| **Cause** | **D** Benchmark regex; **B** composer direct-answer shape |

#### TEST 5 — Sabbath history

*(See historicalRouting above)*

#### TEST 9 — Continue study

| Field | Content |
|-------|---------|
| **Failures** | `continue` |
| **Expected** | `/continue\|last time\|next step\|study\|looking at/i` after prior “What is the Sabbath?” |
| **Actual** | Companion tone; “I’m here with you… Sabbath isn’t just about laws” — no continue keyword |
| **Cause** | **B** Composer mode (comfort vs study continuation) |

#### TEST 11 — Sabbath journey

| Field | Content |
|-------|---------|
| **Failures** | `continueWorks` |
| **Expected** | Fourth “Continue.” in journey shows progression / study refs |
| **Actual** | “It’s okay to feel whatever you’re feeling… grief… rest in God’s presence” |
| **Cause** | **B** Composer (grief bleed from shared user prefix/session pattern) |

#### TEST 14 — Resume after topic switch

| Field | Content |
|-------|---------|
| **Failures** | `resume` |
| **Expected** | After Sabbath then knees, “Continue.” resumes **Sabbath** study |
| **Actual** | Knees hurting again; prayer/peace — no Sabbath resume |
| **Cause** | **B** Composer thread conflation |

#### TEST 18 — Continue journey explanation

| Field | Content |
|-------|---------|
| **Failures** | `journey`, `significance` |
| **Expected** | `/journey\|significance/i` in reply |
| **Actual** | Sabbath rest rhythm; no “journey” or “significance” tokens |
| **Cause** | **B** Composer vocabulary; **D** Benchmark keyword |

---

### Sprint 2.14B (3 failures)

#### TEST 1 — Who changed Sabbath

| Field | Content |
|-------|---------|
| **Failures** | `scriptureNoChange`, `churchAuthority`, `historySecondary`, `intercept` |
| **Expected** | Exact scripture-first phrases; “secondary to Scripture”; `intercept === 'sabbath_history_companion'` |
| **Actual** | Constantine narrative in OpenAI prose; `intercept: null`, `intent: doctrinal_study` |
| **Reply (preview)** | “…Bible consistently designates the seventh day… In AD 321, Roman Emperor Constantine…” |
| **Cause** | **B** Composer + **A** Retrieval/runtime metadata; **D** strict phrase/intercept checks |

#### TEST 3 — Catholic Church performed change

| Field | Content |
|-------|---------|
| **Failures** | `yesHistorically` |
| **Expected** | `/\bYes\b\|yes — historically\|historical answer is yes/i` |
| **Actual** | Historically accurate narrative without leading “Yes” |
| **Cause** | **D** Benchmark; **B** answer shape |

#### TEST 5 — Follow-up correction

| Field | Content |
|-------|---------|
| **Failures** | `apology`, `historicalAnswer`, `direct` |
| **Expected** | Apology + Constantine/Laodicea historical repair after “That was not my question” |
| **Actual** | “Could you please restate your exact question so I can respond directly” |
| **Cause** | **B** Composer correction handling (CLARIFY pattern, not repair) |

---

### Sprint 2.14C (4 failures)

#### TEST 2 — Who changed Sabbath

| Field | Content |
|-------|---------|
| **Failures** | `scripture`, `direct` |
| **Expected** | `does not record God changing\|Scripture identifies the seventh day` AND `Direct answer\|who changed` |
| **Actual** | Historical narrative; missing exact scripture boilerplate |
| **Cause** | **D** Benchmark phrases; **B** composer |

#### TEST 3 — Rome/Catholic change

| Field | Content |
|-------|---------|
| **Failures** | `yesAnswer` |
| **Expected** | `/\bYes\b\|major role\|Roman church authority/i` |
| **Actual** | Long historical explanation without `\bYes\b` |
| **Cause** | **D** + **B** |

#### TEST 5 — Correction

| Field | Content |
|-------|---------|
| **Failures** | `apology`, `historical` |
| **Expected** | Apology + historical content after correction |
| **Actual** | Restate prompt only |
| **Cause** | **B** |

#### TEST 6 — Why Sunday

| Field | Content |
|-------|---------|
| **Failures** | `companionTone` |
| **Expected** | `/I hear\|answer that directly\|historical/i` |
| **Actual** | Empathetic Sunday explanation (“I sense you’re trying to understand…”) — may pass `whyAnswer` but fail companionTone regex |
| **Cause** | **D** Benchmark regex triplet |

---

## RACL listening 6.3 — turns below 7.0 (benchmark rubric)

RACL uses a **different** human listening rubric than S214 “Listening 97”. Low scores cluster on:

| Thread | Turn | Listening | Message | Reply pattern | Primary cause |
|--------|------|----------:|---------|---------------|---------------|
| job | 1–3 | 5.0, 5.0, 4.8 | job / distance / push-wait | “It sounds like…” + prayer offers; weak keyword overlap | **B** + **D** |
| sabbath | 1 | 5.8 | Sunday worship | History-first Sunday answer | **A** + **B** |
| sabbath | 2 | 6.2 | Roman church wording | Low `threadSpecific` (2) despite answer | **D** rubric |
| grief | 1 | 5.8 | lost friend Wednesday | No “Wednesday” in reply | **B** + **D** |
| grief | 2 | 6.0 | still bothering | Generic grief; no “Wednesday” | **B** + **D** |
| health | 2 | 5.8 | knees again today | 53% overlap with T1 | **B** repetition |

**Example — job T1 (listening 5.0):**

- **Expected (human):** Name job opportunity; discernment without template opener.  
- **Actual:** “It sounds like this job opportunity is an important decision…” + Proverbs + prayer offer.  
- **Evidence:** `threadSpecific: 4`, `feltHeard: 2`, memory hits present.  
- **Cause:** **B** Composer template; **D** RACL rubric.

**Example — grief T1 (listening 5.8):**

- **Expected:** Reference **Wednesday** / friend.  
- **Actual:** “I'm so sorry for your loss…” — no Wednesday.  
- **Cause:** **B** Composer missed concrete detail.

---

## Reason-first migration (same run)

| Arm | OpenAI | Avg listening (script rubric) |
|-----|--------|-------------------------------|
| reason_first | 100% | **5.3** (lower than RACL 6.3 — stricter/different scoring path) |
| legacy | 0% | **5.7** (responders/templates) |

Reason-first **did run** successfully; low scores reflect **composer phrasing**, not auth.

---

## Projected Companion Intelligence score (if fixes applied)

### Baseline reference (same repo, prior successful suite)

When **35/35** tests passed (2026-06-02 archive, since overwritten):

- **stability 97**, **overall ~96**, **readiness READY**, categories **95+**.

### Current successful run

- **22/35** passed, **overall 86**, **stability 70**, **readiness NEEDS_REVIEW**.

### Projection table (evidence-based, not implemented)

Assumes: **valid OpenAI** (already true in this run), **no stale 401 data**, fixes grouped below.

| Fix bundle | Tests recovered | Projected stability | Projected overall | Projected readiness |
|------------|-----------------|--------------------:|------------------:|---------------------|
| **A only** — expose intercept + tighten Sunday history gating | +1–2 (T5, maybe T1) | 75–80 | 87–88 | NEEDS_REVIEW |
| **B only** — composer: correction repair, continue/study mode, reduce “It sounds like”, Yes-lead historical | +6–8 | 85–97 | 90–94 | NEEDS_REVIEW until stability ≥95 |
| **D only** — relax regex gates (Yes, reflection, intercept optional on RF) | +4–5 | 80–90 | 88–91 | NEEDS_REVIEW |
| **A+B+D** — realistic beta target | +10–13 | **90–97** | **93–97** | **READY** if ≥9 S214c pass too |
| **+ RACL rubric tune** (not CI suite) | — | — | — | Listening **6.8–7.1** (not in CI overall) |

### Projected overall score math

Current intelligence average ≈ **86** (10 categories). Replacing **stability 70 → 97** adds +27/10 ≈ **+2.7** → **~89**.  
Additional fixes lifting **reasoningDepth, historicalRouting, scriptureBalance** (+3–4 each) add **~+1.0–1.5** → **~93–95**.  
Full **35/35** passes → aligns with prior **~96–97 overall** and **READY**.

### Listening 6.3 projection

| Fix | Est. listening |
|-----|----------------|
| Remove template openers + improve concrete detail (grief Wednesday, job specifics) | **6.6–6.9** |
| Sabbath T1 scripture-first + shorter correction loops | **6.8–7.0** |
| **Not** fixable by benchmark-only | — |

Listening **≥7.0** likely requires **composer** changes; CI suite pass rate alone does not raise RACL rubric.

---

## Readiness gate decomposition

`readiness: NEEDS_REVIEW` because **all** must hold:

1. Every `companionIntelligence` category **≥ 95** → **fails** on stability 70, reasoningDepth 76, historicalRouting 55, scriptureBalance 80, studyContinuity 86, helpfulness 90, feltUnderstood 88.  
2. `totals.passed === 35` → **22/35**.  
3. `sprint214c.scoring.overall >= 95` → **94** (close).

**Fastest readiness unlock:** Raise **stability** (pass 1–2 more S214 tests) + **historicalRouting** (pass T5) + **questionUnderstanding** (pass 2 more S214c) — mix of **B** and **D**.

---

## Answers to audit questions

| Question | Answer |
|----------|--------|
| Why stability 5 in failed auth run? | **N/A this audit** — that was 1/20 false pass on error string. **This run: stability = 70.** |
| Why stability 70 here? | **14/20** S214 tests passed. |
| Primary suppression of readiness? | **Composer** on history/continue/correction + **benchmark** coupling (binary categories). |
| Is retrieval broken? | **No** — 20/20 memory hits; failures are compose shape and intercept metadata. |
| Projected CI overall if auth OK + fixes? | **93–97** and **READY** with ~32–35/35 passes (reference: prior 35/35 run). |
| Projected listening? | **~6.8–7.0** with composer fixes; **6.3** is not blocked by auth in this run. |

---

## Stop conditions

- No implementation, deploy, push, Sprint 3, or new experiments.  
- Evidence: JSON artifacts listed above only.

**Recommended human interpretation:** Treat **NEEDS_REVIEW** as **“companion acceptance 63% + strict category gates”**, not as OpenAI outage. Prioritize **composer** fixes on Sabbath history intercept, correction repair, and continue-study threading before further architectural experiments.
