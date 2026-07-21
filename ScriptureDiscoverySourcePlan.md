# Scripture Discovery Source Plan

**Phase:** 2J-A Part A  
**Date:** 2026-06-08  
**Status:** Pilot — discovery only

---

## Approved candidate source types

| Source type | Allowed in pilot | Ingestion scope |
|-------------|------------------|-----------------|
| User-provided transcripts | ✅ | Manual upload → pilot JSONL only |
| Official / licensed transcripts | ✅ | Admin attests rights |
| Creator-authorized transcripts | ✅ | `copyrightStatus: licensed` |
| Public materials (ToS-compliant) | ✅ | Legal review required |
| Manually supplied notes | ✅ | `data/scripture-discovery-pilot-sources.json` |
| Phase 2I stress Class C gaps | ✅ | Read-only from stress results |
| Approved continuity sample chains | ✅ | `scripture-continuity-sample.json` |
| YouTube transcript metadata | ✅ | **Metadata only** — title, videoId, cited refs |
| YouTube channel scrape | ❌ | Not permitted |
| IOG bulk ingestion | ❌ | Not started |
| Entire channel ingestion | ❌ | Not permitted |

---

## YouTube pilot protocol (metadata only)

1. Admin supplies `videoId`, `title`, `question`, manually extracted `scripturesCited`
2. Pilot writes candidate to `docs/evidence-candidates/scripture-discovery-pilot.jsonl`
3. **No** automated channel crawl, **no** transcript text storage without license
4. `reviewRequired: true`, `autoApplied: false` always

---

## Pilot inputs used

| Input | Count |
|-------|-------|
| Curated pilot questions | 6 |
| Continuity expansion candidates | auto |
| Phase 2I Class C extractions | auto |
| Manual sources file | `data/scripture-discovery-pilot-sources.json` |

---

## Output destination

`docs/evidence-candidates/scripture-discovery-pilot.jsonl` — **separate** from `data/support-graph-candidates.jsonl`
