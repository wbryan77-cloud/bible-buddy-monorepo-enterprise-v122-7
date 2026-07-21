# Support Relationship Engine Report

**Date:** 2026-06-08  
**Phase:** 2B — Support Relationship Engine  
**Status:** **COMPLETE**

---

## Purpose

Move the Bible Authority Engine from **claim → verse citation** to **claim → support verification**.

A claim may cite a verse without that verse actually supporting the assertion. Phase 2B introduces a dedicated engine that evaluates the support relationship between each claim and its cited scriptures before the validator and approval gate run.

---

## Component

| Item | Path |
|------|------|
| Support Relationship Engine | `services/supportRelationshipEngine.js` |
| Validator integration | `services/claimToScriptureValidator.js` |
| Traceability matrix v2 | `services/claimTraceabilityMatrix.js` |
| Doctrine trace wiring | `services/doctrineAnswerTrace.js` |
| Regression runner | `scripts/phase2bSupportRelationshipRegression.js` |

---

## API

### `analyzeSupportRelationship({ claim, supportingScriptures, retrievedEvidence })`

**Input**

| Field | Type | Description |
|-------|------|-------------|
| `claim` | string | Doctrine claim text |
| `supportingScriptures` | string[] | Refs mapped to the claim |
| `retrievedEvidence` | object | Evidence pack from retrieval for this turn |

**Output**

```json
{
  "supportClass": "A | B | C | D",
  "supportReason": "human-readable explanation",
  "confidence": "high | medium | low",
  "supportRelationship": "direct | binding_rule | chain | contradicted | unverified | null",
  "validatorDecision": "Approved | Rejected",
  "issues": [],
  "affirmationId": null,
  "citationDenialId": null
}
```

### Support classes

| Class | Meaning |
|-------|---------|
| **A** | Directly supported — cited verse explicitly affirms the claim under frozen citation-support rules |
| **B** | Indirectly supported — citation appears in approved teaching order (line upon line) |
| **C** | Insufficient support — related topic cited but no verified affirmation, or citation not in evidence graph |
| **D** | Contradicted — claim violates frozen binding rules or citation denial patterns |

---

## Support analysis dimensions

For every claim the engine evaluates:

1. **Explicit affirmation** — Does the cited verse affirm the claim under frozen affirmation rules?
2. **Related topic only** — Does the citation mention a related topic without verified support?
3. **Contradiction** — Does the claim violate citation denial or forbidden patterns?
4. **Over-strong claim** — Is the claim stronger than the verse allows?

Results are surfaced as `supportReason` on every claim row.

---

## Reason generation

`buildSupportReason()` maps validator outcomes to plain-language explanations:

| Trigger | Example reason |
|---------|----------------|
| `direct` affirmation | "The cited verse explicitly affirms the claim under frozen citation-support rules." |
| `binding_rule` | "The claim aligns with a frozen binding rule on the retrieved evidence card." |
| `chain` | "The citation appears in the approved teaching order; support is indirect (line upon line)." |
| `citation_without_verified_support` | "The citation mentions a related topic but lacks verified affirmation under frozen binding rules." |
| `unsupported_citation` | "The citation is not in the approved evidence graph for this turn." |
| `ungrounded_no_evidence_pack` | "Scripture was cited but no approved evidence pack is available." |
| Contradiction denials | Topic-specific frozen denial messages (Acts 10 pork, kingdom in heaven, etc.) |

---

## Pipeline position

```
OpenAI → reply + scripture[]
  → claimExtractor
  → doctrineConclusionBuilder
  → supportRelationshipEngine (per claim)   ← NEW
  → claimToScriptureValidator
  → approval gate
  → doctrineAnswerTrace + matrix v2
```

The engine reuses `classifyDoctrineClaim` from the existing validator via lazy require to avoid circular dependencies. No new doctrine, evidence cards, or validator rules were added.

---

## Batch API

`analyzeTurnSupportRelationships({ claims, retrievedEvidence })` processes all claims for a single turn and returns an array of support analysis results for matrix generation.

---

## Constraints honored

- No doctrine changes
- No evidence card expansion
- No IOG ingestion
- No new validator rule files
- No automatic push/deploy
