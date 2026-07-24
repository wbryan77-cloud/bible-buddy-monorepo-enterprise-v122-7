# 05 — OpenAI Resiliency Certification (CLOSED)

**Gate:** 6 — OpenAI Resiliency  
**Final decision:** **OPENAI_RESILIENCY_PASS**  
**Closure verification date:** 2026-07-24  
**Exact deployed SHA:** `6c8a843f608e03e3e7f055556e86f6cba581c0e8`  
**Short commit:** `6c8a843`  
**Production `/health.releaseCommit`:** `6c8a843`  
**Health artifact:** `05-OpenAIResiliency-health-6c8a843.json`

## Check 1 — Commit and CI

| Field | Value |
|---|---|
| Full SHA | `6c8a843f608e03e3e7f055556e86f6cba581c0e8` |
| On `origin/main` | YES |
| GitHub Actions run ID | `30069760072` |
| URL | https://github.com/wbryan77-cloud/bible-buddy-monorepo-enterprise-v122-7/actions/runs/30069760072 |
| Conclusion | **success** |

## Authoritative production path (proven)

```
POST /buddy/chat
  → routes/buddy.js
  → withBuddyChatGuarantee (responseGuarantee.js)
  → runBuddy (buddyBrain.js)
  → runOpenAiFirstCompanionRuntime
  → composeReasonFirstReply / callOpenAI (reasonFirstComposer.js)
  → openaiClient.js (OpenAI SDK)
```

Drill harness: `scripts/runOpenAiResiliencyDrill.js`  
- Installs a restore-safe stub for `openaiClient` **before** loading the compose chain.  
- Invokes `withBuddyChatGuarantee(() => runBuddy(...))` — same stack as `/buddy/chat`.  
- Restores env + clears stub cache in `finally`.  
- **Does not** leave `BIBLEBUDDY_DISABLE_OPENAI` or timeout overrides enabled.

## Repair in this gate

| Field | Value |
|---|---|
| Symptom | Empty OpenAI content returned `ok:true` and could ship blank / `[object Object]` |
| First contract | `reasonFirstComposer.callOpenAI` treating empty `choices[0].message.content` as success |
| Fix | Empty content → `{ ok:false, error:'openai_empty_response' }` → companion connection fallback |
| Commit | `6c8a843` |

## Drill results

Command:

```bash
node scripts/runOpenAiResiliencyDrill.js
```

Artifact: `05-OpenAIResiliency-drill-local.txt` — **18/18 PASS**

| ID | Simulation | Result |
|---|---|---|
| P1 | Module import path (composer/client/runtime) | PASS |
| P2 | Authority chain documents OpenAI-first | PASS |
| O1–O4 | Firewall / connection helpers leak-safe | PASS |
| R1 | `BIBLEBUDDY_DISABLE_OPENAI=1` (0 SDK calls) | PASS |
| R2 | 429 rate limit stub | PASS — safe companion fallback |
| R3 | 503 stub | PASS |
| R4 | Hung create + `OPENAI_TIMEOUT_MS=40` | PASS |
| R5 | Empty response | PASS — now `core_connection_error` safe text |
| R6 | Invalid JSON content | PASS — no crash / no doctrine hallucination |
| R7 | 401 auth failure | PASS — no API key leak |
| R8 | No retry storm | PASS — `openai_create_calls=1` |
| R9 | Memory pin capture still works | PASS |
| R10 | Production claim verifier module (not universalClaimVerifier) | PASS |
| R11 | Recovery after faults (Genesis 1:1) | PASS |
| P3 | Env restored / no fault left | PASS |

## Production verification

| Check | Result |
|---|---|
| `/health.releaseCommit` | `6c8a843` |
| Prod smoke John 3:16 | PASS (citation present) |
| Fault injection on live Render | **Not performed** (no public fault endpoint; local stub drill uses same modules) |

## Assertions vs architecture facts

| Assertion | Evidence |
|---|---|
| Retries bounded | Compose is single-shot under `coreRestoration` (`attemptCap=1`); R8 calls=1 |
| No retry storm | R8 |
| No fabricated Scripture fallback on transport failure | R2–R5, R7 |
| Safe user-facing error | Companion fallback line; no stack/key |
| Previous conversation / next request recovers | R11 bible_wide Genesis 1:1 |
| Logs do not expose secrets in user text | LEAK_RE checks |
| Production health stable | health artifact + smoke |

## Residual risks (non-blocking)

| Risk | Severity | Notes |
|---|---|---|
| Malformed non-JSON text can still surface as raw reply (R6) | P2 | No crash / no doctrine hallucination; empty path fixed |
| App has no transport exponential backoff | informational | Bounded by zero transport retries — no storm |
| `buildConnectionErrorReply` text differs from final firewall companion line | informational | Firewall rewrites before delivery |
| Live production fault injection not executed | informational | By design — no public fault endpoint |

## Final decision

**OPENAI_RESILIENCY_PASS**

Prior gates remain valid. Scripture composition touched → empty-response fix is defensive only; production smoke John 3:16 PASS on `6c8a843`.

## Next gate

Gate 7 — UI / API / Production Parity.
