# Gate 1 — Corpus Integrity

**Status:** PASS  
**Date:** 2026-08-28  
**Source collection:** CLOSED (except evidence gap blocking a manuscript claim)

## Inspected

- `SOURCE_MANIFEST_FINAL.json`
- `10_SUPPORT/SOURCE_INTEGRITY_REPORT.json`
- `07_CURSOR_TEXT_DERIVATIVES/` (32 readable files extracted into repo)
- `05_EXCLUDED_OR_PENDING/`
- `09_PUBLIC_DOMAIN_PHILOSOPHY_STRATEGY/PHILOSOPHY_STRATEGY_SOURCE_REGISTRY.json`
- Pre-cursor diagnosis (superseded notes only)

## Classification summary

| Class | Count | Notes |
|---|---|---|
| Primary craft benchmarks (full readable derivatives) | 7 | Covey, Clear, Carnegie OCR, Kiyosaki, Frankl, Duhigg, Bible For Dummies |
| Secondary modern full | 4 | Housel, Ury, Ansari, Faber/Mazlish |
| Partial only | 2 | I Will Teach You (SUMMARY_ONLY), Whole-Brain Child (PREVIEW_ONLY ~276 words) |
| Public-domain self-development | 4 | Allen, Smiles×2, Wattles |
| Public-domain Bible study | 3 | Home Circle, Gray, Moody |
| Comparative religion (English witnesses) | 5 | Qur'an Rodwell, Dhammapada, Gita, Analects, Tao Teh King |
| Philosophy/strategy (Gutenberg FULL) | 6 | Sun Tzu, Marcus, Epictetus, Aristotle, Plato, Bacon — **no longer pending** |
| BibleBuddy evidence research source | 1 | Four Winds of Heaven (FULL text derivative) |
| Excluded | 1 active exclude | How_to_Win_Friends `.lcpl` LCP-locked (readable OCR derivative is the active copy) |

## Readable derivatives inventory (workspace)

See `../matrices/SourceInventory.json` for file-level bytes/words/partial flags.

OCR caution (do not over-quantify style metrics):
- Atomic Habits, How to Win Friends, Man's Search for Meaning, Power of Habit — Internet Archive OCR derivatives
- Flag OCR corruption before fragile quantitative craft claims

## Philosophy layer

All six philosophy/strategy sources are FULL_LOCAL_READABLE with Markdown derivatives present. Registry confirms Gutenberg IDs 132, 2680, 45109, 8438, 55201, 575.

## Exclusions / duplicates

| Item | Action |
|---|---|
| `How_to_Win_Friends_LCP_LOCKED_EXCLUDE.lcpl` | EXCLUDE (encrypted) |
| Carnegie OCR markdown | ACTIVE craft source |
| Whole-Brain Child preview | Orientation only — no full-book claims |
| I Will Teach You summary | Orientation only — no full-book claims |

## Binary originals

EPUB/PDF/AZW remain in the zip drop for verification; Cursor work uses text derivatives. Full binary extract deferred (large); integrity SHAs available in `SOURCE_INTEGRITY_REPORT.json` for originals in the zip.

## Evidence gaps (do not reopen collection unless manuscript-blocking)

1. Comparative original languages (Arabic/Pali/Sanskrit/Classical Chinese) — English witnesses only; mark `ORIGINAL_LANGUAGE_SOURCE_MISSING` if lexical claim depends on exact wording.
2. Four Winds not yet attached to production evidence objects — Gate 2 publishing ledger only.
3. World Scope / Last Two Million Years / Jasher — INDEXED_ONLY / edition-unresolved in BIE proofs; cite only with governed care.
4. Nestle1904 (not SBLGNT) is the governed NT Greek source — use it.

## Reused

- Manifest + integrity report as closed corpus truth
- Existing BibleBuddy original-language / historical / IOG-ICOJ owners (Gate 0)

## Changed

- Extracted derivatives + support into `docs/bookbuddy-build/`
- Created `publishing/matrices/SourceInventory.json`

## Next

Gate 2 — Four Winds claim ledger + high-priority audit (publishing only; no doctrine promotion).
