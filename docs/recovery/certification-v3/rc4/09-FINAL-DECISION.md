# FINAL DECISION — Release Candidate v4.0

# NO_GO

Date: 2026-07-24  
Production commit: `fb2cb52`  
Production Truth Corpus: **32/32 PASS**  
Original P0 H1/H2: **CLOSED on production**

## Why not GO

RC Phase 5/6/UI gates remain incomplete. Production companion P0 failures are fixed, but the Release Candidate specification still requires evidence that does not yet exist for:

| Priority | Blocker | Root cause | Component | Repair | Effort |
|---|---|---|---|---|---|
| P1 | Universal claim-category verifier | Spot V1/V2 only | quality / authority | Add classifier gate | M |
| P1 | Full IOG/ICOJ utilization matrix | Inventory ≠ used-in-answer proof | evidence retrieval | Utilization matrix on prod answers | M |
| P1 | Dual conversation/continuation lanes | Ordered branches not consolidated | orchestrator | Single continuation owner | M |
| P1 | Forced OpenAI outage drill | No safe prod injection | OpenAI / guarantee | Staging failover fixture | S–M |
| P2 | UI parity automation | API-only certification | web clients | UI replay or Founder sign-off checklist | S–M |
| P2 | Memory forget wording variance | OpenAI free text | memory lane | Deterministic memory reply | S |

## What is proven (do not re-open without new evidence)

- H1 opener duplication repaired and production-verified
- H2 dietary correction restatement production-verified
- Production/local mismatch for those repairs closed via deploy `fb2cb52`
- Expanded Founder Truth Corpus 32/32 on production
- Original CRITICAL companion incident CLOSED with evidence

## Path to GO

Close R1–R5 with reproducible production evidence, re-run Truth Corpus + independent audit challenge, then re-decide.
