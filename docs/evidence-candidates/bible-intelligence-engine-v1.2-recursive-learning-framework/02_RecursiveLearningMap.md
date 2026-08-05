# 02 — Recursive Learning Map

Rule: every production signal that should improve the product must enter **one** governed loop owned by BIE (not a parallel learning system).

## Loop stages (current truth)

| Stage | Owner | Storage | Lifecycle | Governance | Approval | Replay | Retirement | Status |
|---|---|---|---|---|---|---|---|---|
| OBSERVE | `experienceTraceAdapter` → `experienceEventLedger` | JSONL + durable project | append-only | privacy scopes | n/a | reconstruct from events | retention policy | **ACTIVE** `/buddy/chat` only |
| MEASURE | grounding + `costLedger` (+ registry unused) | eval/cost docs | async post-response | internal | n/a | calibration seed | budget policy | **PARTIAL** |
| EXPLAIN | discovery / hypothesis / relationships / prediction | durable docs | shadow pass | Admin status | Admin | offline scripts | supersededBy | **SHADOW / manual** |
| RECOMMEND | `recommendationIntelligence` | learning records + rec docs | ranked packages | requiredApproval | Admin queue | n/a | suppress rejected | **SHADOW; LEARN broken** |
| APPROVE | `adminDecisionQueue` + `transitionLearningRecord` | index + transitions | status overlay | role-bound | Admin | audit trail | DEFERRED/REJECTED | **ACTIVE write; stale read** |
| DEPLOY | human engineering (no BIE deploy owner) | git/Render | commit/deploy | human | human | health SHA | revert | **OUTSIDE engine (correct)** |
| REPLAY | offline scripts + retrieval shadow compare | local/test | validation | nonmutating | n/a | scripts | n/a | **PARTIAL offline** |
| MEASURE AGAIN | **missing owner** | `measuredOutcome` field unused | — | — | — | — | — | **GAP** |
| LEARN | intended `learningRecordStore` + ranking | JSONL authoritative for list | — | — | — | — | RETIRED status exists | **BLOCKED** |

## Event → loop coverage

| Signal | Enters BIE loop? | Owner / note |
|---|---|---|
| Founder corrections / accept / reject | Yes | `founderExperienceFeedback` |
| Admin approve / reject / defer | Write yes / read stale | `transitionLearningRecord` |
| `/buddy/chat` outcomes + traces | Yes | buddy instrumentation |
| `/buddy/stream` | **No** | no capture block |
| Alpha/Beta feedback | **No** | separate stores |
| `/api/learning/signals` | **No** | own JSONL |
| Benchmarks / regressions / deployments | Declared types; **no producers** | ledger taxonomy only |
| Memory retrieval / misses | Partial via chat spans | not first-class learning records |
| Study Chain / Lesson Packet activation | Partial lineage refs | not maturity-tracked |
| Cost / latency | Partial estimates | `costLedger` placeholders |
| Model / release identity | Partial `releaseCommit` | not closed to outcome |

## Single rule for V1.2

Do not add new signal types until **APPROVE → (human deploy) → MEASURE AGAIN → LEARN** materializes for existing Founder marks.
