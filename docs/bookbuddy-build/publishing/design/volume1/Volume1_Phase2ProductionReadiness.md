# Volume 1 — Phase 2 Production Readiness

**Date:** 2026-08-29  
**Purpose:** Harden toolchain documentation before full-book typesetting.  
**Constraint:** No license purchases; no app dependency installs; no full interior build in this phase.

---

## 1. Typesetting / rendering tool

| Candidate | Role | Status |
|---|---|---|
| Phase 2 prototype path | HTML + headless Chrome → PDF | PROTOTYPE ONLY |
| Production recommendation | Professional book tool (Adobe InDesign **or** Affinity Publisher **or** Typst/LaTeX book class) | **FOUNDER_DECISION_REQUIRED** before full interior |

Prototype path proved 6×9 geometry and system intent. It is **not** the final press toolchain.

**Reproducible prototype build (already present):**

```bash
python3 docs/bookbuddy-build/publishing/design/volume1/prototypes/build_prototypes.py
```

Outputs under `prototypes/direction-*/rendered/`.

---

## 2–5. Fonts

| Role | Working candidate | Status |
|---|---|---|
| Body (Direction C) | Georgia (system-proofed in prototype) | WORKING — **not final commercial lock** |
| Body (Direction A foil) | Baskerville | REFERENCE only |
| Heading strategy | Same family + small-caps furniture demotion | LOCKED strategy |
| Hebrew support | Arial Unicode MS / NewPeninimMT (prototype) | Needs production-grade Hebrew-capable face |
| Greek support | Same Unicode companion as prototype | Needs production confirmation |

### Georgia commercial note

macOS **system Georgia** was used for prototype rendering. System fonts are **not** automatically cleared for commercial embedding/redistribution in print/EPUB products.  

**FONT_LICENSE_STATUS:** `EXTERNAL_VERIFICATION_REQUIRED` / Founder must approve a licensed source (e.g., licensed Georgia/ITC, or an open long-form serif substitute after controlled proof).  

**Do not silently substitute** a different final body face. If proposing a superior serif, produce a Founder font proof first.

---

## 6. Font licensing status

`NOT LOCKED` — verification required before press PDF / EPUB ship.

---

## 7. Print PDF export settings (intent)

| Setting | Intent |
|---|---|
| Page size | Exactly 6×9 (no bleed for text-only) |
| Format | Single-page PDF (1-up) |
| Fonts | All embedded / subset embedded |
| Color | Grayscale / B&W interior |
| Marks | No crop/registration/printer marks |
| Compatibility | Target KDP + Ingram-capable file |

Exact PDF/X preset = tool-dependent → finalize with chosen typesetter.

---

## 8. EPUB strategy

| Rule | Lock |
|---|---|
| Separate from print pagination | LOCKED |
| Semantic HTML headings | LOCKED |
| Scripture as blockquote/styled paras | LOCKED |
| Callouts degrade to `aside`/class | LOCKED |
| Hebrew/Greek real Unicode | LOCKED |
| No print page-geometry theater | LOCKED |

EPUB generator TBD with typesetting tool choice.

---

## 9. Source-to-layout workflow

```
frozen 04_FULL.md (immutable)
  → derived production files (copy/transform wrappers only)
  → typesetting templates (C system + A governor)
  → proof PDF
  → Founder markup
  → design fixes (not prose)
  → if text error: ProductionCorrectionRequest → Founder approval → new freeze commit
  → final print PDF + EPUB
```

---

## 10. Reproducible build command

Prototype: `build_prototypes.py` (documented above).  
Full interior: **PENDING** tool lock.

**REPRODUCIBLE_BUILD_STATUS:** Prototype = YES · Full interior = PENDING_TOOL_LOCK

---

## 11. Output directory structure

```
publishing/design/volume1/
  Volume1_InteriorDesignBible.md          # controlling intent
  Volume1_Phase2FounderDecision.md
  Volume1_Phase2PrototypeLock.md
  Volume1_Phase2ProductionReadiness.md
  prototypes/
    source/                               # derived copies
    direction-c-…/rendered/               # C proofs
    direction-a-…/rendered/               # A restraint proofs
    qa/
```

Future (not created yet): `publishing/production/volume1/` for derived typeset sources — Founder-authorized when full interior starts.

---

## 12. QA workflow

1. Prototype system lock (this phase)  
2. Font proof + license clearance  
3. Sample chapters typeset in final tool (ch00/06/08/12)  
4. Full interior  
5. Widow/orphan/Scripture-break pass  
6. Hebrew/Greek technical QA  
7. KDP + Ingram preflight  
8. EPUB semantic QA  
9. Founder acceptance  

---

## External production verification (DESIGN INTENT vs PRINTER SPEC)

### KDP (verified against current Amazon Help)

Source: [KDP Set Trim Size, Bleed, and Margins](https://kdp.amazon.com/help/topic/GVBQ3CMEQW3W2VL6)

| Item | Spec |
|---|---|
| Common US trim | 6×9 supported |
| No-bleed outside/top/bottom min | 0.25 in |
| Inside 151–300 pp | 0.5 in min |
| Inside 301–500 pp | **0.625 in min** |
| Bleed | 0.125 in top/bottom/outside if used; not on gutter |

**KDP_VERIFICATION_STATUS:** VERIFIED (Help topic, 2026 check)  
Prototype inside **0.90 in** remains above both 300- and 500-page tiers.

### IngramSpark (verified against File Creation / Print guidelines)

| Item | Spec |
|---|---|
| Interior | Single-page PDF at trim; fonts embedded |
| Margin recommendation | **≥0.5 in** all sides (common guidance) |
| Bleed | 0.125 in three outer edges if needed |
| Strictness | Often PDF/X + embedding enforcement |

**INGRAM_VERIFICATION_STATUS:** VERIFIED at guidance level (File Creation Guide / Print Book File Guidelines). Exact PDF/X preset remains tool-lock dependent.

### Dual-platform comfort model (design intent)

Keep comfort margins (≈0.75–0.90 inside) rather than platform minima as aesthetic targets — matches Founder Phase 2 note.
