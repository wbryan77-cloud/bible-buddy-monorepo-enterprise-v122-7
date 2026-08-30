# Volume 1 — Phase 3B proposed commit allowlist

**DO NOT** use `git add .` / `git add -A` / `git commit -a`.  
Stage **only** the paths below when Founder authorizes the Phase 3B production commit.

Approved HEAD before this commit should remain: `c06ecc2999497e05944b3b9ceca7a1fa667691f2`.

## Allowlist (exact)

### Builder / config

- `docs/bookbuddy-build/publishing/production/volume1/build_final_interior.py`
- `docs/bookbuddy-build/publishing/production/volume1/build_full_interior.py` *(if modified in Phase 3 tree)*
- `docs/bookbuddy-build/publishing/production/volume1/README.md`
- `docs/bookbuddy-build/publishing/production/volume1/config/` *(entire Phase 3 production config directory if present)*
- `docs/bookbuddy-build/publishing/production/volume1/fonts/` *(vendored OFL fonts used by builds)*

### Derived sources (byte copies of frozen manuscript — presentation pipeline only)

- `docs/bookbuddy-build/publishing/production/volume1/derived/`

### Output — retain both proof and candidate

- `docs/bookbuddy-build/publishing/production/volume1/output/BOOKBUDDY_VOLUME1_FULL_READING_PROOF.pdf`
- `docs/bookbuddy-build/publishing/production/volume1/output/BOOKBUDDY_VOLUME1_FULL_READING_PROOF.html`
- `docs/bookbuddy-build/publishing/production/volume1/output/BOOKBUDDY_VOLUME1_FINAL_INTERIOR_CANDIDATE.pdf`
- `docs/bookbuddy-build/publishing/production/volume1/output/BOOKBUDDY_VOLUME1_FINAL_INTERIOR_CANDIDATE.html`
- `docs/bookbuddy-build/publishing/production/volume1/output/final_interior_meta.json`
- `docs/bookbuddy-build/publishing/production/volume1/output/build_meta.json` *(if present from Phase 3)*

### Optional build intermediates / QA evidence (include only if Founder wants rebuild evidence in-repo)

- `docs/bookbuddy-build/publishing/production/volume1/output/_build_pass1.html`
- `docs/bookbuddy-build/publishing/production/volume1/output/_build_pass1.pdf`
- `docs/bookbuddy-build/publishing/production/volume1/output/_final_raw.pdf`
- `docs/bookbuddy-build/publishing/production/volume1/output/qa_pages/`

**Final Interior Lock commit decision:** optional intermediates / `qa_pages/` are **NOT staged** (rebuildable from builders; keep lock commit lean).

### Phase 3 / 3B docs

- `docs/bookbuddy-build/publishing/production/volume1/FOUNDER_METADATA_REQUIRED.md`
- `docs/bookbuddy-build/publishing/production/volume1/Volume1_ProductionCorrectionRequests.md`
- `docs/bookbuddy-build/publishing/production/volume1/Volume1_FinalInteriorIntegrityReport.md`
- `docs/bookbuddy-build/publishing/production/volume1/Volume1_Phase3BProductionDiff.md`
- `docs/bookbuddy-build/publishing/production/volume1/Volume1_Phase3BProposedCommitAllowlist.md`
- `docs/bookbuddy-build/publishing/production/volume1/Volume1_ProductionDecision.md`
- `docs/bookbuddy-build/publishing/production/volume1/Volume1_ManuscriptIntegrityManifest.md`
- `docs/bookbuddy-build/publishing/production/volume1/Volume1_FullInteriorQA.md`
- `docs/bookbuddy-build/publishing/production/volume1/Volume1_ProductionBuildLog.md`
- `docs/bookbuddy-build/publishing/production/volume1/Volume1_Phase3BFinalQA.md`

## Explicitly exclude

- All `manuscript/volume1/**/04_FULL.md` (must remain untouched)
- Unrelated dirty-tree files outside `docs/bookbuddy-build/publishing/production/volume1/`
- `output/_chrome_test.pdf` (scratch diagnostic; already deleted; never commit)
- `proofs/` internal technical proof HTML/PDF (not on core allowlist; leave untracked)
- Optional `output/_build_pass1.*`, `output/_final_raw.pdf`, `output/qa_pages/` (omitted from lock commit)
- Runtime / services / app code
- Design prototype reopen artifacts (unless already committed in Phase 2)

## Suggested staging command (after Founder approval)

```bash
git add \
  docs/bookbuddy-build/publishing/production/volume1/build_final_interior.py \
  docs/bookbuddy-build/publishing/production/volume1/build_full_interior.py \
  docs/bookbuddy-build/publishing/production/volume1/README.md \
  docs/bookbuddy-build/publishing/production/volume1/FOUNDER_METADATA_REQUIRED.md \
  docs/bookbuddy-build/publishing/production/volume1/Volume1_*.md \
  docs/bookbuddy-build/publishing/production/volume1/config \
  docs/bookbuddy-build/publishing/production/volume1/fonts \
  docs/bookbuddy-build/publishing/production/volume1/derived \
  docs/bookbuddy-build/publishing/production/volume1/output/BOOKBUDDY_VOLUME1_FULL_READING_PROOF.pdf \
  docs/bookbuddy-build/publishing/production/volume1/output/BOOKBUDDY_VOLUME1_FULL_READING_PROOF.html \
  docs/bookbuddy-build/publishing/production/volume1/output/BOOKBUDDY_VOLUME1_FINAL_INTERIOR_CANDIDATE.pdf \
  docs/bookbuddy-build/publishing/production/volume1/output/BOOKBUDDY_VOLUME1_FINAL_INTERIOR_CANDIDATE.html \
  docs/bookbuddy-build/publishing/production/volume1/output/final_interior_meta.json \
  docs/bookbuddy-build/publishing/production/volume1/output/build_meta.json
```

Then verify `git status` / `git diff --cached --stat` show **only** BookBuddy production paths.
