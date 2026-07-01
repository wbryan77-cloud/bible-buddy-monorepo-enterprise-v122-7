# Bible Authority Phase 3R Report

**Date:** 2026-06-09T22:37:13.993Z

## Executive Summary

Phase 3R executed full IOG/ICOJ source recovery from official catalogs, registry, and scrubbed corpus. **Source recovery only** — no doctrine implementation, production changes, or approvals.

### Recovery counts

| # | Metric | Count |
|---|--------|-------|
| 1 | New source entries recovered | **56** |
| 2 | New scripture references recovered | **831** |
| 3 | New lesson titles recovered | **55** |
| 4 | New Q&A items recovered | **0** (Q&A matched via lesson/video titles, not separate counter) |
| 5 | PDFs with scriptures | **47** |
| 6 | YouTube transcripts recovered | **0** (201 videos processed) |
| 7 | Facebook sources with scriptures | **0** |
| 8 | Spanish lessons with scriptures | **0** / 0 cataloged |
| 9 | Remaining missing (scripture-based) | **94** |
| 10 | Manual transcript upload needed | **30** YouTube items |

### Master inventory

- **273** cataloged source endpoints (IOG: 163 · ICOJ: 110)
- **181** known lesson/Q&A/handout URLs from corpus + registry
- Official IOG/ICOJ headquarters, camp Facebook pages, YouTube channels, lesson handouts, and research committee URLs included

### Coverage (scripture-based)

| Metric | Before 3R (3Q) | After 3R | Notes |
|--------|----------------|----------|-------|
| Covered | 356 | **280** | 3Q used pack-readiness promotion; 3R uses scripture refs only |
| Partial | 168 | **219** | Many entries gained scripture refs without full chain depth |
| Missing | 69 | **94** | Scripture-based count on full audit corpus |

**108 entries** moved from missing → partial/covered when scriptures were found in corpus + 3R recovery.

### What worked

- **PDF / ICOJ handouts:** 47 PDFs yielded extractable scripture references
- **WordPress lesson posts:** 27 IOG/ICOJ posts scraped via WP REST API
- **URL re-fetch:** Jacob & Esau, locations pages, ICOJ lessons pages recovered refs
- **YouTube descriptions:** 2 videos with scripture refs in titles/descriptions
- **Camp inventories:** Phoenix, Dallas, Atlanta, Houston, Detroit, Baltimore, Toronto, LA, Raleigh, St Louis, Bay Area, Jacksonville, Indianapolis mapped

### What remains blocked

- **YouTube transcripts:** 0 recovered — captions unavailable without API key or manual upload
- **Facebook videos:** 0 scripture refs — og:metadata often blocked or empty
- **Spanish lessons:** none in scrubbed corpus — caption/translation upload required
- **IOG live/lessons/publications URLs:** HTTP 404 on some legacy paths
- **israelofgoddallas.com:** DNS failure (ENOTFOUND)

### Human review next

1. Upload manual transcripts for 30 YouTube Q&A sessions
2. Review 47 PDF-extracted scripture lists before pack linkage
3. Triage 94 remaining missing entries in `SourceGapEliminationReport.md`
4. Spanish lesson inventory needs dedicated caption/transcript pass

## Safety

| Check | Status |
|-------|--------|
| Production changes | none |
| Scripture implementation | none |
| Approvals | none |
| Doctrine changes | none |
| Graph / card / prompt updates | none |

## Artifacts

- `docs/regression-trace/phase3r-source-recovery-results.json`
- `docs/evidence-candidates/phase3r-recovered-sources.json`
