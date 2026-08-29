# Volume 1 — Manuscript Immutability Policy

**Date:** 2026-08-29  

---

## Rule

**FROZEN_MANUSCRIPT ≠ DESIGN_COPY**

| Artifact | Role |
|---|---|
| `manuscript/volume1/**/04_FULL.md` at `b2d4e63208946e796244c6d5815fc2dba3769d6c` | Authoritative literary source |
| Derived production files | Typesetting / EPUB inputs |
| Design docs under `publishing/design/` | Intent & specification |

**Never** silently alter frozen source to fix a layout problem (overmatter, bad break, heading collision, etc.).

---

## Allowed design transformations (derived files only)

- Heading style mapping  
- Soft hyphenation hints  
- Page-break suggestions (non-destructive comments)  
- Table column widths  
- Callout wrappers  
- Stripping internal non-reader markers if any  

## Not allowed without Founder approval

- Story rewrites  
- Doctrine / Scripture / OL conclusion changes  
- Character arc changes  
- Series through-line changes  
- “Preferable wording” polish  

---

## MANUSCRIPT_CHANGE_REQUEST template

If design reveals a genuine textual error:

```
MANUSCRIPT_CHANGE_REQUEST
chapter:
exact text (current):
problem:
proposed correction:
reason:
doctrine impact: none/low/high
story impact: none/low/high
Founder approval: pending
```

No correction enters the frozen manuscript without explicit Founder approval and a new controlled commit.

---

## Success test

Diff from freeze commit on `04_FULL.md` remains empty throughout design phases unless Founder authorizes a text fix commit.
