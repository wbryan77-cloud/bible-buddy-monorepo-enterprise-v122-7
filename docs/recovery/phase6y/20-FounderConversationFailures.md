# 20 — Founder Conversation Failures (Phase 6Y)

## F-01 Historical causation hijacked by doctrine final authority — FIXED

| Field | Value |
|---|---|
| **Conversation** | “Who changed the Sabbath to Sunday historically?” |
| **Expected** | Historical Context answering WHO/how practice changed; distinguish from Explicit Scripture |
| **Actual (pre-fix)** | `doctrine_final_authority` → “seventh day is the Sabbath…” only |
| **Subsystem** | `companionDoctrineRouter` + `strictDoctrineGate` / `doctrineFinalAuthorityEngine` |
| **Root cause** | Sabbath strict topic claimed historical WHO asks; OpenAI blocked |
| **Behavior family** | BF-14 / historical classification + retrieval |
| **Repair** | `c12eee2` — `historicalCausationAsk` forces companion lane; skip final authority / OpenAI block |
| **Regression** | History probes 4/4 PASS; Sabbath doctrine control still PASS; FTC 32/32; Gate3 10/10 |

## F-02 Heavy multipart → response_guarantee ask-again under suite load — MITIGATED

| Field | Value |
|---|---|
| **Conversation** | Gate4 `J_multipart_three` / Gate3 G8 under heavy parallel suite load |
| **Expected** | Answer all parts |
| **Actual** | `response_guarantee_fallback` “ask your question again” (timeout) |
| **Subsystem** | `responseGuarantee` (55s default) |
| **Root cause** | Suite load latency > 55s; isolated runs ~22s PASS |
| **Repair** | `741084f` — default timeout 75s |
| **Regression** | Isolated J_multipart_three PASS on `741084f` |

## F-03 Memory M4_10 honest miss in suite — INTERMITTENT / ISOLATED PASS

| Field | Value |
|---|---|
| **Conversation** | Explicit remember favorite verse + 10-turn recall in Memory suite |
| **Expected** | Recall Psalm 23 |
| **Actual (suite once)** | Honest miss |
| **Isolated reprobe** | PASS |
| **Subsystem** | `explicitRememberPin` / suite concurrency |
| **Repair** | None (no stable FAIL) |
| **Rank** | P2 |

## Hidden failures

None withheld. All observed production failures listed above.
