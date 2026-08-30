# Volume 1 Production — README

## Primary deliverables

| Build | Path |
|-------|------|
| Internal reading proof | `output/BOOKBUDDY_VOLUME1_FULL_READING_PROOF.pdf` |
| **Final interior candidate** | `output/BOOKBUDDY_VOLUME1_FINAL_INTERIOR_CANDIDATE.pdf` |

## Rebuild publication candidate

```bash
/tmp/bb-vol1-venv/bin/python docs/bookbuddy-build/publishing/production/volume1/build_final_interior.py
```

Requires Google Chrome at the standard macOS path and the local venv with `pypdf` + `reportlab` for folio stamping.  
Does **not** modify frozen `manuscript/**/04_FULL.md`.

## Rebuild reading proof (internal)

```bash
python3 docs/bookbuddy-build/publishing/production/volume1/build_full_interior.py
```

## Key Phase 3B docs

- `FOUNDER_METADATA_REQUIRED.md`
- `Volume1_FinalInteriorIntegrityReport.md`
- `Volume1_Phase3BProductionDiff.md`
- `Volume1_Phase3BProposedCommitAllowlist.md`
- `Volume1_Phase3BFinalQA.md`
- `Volume1_ProductionCorrectionRequests.md`
