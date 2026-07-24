# Updated Deployment Readiness Report — RC v4.0

| Gate | Status |
|---|---|
| Companion P0 repairs committed | `fb2cb52` |
| Pushed to `origin/main` | YES |
| Render autoDeploy | Observed (H1 DUP→CLEAN) |
| Production Truth Corpus | 32/32 PASS |
| Unrelated Stage-1 admin auth edits | Still local dirty — **not deployed** (correct isolation) |
| Rollback | Redeploy `7fc7acf` or `git revert fb2cb52` |

## Deployment recommendation

Companion RC code is on production. Do not bundle unrelated admin working-tree changes into the next deploy without separate review.
