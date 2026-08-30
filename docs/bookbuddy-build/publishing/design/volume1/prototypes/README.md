# Volume 1 Phase 2 Prototypes — README

**Status:** UNCOMMITTED — awaiting Founder + ChatGPT review of rendered PDFs  
**Frozen manuscript:** `b2d4e63208946e796244c6d5815fc2dba3769d6c`  
**Phase 1 design commit:** `511a7ea2ba4834d0793650520ed5907b95fdf02b`  
**Rule:** Derived production copies only. Never edit `04_FULL.md`.

## Open these first

| Direction | PDF |
|---|---|
| **A — Quiet Literary** | [`direction-a-quiet-literary/rendered/Volume1_DirectionA_Prototype.pdf`](direction-a-quiet-literary/rendered/Volume1_DirectionA_Prototype.pdf) |
| **C — BookBuddy Signature Hybrid** | [`direction-c-bookbuddy-signature/rendered/Volume1_DirectionC_Prototype.pdf`](direction-c-bookbuddy-signature/rendered/Volume1_DirectionC_Prototype.pdf) |
| C accent sample (secondary) | [`direction-c-bookbuddy-signature/rendered/Volume1_DirectionC_AccentSample.pdf`](direction-c-bookbuddy-signature/rendered/Volume1_DirectionC_AccentSample.pdf) |

## Also read

- [`../Volume1_Phase2FounderReviewGuide.md`](../Volume1_Phase2FounderReviewGuide.md)
- [`../Volume1_Phase2DesignComparison.md`](../Volume1_Phase2DesignComparison.md)
- [`qa/Volume1_Phase2DesignQA.md`](qa/Volume1_Phase2DesignQA.md)
- [`qa/Volume1_Phase2ReaderPanel.md`](qa/Volume1_Phase2ReaderPanel.md)
- [`DIAGRAM_CANDIDATES_REVIEW.md`](DIAGRAM_CANDIDATES_REVIEW.md)

## Prototype geometry

| Spec | Value |
|---|---|
| Trim | **6 × 9 in** |
| TOP | 0.75 in |
| BOTTOM | 0.90 in |
| INSIDE | **0.90 in** (safe for ~280–340 pp; above KDP 301–500 min 0.625) |
| OUTSIDE | 0.80 in |
| Body A | Baskerville ~11 / 1.48 |
| Body C | Georgia ~10.8 / 1.46 |
| Images | None |
| Icons | None |

## How built

1. Copy frozen chapters → `source/*_DERIVED.md`  
2. Excerpt representative contiguous passages → `source/excerpts/`  
3. `build_prototypes.py` → HTML → headless Chrome PDF  
4. No BibleBuddy app dependencies installed  

## Contained samples

Front-matter mini · typography proof · Scripture proof · reflection proof · ch00 · ch06 (incl. Lena options) · ch08 (incl. OL A/B) · ch12 · quiet final · back-matter placeholder  

## Do not

Commit/push Phase 2 · format full book · start C3 · invent title/ISBN/bio  
