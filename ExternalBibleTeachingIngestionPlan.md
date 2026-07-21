# External Bible Teaching Ingestion Plan

**Date:** 2026-06-07  
**Priority:** CRITICAL (planning)  
**Status:** PLAN ONLY — no scraping, no ingestion, no implementation

---

## Principle

External teaching (Israel of God Q&A, sermons, YouTube lessons, transcripts, study notes) may **inform admin research** but **Scripture remains the highest authority**. Nothing from external sources becomes doctrine for OpenAI unless an admin freezes it as an Evidence Card after review.

---

## Legal and copyright guardrails

| Rule | Requirement |
|------|-------------|
| No unauthorized scraping | Do not ingest copyrighted sermons, books, or videos without explicit permission |
| Transcripts | Only use transcripts the project has rights to (own recordings, licensed, or public-domain) |
| Attribution | Store `sourceName`, `sourceUrl`, `copyrightStatus` on every candidate |
| No verbatim preaching in answers | External prose is never pasted to users — only Scripture citations and admin-approved conclusions |
| Israel of God / third-party ministries | Treat as **research reference** until written permission for structured ingestion |

**Default `copyrightStatus`:** `unknown` → blocks auto-processing until admin sets `licensed` or `public_domain`.

---

## Pipeline architecture (admin-review only)

```
External source (manual upload or licensed API)
  → Extract question + scriptures cited + stated conclusion
  → Store as Evidence Candidate (unclassified)
  → Admin review queue
  → [reject | merge into existing card | create new card proposal]
  → Approved Evidence Card (frozen) — only path into live retrieval
```

**Never:** candidate → OpenAI prompt automatically.

---

## Evidence Candidate schema

```json
{
  "candidateId": "uuid",
  "sourceName": "Israel of God Q&A",
  "sourceUrl": "https://example.com/lesson/123",
  "question": "What is the third heaven?",
  "scripturesCited": [
    "Genesis 1:6-8",
    "2 Corinthians 12:2",
    "John 3:13"
  ],
  "doctrineConclusion": "Paul names a third heaven; Scripture does not teach believers' final destination is the third heaven.",
  "confidence": 0.0,
  "copyrightStatus": "unknown",
  "reviewRequired": true,
  "status": "pending_admin_review",
  "submittedAt": "2026-06-07T00:00:00Z",
  "reviewedBy": null,
  "reviewedAt": null,
  "promotedToCardId": null,
  "notes": ""
}
```

### Field rules

| Field | Purpose |
|-------|---------|
| `sourceName` | Human-readable origin |
| `sourceUrl` | Provenance link (not shown to end users) |
| `question` | Normalized user question this candidate answers |
| `scripturesCited` | KJV references only in promoted cards |
| `doctrineConclusion` | **Admin summary** — not auto-used as OpenAI script |
| `confidence` | Admin-assigned 0–1 after review; discovery engine may not auto-set |
| `copyrightStatus` | `unknown` \| `licensed` \| `public_domain` \| `owned` \| `denied` |
| `reviewRequired` | Always `true` until promoted |

---

## Ingestion stages (future implementation)

### Stage 0 — Manual admin entry (lowest risk)

Admin pastes question, scriptures, conclusion into review UI. No automation.

### Stage 1 — Licensed transcript upload

- Admin uploads `.txt` / `.vtt` with `copyrightStatus: licensed`
- Script extracts **questions** and **verse references** (regex + concordance)
- **Does not** extract conclusion automatically — admin writes conclusion

### Stage 2 — Structured Q&A import

- CSV/JSON bulk import from owned Q&A databases
- Each row → Evidence Candidate
- Dedup against existing cards by question similarity

### Stage 3 — Discovery reinforcement (existing pattern)

`scriptureDiscoveryEngine` already produces admin-review candidates from continuity/concordance. External teaching feeds the **same queue**, not a separate speaker path.

---

## Relationship to Bible Authority Engine

| BAE component | External teaching role |
|---------------|------------------------|
| Evidence Retrieval | **None** until promoted to frozen card |
| Claim validator | **None** — validator uses approved refs only |
| Composer prompt | **None** — no external prose in prompt |
| Admin review UI | **Primary consumer** of candidates |
| Learning engine | Logs when live answers contradict promoted candidates |

---

## Promotion workflow (admin only)

1. Review candidate Scriptures against KJV and existing card chains
2. Verify conclusion is Scripture-supported line upon line
3. Check `copyrightStatus` is not `unknown` or `denied`
4. Either:
   - **Merge** scriptures into existing card (`heavens`, `kingdom`, etc.)
   - **Propose** new card → second admin sign-off for freeze
5. Update `approved-doctrine-registry.json` with audit trail
6. Reject candidates that restate tradition without Scripture chain

---

## Source-type handling

| Source type | Ingestion method | Risk |
|-------------|------------------|------|
| Own sermon notes | Manual / upload | Low |
| Licensed ministry transcripts | Upload with license flag | Medium |
| YouTube auto-captions | **Do not** without license | High (copyright) |
| Israel of God Q&A | Manual citation extraction only until permission | High |
| User-submitted questions | Already in session logs — not doctrine | N/A |

---

## Storage layout (proposed)

```
docs/bible-learning/evidence-candidates/
  pending/
  approved/
  rejected/
docs/bible-learning/evidence-candidate-schema.json
```

Live retrieval reads **only** `services/evidenceCards/*.card.js` + registry — never `evidence-candidates/`.

---

## Success metrics

| Metric | Target |
|--------|--------|
| Auto-promote rate | **0%** |
| Time from candidate to frozen card | Admin-driven; no SLA |
| Scripture citation accuracy in candidates | 100% KJV refs validated before promotion |
| Live answer contradictions vs promoted cards | Logged to admin findings |

---

## Out of scope (this plan)

- Web scraping
- YouTube download automation
- Using external conclusions as OpenAI few-shot examples without freeze
- Replacing Evidence Cards with RAG over sermon text

**End of external teaching ingestion plan.**
