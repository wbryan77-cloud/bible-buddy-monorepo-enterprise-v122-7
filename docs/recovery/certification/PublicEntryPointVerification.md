# Public Entry Point Verification

**Date:** 2026-07-24  
**Commit:** `2a67a347714e82bea142fab764ff892cbaae06b8` (`2a67a34`)  
**CI:** https://github.com/wbryan77-cloud/bible-buddy-monorepo-enterprise-v122-7/actions/runs/30130494186 — **success**  
**Production `/health.releaseCommit`:** `2a67a34`  
**Production domain:** `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`

## Production URLs

| Purpose | Public URL |
|---|---|
| Alpha (Companion) | https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/alpha |
| Alpha secondary alias | https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/alpha-test |
| Admin | https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/admin |

## Implementation (minimal)

File: `server.js` only.

- `GET /alpha`, `/alpha/`, `/alpha-test`, `/alpha-test/` → **302** → `/` (production Companion `public/index.html`)
- `GET /admin`, `/admin/` → **302** → `/admin/bible-authority` (existing Admin Command Center)
- Registered **before** `express.static` so legacy `admin/index.html` / public static cannot own these paths
- Internal harness remains at `/admin/alpha-test` (not a public invitation URL)
- No Companion runtime, auth middleware, authorization, streaming, memory, or business-logic changes

## Local verification

| Check | Result |
|---|---|
| `GET /alpha` → `Location: /` then Living Companion | PASS |
| `GET /alpha-test` → `Location: /` then Living Companion | PASS |
| `GET /admin` → `Location: /admin/bible-authority` then Command Center | PASS |
| `/admin/alpha-test` still serves internal harness | PASS |
| `/` Companion unchanged | PASS |
| `POST /buddy/chat` still 200 | PASS |
| Admin API without token → 401 | PASS |
| Admin API bad token → 401 | PASS |

## Production verification (`2a67a34`)

| Check | Result |
|---|---|
| `GET /alpha` → **302** `Location: /` | PASS |
| `GET /alpha-test` → **302** `Location: /` | PASS |
| `GET /admin` → **302** `Location: /admin/bible-authority` | PASS |
| Follow `/alpha` → title `Bible Buddy — Living Companion` | PASS |
| Follow `/alpha-test` → title `Bible Buddy — Living Companion` | PASS |
| Follow `/admin` → title `Bible Authority Command Center` | PASS |
| Admin API no token → **401** | PASS |
| Admin API bad Bearer → **401** | PASS |
| `POST /buddy/chat` John 3:16 → **200** with Scripture reply | PASS |

## Authentication verification

| Assertion | Status |
|---|---|
| Auth middleware (`checkAdminAuth`) not modified | CONFIRMED |
| Admin API 401 without credentials | CONFIRMED |
| Admin API 401 with invalid token | CONFIRMED |
| No new auth system introduced | CONFIRMED |

## Authorization verification

| Assertion | Status |
|---|---|
| Admin API permission model unchanged | CONFIRMED |
| Public entry redirects do not grant admin access | CONFIRMED |
| Companion remains public UI alias only | CONFIRMED |

## Security verification

| Assertion | Status |
|---|---|
| Redirect targets are public page aliases (`/`, `/admin/bible-authority`) — not `/buddy/chat`, `/internal`, or versioned/dev paths | CONFIRMED |
| Unauthorized admin APIs remain protected (401) | CONFIRMED |
| Session / Companion continuity path unchanged (`POST /buddy/chat` still works) | CONFIRMED |
| Internal alpha harness not used as public `/alpha` | CONFIRMED |

## Deployment verification

| Field | Value |
|---|---|
| Git commit | `2a67a34` |
| GitHub Actions | `30130494186` success |
| Render `releaseCommit` | `2a67a34` |
| Diff scope | `server.js` entry aliases only (+11 / −8) |

## Confirmations

1. Production Alpha URL resolves correctly  
2. Production Admin URL resolves correctly  
3. Authentication unchanged  
4. Authorization unchanged  
5. Companion runtime unchanged  
6. Admin runtime unchanged (existing Command Center page)  
7. No internal implementation paths exposed in public entry redirects  

## Decision

PUBLIC_ENTRY_POINTS_READY

- **Alpha:** https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/alpha  
- **Admin:** https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/admin  
