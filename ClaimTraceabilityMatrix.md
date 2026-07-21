# Claim Traceability Matrix

**Date:** 2026-06-07  
**Phase:** 1B — Complete claim traceability  
**Live OpenAI matrix:** Pending API key  
**Offline citation fixtures:** 9/9 pass

---

## Matrix schema (per claim)

| Field | Description |
|-------|-------------|
| `claimId` | Stable claim identifier from compose JSON |
| `claim` | Atomic doctrinal assertion |
| `supportingScriptures` | KJV refs model asserts support this claim |
| `supportClass` | A / B / C / D |
| `supportRelationship` | direct / chain / binding_rule / unverified / contradicted / none |
| `derivedFrom` | evidence_card / catalog / inference |
| `validatorDecision` | Approved / Rejected |
| `citationDenialId` | Set when citation ≠ support |

---

## Example rows (offline fixtures — validator ground truth)

### Rejected — citation does not support claim

| claimId | claim | supportingScriptures | supportClass | validatorDecision |
|---------|-------|---------------------|:------------:|:-----------------:|
| c1 | Believers go to the third heaven when they die. | 2 Corinthians 12:2 | **D** | Rejected |
| c1 | The kingdom is in heaven where believers go after death. | Matthew 6:9-10 | **D** | Rejected |
| c1 | Acts 10 makes all foods clean including pork. | Acts 10:14 | **D** | Rejected |
| c1 | 2 Corinthians 12:2 proves believers eternal home is the third heaven. | 2 Corinthians 12:2 | **D** | Rejected |
| c1 | Yes, pork is clean for believers. | Leviticus 11 | **D** | Rejected |
| c1 | Believers have ascended to heaven except Christ. | John 3:13 | **D** | Rejected |
| c1 | Believers will join Jesus in heaven permanently away from earth. | John 13:33 | **D** | Rejected |

### Approved — citation supports claim

| claimId | claim | supportingScriptures | supportClass | validatorDecision |
|---------|-------|---------------------|:------------:|:-----------------:|
| c1 | Paul names a third heaven in 2 Corinthians 12:2. | 2 Corinthians 12:2 | **A** | Approved |

---

## Part C — Citation ≠ support elimination

**Before Phase 1B:** Approved ref in claim → automatic class B (false pass).

**After Phase 1B:** `claimSupportVerifier.js` judges claim + verse relationship:

| Check | Result |
|-------|--------|
| Ref-specific denial rules (from frozen bindingRules) | Class **D** + `citation_does_not_support_claim` |
| Ref-specific affirmation rules | Class **A** direct support |
| Binding rule keyword match | Class **A** |
| Catalog teaching chain | Class **B** |
| Ref cited, no verified support | Class **C** `citation_without_verified_support` |

**Removed:** auto-approve B when ref ∈ approved set without support proof.

---

## Doctrine topic traceability (retrieval + offline validator)

| Topic | Evidence retrieved | Validator blocks drift | Citation≠support fixed |
|-------|:------------------:|:----------------------:|:----------------------:|
| Pork / Acts 10 | ✅ dietaryLaw | ✅ | ✅ |
| Third heaven | ✅ heavens | ✅ | ✅ |
| Kingdom | ✅ kingdom | ✅ | ✅ |
| Death state | ✅ deathState | ✅ | ✅ |
| Resurrection | ✅ deathState | ✅ | ✅ |
| Sabbath | ✅ sabbath | ✅ | ✅ |
| Holy days | ✅ feasts | ✅ | ✅ |
| Logos | ✅ messiahLogos | ✅ | ⚠️ chain gap |
| Holy | ❌ no card | ✅ C | N/A |
| No ascended | ✅ heavens | ✅ | ✅ |
| Cannot come | ✅ kingdom | ✅ | ✅ |

---

## Runtime integration

- `validateClaimToScripture` → populates `claimResults[]` with `validatorDecision`
- `buildClaimTraceabilityMatrix` → per-turn matrix in `DoctrineAnswerTrace`
- Live matrix captured in `docs/regression-trace/bae-phase1b-results.json` per test

**Generate live matrix:**

```bash
export OPENAI_API_KEY=sk-...
node scripts/baePhase1bValidation.js
```
