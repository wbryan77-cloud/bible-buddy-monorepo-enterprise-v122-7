# 07 — Regression Results (Phase 6X Option D)

**Scope:** Local unit / pack probes completed per objective. Live production replay pending deploy of tip containing Obj1–9.

## Local (this branch)

| Suite | Result |
|---|---|
| `tests/phase6xObj1SemanticUnderstanding.test.js` | PASS |
| `tests/phase6xObj2ConversationIntelligence.test.js` | PASS |
| `tests/phase6xObj3EvidenceBroker.test.js` | PASS |
| `tests/phase6xObj4to6.test.js` | PASS |
| Gate3 multi-part helper cases | PASS |
| Reasoning plan: capital of France → companion (not clarification) | PASS |

## Live production (pre-deploy baseline)

| Suite | Tip | Result |
|---|---|---|
| GK capital / photosynthesis | pre-Obj6 | **FAIL** clarifier (evidence for Obj6) |
| GK president / WWII year | pre-Obj6 | PASS |
| John 1:1 | pre-Obj6 | PASS |
| Prior Gates 1–10 | certified tip | PASS (do not reopen without new FAIL) |

## Post-deploy required

```bash
export BUDDY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com
node scripts/runFounderTruthCorpus.js
node scripts/runFounderTruthCorpusV2.js
node scripts/runConversationGovernanceCertification.js
node scripts/runScriptureReasoningCertification.js
# plus Memory / Claim / UI / Resiliency as in Gate 9
```

Do not certify Option D Alpha until post-deploy suites are green.
