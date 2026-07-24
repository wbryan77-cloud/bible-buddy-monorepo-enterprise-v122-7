# 00 — Preflight Snapshot (Certification v5.0)

Date: 2026-07-24  
Branch: `main`  
Repo HEAD at start of v5 work: `5d9fef8`  
Production health: `v122.14.0 (platform unification foundation)` ok  
Production commit lineage: `fb2cb52` companion repairs + `5d9fef8` incident close (deployed via autoDeploy)  

## Starting corpus

- Founder Truth Corpus: 32 automated cases (`scripts/runFounderTruthCorpus.js`)
- Prior status: RC4 **NO_GO** (residuals R1–R7)
- Rollback point: `5d9fef8` (pre-v5 runtime changes)

## Immediate P0 found in v5 challenge (before repair)

Production answered resurrection-timing questions with **death-sleep / resurrection-hope** doctrine (`doctrine_final_authority` topic `resurrection`) or OpenAI tradition answers that confused discovery with rising time.

Examples (pre-repair production):
- “Was the resurrection on Sunday, or already risen before the first day?” → death-sleep witnesses
- “Was he already risen when Mary reached the tomb?” → “No, not yet risen” (contradicts Gospel discovery wording)

## Working directory

`docs/recovery/certification-v5/` (new; does not overwrite rc4)
