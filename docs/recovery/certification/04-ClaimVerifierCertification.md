# 04 — Claim Verifier Certification (CLOSED)

**Gate:** 5 — Universal Claim Verifier  
**Final decision:** **CLAIM_VERIFIER_PASS**  
**Closure verification date:** 2026-07-24  
**Exact deployed SHA:** `c2f4ff74595091412a3d45097827763c2deddd56`  
**Short commit:** `c2f4ff7`  
**Production `/health.releaseCommit`:** `c2f4ff7`  
**Deployment verification timestamp:** see `04-ClaimVerifier-health-c2f4ff7.json`

## Authoritative production verifier (evidence-backed)

| Field | Value |
|---|---|
| Module | `services/claimToScriptureValidator.js` |
| Functions | `validateClaimToScripture`, `applyClaimDegradation`, `matchesForbidden` |
| Support stack | `claimSupportVerifier`, `supportRelationshipEngine`, `approvedSupportGraph` |
| Wired in | `openAiFirstCompanionRuntime` `runGuards()` after `composeReasonFirstReply` (regen ≤1, then degrade) |
| Also compose-time | `reasonFirstComposer` when `coreRestoration` |

**Not production-wired:** `services/universalClaimVerifier.js` (`auditBiblicalReply`) — offline / aspirational only. Older `docs/recovery/certification-v6/04-ClaimVerifierCertification.md` claiming finalize wiring is **incorrect for current code**.

## Check 1 — Commit and CI

| Field | Value |
|---|---|
| Full SHA | `c2f4ff74595091412a3d45097827763c2deddd56` |
| On `origin/main` | YES |
| GitHub Actions run ID | `30069313040` |
| URL | https://github.com/wbryan77-cloud/bible-buddy-monorepo-enterprise-v122-7/actions/runs/30069313040 |
| Conclusion | **success** |

Repair commit purpose: scope forbidden-claim `unless` checks **per sentence** so a safe “know not” in one sentence cannot mask an unsupported claim in another.

## Check 2 — Offline fixtures (same module as production)

```bash
node scripts/baeClaimValidatorFixtures.js
```

Artifact: `04-ClaimVerifier-offline-fixtures-c2f4ff7.txt` — **9/9 PASS**

## Check 3 — Gate 5 certification matrix

```bash
BUDDY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com \
  node scripts/runClaimVerifierCertification.js
```

Artifact: `04-ClaimVerifier-production-rerun-c2f4ff7.txt` — **18/18 PASS**

### Offline adversarial (11)

| Case | Outcome |
|---|---|
| Unsupported heaven-at-death certainty | FAIL validation (class D) |
| Citation mismatch (2 Cor 12:2 → destination) | FAIL (class D) |
| Acts 10 pork clean | FAIL (class D) |
| Sunday replaced Sabbath | FAIL (class D) |
| Tradition as doctrine | FAIL (class C) |
| One bad sentence inside correct reply | Detect + degrade; good sentence preserved |
| Correct answer byte-stable under degradation | PASS unchanged |
| Abstention denial phrase | Applies `Scripture does not state that directly.` |
| No infinite degrade loop | Idempotent second pass |
| False ascension certainty | FAIL (class D) |
| Silence overclaim / Sunday Sabbath from Matt 28 | FAIL validation |

### Production `/buddy/chat` (7)

| Case | Route | Outcome |
|---|---|---|
| Preserve John 3:16 | `bible_wide_reasoning` | Citations intact; not degraded |
| Acts 10 not pork clean | `bible_wide_reasoning` | Direct No |
| No immediate heaven certainty | `reason_first_openai` | Sleep / resurrection framing |
| Sunday does not replace Sabbath | `doctrine_final_authority` | Seventh-day witness |
| Prayer tone preserved | `phase5k_prayer_companion` | Empathy/prayer retained |
| Bypass lane documented | `bible_wide_reasoning` | `claimValidation=null` (expected residual) |
| Third heaven no destination overclaim | `bible_wide_reasoning` | Quotes 2 Cor 12:2 without destination claim |

## Check 4 — Gate 4 regression after verifier patch

```bash
BUDDY_URL=... node scripts/runScriptureReasoningCertification.js
```

Artifact: `04-Gate4-regression-on-c2f4ff7.txt` — **29/29 PASS**

## Modes proven

| Mode | Evidence |
|---|---|
| Detection | Offline class C/D failures |
| Correction when safe | Regen path in runtime (≤1) + degradation strip |
| Abstention when insufficient | Denial phrase |
| Preserve correct structure | Byte-stable good reply; John 3:16 prod |
| Preserve citations | John 3:16 / 2 Cor 12:2 prod |
| Preserve conversation intent / prayer tone | Prayer companion prod |
| No infinite revision loop | Double degrade offline |
| No new unsupported claims from degrade | Mixed-sentence case keeps Ecclesiastes only |

## Residual risks (non-blocking)

| Risk | Severity | Notes |
|---|---|---|
| Orchestrator early lanes (`bible_wide`, `doctrine_final_authority`, resurrection source-grounded, prayer) bypass `runGuards` claimValidation | P2 | Documented; those lanes use corpus / source-grounded contracts. Prod trap cases still answered correctly. |
| Verifier throw has no dedicated try/catch around `runGuards` | P2 / informational | `validateClaimToScripture` itself is defensive; nested throw would fail the turn (Gate 6 resiliency owns broader failure drills) |
| `universalClaimVerifier` unused in production | informational | Do not certify it as live enforcement |
| Regex/graph incomplete for novel unsupported claims | P2 | Frozen forbidden rules + support graph; expand only on reproducible misses |

## First blocker repaired in this gate

| Field | Value |
|---|---|
| Case | `OFF_one_bad_sentence_in_good_reply` |
| Symptom | Validation `passed=true` when heaven-at-death followed Ecclesiastes “know not” |
| Root cause | `matchesForbidden` applied `unless: /\bnot\b/` to the **entire** multi-sentence reply |
| Fix | Sentence-scoped matching in `matchesForbidden` |
| Regression | `tests/gate5ClaimOrphanSentenceScope.test.js` |

## Final decision

**CLAIM_VERIFIER_PASS**

Prior gates remain valid (Gate 4 re-verified 29/29 on `c2f4ff7`).

## Next gate

Gate 6 — OpenAI Resiliency Certification.
