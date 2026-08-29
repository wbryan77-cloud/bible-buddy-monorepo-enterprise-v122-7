# BookBuddy COMMIT_ALLOWLIST

Use **only** when Founder explicitly requests a commit.  
Do **not** use `git add -A`.

## Include (stage these)

```
docs/bookbuddy-build/.gitignore
docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/START_HERE_CURSOR_BUILD_MASTER_FINAL.md
docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/README_FINAL_CURSOR_DROP.md
docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/SOURCE_MANIFEST_FINAL.json
docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/10_SUPPORT/
docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/09_PUBLIC_DOMAIN_PHILOSOPHY_STRATEGY/PHILOSOPHY_STRATEGY_SOURCE_REGISTRY.json
docs/bookbuddy-build/publishing/
```

Suggested command shape (when authorized):

```bash
git add \
  docs/bookbuddy-build/.gitignore \
  docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/START_HERE_CURSOR_BUILD_MASTER_FINAL.md \
  docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/README_FINAL_CURSOR_DROP.md \
  docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/SOURCE_MANIFEST_FINAL.json \
  docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/10_SUPPORT \
  docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/09_PUBLIC_DOMAIN_PHILOSOPHY_STRATEGY/PHILOSOPHY_STRATEGY_SOURCE_REGISTRY.json \
  docs/bookbuddy-build/publishing
```

## Exclude (never stage for BookBuddy commit)

- `docs/bookbuddy-build/**/07_CURSOR_TEXT_DERIVATIVES/` (ignored)
- `docs/bookbuddy-build/**/05_EXCLUDED_OR_PENDING/` (ignored)
- Ebook binary dirs / `*.epub` under drop (ignored)
- All `docs/evidence-candidates/bible-intelligence-engine-v1.3*` / `v1.4*` / `v1.6*` packs
- `docs/production-certification/2026-08-10/**`
- Dirty root `*Report.md` / discovery JSON listed in CommitReadinessResolution Blocker A
- Any `.env`, credentials, keys

## Verify before commit

```bash
git status --porcelain docs/bookbuddy-build
git check-ignore -v docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/07_CURSOR_TEXT_DERIVATIVES/Atomic_Habits_James_Clear_Internet_Archive_OCR.md
# must show ignored
```
