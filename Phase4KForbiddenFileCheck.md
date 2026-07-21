# Phase 4K — Forbidden File Check

Generated: 2026-06-12

## Commands run

```bash
git status --short
git diff --name-only
git diff --cached --name-only
```

## Pre-staging state

- **Cached (staged):** empty
- **Modified (unstaged):** included forbidden-adjacent files:
  - `docs/bible-learning/approved-doctrine-registry.json` — **not staged**
  - `services/evidenceCards/deathState.card.js`, `index.js`, `sabbath.card.js` — **not staged**
  - Various `docs/*.json` regression artifacts — **not staged**

## Post-staging (`bash scripts/phase4i-git-add-runtime.sh`)

### Forbidden category scan on `git diff --cached --name-only`

| Forbidden pattern | Found in staged? | Action |
|-------------------|------------------|--------|
| `.env` | ❌ No | — |
| `data/*` | ❌ No | — |
| `*.jsonl` | ❌ No | — |
| `services/evidenceCards/*` | ❌ No | — |
| `docs/evidence-candidates/*` | ❌ No | — |
| `docs/bible-learning/approved-doctrine-registry.json` | ❌ No | — |
| Corpus / doctrine pack files | ❌ No | — |
| API key literals (`sk-`, etc.) | ❌ No | See secret scan |

**No forbidden files were staged. No unstage action required.**

## Modified but correctly excluded (remain unstaged)

| File | Why excluded |
|------|--------------|
| `services/evidenceCards/*` | Forbidden evidence card edits |
| `docs/bible-learning/approved-doctrine-registry.json` | Forbidden doctrine registry |
| `services/retrievalEvidencePack.js` | Modified locally; not in runtime staging script |
| `services/companionIntelligence.js` | Not in staging script |
| `package.json` / `package-lock.json` | Not in staging script |
| All `data/*` | Untracked; never staged |

## Verdict

**PASS** — Forbidden file gate clean. Selective staging only via `scripts/phase4i-git-add-runtime.sh`.
