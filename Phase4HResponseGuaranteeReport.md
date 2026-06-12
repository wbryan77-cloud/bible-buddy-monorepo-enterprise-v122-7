# Phase 4H Response Guarantee Report

Generated: 2026-06-11

## Production path

`POST /buddy/chat` → `withBuddyChatGuarantee()` → `runBuddy()` → firewall on payload

## Verified behaviors

| Scenario | Result |
|----------|--------|
| Forced exception (×25) | Safe JSON returned; no `e.message` to user |
| OpenAI disabled + strict doctrine | Local authority answer (Phase 4H doctrine parity) |
| Strict continuation | Witness inventory; no OpenAI |
| Memory pressure | `handleMemoryPressure()` at guarantee entry + health endpoint |

## User must not see (enforced)

- `e.message` — route catch uses generic text ✅
- `connection_error` — firewall strips ✅
- `AI service unavailable` / trouble reaching — firewall strips ✅
- `safe corpus fallback` — firewall strips ✅
- Stack traces — not in outbound JSON ✅

## Stream route

`/buddy/stream` uses `withBuddyChatGuarantee` + firewall on `done` payload ✅

## Gaps on current Render

Render build **without** `responseGuarantee` still returns `core_connection_error` and “trouble reaching the AI service” — confirms deploy skew, not local regression.
