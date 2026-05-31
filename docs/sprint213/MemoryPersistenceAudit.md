# Sprint 2.13 — Memory Persistence Audit

**Date:** 2026-05-31  
**Evidence source:** Code trace + HTTP acceptance TEST 7

---

## Memory Systems

### 1. Conversation memory (summaries)

| Field | Detail |
|-------|--------|
| Write path | `buddyBrain.updateUserMemory` → `writeMemoryStore` |
| Read path | `getUserCompanionProfile`, `memoryRecallEngine.readMemorySummaries` |
| Storage | `data/buddy-memory.json` |
| Reload | Sync `readFileSync` on each read |
| Retention | Last **30** summaries per user (`summaries.slice(-30)`) |
| Capacity | Unbounded users; 30 rolling summaries |

### 2. Session log (full turns)

| Field | Detail |
|-------|--------|
| Write path | `appendSession` → `appendJsonl` + in-memory `RECENT_SESSION_CACHE` |
| Read path | `getRecentSessions` (cache first, then `data/buddy-sessions.jsonl`) |
| Storage | `data/buddy-sessions.jsonl` |
| Reload | Cache per process; file on restart |
| Retention | Last **8–12** turns in cache; file append-only |
| Capacity | Unbounded file growth |

### 3. Relationship memory

| Field | Detail |
|-------|--------|
| Write path | `relationshipMemoryBridge.persistRelationshipMemoryFromInteraction` → `runtimeRelationshipMemoryEngine.saveRelationshipMemory` |
| Read path | `buildRelationshipContext`, `relationshipRecallEngine` |
| Storage | `data/runtime-relationship-memory.json` |
| Reload | Sync read on request |
| Retention | Tiered: HIGH 50%, MEDIUM 35%, LOW remainder; max **500** stored, **80** retained after ranking |
| Categories | grief, health, prayer, family, goals, study topics, open loops |

### 4. Prayer memory

| Field | Detail |
|-------|--------|
| Write path | `runtimePrayerContinuityEngine.savePrayerContinuity` (via persistBuddyMemory) |
| Read path | `getPrayerContinuity`, `buildPrayerContinuityContext` |
| Storage | `data/runtime-prayer-continuity.json` |
| Retention | Last **300** entries per user; unresolved filtered on read |

### 5. Study memory

| Field | Detail |
|-------|--------|
| Write path | `continuityStudySessionRuntime.saveStudySession` |
| Read path | `getRecentStudySessions`, continueStudyEngine |
| Storage | `data/continuity-study-sessions.json` |
| Retention | Last **250** sessions per user |

### 6. Milestone memory

| Field | Detail |
|-------|--------|
| Write path | `milestoneTracking.recordMilestone` via companionRelationshipOrchestrator |
| Read path | `detectCompanionMilestones`, relationship enrich |
| Storage | `data/companion-milestones.json` |
| Retention | Last **60** milestones per user |

### 7. Continuity memory (threads)

| Field | Detail |
|-------|--------|
| Write path | `continuityMemoryRuntime.saveContinuityMemory` |
| Read path | `getContinuityMemory` via memoryRecallEngine |
| Storage | `data/continuity-memory.json` |
| Retention | Thread list per user (slice in save) |

### 8. Learning profile

| Field | Detail |
|-------|--------|
| Write path | `companionLearningLayer.recordCompanionLearning` |
| Read path | `buildLearningContext`, `getCompanionLearningProfile` |
| Storage | `data/companion-learning-profiles.json` |
| Retention | Persistent profile per user |

### 9. Conversation state

| Field | Detail |
|-------|--------|
| Write path | `runtimeConversationStateEngine.saveConversationState` |
| Read path | `buildConversationStateContext` |
| Storage | `data/runtime-conversation-state.json` |
| Retention | One state object per user (overwrite) |

### 10. Emotional arc / timeline / open loops

| Storage | Files |
|---------|-------|
| Emotional arc | `data/emotional-arc-memory.json` |
| Life timeline | `data/life-timeline-memory.json` |
| Open loops | `data/open-loops-memory.json` |

Written via `companionRelationshipOrchestrator.persistCompanionRelationshipState`.

---

## Time Horizon Answers (code evidence)

| Horizon | Can Buddy remember? | Evidence |
|---------|---------------------|----------|
| **Yesterday** | **YES** | `memoryRecallEngine` windows: TODAY, YESTERDAY; relationship memory persists with timestamps; TEST 7 recalled knee pain + grief |
| **Last week** | **YES** | `LAST_7_DAYS` window in recall; session jsonl; relationship memory retained |
| **Last month** | **PARTIAL** | Session summaries capped at 30; relationship memory tiered to 80 items; no explicit 30-day window — older entries may be trimmed |
| **Six months** | **UNLIKELY for detail** | No long-term archive; rolling caps (30 summaries, 80 relationship, 250 study sessions) will drop early context; milestones may persist longer |

**Honesty layer:** `memoryTruthfulness.js` classifies KNOWN/LIKELY/PARTIAL/UNKNOWN for recall surfacing.

---

## Startup Reload Path

All memory stores use **sync JSON file reads** on demand — no separate boot loader. Process restart:
1. `RECENT_SESSION_CACHE` empty until new turns (file backfill on cache miss)
2. All JSON stores reload from `data/` on first read ✓

**Render note:** `PERSISTENCE=MEMORY` in render.yaml — **ephemeral disk** on free tier may **wipe `data/` on redeploy**. File-based memory may not survive deploy restarts on Render free plan.

---

## HTTP Evidence (TEST 7)

Input: `"What were we talking about last week?"`  
Response included: knee pain, grief after loss, open topics tracking.  
Runtime intent: `memory_recall`  
**Memory write/read path verified through POST /buddy/chat.**
