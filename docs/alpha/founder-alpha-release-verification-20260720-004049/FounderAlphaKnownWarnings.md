# Founder Alpha — Known Warnings

These are documented, non-blocking warnings for the Founder Alpha release. None of them are averaged away or hidden — each is called out explicitly, as required.

## 1. `admin_auth_boundary` (Founder Readiness Validator WARN)

**What:** No `BIBLE_AUTHORITY_ADMIN_TOKEN` / `ALPHA_ADMIN_TOKEN` / `BETA_REVIEW_TOKEN` environment variable is configured. Admin routes (`/admin/api/bible-authority/*`) are open to anyone who can reach the server.

**Why it's acceptable now:** Founder Alpha is a small, trusted cohort with controlled access to the deployment. `render.yaml` does not currently set any of these tokens.

**Verified fact:** the gate itself works correctly when a token IS configured — tested live during this verification: 401 without a token, 401 with the wrong token, 200 with the correct token.

**Must change before:** any deployment reachable by an untrusted or public audience.

## 2. `admin_dashboard_latency` (Founder Readiness Validator WARN)

**What:** `GET /admin/api/bible-authority/command-center` takes roughly 6 seconds to respond.

**Why it's acceptable now:** this endpoint aggregates several large, offline-precomputed knowledge/engineering snapshots. It is not on the live chat path — Scripture, doctrine, prayer, and companion chat all respond in well under half a second. This has been documented since Phase 6G with no change.

**Must change before:** if Admin dashboard responsiveness becomes a Founder complaint, or before any SLA is promised on Admin endpoints.

## 3. Admin console has no token-entry mechanism (new finding, this verification)

**What:** `admin/bible-authority.html` / `admin/js/bible-authority.js` send no `Authorization` header on any request. If warning #1 is ever resolved by setting an admin token, the browser-based Admin console itself will start failing every request with 401 until a minimal token-entry UI is added.

**Why it's not fixed now:** resolving it requires adding a small UI element (a token prompt/field), which is out of scope for this VERIFY-only batch ("do not add features," "do not redesign Admin"). It does not block Founder Alpha today because no token is configured.

**Must change before:** an admin token is actually turned on.

## 4. No rate limiting

**What:** No endpoint has request-rate limiting. Documented since Phase 6F; unchanged.

**Why it's acceptable now:** small, known, trusted Founder Alpha cohort.

**Must change before:** any deployment with unpredictable or public traffic.

## 5. No multi-instance / horizontal scaling support

**What:** All persistence (memory, queues, analytics snapshots) is local JSONL/JSON files on a single instance. Documented since Phase 6F; unchanged.

**Must change before:** running more than one server instance behind a load balancer.

## 6. Version string drift

**What:** `server.js`'s `APP_VERSION` constant reports `v122.14.0`, while `package.json`'s `version` field reports `v122.12`. Cosmetic only — does not affect any runtime behavior, routing, or logic.

## 7. Memory export/delete not yet Founder-facing

**What:** `services/livingOSAggregator.js` declares `view/correct/export/delete` as memory-governance rules, and the underlying functions exist internally, but there is no HTTP route or UI button exposing export/delete to a Founder yet. Documented since Phase 6F; unchanged.

## 8. One flaky (non-deterministic) regression assertion

**What:** `openAiFirstRegressionTest`'s `2b_correction_seeded_health_topic` case failed once during this verification pass, then passed 10/10 on two immediate reruns. Root cause: the test's regex checks for an exact unquoted phrase in OpenAI's free-text self-correction language; occasionally OpenAI phrases the correction without the expected quote-mark pattern. The actual product routing behavior was correct in every run, including the one that failed the strict text assertion. Classified `EXTERNAL_PROVIDER`, not a product defect.
