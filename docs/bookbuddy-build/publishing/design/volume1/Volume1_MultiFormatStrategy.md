# Volume 1 — Multi-Format Strategy (Print / EPUB / Digital PDF)

**Date:** 2026-08-29  
**Rule:** One layout cannot simply be exported to all formats without adaptation.

---

## PRINT

| Survives | Changes | Cannot be page-dependent in other formats |
|---|---|---|
| Full grid, folios, running heads | — | Intentional blank versos; page-turn reveals |
| Hairline callouts | — | “See facing page” |
| Table layouts | May simplify | — |
| Chapter sink | — | — |
| Widow/orphan control | Engine-specific | — |

**Scripture:** block indent + leading.  
**Reflection:** physical space / short pages.  
**Openers:** recto starts preferred.

---

## REFLOWABLE EPUB

| Survives | Changes |
|---|---|
| Semantic structure | Lose fixed page turns / blanks |
| Scripture as blockquote CSS | No reliance on “bottom of page” |
| Callouts as `aside` / class | Simplify borders |
| Tables | Stack or list fallback |
| Keepable Rule / Monday Mercy | Styled block, not absolute-position card |
| OL Unicode | Must embed/license fonts carefully |

**Do not** fake print spreads in EPUB.  
**Do not** use text images for Hebrew/Greek.

---

## DIGITAL PDF (fixed)

| Role | Notes |
|---|---|
| Proof / review PDF | Mirrors print closely |
| Reader PDF | Optional; same accessibility contrast rules |
| Not a substitute for EPUB | Reflow users need EPUB |

---

## Cross-format component behavior

| Component | Print | EPUB | PDF |
|---|---|---|---|
| Chapter opener | Sink + recto | Top of chapter file | Sink |
| Scripture | Block | Blockquote | Block |
| Callout | Hairline box | Aside | Hairline |
| Reflection space | Blank/margin | Margin + page-break opportunity | Margin |
| Diagram | Vector | SVG/HTML | Vector |
| Last quiet spread | Possible blank | Extra paragraph spacing + break | Possible blank |

## Success test

Each format feels native — not a broken export.
