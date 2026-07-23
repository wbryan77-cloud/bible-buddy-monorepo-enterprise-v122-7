# Authentication Architecture Diagram & Flow Diagram
### BibleBuddy Enterprise Security Stabilization — Phase 1A

## Architecture Diagram — BEFORE

```
                    ┌────────────────────────────────────────────┐
                    │              server.js                      │
                    │                                              │
                    │  GET /admin/api/selftest    ─── NO AUTH ───┐│
                    │  GET /admin/api/providers   ─── NO AUTH ───┤│
                    └──────────────────────────────────────────┬──┘
                                                                 │
        ┌────────────────────────────┬───────────────────────────┼────────────────────────────┐
        ▼                            ▼                           ▼                            ▼
┌───────────────────┐    ┌───────────────────┐      ┌───────────────────┐      ┌────────────────────┐
│ bibleAuthorityAdmin│    │    alphaAdmin.js    │      │      beta.js        │      │  adminAssistant.js   │
│        .js          │    │                     │      │                     │      │                      │
│ own checkAdminAuth  │    │ own checkAdminAuth  │      │ own checkReviewAuth │      │     NO AUTH AT ALL     │
│                     │    │                     │      │                     │      │      (either route)    │
│ checks:              │    │ checks:              │      │ checks:              │      │                      │
│  BIBLE_AUTH_TOKEN    │    │  ALPHA_ADMIN_TOKEN   │      │  BETA_REVIEW_TOKEN   │      │  POST /assistant      │
│  ALPHA_ADMIN_TOKEN   │    │  BETA_REVIEW_TOKEN   │      │                     │      │  GET /project-brain   │
│  BETA_REVIEW_TOKEN   │    │                     │      │ if empty: OPEN ✗    │      │  → always OPEN ✗       │
│                     │    │ if empty: OPEN ✗    │      │                     │      │                      │
│ if empty: OPEN ✗    │    │ (never checks        │      │ (never checks        │      │                      │
│ (but prod sets       │    │  BIBLE_AUTH_TOKEN)   │      │  BIBLE_AUTH_TOKEN)   │      │                      │
│  BIBLE_AUTH_TOKEN,    │    │                     │      │                     │      │                      │
│  so this file is      │    │ ── LIVE: OPEN ──►    │      │ ── LIVE: OPEN ──►    │      │  ── LIVE: OPEN ──►     │
│  accidentally safe)   │    │  /admin/api/alpha/*  │      │  /api/beta/review*  │      │  /admin/assistant/*   │
└───────────────────┘    └───────────────────┘      └───────────────────┘      └────────────────────┘
        │
        ▼
 ── LIVE: 401 (protected) ──►
  Founder Console, Command Center, Founder Intelligence,
  Knowledge Coverage, Lesson Alignment, Review Queue

PROBLEM: 4 independent auth implementations. Only one (bibleAuthorityAdmin.js)
happens to be safe in production, purely because production's one configured
token (BIBLE_AUTHORITY_ADMIN_TOKEN) happens to be the one it checks. Any
route in the other 3 files is open by construction.
```

## Architecture Diagram — AFTER

