# Founder Warnings Assessment

**Batch:** Founder Alpha Final Release Review — Part 2
**Date:** 2026-07-20
**Source:** `FounderAlphaKnownWarnings.md` (8 warnings, all carried forward unchanged from the FINAL GATE verification)

For each warning: classification, why it exists, and its effect on users, Scripture Authority, production correctness, Founder Alpha, and release blocking.

---

## 1. `admin_auth_boundary` — no admin token configured

**Classification:** Expected Founder Alpha Limitation

- **Why it exists:** `render.yaml` does not set `BIBLE_AUTHORITY_ADMIN_TOKEN`/`ALPHA_ADMIN_TOKEN`/`BETA_REVIEW_TOKEN`. Admin routes therefore have no app-layer gate.
- **Affects users?** No — Founders using the companion never touch Admin routes.
- **Affects Scripture Authority?** No — Scripture retrieval, doctrine authority, and witness logic are unrelated to Admin route access control.
- **Affects production correctness?** No — verified the gate itself works correctly when a token IS configured (401/401/200 test in the FINAL GATE batch); this is a deployment-configuration choice, not a code defect.
- **Affects Founder Alpha?** No — deployment access is controlled outside the app (who can reach the URL at all), appropriate for a small trusted cohort.
- **Blocks release?** No.

## 2. `admin_dashboard_latency` — command-center ~6s

**Classification:** Minor Risk

- **Why it exists:** the endpoint aggregates several large, offline-precomputed knowledge/engineering snapshots on every request rather than caching them.
- **Affects users?** No — not on the chat/companion path (verified: chat latency 320–352ms, unaffected).
- **Affects Scripture Authority?** No.
- **Affects production correctness?** No — the endpoint still returns correct data, just slowly.
- **Affects Founder Alpha?** Minor — only affects Admin/engineering reviewers viewing one dashboard tab.
- **Blocks release?** No.

## 3. Admin console has no token-entry mechanism

**Classification:** Expected Future Enhancement

- **Why it exists:** the Admin front-end was built when no token was ever configured; no UI element exists to attach an `Authorization` header to its `fetch()` calls.
- **Affects users?** No.
- **Affects Scripture Authority?** No.
- **Affects production correctness?** No effect under the current (no-token) configuration.
- **Affects Founder Alpha?** No — irrelevant while no token is set. Becomes a real, self-inflicted outage the moment someone sets a token without also adding this UI.
- **Blocks release?** No — but must be resolved **before** warning #1 is ever remediated by turning a token on.

## 4. No rate limiting on any endpoint

**Classification:** Expected Founder Alpha Limitation

- **Why it exists:** not yet built; appropriate for a small, known, invitation-only cohort where abusive traffic is not expected.
- **Affects users?** Only in a hypothetical abuse scenario, which is not expected from a trusted cohort.
- **Affects Scripture Authority?** No.
- **Affects production correctness?** No.
- **Affects Founder Alpha?** Low risk given cohort size and trust level.
- **Blocks release?** No.

## 5. No multi-instance / horizontal scaling support

**Classification:** Expected Founder Alpha Limitation

- **Why it exists:** all persistence (memory, queues, analytics) is local JSONL/JSON files on a single instance; no database layer is wired in.
- **Affects users?** No — a single instance comfortably serves a small Founder Alpha cohort (verified: 10 concurrent chats completed cleanly).
- **Affects Scripture Authority?** No.
- **Affects production correctness?** No.
- **Affects Founder Alpha?** No.
- **Blocks release?** No — will need to be resolved before scaling beyond one instance.

## 6. Version string drift (`v122.14.0` vs `v122.12`)

**Classification:** Documentation Only

- **Why it exists:** `server.js`'s `APP_VERSION` constant and `package.json`'s `version` field were updated independently and drifted apart.
- **Affects users?** No.
- **Affects Scripture Authority?** No.
- **Affects production correctness?** No — purely a cosmetic string shown in logs and `/health`.
- **Affects Founder Alpha?** No.
- **Blocks release?** No.

## 7. Memory export/delete not yet Founder-facing

**Classification:** Expected Future Enhancement

- **Why it exists:** `services/livingOSAggregator.js` declares the governance rules (`view/correct/export/delete`) and the underlying functions exist, but no HTTP route or UI button exposes them to a Founder yet.
- **Affects users?** Mildly — a Founder who wants to export or delete their own conversation memory cannot self-serve yet; this would need to be handled manually by the team on request.
- **Affects Scripture Authority?** No.
- **Affects production correctness?** No.
- **Affects Founder Alpha?** Worth disclosing to testers up front so expectations are set correctly (see `FounderManualTestGuide.md`, Scenario 14).
- **Blocks release?** No — but should be communicated transparently to Founder testers, not silently omitted.

## 8. Flaky external-provider test assertion (`2b_correction_seeded_health_topic`)

**Classification:** Expected External Dependency

- **Why it exists:** the test's regex checks for an exact unquoted phrase in OpenAI's free-text self-correction language; occasionally OpenAI's phrasing varies just enough to trip the strict text assertion.
- **Affects users?** No — the underlying product routing behavior (never treating a correction as a new health question) was correct in every single run, including the one that failed the test.
- **Affects Scripture Authority?** No.
- **Affects production correctness?** No.
- **Affects Founder Alpha?** No.
- **Blocks release?** No.

---

## Summary table

| # | Warning | Classification | Blocks release? |
|---|---|---|---|
| 1 | Admin auth boundary open | Expected Founder Alpha Limitation | No |
| 2 | Admin dashboard latency | Minor Risk | No |
| 3 | Admin UI has no token-entry mechanism | Expected Future Enhancement | No |
| 4 | No rate limiting | Expected Founder Alpha Limitation | No |
| 5 | No multi-instance scaling | Expected Founder Alpha Limitation | No |
| 6 | Version string drift | Documentation Only | No |
| 7 | Memory export/delete not Founder-facing | Expected Future Enhancement | No |
| 8 | Flaky external-provider test | Expected External Dependency | No |

**No warning is a Critical Blocker or Production Risk that affects Scripture Authority or production correctness.**

## Final conclusion

**ACCEPTABLE_FOR_FOUNDER_ALPHA**
