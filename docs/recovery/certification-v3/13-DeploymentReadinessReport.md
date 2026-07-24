# Deployment Readiness Report — Certification v3.0

## Deploy candidate (local)

Uncommitted certification repairs:
- `services/directAnswerFormatter.js`
- `services/responseRevisionOwner.js`
- `services/singleCompanionContract.js`
- `scripts/runFounderTruthCorpus.js`

Working tree also contains unrelated Stage-1 admin auth/stabilization edits (`server.js`, admin login, runtime health auth, etc.). **Do not bundle blindly.**

## Deploy gate

1. Isolate companion certification files into a focused commit
2. Deploy to production
3. Require `BUDDY_URL=<prod> node scripts/runFounderTruthCorpus.js` → 19/19
4. Require Phase 5O + scripture fidelity + decision ownership PASS
5. Only then consider closing `coreCompanionIncident`

## Current deploy readiness for Founder Alpha

**NOT READY** — production currently fails Truth Corpus; incident remains OPEN.