```
                    ┌──────────────────────────────────────────────────┐
                    │              services/adminAuthMiddleware.js       │
                    │                                                    │
                    │   function checkAdminAuth(req, res, options)      │
                    │                                                    │
                    │   token = BIBLE_AUTHORITY_ADMIN_TOKEN               │
                    │        || ALPHA_ADMIN_TOKEN                        │
                    │        || BETA_REVIEW_TOKEN                        │
                    │        || ''                                       │
                    │                                                    │
                    │   if (!token)              → 401  (FAIL CLOSED)    │
                    │   if (provided !== token)  → 401                  │
                    │   else                      → true (authorized)    │
                    └───────────────────────┬────────────────────────────┘
                                             │  single shared module, imported everywhere
        ┌────────────────────────────┬───────┴─────────────────┬────────────────────────────┐
        ▼                            ▼                          ▼                            ▼
┌───────────────────┐    ┌───────────────────┐      ┌───────────────────┐      ┌────────────────────┐
│ bibleAuthorityAdmin│    │    alphaAdmin.js    │      │      beta.js        │      │  adminAssistant.js   │
│        .js          │    │                     │      │                     │      │                      │
│ imports             │    │ imports             │      │ imports checkAdminAuth│    │ imports             │
│ checkAdminAuth       │    │ checkAdminAuth       │      │ as checkReviewAuth,  │      │ checkAdminAuth       │
│ (28 routes,          │    │ (7 routes,           │      │ custom error text    │      │ (both routes now     │
│  unchanged calls)     │    │  unchanged calls)     │      │ preserved via        │      │  gated)              │
│                     │    │                     │      │ options param        │      │                      │
└───────────────────┘    └───────────────────┘      │ (3 review routes      │      └────────────────────┘
        │                            │                │  gated; /testers,    │                 │
        ▼                            ▼                │  /feedback remain    │                 ▼
 401 anon / 200 valid          401 anon / 200 valid    │  intentionally        │          401 anon / 200 valid
 (UNCHANGED — prod             (FIXED — closed          │  public, untouched)  │          (FIXED — closed for
  already had the               with zero prod          └───────────────────┘           the first time ever)
  right token)                  config change)                    │
                                                                    ▼
                                                          401 anon / 200 valid (review
                                                          routes fixed); /testers,
                                                          /feedback still 200 (unchanged,
                                                          by design)

        ┌──────────────────────────────────────────┐
        │              server.js                      │
        │  GET /admin/api/selftest   → checkAdminAuth │
        │  GET /admin/api/providers  → checkAdminAuth │
        └──────────────────────────────────────────┘
                     401 anon / 200 valid (FIXED)

RESULT: One module, one token-precedence order, fail-closed everywhere,
zero production configuration change required (BIBLE_AUTHORITY_ADMIN_TOKEN
was already set and is checked first by every route file now).
```

## Authentication Flow Diagram — Request Lifecycle (AFTER)

```
   Incoming HTTP request to any admin-prefixed route
                        │
                        ▼
   ┌─────────────────────────────────────────────┐
   │ Route handler calls:                          │
   │   checkAdminAuth(req, res[, options])          │
   └─────────────────────┬─────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────┐
   │ resolveAdminToken():                          │
   │   BIBLE_AUTHORITY_ADMIN_TOKEN                  │
   │   || ALPHA_ADMIN_TOKEN                         │
   │   || BETA_REVIEW_TOKEN                         │
   │   || ''                                        │
   └─────────────────────┬─────────────────────────┘
                        ▼
              ┌──────────────────┐
              │ token is empty?    │
              └────┬─────────┬─────┘
               YES │         │ NO
                   ▼         ▼
        ┌──────────────┐   ┌─────────────────────────────┐
        │ res.status(401)│  │ Read Authorization header    │
        │  { ok:false,   │  │ (Bearer ...) or ?token=       │
        │  error: msg }  │  └───────────────┬─────────────┘
        │ return false   │                  ▼
        │ (FAIL CLOSED — │        ┌──────────────────┐
        │  route handler │        │ provided === token?│
        │  returns       │        └────┬─────────┬─────┘
        │  immediately,  │         NO  │         │ YES
        │  no other code │             ▼         ▼
        │  executes)     │   ┌──────────────┐  ┌──────────────┐
        └──────────────┘   │ res.status(401)│  │ return true    │
                           │ return false   │  │ (route handler │
                           └──────────────┘  │  proceeds to    │
                                             │  its normal      │
                                             │  business logic) │
                                             └──────────────┘
```

**Key property change:** the "token is empty" branch used to `return true` (grant access). It now `return false` after writing a 401. This single-line change, applied consistently through one shared module instead of three divergent copies, is the entire remediation.

*No architecture diagram change was made anywhere else in the system — Companion AI, Governance/Scripture Authority, and all non-admin routes are untouched, as confirmed in the Regression Test Report.*
