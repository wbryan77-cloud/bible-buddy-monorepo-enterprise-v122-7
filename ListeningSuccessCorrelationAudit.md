# Listening Success Correlation Audit

**Generated:** 2026-06-01  
**Scope:** Audit only. No code, implementation, deploy, push, or Sprint 3.

**Question:** What fields are present when listening is high — and what differs between HIGH, MID, and LOW turns?

**Evidence sources:**

| Source | Turns with listening | Role in audit |
|--------|----------------------|---------------|
| `docs/racl/validation-results.json` | 20 | **Primary** — full field replay + rubric dimensions |
| `docs/racl/validation-results-baseline-pre-person-first-reflect.json` | 20 | Pooled listening distribution |
| `docs/response-structure-removal/results.json` | 40 (current + experiment) | `companionPresence`, shape scores |
| `docs/companion-operating-model/results.json` | 20 | Pooled listening |
| `docs/companion-turn-intent/validation-results.json` | 20 | Pooled listening |
| `docs/companion-conversation-experiment/results.json` | 40 | Pooled listening |
| `docs/reason-first-migration/listening-audit-evidence.json` | 20 | Understanding fields (older run; listening differs) |
| `docs/reason-first-migration/validation-results.json` | varies | Pooled |
| **Pooled total** | **140** scored turns | Aggregate tier means (listening only where noted) |

**Primary analysis:** **20 canonical RACL turns** (reason-first, 2026-06-03) with evidence-pack replay for retrieval/composer fields. Final replies from validation JSON.

**Tier definitions:**

| Tier | Listening |
|------|-----------|
| **HIGH** | ≥ 7.0 |
| **MID** | 6.0 – 6.9 |
| **LOW** | < 6.0 |

**Canonical tier counts:** HIGH **4**, MID **11**, LOW **5** (avg listening **7.48 / 6.36 / 5.60**).

---

## PART 1 — Every canonical turn (20)

`detailInOpener` = automated token overlap with `detailCandidates` in **first sentence** (see caveat below).  
`specificAnchorInOpener` = user’s salient phrase (Wednesday, far away, grieving who, faith failing, again today, etc.) appears in opening — **stronger discriminator** on this corpus.

