# Render Memory Stability Notes

**Date:** 2026-06-01  
**Context:** Render OOM / exit status **134** during Companion Chat load tests.

---

## Likely causes (ranked)

| # | Cause | Evidence in repo |
|---|--------|------------------|
| 1 | **Large in-memory prompt payloads** | `buildRetrievalEvidencePack` + full `runtimeContext.memory` serialized into OpenAI user JSON each turn |
| 2 | **Full `buddy-sessions.jsonl` read** | `getRecentSessions` used to read entire file per request (mitigated: tail-read last 512KB) |
| 3 | **Large JSON stores loaded synchronously** | `buddy-memory.json`, `active-conversation-state.json`, learning profiles, relationship stores |
| 4 | **Heavy module graph on boot** | `masterBuddyRuntime` + hundreds of runtime engines imported even when bypassed |
| 5 | **Debug objects in responses** | `coreDebug` + full `validation` on every reply when `NODE_ENV !== production` |
| 6 | **Concurrent chat load** | Multiple OpenAI calls + sync file writes per turn under memory pressure |

Status **134** on Linux often indicates the process was killed (**SIGABRT** / OOM killer), which matches connection drops (“I had trouble connecting”) when the Node process restarts or requests fail mid-flight.

---

## Recommendations

### A. Render plan (immediate ops)

- Upgrade to a plan with **≥ 1 GB RAM** if currently on the smallest web service.
- Enable **health check** on `/` or a lightweight `/health` route.
- Set **max instances = 1** during debugging to avoid duplicate memory use.

### B. Reduce memory loading (code — partial done)

- [x] Tail-read `buddy-sessions.jsonl` (last 512KB) in `getRecentSessions`.
- [x] Cap conversation history in evidence pack (5 turns, truncated assistant text).
- [ ] Cap `runtimeContext.memory` fields sent to OpenAI (future: slim memory slice).
- [ ] Lazy-require `masterBuddyRuntime` only when `BUDDY_OPENAI_FIRST=0`.

### C. Do not serve `/data` publicly

- Confirm no `express.static('data')` on production (removed in beta hardening).
- Reports and JSONL should not be web-accessible.

### D. Lightweight logging

- Log one line per chat: `openaiCalled`, `route`, `ms`, `userId` hash — not full evidence pack.
- Avoid writing multi-KB objects to stdout on Render.

### E. Restart policy

- After deploy, **manual restart** once env vars are set.
- If OOM persists, add Render **auto-redeploy** on memory alert or cron restart off-peak.

### F. Required Render environment variables

```bash
OPENAI_API_KEY=<secret>
BUDDY_RUNTIME=legacy
# BUDDY_OPENAI_FIRST unset (default core path) OR:
BUDDY_OPENAI_FIRST=1
BUDDY_TEMPLATE_PROSE=0
BUDDY_DISABLE_STUDY_FALLBACK=1
NODE_ENV=production
BUDDY_CORE_DEBUG=0
PORT=3000
OPENAI_MODEL=gpt-4.1-mini
```

For local validation with debug:

```bash
BUDDY_DEBUG=1
NODE_ENV=development
```

---

## Connection errors vs wrong answers

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| “I had trouble connecting just now” | Real API/process failure | Now only from `buildConnectionErrorReply` when OpenAI call fails |
| “You've been studying general…” | `personalizedFallback` / enrichment | Bypassed on core path; study speaker disabled with `BUDDY_TEMPLATE_PROSE=0` |
| Sabbath history on HOW question | Topic bleed + history in evidence | `routingHintsOnly` + `practicalSabbathHow` + `answerGuidance` |
| Witness triplet blocks | Template engines / OpenAI paste | Regen + strip + composer rules |

---

## Validation after deploy

```bash
OPENAI_API_KEY=... BUDDY_RUNTIME=legacy node scripts/postOpenAiCoreRestorationSmokeTest.js
```

Watch Render metrics during the run; memory should stay flat after tail-read fix.
