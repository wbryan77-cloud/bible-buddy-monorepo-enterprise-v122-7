# BibleBuddy Master Canonical Architecture

Status: Platform Unification Phase  
Repository: `wbryan77-cloud/bible-buddy-monorepo-enterprise-v122-7`

## Purpose

This document is the persistent architecture anchor for BibleBuddy. Every new implementation chat should reference this file before adding new engines, routes, UI panels, or AI behavior.

The platform has moved from feature accumulation into architecture consolidation and orchestration.

## Core Principle

Do not replace existing systems.

Unify them through shared orchestration layers.

Existing systems remain the source families:

- Covenant timeline systems
- Discipleship systems
- Worship systems
- Missions systems
- Prayer systems
- Revival systems
- Apologetics systems
- Stewardship systems
- Ethics systems
- Analytics systems

The new canonical platform layer coordinates these systems without deleting, renaming, or rewriting them.

## Canonical Runtime Shape

```txt
Existing Feature Systems
        ↓
Read-Only System Adapters
        ↓
CanonicalOrchestrator
        ↓
KingdomKnowledgeGraph
        ↓
ContinuityRuleEngine
        ↓
DoctrineIntegrityPipeline
        ↓
RuntimeMemoryCompressor
        ↓
UnifiedDiscipleshipCompiler
        ↓
User / Admin / Companion Output
```

## Core Systems

### 1. CanonicalOrchestrator

Receives normalized signals from existing systems and determines which runtime layers should handle them.

Responsibilities:

- Normalize incoming feature-family signals
- Prevent duplicate disconnected workflows
- Select continuity, doctrine, memory, and discipleship paths
- Keep orchestration gentle, explainable, and Scripture-aware

### 2. KingdomKnowledgeGraph

Links Scripture, doctrine, covenant history, themes, disciplines, habits, missions, worship, stewardship, and user-safe learning nodes.

Responsibilities:

- Store relationship contracts
- Connect biblical themes to life application carefully
- Avoid isolated feature-only outputs
- Support future RAG and graph-based retrieval

### 3. ContinuityRuleEngine

Keeps user journeys ordered and coherent over time.

Responsibilities:

- Prevent spiritual, devotional, or habit-flow whiplash
- Track what stage the user is in
- Preserve context without overloading memory
- Prefer one gentle next step over many suggestions

### 4. DoctrineIntegrityPipeline

Protects Scripture handling and theological consistency.

Responsibilities:

- Separate Scripture from commentary
- Never invent Bible verses
- Require context checks for Scripture use
- Mark AI paraphrase as non-scripture
- Use pastoral sensitivity for suffering, trauma, mental health, and moral questions

### 5. RuntimeMemoryCompressor

Compresses runtime context into safe summaries.

Responsibilities:

- Reduce context overload
- Reduce memory drift
- Avoid storing raw sensitive details unless explicitly needed and consented
- Preserve continuity summaries for future orchestration

### 6. UnifiedDiscipleshipCompiler

Compiles final user-facing and admin-facing outputs.

Responsibilities:

- Combine devotional, study, worship, prayer, mission, stewardship, and habit outputs
- Produce one coherent plan
- Avoid scattered disconnected feature suggestions
- Respect doctrine and continuity results

## Current Implemented Foundation

Current foundation files:

- `services/platformUnification/orchestrator.js`
- `services/platformUnification/adapters/registry.js`
- `services/platformUnification/adapters/covenantTimelineAdapter.js`
- `routes/platformUnification.js`

Current route:

```txt
GET  /api/platform-unification
POST /api/platform-unification/orchestrate
```

Mounted in:

```txt
server.js
```

## Implementation Rule

Use shorter implementation cycles.

Each batch should do only one of the following:

- add one central architecture document
- add one orchestrator skeleton
- add one read-only adapter
- connect one existing system family
- add one test/status endpoint
- add one memory or doctrine contract

Avoid broad multi-system rewrites.

## Do Not Do

- Do not mass-refactor working systems
- Do not delete existing feature modules
- Do not rename established systems unless absolutely necessary
- Do not create one new isolated engine per new idea
- Do not rely only on conversation memory
- Do not create large simultaneous GitHub write batches

## Do Instead

- Add persistent architecture docs
- Use read-only adapters
- Centralize orchestration
- Connect one system family at a time
- Keep doctrine safeguards central
- Compress memory into stable contracts
- Build small, verify, then continue