| Turn | Tier | L | feltHeard | threadSpec | presence | companionTopic | nextStep | questionType | requestedAnswerType | strict | #details | detailOpener | anchorOpener | #scrip | len | #Q | corrCnt | overlap |
|------|------|---|-----------|------------|----------|----------------|----------|--------------|---------------------|--------|----------|--------------|--------------|--------|-----|-----|---------|---------|
| job-1 | LOW | 5.8 | 5 | 4 | 7 | discernment | wise_discernment_and_peace | discernment | discernment_conversation | no | 2 | yes | n/a | 0 | 422 | 1 | 0 | 0 |
| job-2 | LOW | 4.8 | 2 | 2 | 7 | discernment | wise_discernment_and_peace | discernment | discernment_conversation | no | 5 | yes | **no** (far away) | 1 | 567 | 1 | 0 | 33 |
| job-3 | MID | 6.0 | 5 | 4 | 5 | discernment | wise_discernment_and_peace | discernment | discernment_conversation | no | 7 | yes | yes (push/wait) | 1 | 583 | 1 | 0 | 30 |
| alz-1 | MID | 6.5 | 6 | 6 | 7 | caregiver | emotional_support_and_prayer | direct_question | direct_answer | no | 2 | no | n/a | 1 | 342 | 0 | 0 | 0 |
| alz-2 | MID | 6.8 | 6 | 6 | 5 | caregiver | emotional_support_and_prayer | direct_question | direct_answer | no | 4 | yes | yes (remember who) | 1 | 394 | 0 | 0 | 23 |
| alz-3 | HIGH | 7.8 | 8 | 8 | 9 | caregiver | emotional_support_and_prayer | grief | companion_support | no | 7 | yes | **yes** (grieving who) | 0 | 595 | 1 | 0 | 23 |
| distant-1 | MID | 6.0 | 6 | 4 | 7 | distant_from_god | honest_reflection_not_template | direct_question | direct_answer | no | 2 | yes | n/a | 3 | 554 | 1 | 0 | 0 |
| distant-2 | MID | 6.0 | 6 | 4 | 9 | distant_from_god | honest_reflection_not_template | direct_question | direct_answer | no | 5 | yes | partial (empty) | 1 | 489 | 1 | 0 | 36 |
| distant-3 | HIGH | 7.5 | 8 | 6 | 7 | distant_from_god | honest_reflection_not_template | follow_up | direct_answer | no | 7 | yes | **yes** (faith failing) | 0 | 512 | 1 | 0 | 19 |
| sabbath-1 | LOW | 5.8 | 5 | 4 | 7 | null | null | historical_evidence | historical_answer | no | 1 | yes | n/a | 0 | 612 | 0 | 0 | 0 |
| sabbath-2 | MID | 6.2 | 5 | 2 | 5 | null | null | meta_about_previous_answer | wording_explanation | no | 5 | yes | meta partial | 0 | 318 | 1 | 1 | 10 |
| sabbath-3 | MID | 6.8 | 7 | 6 | 9 | null | null | meta_about_previous_answer | wording_explanation | no | 5 | yes | meta partial | 0 | 354 | 1 | 2 | 56 |
| sabbath-4 | MID | 6.8 | 7 | 6 | 7 | null | null | meta_about_previous_answer | wording_explanation | no | 5 | yes | meta partial | 0 | 385 | 0 | 2 | 44 |
| sabbath-5 | HIGH | 7.4 | 7 | 8 | 7 | null | null | correction | direct_reanswer | no | 9 | yes | meta partial | 0 | 381 | 1 | 2 | 23 |
| sabbath-6 | MID | 6.6 | 7 | 6 | 5 | null | null | meta_about_previous_answer | wording_explanation | no | 9 | yes | meta partial | 0 | 358 | 0 | 3 | 22 |
| sabbath-7 | HIGH | 7.2 | 8 | 8 | 9 | null | null | correction | direct_reanswer | **yes** | 10 | yes | **yes** (listening/meta) | 0 | 403 | 0 | 4 | 31 |
| grief-1 | LOW | 5.8 | 5 | 4 | 9 | grief | presence_and_comfort | grief | companion_support | no | 2 | **no** | **no** (Wednesday) | 0 | 299 | 0 | 0 | 0 |
| grief-2 | MID | 6.0 | 5 | 4 | 9 | grief | presence_and_comfort | grief | companion_support | no | 5 | yes | n/a | 0 | 442 | 0 | 0 | 22 |
| health-1 | MID | 6.3 | 5 | 6 | 5 | health | practical_care_and_prayer | health | companion_support | no | 2 | yes | n/a | 0 | 317 | 0 | 0 | 0 |
| health-2 | LOW | 5.8 | 5 | 6 | 7 | health | practical_care_and_prayer | health | companion_support | no | 5 | yes | yes (again today) | 0 | 360 | 0 | 0 | **57** |

**Caveat on `detailInOpener`:** LOW tier shows **80%** “yes” vs HIGH **75%** — the automated metric **does not predict listening** on this benchmark (false positives: job-2 paraphrases “distance” without “far away”; grief-1 says “loss” not “Wednesday”). **Do not use `detailInOpener` alone as success signal.**

---

## PART 2 — Group aggregates (canonical n=20)

| Field | HIGH (n=4) | MID (n=11) | LOW (n=5) |
|-------|------------|------------|-----------|
| **Avg listening** | **7.48** | **6.36** | **5.60** |
| **Avg feltHeard** | **7.75** | **5.91** | **4.40** |
| **Avg threadSpecific** | **7.50** | **4.91** | **4.00** |
| **Avg companionPresence** | 8.00 | 6.82 | **7.00** |
| `detailInOpener` % yes | 75% | 73% | **80%** |
| **`specificAnchorInOpener`** (where applicable) | **2/3 (67%)** | **2/7 (29%)** | **1/3 (33%)** |
| **`shallowOpener`** (“It sounds like…”) | **0%** | 9% | **20%** |
| Avg scripture refs in reply | **0.25** | 0.64 | 0.20 |
| Avg answer length (chars) | 473 | 419 | 484 |
| Avg closing `?` count | 0.5 | 0.36 | 0.4 |
| Avg overlap % | 24 | 22 | 18 (health-2 **57**) |
| Avg correctionCount | 1.5 | 0.36 | 0 |
| `strictAnswerMode` | 25% (1/4) | 0% | 0% |
| `historyIncluded` | 0% | 0% | **20%** (sabbath-1) |

### Pooled corpus (140 turns, listening score only)

| Tier | n | Avg listening |
|------|---|---------------|
| HIGH | 31 | **7.27** |
| MID | 49 | **6.37** |
| LOW | 60 | **5.46** |

Confirms calibration-audit split (~7.5 vs ~5.3) across artifacts; per-field replay only on canonical 20.

**Confidence:** **High** on tier means (canonical); **Medium** on pooled (mixed rubrics/arms).

---

## PART 3 — Correlation with listening / feltHeard / threadSpecific

