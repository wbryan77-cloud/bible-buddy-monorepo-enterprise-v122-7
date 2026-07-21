# Scripture Discovery Admin Workflow Plan

**Phase:** 2J-C Part I — Design only
**Date:** 2026-06-08T22:43:30.430Z

> No production wiring. All features optional and admin-disableable.

## Authority flow

```
Question → Scriptures cited → Scripture order → Candidate conclusion
  → Genesis-to-Revelation verification → Parallel Scripture discovery
  → Bible support score → Admin review queue → Human approval
```

## Planned features

### Daily review queue
- Surface top N candidates by `supportScore` and `priorityScore`
- Filter: `reviewRequired:true`, `autoApplied:false`, `decision:null`
- Group by topic and recommended action

### Weekly digest
- Summary of new candidates from discovery runs
- Score band changes since last run
- Class C degradation correlation (read-only)

### Monthly digest
- Cumulative approved vs pending counts
- Topic coverage heatmap (OT/NT/continuity)
- Stale candidates (>30 days unreviewed)

### Review reminders
- Optional email/Slack hook (admin-configured)
- Threshold: candidates with score ≥80 unreviewed >7 days

### Approve / reject workflow
- Admin fills `admin-decisions.template.json` or G2R review package decisions
- Allowed: `approve_card_ref`, `approve_support_edge`, `hold`, `future_research`, `reject`
- Separate apply step (Phase 2K+) — never auto-apply

### Bulk review tools
- Batch approve support edges for same topic
- Batch reject pastoral/off-card candidates
- Export CSV for external theological review

## Safety invariants

- Every candidate: `reviewRequired: true`, `autoApplied: false`
- Discovery modules not imported by `buddyBrain`, `retrievalEvidencePack`, or validators
- Human approval required before any card/graph/registry change

## Disable controls

| Feature | Env flag (proposed) | Default |
|---------|---------------------|---------|
| Discovery runner | `SCRIPTURE_DISCOVERY_ENABLED` | false |
| Daily queue | `SCRIPTURE_DISCOVERY_DAILY_QUEUE` | false |
| Digests | `SCRIPTURE_DISCOVERY_DIGESTS` | false |
| Reminders | `SCRIPTURE_DISCOVERY_REMINDERS` | false |
