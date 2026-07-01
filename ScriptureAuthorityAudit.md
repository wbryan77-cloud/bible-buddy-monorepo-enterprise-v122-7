# Scripture Authority Audit

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Goal:** Determine whether BibleBuddy answers are driven by Scripture evidence or model prior knowledge  
**Status:** Diagnosis only — no doctrine, evidence, retrieval, validator, prompt, or approval-gate changes. No fixes, deploy, or push.

---

## Executive summary

| Layer | Finding |
|-------|---------|
| **Retrieval** | 8/9 doctrine topics retrieve frozen evidence cards; **holy** has no card (pre-failure A) |
| **Live OpenAI answers** | **Not measurable in this run** — all 9 topics `pipelineBlocked: true`, `openaiCalled: false`, connection fallback |
| **Offline validator** | Typical **model-prior claims** classify **D** (third heaven, kingdom, Acts 10, pork, Sabbath, death) or **C** (resurrection, logos, holy) |
| **Evidence-aligned claims** | Validator approves **A/B** when claims match frozen binding rules (e.g. third heaven naming only) |

**Authority order when pipeline runs:** Evidence is **sent** to OpenAI in every non-holy turn (~10–23 approved refs). Whether the **final answer** is evidence-driven depends on (1) model following evidence in compose, (2) `claims[]` extraction accuracy, (3) validator + approval gate catching drift. Validators **block** known model priors **when claims are present**; orphan reply scan catches some prose-only leaks.

**Artifact:** `docs/regression-trace/scripture-authority-audit.json`

---

## PART A — Evidence attribution (9 doctrine questions)

### Live run status

All topics returned connection fallback — **no live claims, no scriptures cited, no authority score from model output.**

| Topic | Question | Evidence retrieved | Cards | Catalog | Approved refs | Live claims | Live authority |
|-------|----------|-------------------|-------|---------|---------------|-------------|----------------|
| Third heaven | What is the third heaven? | ✅ | heavens | threeHeavens | 23 | 0 | **blocked** |
| Kingdom | What is the kingdom of God? | ✅ | kingdom | kingdomComesToEarth | 24 | 0 | **blocked** |
| Acts 10 | Does Acts 10 make pork clean? | ✅ | dietaryLaw | — | — | 0 | **blocked** |
| Pork | Can I eat pork? | ✅ | dietaryLaw | — | — | 0 | **blocked** |
| Sabbath | How do we keep the Sabbath holy? | ✅ | sabbath | — | — | 0 | **blocked** |
| Death state | What happens when we die? | ✅ | deathState | stateOfTheDead | 17 | 0 | **blocked** |
| Resurrection | What does Scripture teach about resurrection? | ✅ | deathState | stateOfTheDead | 17 | 0 | **blocked** |
| Logos | What does Logos mean in John 1:1? | ✅ | messiahLogos | — | 10 | 0 | **blocked** |
| Holy | What does holy mean? | ❌ | *(none)* | — | 0 | 0 | **blocked + A** |

### Offline claim classification (representative model-prior vs evidence-aligned)

Simulated via `validateClaimToScripture` — same validator as production, no OpenAI.

#### Third heaven

| Claim | Class | Attribution |
|-------|-------|-------------|
| *Model prior:* "Believers go to the third heaven when they die." (2 Cor 12:2) | **D** | Contradicts approved binding — citation does not support destination |
| *Evidence-aligned:* "Paul names a third heaven in 2 Corinthians 12:2." | **A** | Directly supported by heavens card |

#### Kingdom of God

| Claim | Class | Attribution |
|-------|-------|-------------|
| *Model prior:* "The kingdom is in heaven where believers go after death." (Matt 6:9-10) | **D** | Contradicts kingdom-on-earth evidence |
| *Evidence-aligned:* "Thy kingdom come — thy will be done in earth." | **A** | Binding rule match |

#### Acts 10 / Pork

| Claim | Class | Attribution |
|-------|-------|-------------|
| *Model prior:* "Acts 10 makes all foods clean including pork." | **D** | Contradicts dietaryLaw card |
| *Model prior:* "Yes, pork is clean for believers." (Leviticus 11) | **D** | Citation denial — Lev 11 does not support |
| *Evidence-aligned denial:* "Scripture does not state pork is made clean." | **C** | Safe denial path — unverified support on positive framing |

#### Sabbath

| Claim | Class | Attribution |
|-------|-------|-------------|
| *Model prior:* "Sunday replaced the Sabbath for Christians." | **D** | Forbidden pattern |
| *Evidence-aligned:* "Remember the Sabbath day to keep it holy." | **C** | Citation present; verifier needs binding-rule alignment for A |

#### Death state

