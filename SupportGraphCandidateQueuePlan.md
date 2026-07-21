# Support Graph Candidate Queue Plan

**Date:** 2026-06-08  
**File:** `services/supportGraphCandidateQueue.js`  
**Status:** Implemented (queue only — no auto-promotion)

---

## Purpose

Provide a safe pathway for BibleBuddy to record **proposed** Scripture support relationships for admin review, preparing Genesis-to-Revelation growth without automatic doctrine changes.

---

## API

| Function | Purpose |
|----------|---------|
| `enqueueSupportGraphCandidate(candidate)` | Append pending candidate to `data/support-graph-candidates.jsonl` |
| `readSupportGraphCandidates({ limit, status })` | Read queue for admin UI / scripts |
| `proposeCandidateFromUnverifiedClaim({ claim, supportingScriptures, topic, reason })` | Research-only proposal when support engine returns class C |

---

## Candidate schema

```json
{
  "id": "sgc_<timestamp>_<random>",
  "topic": "sabbath",
  "proposedClaim": "God's direct command to keep the Sabbath holy by ceasing work.",
  "scriptures": ["Exodus 20:8-11"],
  "scriptureOrder": ["Genesis 2:2-3", "Exodus 20:8-11"],
  "relationshipType": "directly_affirms",
  "reason": "Claim cites Scripture but no approved support edge exists yet.",
  "confidence": "low",
  "source": "support_relationship_engine",
  "reviewRequired": true,
  "autoApplied": false,
  "status": "pending_review",
  "createdAt": "ISO-8601"
}
```

---

## Rules (enforced)

| Rule | Implementation |
|------|----------------|
| Never auto-promote | No code path writes to `APPROVED_SUPPORT_EDGES` from queue |
| Never change final answer | Queue is append-only side channel |
| Never override Evidence Cards | Promotion requires admin + regression |
| Admin approval required | `status: pending_review` until manual promotion |
| Research only | `proposeCandidateFromUnverifiedClaim` on class C only |

---

## Promotion workflow (future admin tool)

1. Admin reviews `data/support-graph-candidates.jsonl`
2. Verifies candidate against frozen card/catalog source
3. Adds edge to `APPROVED_SUPPORT_EDGES` with matching `source` field
4. Runs `phase2bSupportRelationshipRegression.js` + `baeClaimValidatorFixtures.js`
5. Marks candidate `status: approved` or `rejected`

---

## When candidates are created

Phase 2D does **not** auto-enqueue on every class C (would flood queue). The function exists for:

- Future precept discovery scans
- Optional explicit enqueue from admin scripts
- Future hook after regression analysis

Sabbath and Logos class C claims are documented in Phase 2C inventory as prime candidates for manual admin review before promotion.

---

## Storage

- Path: `data/support-graph-candidates.jsonl`
- Format: JSONL (one candidate per line)
- Not deployed to production auto-ingest — local/admin artifact only
