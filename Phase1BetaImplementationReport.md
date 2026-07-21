# Phase 1 Beta Implementation Report

**Date:** 2026-06-01  
**Status:** Implemented locally (no deploy, no push, no Sprint 3).  
**Plans followed:** [HumanBetaEnablementPlan.md](./HumanBetaEnablementPlan.md), [HumanBetaTestingInventoryAudit.md](./HumanBetaTestingInventoryAudit.md)

---

## Summary

Phase 1 adds the **minimum wiring** for internal (2–3) and external (10–20) human betas on the **same** path: `POST /buddy/chat` → `buddy-sessions.jsonl`, with `POST /api/beta/feedback` → `companion-feedback.jsonl`, review UI, and export script.

**Not modified:** composer, doctrine, memory logic, RACL, reason-first runtime, companion architecture (only **pass-through** fields on `appendSession` / `finalizeBuddyResponse` and two lines in `masterBuddyRuntime` for `testerId` / `sessionId` / `cohort`).

---

## What was implemented

| Part | Deliverable | Status |
|------|-------------|--------|
| A | Removed public `express.static('/data')` | Done — `server.js` |
| B | `data/beta-testers.json` registry | Done |
| C | `testerId` + `sessionId` on session log lines | Done — `buddyBrain`, `routes/buddy`, `masterBuddyRuntime` |
| D | `POST /api/beta/feedback` + extended feedback jsonl | Done — `routes/beta.js`, `companionIntelligence.js` |
| E | `public/beta.html` (+ `/beta` route) | Done |
| F | `admin/beta-review.html` (+ `/admin/beta-review`) | Done |
| G | `scripts/exportBetaData.js` | Done |
| H | Launch instructions | Below + this report |
| I | Success criteria | Below |

### New / changed files

| File | Role |
|------|------|
| `data/beta-testers.json` | Tester registry (internal + external placeholders) |
| `services/betaRegistry.js` | Read/validate testers |
| `services/betaSessionReader.js` | Read sessions + feedback for review/export |
| `routes/beta.js` | `/api/beta/testers`, `/feedback`, `/review` |
| `public/beta.html` | Tester chat + feedback UI |
| `admin/beta-review.html`, `admin/js/beta-review.js` | Review UI |
| `scripts/exportBetaData.js` | CSV + JSON export |
| `server.js` | Secure data, mount beta routes, `/beta`, `/admin/beta-review` |
| `services/companionIntelligence.js` | Beta 1–5 rating fields on feedback |
| `services/buddyBrain.js` | `normalizeInput` + `appendSession` beta fields |
| `services/masterBuddyRuntime.js` | Pass beta context to `finalizeBuddyResponse` |
| `routes/buddy.js` | Accept `testerId`, `sessionId`, `cohort` |

---

## PART H — Launch instructions

### Prerequisites

1. Node 20+, dependencies installed: `npm install`
2. `OPENAI_API_KEY` set for real Buddy replies
3. `BUDDY_RUNTIME=legacy` (default) for beta unless ops explicitly tests another runtime on staging
4. Optional: `BETA_REVIEW_TOKEN` — if set, review API and page require `Authorization: Bearer <token>`; if **unset**, review is open (fine for local internal review)

Start server:

```bash
cd /path/to/bible-buddy-monorepo-enterprise-v122-7
export OPENAI_API_KEY=sk-...
# optional for external deploy:
# export BETA_REVIEW_TOKEN=your-secret-review-token
node server.js
```

Base URL examples: `http://localhost:3000` or your Render URL.

---

### A. Internal beta (2–3 users)

#### 1. Setup

1. Edit `data/beta-testers.json`:
   - Set `active: true` for `beta-internal-01` … `beta-internal-03`
   - Set `displayName` (and optional `email`)
2. Keep `cohort: "internal"`
3. Start server (above)

#### 2. Invite flow

1. Send each tester: **`https://<host>/beta`**
2. Tell them to select their name from the dropdown (maps to `testerId`)
3. Click **Start session** (generates `sessionId` in browser)

No login required for internal beta.

#### 3. Feedback flow

1. Tester chats (≥1 message)
2. **End session & give feedback**
3. Rate all five dimensions 1–5, optional comment, consent checkbox
4. **Submit feedback** → `data/companion-feedback.jsonl`

#### 4. Review flow

1. Open **`https://<host>/admin/beta-review`**
2. Enter review token if `BETA_REVIEW_TOKEN` is set
3. Filter cohort **internal** → **Load sessions**
4. Click a session → transcript + linked feedback