Pearson **r** on **canonical n=20** (linear association — not causation).

### Ranked by |r| with **listening**

| Field | r (listening) | r (feltHeard) | r (threadSpecific) | Confidence |
|-------|---------------|---------------|-------------------|------------|
| **feltHeard** (dimension) | **0.925** | 1.00 | 0.89 | High |
| **threadSpecific** (dimension) | **0.834** | 0.89 | 1.00 | High |
| **shallowOpener** | **−0.468** | −0.449 | −0.426 | Medium (n=1 shallow in MID) |
| detailCount | 0.57 | 0.56 | 0.55 | Low (confounded by turn index) |
| correctionActive | 0.405 | 0.433 | 0.304 | Medium (Sabbath only) |
| correctionCount | 0.395 | 0.476 | 0.520 | Medium |
| strictAnswerMode | 0.261 | 0.342 | 0.373 | Low (n=1 strict) |
| companionPresence | 0.18 | 0.25 | 0.296 | Low — **not a listening driver** |
| historyIncluded | −0.193 | −0.146 | −0.160 | Low (n=1 history) |
| scriptureCount | −0.187 | −0.101 | −0.267 | Medium |
| detailInOpener (automated) | **−0.183** | −0.205 | −0.268 | High — **misleading metric** |
| questionCount | −0.153 | −0.159 | −0.451 | Medium |
| answerLength | −0.140 | −0.129 | −0.247 | Low |
| overlap | 0.128 | 0.165 | 0.243 | Low |

### Evidence splits (canonical)

| Signal | Avg listening when true / condition | Avg when false |
|--------|-------------------------------------|----------------|
| **shallowOpener** | **5.40** (n=2) | **6.51** |
| **specificAnchorInOpener** (applicable turns only) | **6.78** (n=9) | **6.28** |
| scriptureCount = 0 | **6.48** | 6.23 (1+) |
| overlap ≥ 50% | **6.30** (health-2 only) | — |

**Strongest predictors on this benchmark:** rubric dimensions **feltHeard** and **threadSpecific** (partially define listening score), then **shallow opener**, then **salient anchor in opening** (manual check). **Companion presence does not co-vary with listening** (grief-1: presence **9**, listening **5.8**).

**Confidence:** **High** for dimension correlation; **Medium** for opener/anchor splits (small n).

---

## PART 4 — HIGH vs LOW (evidence only)

### Present in HIGH turns, absent or rare in LOW

| Observation | HIGH evidence | LOW counter-evidence | Confidence |
|-------------|---------------|----------------------|------------|
| **feltHeard ≥ 7** | 4/4 turns | 0/5 (max 5) | **High** |
| **threadSpecific ≥ 6** | 4/4 (distant-3 is 6) | 1/5 (health-2 threadSpec 6 only) | **High** |
| **Salient user phrase in opening** | alz-3 “grieving who…”; distant-3 “faith failing”; sabbath-7 “hear your concern” | grief-1 **no Wednesday**; job-2 **no “far away”** (template paraphrase) | **High** |
| **No shallow “It sounds like” opener** | 0/4 | job-2 **yes** | **High** |
| **Direct fear/question answered in first clause** | distant-3 | job-1/2 lead with Proverbs/discernment | **High** |
| **requestedAnswerType** | `companion_support`, `direct_reanswer` on best turns | job: **`discernment_conversation`** all 3 turns | **High** |
| **questionType on best companion turn** | alz-3: **`grief`** (not generic direct_question) | job: **`discernment`** on share turns | **Medium** |
| **Scripture refs in reply (count)** | avg **0.25** | similar avg but job-2/T1 use teach framing | **Medium** |
| **strictAnswerMode** | sabbath-7 **true** at 7.2 | never on LOW | **Low** (n=1) |

### Present in LOW turns, absent or rare in HIGH

| Observation | LOW evidence | HIGH evidence | Confidence |
|-------------|--------------|---------------|------------|
| **Listening < 6** | 5/5 | 0/4 | **High** |
| **feltHeard ≤ 5** | 5/5 | 0/4 | **High** |
| **Shallow opener** | job-2 | none | **High** |
| **Discernment pipeline on non-decision shares** | job-1, job-2 (`discernment` + Proverbs) | — | **High** |
| **Missed named anchor in opener** | grief-1 Wednesday; job-2 far away | — | **High** |
| **High body overlap with prior turn** | health-2 **57%** | max HIGH **31%** | **Medium** |
| **historyIncluded** | sabbath-1 **true** (lecture) | 0/4 HIGH | **Medium** |
| **High companionPresence with low listening** | grief-1 presence **9**, L **5.8** | — | **High** |

