# Production Deployment Verification — Core Companion Recovery

| Item | Value |
|---|---|
| Pre-repair production commit | `1a59160` |
| Deployed recovery commit | `7fc7acf` |
| Branch | `main` (merged from `recovery/core-companion-master-v1`) |
| Pre-recovery tag | `recovery-pre-core-companion-v1.0.0` |
| Health after deploy | `ok:true`, `releaseCommit:7fc7acf` |
| Production Phase 5O | **PASS** |
| Production Founder multi-turn corpus | **10/10 PASS** |
| Incident status | OPEN — `NOT_READY_FOR_FOUNDER_ALPHA` until Founder review |
| Rollback | `git reset --hard recovery-pre-core-companion-v1.0.0` + push (see ROLLBACK_PLAN.md) |

Production API replay used `BUDDY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`.