#### 5. Export flow

```bash
node scripts/exportBetaData.js --cohort internal --out docs/beta/exports
```

Outputs: `beta-internal-<timestamp>.json`, `-conversations.csv`, `-feedback.csv`

---

### B. External beta (10–20 users)

Same workflow as internal; only registry and ops differ.

#### 1. Setup

1. Add rows to `data/beta-testers.json`:
   - `testerId`: `beta-external-01` … `beta-external-20`
   - `cohort`: `"external"`
   - `active`: `true` when invited
   - Optional `email` for ops tracking (not used by app auth)
2. **Set `BETA_REVIEW_TOKEN`** on production before external launch
3. Confirm **`/data` is not publicly served** (implemented in this phase)

#### 2. Invite flow

1. One invite link per tester: `https://<host>/beta` (same URL; identity from dropdown)
2. Optionally pre-document which `testerId` each person must select
3. Do **not** use `lab.html` or `/api/ai/tester-chat` for cohort testing

#### 3–5. Feedback, review, export

Same as internal; use cohort filter **external** in review UI and:

```bash
node scripts/exportBetaData.js --cohort external --out docs/beta/exports
```

---

## PART I — Success criteria

| Criterion | Met? | How |
|-----------|------|-----|
| Non-technical tester opens beta page | Yes | `/beta` |
| Talks to Buddy | Yes | `POST /buddy/chat` with `testerId` + `sessionId` |
| Leaves feedback | Yes | In-page form → `POST /api/beta/feedback` |
| Transcript stored | Yes | `data/buddy-sessions.jsonl` with `testerId`, `sessionId`, `cohort` |
| Feedback linked to transcript | Yes | Shared `sessionId` + `testerId`; review API joins them |
| No SSH required | Yes | Review at `/admin/beta-review`; export via script on server filesystem (ops machine) |

### Verification performed (local)

- `GET /api/beta/testers` returns 3 active internal testers
- `GET /data/buddy-sessions.jsonl` → **404** (public data exposure removed)
- `POST /api/beta/feedback` saves with five ratings
- `exportBetaData.js` produces JSON + CSV

### Recommended before first external tester

1. Set `BETA_REVIEW_TOKEN` on deploy
2. Activate only invited rows in `beta-testers.json`
3. Run `node scripts/sprint2FinalReleaseGate.js` on release candidate
4. Confirm Render persistent disk (or accept session loss on redeploy)

---

## API reference (beta)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/beta/testers` | None | List active testers |
| GET | `/api/beta/testers/:testerId` | None | Validate tester |
| POST | `/api/beta/feedback` | None | Submit session feedback |
| GET | `/api/beta/review` | Token if env set | Session index + feedback snippets |
| GET | `/api/beta/review/session/:sessionId` | Token if env set | Full transcript + feedback |
| GET | `/api/beta/review/tester/:testerId` | Token if env set | Sessions + feedback for one tester |

### Feedback body (`POST /api/beta/feedback`)

Required: `testerId`, `sessionId`, `feltHeard`, `usefulness`, `biblicalFaithfulness`, `naturalness`, `wouldUseAgain` (each 1–5).  
Optional: `comment`, `cohort`, `consentForAggregateReview` (default true if omitted in UI).

### Chat body (`POST /buddy/chat`)

Include: `testerId` (or `userId`), `sessionId`, `cohort`, `message`, `mode`, `personaKey`.

---

## Enabling external testers in registry

Example: activate `beta-external-01`:

```json
{
  "testerId": "beta-external-01",
  "displayName": "External Tester 1",
  "email": "tester@example.com",
  "cohort": "external",
  "createdAt": "2026-06-01T00:00:00.000Z",
  "active": true
}
```

Duplicate pattern for `beta-external-02` … `20`.

---

## Security notes

- **Removed:** `app.use('/data', express.static(DATA_DIR))` — session/feedback files are not web-accessible.
- **Review:** Optional bearer token via `BETA_REVIEW_TOKEN`.
- **Feedback:** Only registered active `testerId` values accepted.
- **Beta chat:** No authentication (per spec); trust registry + invite discipline for closed beta.

---

## Known limitations (acceptable for Phase 1)

- File-based storage only (single-instance disk)
- No automated delete-by-user API
- No email invites from app
- `recordCompanionEvent` still not called from main legacy path (optional telemetry)
- Export script runs on server filesystem (reviewer needs shell or copied files unless download API added later)

---

## Stop line

Implementation complete per Phase 1 scope. **No deploy, no push, no Sprint 3** performed.
