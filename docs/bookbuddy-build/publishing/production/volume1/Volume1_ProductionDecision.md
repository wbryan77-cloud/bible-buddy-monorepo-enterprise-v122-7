# Volume 1 — Production Decision (Phase 3 Lock)

**Date:** 2026-08-29  
**Baseline HEAD:** `c06ecc2999497e05944b3b9ceca7a1fa667691f2`  
**Manuscript freeze:** `b2d4e63208946e796244c6d5815fc2dba3769d6c`  
**Design:** Direction **C** + restraint governor **A**

---

## Tool

| Item | Lock |
|---|---|
| TYPESETTING_TOOL | **HTML semantic source + headless Google Chrome print-to-PDF** |
| Why | Proven Phase 2 pipeline; isolated; no BibleBuddy app dependency changes; professional 6×9 output |
| Options considered | (1) Chrome HTML pipeline — selected (2) WeasyPrint — blocked (missing system Pango/GObject) (3) ReportLab — available but weaker literary pagination) |
| Reproducible command | `python3 docs/bookbuddy-build/publishing/production/volume1/build_full_interior.py` |

## Fonts

| Role | Lock | License |
|---|---|---|
| BODY | **Literata** ~10.8pt / leading 1.48 | SIL OFL 1.1 |
| HEADING | Literata SemiBold + small-caps furniture | SIL OFL 1.1 |
| HEBREW | **Noto Serif Hebrew** | SIL OFL 1.1 |
| GREEK | Literata primary; Noto Serif fallback | SIL OFL 1.1 |

Vendored: `production/volume1/fonts/` (+ OFL texts).  
Georgia remains Phase 2 visual reference only — not final.

## Geometry

| Spec | Value |
|---|---|
| TRIM | **6×9 in** |
| TOP | 0.75 in |
| BOTTOM | 0.90 in |
| INSIDE | 0.90 in |
| OUTSIDE | 0.80 in |
| BLEED | none (text interior) |

Inside 0.90 in exceeds KDP 151–300 (0.5) and 301–500 (0.625) minima. Final page count **197** → KDP tier 151–300.

## Running heads / folios

Chrome print path suppresses browser headers (`--no-pdf-header-footer`).  
Chapter openers provide chapter number/title. Continuous running heads/folios are **limited in this Chrome proof path**; acceptable for Founder reading proof. Final press master may add margin-box folios in a future press-tool pass if Founder requires.

## Pipeline

```
frozen 04_FULL.md
 → exact byte-derived copies (derived/)
 → HTML semantic mapping (C system + A governor)
 → Chrome PDF
 → BOOKBUDDY_VOLUME1_FULL_READING_PROOF.pdf
```

## Hebrew / Greek strategy

Unicode in HTML; `@font-face` to OFL files; Hebrew `dir=rtl` spans; no image glyphs.

## Semantic style map (minimum)

| Element | Implementation |
|---|---|
| Chapter number / title | `.chap-num` / `.chapter-title` on opener |
| Body | Literata justified, first-line indent |
| Scripture block | `blockquote.scripture` + cite |
| Key discovery | `.scripture-key` left hairline (rare) |
| Lena peak | `.lena-isolated` (Option 2) |
| OL insight | `.ol-insight` left rule when H2 is “What the word actually says…” |
| Furniture H2 | small-caps demotion |
| Lists/tables | standard / `.compare` |
| Final silence | `.final-quiet` then `.back-start` placeholders |
