# Phase 4J — Scaling Risk Report

Generated: 2026-06-12  
Method: Analytical model calibrated to Phase 4H local stress (1650 turns, peak RSS 288 MB **with** caps) and production code inspection (`origin/main`).

Assumptions:

- Render **standard** plan ≈ **512 MB RAM** (`render.yaml` `plan: standard`)
- Average chat: 1 `buildRetrievalEvidencePack` + 1 OpenAI call on production doctrine path
- Session log: production **~15–40 KB/line** (full structured); local 4H **~1–3 KB/line**
- Continuity memory grows **~2–5 KB/user** per substantive turn
- Distinct `userId` keys map 1:1 to cache entries on production

---

## Model summary table

| Scenario | Chats (steady) | Prod RSS estimate (24h) | Prod session JSONL (24h) | Cache heap (prod) | OOM risk |
|----------|----------------|---------------------------|--------------------------|-------------------|----------|
| **1 user** | ~50/day | 120–180 MB | 0.75–2 MB | <1 MB | Low |
| **10 users** | ~500/day | 180–280 MB | 7.5–20 MB | 0.4–0.8 MB | Low–medium |
| **100 users** | ~5,000/day | 280–420 MB | 75–200 MB | 4–8 MB | **Medium–high** |
| **1000 users** | ~50,000/day | **420–600+ MB** | 750 MB–2 GB | 40–80 MB | **Critical** |

Local 4H with same 1650-turn stress: peak RSS **288 MB** — roughly **40–50% lower** than production model at equivalent doctrine load.

---

## 1 user

| Metric | Production estimate | Local 4H estimate |
|--------|---------------------|-------------------|
| Memory growth / day | +5–15 MB RSS drift | +2–5 MB |
| RSS steady | 120–180 MB | 100–150 MB |
| Cache growth | 1 entry (~60 KB max) | 1 entry (~90 KB max) |
| `buddy-sessions.jsonl` | ~1–2 MB/day at 50 chats | ~150 KB/day (slim + rotate) |
| Log growth (all JSONL) | ~2–4 MB/day | ~0.5 MB/day |

**Risk:** Low. Single-user beta does not explain Render OOM unless files already large from prior traffic.

---

## 10 users

| Metric | Production estimate | Local 4H estimate |
|--------|---------------------|-------------------|
| Memory growth / day | +15–40 MB RSS | +8–20 MB |
| RSS steady | 180–280 MB | 150–220 MB |
| Cache growth | ~10 keys × 60 KB ≈ 0.6 MB | Capped at 200 users |
| Session JSONL | ~10–20 MB/day | Rotates at 5 MB |
| Continuity JSON | ~20–50 KB/user → ~0.5 MB total | Same + TTL |

**Risk:** Medium if instance uptime > 7 days without restart. `live-request-trace` adds ~0.5 MB/day.

---

## 100 users

| Metric | Production estimate | Local 4H estimate |
|--------|---------------------|-------------------|
| Memory growth / day | +40–80 MB RSS | +15–30 MB (trim at pressure) |
| RSS steady | 280–420 MB | 220–320 MB |
| Cache growth | ~100 × 60 KB ≈ **6 MB** retained | Max 200 users × ~90 KB ≈ **18 MB** cap |
| Session JSONL | **75–200 MB/day** unbounded | Max **5 MB** active file |
| Continuity parse spike | **4.7 MB parse × concurrent requests** | TTL limits user count in file |
| OpenAI concurrent | 5–10 in-flight ≈ **+50–100 MB** transient | Strict path reduces in-flight |

**Risk:** **High.** RSS approaches 512 MB ceiling; GC pauses cause timeouts; Render OOM likely under burst (10+ concurrent doctrine chats).

---

## 1000 users

| Metric | Production estimate | Local 4H estimate |
|--------|---------------------|-------------------|
| Memory growth / day | +80–150 MB RSS (until OOM) | Pressure trim slows growth |
| RSS steady | **>512 MB → kill** | 350–450 MB with trim |
| Cache growth | **40–80 MB** unbounded | **18 MB** cap |
| Session JSONL | **0.75–2 GB/day** | Rotating 5 MB chunks |
| Disk (ephemeral) | Fill → read failures → errors | Managed rotation |
| Concurrent doctrine | Evidence pack × N concurrent | Gate reduces OpenAI retention |

**Risk:** **Critical** on production code. Expect repeated OOM/restart cycles within hours of heavy beta traffic.

---

## Growth drivers by scale

```text
                    1 user    10 users   100 users   1000 users
─────────────────────────────────────────────────────────────────
Session JSONL       low       low        HIGH        CRITICAL
RECENT_SESSION_CACHE low      low        medium      HIGH (prod)
Evidence pack spike  medium   medium     HIGH        HIGH
Continuity RMW       low      low        HIGH        HIGH
OpenAI in-flight     low      medium     HIGH        HIGH
Doctrine state JSON  N/A      N/A        medium*     medium*
```

\*After Phase 4I deploy; TTL caps at 500 users / 24h.

---

## Log growth rates (production, per 1000 chats)

| Log | Bytes/chat | 1000 chats |
|-----|------------|------------|
| `buddy-sessions.jsonl` (full structured) | 15–40 KB | **15–40 MB** |
| `live-request-trace.jsonl` | ~0.8 KB | ~0.8 MB |
| `buddy-quality-events.jsonl` | ~0.5 KB | ~0.5 MB |
| `companion-intelligence-events.jsonl` | ~0.3 KB | ~0.3 MB |

**Combined:** ~16–42 MB per 1000 chats on production vs ~2–4 MB local 4H.

---

## Stress calibration reference

Phase 4H memory stress (`1650 turns`, single process, local mitigations):

| Metric | Value |
|--------|-------|
| Peak RSS | 288.3 MB |
| Peak heap | 131.1 MB |
| RSS growth | +176.4 MB |
| Blank responses | 0 |
| Strict OpenAI calls | 0 |

Extrapolation: production equivalent load without mitigations → peak RSS **~400–500 MB**, consistent with Render OOM on standard plan.

---

## Scaling verdict

Production will **not** safely scale past **~50–100 concurrent beta users** without:

1. Session log slimming + rotation (4H)
2. Session cache user cap (4H)
3. Strict doctrine short-circuit before OpenAI (4E)
4. Runtime health + pressure trim (4H)
5. Longer term: replace full-file JSON RMW with per-user storage or DB