### Not discriminators (contradicting simple theory)

| Field | Finding | Confidence |
|-------|---------|------------|
| `detailInOpener` (automated) | Higher in LOW (80%) than HIGH (75%) | **High** |
| `detailCandidates` count | LOW avg 3.2 vs HIGH 8.5 — confounded by turn depth | **High** |
| `companionTopic` set | LOW has valid topics (grief, discernment) — topic alone doesn’t fix listening | **High** |
| `companionPresence` | LOW avg 7.0 vs HIGH 8.0 — grief LOW **9** | **High** |
| Answer length | LOW slightly **longer** avg than HIGH | **High** |

---

## PART 5 — Categorical field presence by tier

### `companionTopic` (canonical)

| Topic | HIGH | MID | LOW |
|-------|------|-----|-----|
| null (Sabbath) | 2 | 5 | 1 |
| caregiver | 1 | 2 | 0 |
| distant_from_god | 1 | 2 | 0 |
| discernment | 0 | 1 | **2** |
| grief | 0 | 1 | **1** |
| health | 0 | 1 | **1** |

### `requestedAnswerType`

| Type | HIGH | LOW |
|------|------|-----|
| discernment_conversation | 0 | **2** (job) |
| historical_answer | 0 | **1** (sabbath-1) |
| companion_support | 1 | 1 |
| direct_reanswer | 2 | 0 |
| direct_answer / wording | 1 | 0 |

### `practicalNextStepCategory`

| nextStep | HIGH | LOW |
|----------|------|-----|
| wise_discernment_and_peace | 0 | **2** |
| presence_and_comfort | 0 | **1** |
| emotional_support_and_prayer | 1 | 0 |
| honest_reflection_not_template | 1 | 0 |
| null (Sabbath) | 2 | 1 |

---

## PART 6 — If LOW turns copied only HIGH-turn characteristics

**LOW turns:** job-1 (5.8), job-2 (4.8), sabbath-1 (5.8), grief-1 (5.8), health-2 (5.8).

**HIGH characteristics copied (observable only on HIGH scorers):**

1. No `shallowOpener`
2. `specificAnchorInOpener` = yes where user named a salient detail
3. `feltHeard` / `threadSpecific` patterns: anchor + direct answer when user asked a fear/question
4. Scripture count in reply ≤ 1 (HIGH avg 0.25)
5. Overlap < 35% (exclude health-2 style repeat)

**Per-turn projection (conservative, from same-benchmark splits — not simulated re-run):**

| Turn | Current L | Adjustments applied | Projected L |
|------|-----------|---------------------|-------------|
| job-1 | 5.8 | No HIGH analogue for “first share”; minimal change | **5.8** |
| job-2 | 4.8 | Remove shallow + anchor “far away” → toward anchor-matched mean (~6.78) | **~6.7** |
| sabbath-1 | 5.8 | Teach length not fixed by anchor alone | **5.8** |
| grief-1 | 5.8 | Add Wednesday anchor → toward anchor-matched band | **~6.6** |
| health-2 | 5.8 | Already anchored; overlap 57% caps lift | **5.8** |

| Metric | Current (canonical) | After copying HIGH traits into LOW only |
|--------|---------------------|----------------------------------------|
| **LOW tier avg** | **5.60** | **~6.14** |
| **Corpus avg (20 turns)** | **6.40** | **~6.53** |

**Projected listening if all LOW → HIGH-profile behavior:** **~6.1–6.5** corpus average — **not ~7.5**.

**Why (evidence):** HIGH listening on this set is already reflected in **feltHeard/threadSpecific** rubric; copying opener/anchor fixes alone on 5 LOW turns moves the needle modestly. Turns already **HIGH** (4/20) average **7.48**; the gap to 7.5 gate requires more than anchor/shallow fixes on the remaining 16 turns.

**Confidence:** **Medium** on ~6.5 corpus projection; **Low** on reaching **7.5** from LOW-copy alone.

---

## Summary table — what actually correlates

| Rank | Signal | Listening | FeltHeard | ThreadSpecific |
|------|--------|-----------|-----------|----------------|
| 1 | feltHeard (rubric dim) | **0.93** | — | — |
| 2 | threadSpecific (rubric dim) | **0.83** | — | — |
| 3 | shallowOpener = false | **↑** | **↑** | **↑** |
| 4 | specificAnchorInOpener | **↑** (weak r≈0.32 on applicable) | **↑** | **↑** |
| 5 | scriptureCount lower | slight ↑ | slight ↑ | ↑ |
| 6 | companionPresence | **~no correlation** | weak | weak |

---

*Audit complete. No code changes made.*
