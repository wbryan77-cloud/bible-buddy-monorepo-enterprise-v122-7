# Rollback Plan

## Pre-recovery snapshot

- Tag: `recovery-pre-core-companion-v1.0.0`
- Commit: `1a59160` (also previous production)

## Rollback commands

```bash
git checkout main
git reset --hard recovery-pre-core-companion-v1.0.0
# or: git revert <recovery-commit-range>
git push origin main
# Render autoDeploy will redeploy 1a59160
```

## Data impact

No schema migrations. Continuation memory is session state under existing doctrine conversation files — safe to leave or clear.

## When to rollback

- Production Companion worse than baseline
- Scripture fidelity smoke fails after deploy
- Startup crash / missing module
