# Render Stress After BAE Report

**Date:** 2026-06-07  
**Environment:** Local offline regression + static Render config audit  
**Live Render stress test:** Not run (no deployed BAE build with API key)

---

## Question

Were recent failures caused by memory exhaustion, OpenAI retries, regen loops, oversized packs, or logging?

---

## Findings

### Memory

| Metric | Offline 8-test run | Assessment |
|--------|-------------------|------------|
| Start RSS | 68 MB | Normal |
| End RSS | 147 MB | Normal |
| Delta | +79 MB | Acceptable for 8 turns without API |
| Render plan | Standard 2 GB | **Headroom sufficient** |

BAE adds ~30–80 KB per request (evidence graph + claim results) — negligible vs 2 GB.

### OpenAI retries

| Control | Status |
|---------|--------|
| Composer `maxAttempts` (core) | 1 |
| Runtime regen | Max 1 (`regenerated` flag) |
| Total API calls per turn | ≤ 2 |
| Attempt cap flag | `openai_attempt_cap_exceeded` if >2 |

**Verdict:** Regeneration loops are capped. Not a multi-retry storm.

### Evidence pack size

| Topic | Approx pack size |
|-------|------------------|
| Third heaven | ~14–15 KB |
| Kingdom | ~11–12 KB |
| Thin (holy) | ~3.5 KB |

`evidencePackSlimmer` active in core path. No evidence-driven OOM pattern detected offline.

### Logging

| Env var | render.yaml | Impact |
|---------|-------------|--------|
| `BUDDY_DEBUG` | `0` | ✅ Off |
| `BUDDY_LIVE_TRACE` | `0` | ✅ Off |
| `BAE_TRACE` | not set → **off** | ✅ Fixed (was default on) |
| `BUDDY_REQUEST_MEMORY_LOG` | not set | Off unless `=1` |

**Verdict:** Production logging profile is lean. BAE doctrine traces now opt-in only.

### Route restarts

No restart loop in offline path. Crisis/template/study-loop speakers disabled on core path.

---

## Stability checklist

| Check | Pass |
|-------|:----:|
| Max one regeneration | ✅ |
| Debug off (Render) | ✅ |
| Live trace off (Render) | ✅ |
| BAE trace off by default | ✅ |
| Memory stable (offline) | ✅ |
| No regen loop | ✅ |
| No template responder on doctrine path | ✅ |

---

## Risks under live load (unverified)

| Risk | Mitigation |
|------|------------|
| 2 API calls × doctrine latency | Acceptable on Standard plan |
| Claim validation CPU | +15–40 ms — negligible |
| jsonl trace growth | Opt-in `BAE_TRACE=1` only |
| Concurrent users on MEMORY persistence | Existing Render concern — separate from BAE |

---

## Recommendation

Deploy BAE to staging with:

```bash
BUDDY_DEBUG=0
BUDDY_LIVE_TRACE=0
BAE_TRACE=0
OPENAI_API_KEY=<secret>
```

Run `baePhase1aRegression.js` against staging before production push.

**Live Render stress:** Pending deployment + API key.