| Claim | Class | Attribution |
|-------|-------|-------------|
| *Model prior:* "When we die we go to heaven immediately." (2 Cor 5:8) | **D** | Heaven-at-death contradiction |
| *Evidence-aligned:* "The dead sleep until resurrection." | **B** | Chain inference from stateOfTheDead catalog |

#### Resurrection

| Claim | Class | Attribution |
|-------|-------|-------------|
| *Model prior:* "Resurrection happens in heaven away from earth." | **C** | Citation without verified support |
| *Evidence-aligned:* "Resurrection of the dead is taught in 1 Corinthians 15." | **C** | Ref support rules incomplete for auto-A |

#### Logos

| Claim | Class | Attribution |
|-------|-------|-------------|
| *Model prior:* "Logos means one and only Son in the NIV sense." | **C** | Model translation prior; citation unverified |
| *Evidence-aligned:* "In the beginning was the Word (Logos)." | **C** | Citation without verified affirmation rule |

#### Holy

| Claim | Class | Attribution |
|-------|-------|-------------|
| Any definitional claim without card | **C** | `no_approved_evidence` — **forced model knowledge** if OpenAI answers |

### Classification key

| Class | Meaning |
|-------|---------|
| **A** | Directly supported by approved evidence / binding rules |
| **B** | Inference from approved evidence / teaching chain |
| **C** | Model knowledge or citation not traceable to approved support |
| **D** | Contradiction of approved evidence |

---

## PART B — Authority order score (offline simulation)

When typical **model-prior** phrasing is submitted as a doctrine claim:

| Topic | Evidence Driven % | Model Driven % | Notes |
|-------|-------------------|----------------|-------|
| Third heaven | 0% | **100%** | D — destination prior |
| Kingdom | 0% | **100%** | D — kingdom in heaven |
| Acts 10 | 0% | **100%** | D — pork clean |
| Pork | 0% | **100%** | D |
| Sabbath | 0% | **100%** | D — Sunday replacement |
| Death state | 0% | **100%** | D — immediate heaven |
| Resurrection | 0% | **100%** | C — weak verifier affirmation |
| Logos | 0% | **100%** | C — translation prior |
| Holy | 0% | **100%** | C — no evidence pack |

When **evidence-aligned** phrasing is submitted:

| Topic | Evidence Driven % | Model Driven % |
|-------|-------------------|----------------|
| Third heaven | **100%** | 0% |
| Kingdom | **100%** | 0% |
| Death state | **100%** | 0% |
| Acts 10 / Pork / Sabbath / Resurrection / Logos / Holy | 0% | **100%** | Verifier returns C without stronger binding match |

**Interpretation:** The system **can** be evidence-driven when the model emits claims matching frozen cards. Common Christian priors score **100% model-driven** and are **rejected** by validator (class D) when extracted.

---

## PART C — Claim origin trace (production path)

For each doctrine claim at runtime (when `openaiCalled: true`):

| Field | Source |
|-------|--------|
| `claim` | OpenAI `claims[]` in compose JSON |
| `supportingScriptures` | OpenAI-assigned refs from evidence pack |
| `derivedFrom` | `evidence_card:<id>` \| `catalog:<key>` \| `inference` (from composer instruction) |
| `derivedFromEvidence` | Populated when refs in approved graph |
| `derivedFromModel` | Set when classification **C** or **D** |
| `confidence` | From claim object |
| `supportClass` / `classification` | `classifyDoctrineClaim` → `verifyCitationSupportsClaim` |
| `validatorDecision` | Approved (A/B) \| Rejected (C/D) |

Orphan claims from reply prose: `scanReplyOrphans` + `matchesForbidden` on full reply.

---

## PART D — Aggregate findings

### Evidence infrastructure vs model behavior

```
Retrieval (8/9) ──► Evidence in prompt ──► OpenAI compose ──► claims[] + reply
                              │                    │              │
                              │                    │              └──► Validator A/B/C/D
                              │                    └──► Model priors compete here
                              └──► Scripture refs frozen in pack
```

### Validator coverage (offline)

- **9/9** model-drift fixtures pass (`baeClaimValidatorFixtures.js`)
- **0** validator misses on gap audit drift probes (`baeAuthorityGapAudit.js`)

### Live gap

Cannot attribute live answers to Scripture vs model until `openaiCalled: true`. Re-run:

```bash
export OPENAI_API_KEY=<valid-key>
node scripts/scriptureAuthorityAuditRunner.js
```

---

## Related documents

- [ModelAuthorityLeakReport.md](ModelAuthorityLeakReport.md)
- [AuthorityOrderScorecard.md](AuthorityOrderScorecard.md)

**No fixes implemented.**
