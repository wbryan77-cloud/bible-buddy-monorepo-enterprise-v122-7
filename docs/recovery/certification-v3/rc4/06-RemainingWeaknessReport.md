# Updated Remaining Weakness Report — RC v4.0

## Closed this RC (production-proven)

1. H1 opener duplication
2. H2 dietary meta-correction non-answer
3. Production/local mismatch for those repairs
4. Major Founder corpus gaps (expanded to 32 cases)

## Remaining blockers / residuals

| ID | Priority | Blocker | Root cause | Component | Repair recommendation | Effort |
|---|---|---|---|---|---|---|
| R1 | P1 | No universal claim-category verifier on every doctrine sentence | Spot cases V1/V2 only | authority / quality gate | Add response claim classifier asserting Explicit/Comparison/Historical/OL/Inference/Silent | M |
| R2 | P1 | IOG/ICOJ utilization matrix not fully certified | Inventory ≠ per-answer utilization proof | approved evidence / retrieval | Build indexed→used matrix on production answers | M |
| R3 | P1 | Dual conversation_owner / phase5O lanes not consolidated | Ordered intent branches remain | `bibleCompanionOrchestrator.js` | Consolidate behind one continuation owner after regression lock | M |
| R4 | P1 | Forced OpenAI outage path not injected in corpus | Cannot safely crash provider in prod | OpenAI runtime / guarantee | Add deterministic failover fixture in non-prod + one staging drill | S–M |
| R5 | P2 | Browser/Desktop/Mobile UI parity not automated | API-only certification | `/`, `/alpha`, `/beta`, `/chat.html` | Replay Truth Corpus via UI automation or manual Founder checklist sign-off | S–M |
| R6 | P2 | Memory forget answer wording inconsistent local vs prod | OpenAI free-text variance on S1 | memory / OpenAI lane | Deterministic memory-governance reply owner | S |
| R7 | P2 | Doctrine polish mutation layers still present | Multiple polish functions remain | formatter / contract / polishFinalReply | Single polish owner (no redesign beyond collapse) | M |

## Closed governance note

Original CRITICAL companion incident marked CLOSED with production 32/32 evidence (`services/coreCompanionIncident.js`). Residuals above still drive NO_GO under RC Phase 5/6/UI gates.
