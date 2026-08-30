# Proposed Phase 2 Commit Allowlist

**Status:** AWAITING FOUNDER AUTHORIZATION — do not commit until Founder says so.  
**Suggested message:** `BookBuddy: lock Volume 1 Phase 2 interior design system`

## Include (explicit paths only — never `git add .`)

### Controlling / lock / QA docs (modified or new under design/volume1/)

- `docs/bookbuddy-build/publishing/design/volume1/Volume1_InteriorDesignBible.md` (modified)
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase1DecisionRegister.md` (modified)
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2FounderDecision.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2PrototypeLock.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2ProductionReadiness.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2TypographyQA.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2ScriptureQA.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2OriginalLanguageQA.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2AccessibilityQA.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2PrintEPUBStrategy.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2FinalQA.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_ProductionCorrectionRequests.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2DesignComparison.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2FounderReviewGuide.md`
- `docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2ProposedCommitAllowlist.md`

### Prototype workspace (entire tree — BookBuddy Phase 2 only)

- `docs/bookbuddy-build/publishing/design/volume1/prototypes/`  
  (README, build script, derived sources, HTML/PDF renders, QA, diagram review, typography proof)

### Build log append

- `docs/bookbuddy-build/publishing/BUILD_LOG.md`

## Exclude (never stage)

- All `04_FULL.md` / manuscript files  
- `services/**` `routes/**` `server.js` `lib/**` `public/**`  
- Root discovery reports, `docs/evidence-candidates/**`, `docs/production-certification/**`, alpha/bible-learning dirty files  
- Any non-BookBuddy path  

## Staging pattern (when Founder authorizes)

```bash
git add -- \
  docs/bookbuddy-build/publishing/BUILD_LOG.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_InteriorDesignBible.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase1DecisionRegister.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2FounderDecision.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2PrototypeLock.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2ProductionReadiness.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2TypographyQA.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2ScriptureQA.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2OriginalLanguageQA.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2AccessibilityQA.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2PrintEPUBStrategy.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2FinalQA.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_ProductionCorrectionRequests.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2DesignComparison.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2FounderReviewGuide.md \
  docs/bookbuddy-build/publishing/design/volume1/Volume1_Phase2ProposedCommitAllowlist.md \
  docs/bookbuddy-build/publishing/design/volume1/prototypes
```

Then `git diff --cached --name-status` audit before commit. **Do not push** unless Founder asks.
