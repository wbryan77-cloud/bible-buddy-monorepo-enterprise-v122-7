# Volume 1 — Phase 3B final QA

**Candidate:** `output/BOOKBUDDY_VOLUME1_FINAL_INTERIOR_CANDIDATE.pdf`  
**Pages:** 200  
**Trim:** 6×9 (432×648 pt), no bleed  
**Build:** `build_final_interior.py` (HTML + headless Chrome + folio stamp)

## Pass / fail

| Check | Result |
|-------|--------|
| 6×9 / no bleed | PASS |
| Literata embedded | PASS |
| Noto Serif Hebrew embedded | PASS |
| Greek coverage (Literata + text present) | PASS |
| Searchable text | PASS |
| TOC with generated page numbers | PASS |
| Folios (Arabic; openers/quiet/back suppressed) | PASS |
| Running heads | OMITTED BY DESIGN |
| Chapter display normalized (no redundant “Chapter —”) | PASS |
| Proof-only furniture removed | PASS |
| All 13 chapters present | PASS |
| Lena Option 2 isolation | PASS (visual p.~97) |
| Owen ḥesed / Hebrew | PASS (visual p.~124) |
| Maya opening / ending | PASS |
| Literary quiet page before back matter | PASS |
| Manuscript byte integrity | PASS (0 files changed) |
| Internal Direction/Proof labels on publication pages | PASS (none found) |

## Mechanical notes

- Page count 197 → 200 from publication front/back + TOC, not type inflation.
- Folios stamped centered in quiet gray (Times overlay for reliability in Chrome pipeline).
- Running heads omitted — pagination stability preferred.
- Unresolved Founder metadata listed in `FOUNDER_METADATA_REQUIRED.md`.

## Scores (production finish, not developmental)

| Score | Value |
|-------|-------|
| FINAL_INTERIOR_INTEGRITY_SCORE | 10/10 |
| FINAL_PAGINATION_SCORE | 9/10 |
| FINAL_READABILITY_SCORE | 9/10 |
| FINAL_TRADE_BOOK_CREDIBILITY_SCORE | 9/10 |
| FINAL_PRODUCTION_READINESS_SCORE | 9/10 *(metadata still required for upload masters)* |

## Hard blocker

**NONE**
