# Content Extraction Target Report

**Phase:** 3F Part A
**Date:** 2026-06-09T07:12:13.392Z

**Total scrubbed questions:** 513
**Weak scripture (no refs):** 506
**Registry sources:** 78

## Priority sources (weak chains)

| Priority | Source | Camp | Weak Qs | Type | Sample URL |
|----------|--------|------|---------|------|------------|
| critical | ICOJ Lesson Handouts | HQ | 144 | lesson_handout_pdf | https://www.israelthechurchofjesus.net/wp-con |
| critical | ICOJ HQ Lessons | HQ | 144 | lesson_handout_pdf | https://www.israelthechurchofjesus.net/wp-con |
| critical | IOG Main Website | HQ | 51 | wordpress_lesson | https://theisraelofgod.com/wp-content-uploads |
| critical | IOG HQ Lessons | HQ | 51 | wordpress_lesson | https://theisraelofgod.com/wp-content-uploads |
| high | IOG YouTube Main (IOGNEWS900 | HQ | 34 | youtube_video | https://www.youtube.com/watch?v=58PphDsDAA4 |
| high | IOG YouTube @theisraelofgod | HQ | 34 | youtube_video | https://www.youtube.com/watch?v=58PphDsDAA4 |
| high | IOG Wednesday Night Q&A (IOG | HQ | 31 | youtube_video | https://www.youtube.com/watch?v=S0ErrdBWLAg |
| high | ICOJ YouTube IsraelChurchofJ | HQ | 11 | youtube_video | https://www.youtube.com/watch?v=B1u4ICxgcBI |

## Extraction strategy

- ICOJ PDF lesson handouts — pdf-parse text extraction
- IOG/ICOJ WordPress and HTML lesson pages — body text + ref regex
- YouTube title/description metadata from Phase 3E corpus
- Public caption probe (timedtext) where available
- Scripture normalization before KJV validation
