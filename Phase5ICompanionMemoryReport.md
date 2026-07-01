# Phase 5I Companion Memory Report

**Date:** 2026-06-14

## Architecture

`companionMemoryManager.js` is the single safe memory interface for the companion lane.

### Memory Layers

| Layer | Scope | Contents |
|-------|-------|----------|
| Turn memory | One response cycle | Last question, concept, refs, summary via `recordTurnMemory` |
| Session memory | Current conversation | struggle, last topic, practical need, prayer need, family context |
| User preference | Persistent (user-scoped) | direct answers, yes/no direct, forbid hedging phrases |
| Relationship summary | Allowed signals only | practical wording preference, family context flag |
| Learning candidates | Global pending_review | phrase/concept improvements only |

### Safety Rules

- No sensitive personal details stored globally by default
- No sexual detail global storage
- Memory disclosure only lists actually stored items
- Session-only context described honestly when empty
- Forget clears relationship file + preference store (explicit false, not default-true merge)

### Regression Evidence

| Test | Result |
|------|--------|
| Remember direct answers | PASS |
| Forget that preference | PASS — prefs cleared |
| What do you remember | PASS — only actual stored items |
| Learning candidate for others | PASS — pending_review ack |

### Verdict

Companion memory is **honest, layered, and user-controlled**.
