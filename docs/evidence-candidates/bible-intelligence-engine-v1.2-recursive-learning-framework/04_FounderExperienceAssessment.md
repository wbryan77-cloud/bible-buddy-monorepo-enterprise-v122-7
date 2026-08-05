# 04 — Founder Experience Assessment

Loop required: Observe → Measure → Explain → Recommend → Approve → Deploy → Replay → Measure Again → Learn

| Stage | Complete? | Owner | File | Smallest fix if incomplete |
|---|---|---|---|---|
| Observe | Partial | `experienceTraceAdapter` | `services/experienceTraceAdapter.js`, `routes/buddy.js` | Mirror capture on `/buddy/stream` **after** LEARN fix |
| Measure | Partial | grounding + `costLedger` | `services/claimGroundingEvaluator.js`, `services/costLedger.js` | Wire registry dispatcher later; use real token usage when available |
| Explain | Shadow | discovery/hypothesis/relationship/prediction | `services/discoveryEngine.js` et al. | Keep shadow; trigger from Admin brief only |
| Recommend | Shadow / broken LEARN | `recommendationIntelligence` | `services/recommendationIntelligence.js` | Align rejection fingerprint with `fingerprintPackage` |
| Approve | Write ok / read stale | `adminDecisionQueue` + learning store | `services/learningRecordStore.js` | **`listLearningRecords` must merge index/transitions** |
| Deploy | Human (correct) | engineering + Render | git / health | Do not automate deploy |
| Replay | Offline partial | scripts + retrieval shadow | `scripts/runBieV11FounderReplayValidation.js` | Keep offline until outcome owner exists |
| Measure Again | **Incomplete** | none | — | Smallest later: `recordMeasuredOutcome(learningRecordId, metrics)` writing `measuredOutcome` + event |
| Learn | **Blocked** | `learningRecordStore` / ranking | `services/learningRecordStore.js:161-242`, `recommendationIntelligence.js:51-62` | Materialize status + one fingerprint |

## Do not redesign

No new FEL runtime. Extend existing owners only.

## Production proof already held

- Health `99cb4c3` (docs tip) after v1.1A runtime `d8b584a`
- Unauthenticated FEL mutations → 401
- Sabbath Direct-answer stable under shadow intelligence
