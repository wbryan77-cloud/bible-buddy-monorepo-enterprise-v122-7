# Volume 1 — Production Toolchain

**Date:** 2026-08-29  
**Constraints:** Do not install new dependencies without Founder authorization. Do not modify production application code (`services/`, `routes/`, `server.js`, `lib/`, `public/`).

---

## Goals

REPEATABILITY · VERSION CONTROL · HIGH TYPOGRAPHIC QUALITY · LOW MANUSCRIPT DRIFT

---

## Recommended architecture (conceptual)

| Layer | Recommendation | Status |
|---|---|---|
| SOURCE_OF_TRUTH | Frozen git `04_FULL.md` at freeze commit | LOCKED |
| DESIGN_SOURCE | Derived files under `publishing/design/` + future `publishing/production/` (not yet created) | RECOMMENDED |
| TYPESETTING | Professional book tool (InDesign **or** Quark **or** Typst/LaTeX book class) — Founder chooses | FOUNDER_DECISION_REQUIRED |
| PRINT_OUTPUT | Press-ready PDF/X as printer requires | EXTERNAL_VERIFICATION_REQUIRED |
| EPUB_OUTPUT | Separate HTML/CSS pipeline or tool export with QA | RECOMMENDED |
| PDF_OUTPUT | Proof PDF + optional reader PDF | RECOMMENDED |
| VERSIONING | Git tags for design releases; never silent-edit frozen md | LOCKED policy |
| QA_WORKFLOW | Prototype → Founder review → expand → print proofs → ebook QA | RECOMMENDED |

---

## Workflow sketch

```
frozen 04_FULL.md
  → derive chapter production markdown/docx (no silent wording changes)
  → place into templates (print + epub)
  → proof PDF
  → Founder markup
  → revise design (not doctrine)
  → if textual error: MANUSCRIPT_CHANGE_REQUEST → Founder approval → new freeze commit
  → final print PDF + EPUB
```

## Not recommended

- Editing frozen manuscript inside InDesign as sole source  
- One-click “Markdown to book” without typographic QA  
- Coupling BookBuddy app deploy to book interior  

## Tooling note

Phase 1 does **not** install fonts, InDesign scripts, or npm book pipelines. Selection waits Founder authorization.
