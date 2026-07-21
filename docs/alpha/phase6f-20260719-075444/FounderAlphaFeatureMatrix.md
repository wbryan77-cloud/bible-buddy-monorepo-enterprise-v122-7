# Phase 6F — Part 16: Founder Alpha Scope Decision

## Principle

The Founder Alpha must be **coherent, not enormous**: prove the
Scripture-grounded companion core is trustworthy and pleasant to use.
Everything not required for that core test is explicitly deferred,
feature-flagged, or admin/tester-only — and confirmed **not to affect
the core** (verified throughout Parts 9–13).

This matrix is also served live and machine-readably via
`GET /admin/api/bible-authority/founder-console` (`featureDisposition`
field, added in Part 12) so Admin always sees the same list this
document describes — one source of truth, not two.

## Feature Matrix

| Feature | Status | Why |
|---|---|---|
| Scripture chat (companion core) | `ON_FOR_FOUNDER_ALPHA` | The core product. Verified end-to-end (Parts 2–5, 13). |
| KJV reader / search (explicit reference retrieval via chat) | `ON_FOR_FOUNDER_ALPHA` | Local 66-book KJV corpus is Tier 1 and complete; verified live. A dedicated standalone "Bible reader" browsing UI (tap through chapters without asking a question) does not exist — chat-driven retrieval is the Founder Alpha interface. |
| Witnesses / cross-references | `ON_FOR_FOUNDER_ALPHA` | Verified live for doctrine topics; Part 2 closed the highest-priority gaps. |
| Original language (Hebrew/Aramaic/Greek study) | `ON_FOR_FOUNDER_ALPHA` | Verified live end-to-end in Part 4 for 10 high-priority doctrine passages plus ad hoc requests. |
| Historical context | `ON_FOR_FOUNDER_ALPHA` | Verified live, explicitly labeled and supplemental, per Part 5. |
| Prayer | `ON_FOR_FOUNDER_ALPHA` | Verified in Part 9 multi-turn tests (request, decline, "pray deeper"). |
| Therapeutic / reflection companion | `ON_FOR_FOUNDER_ALPHA` | Verified across 10 multi-turn scenarios in Part 9 (grief, anxiety, guilt, crisis, quiet companionship, etc.), one real bug found and fixed. |
| Memory (session + preference continuity) | `ON_FOR_FOUNDER_ALPHA` | Verified live via `companionMemoryManager` in Part 12 (export/delete both function correctly). |
| Reading plan | `TESTER_ONLY` | A "start a reading plan" entry point exists in the UI and routes into the companion conversation, but there is no dedicated persisted plan-tracking/progress feature — appropriate for testers to try, not a headline Founder Alpha feature. |
| Daily verse | `TESTER_ONLY` | Quick-prompt button exists and works through the live companion path; no separate scheduling/notification system. |
| Notes / highlights / bookmarks | `TESTER_ONLY` | Not a dedicated persisted feature in this build; deferred to Closed Alpha. |
| Auth / accounts | `ON_FOR_FOUNDER_ALPHA` | Required for Founder testers to have distinct identities; existing tester onboarding flow (`routes/alphaTest.js`) is functional. |
| Privacy / export / delete | `ON_FOR_FOUNDER_ALPHA` (function-level) | `getMemorySnapshot`/`forgetMemory` verified live (Part 12); no dedicated self-service "download my data" UI button yet — Founders can request export/delete conversationally today. Full self-service UI is `DEFER_CLOSED_ALPHA`. |
| Lesson/sermon Scripture-alignment (paste text) | `ADMIN_ONLY` | New this batch (Part 11) — Admin/Founder-only diagnostic tool, never auto-promotes to production knowledge. |
| Lesson/sermon file upload | `FEATURE_FLAG_OFF` | Explicit blocker documented in Part 11 (no safe file-parsing pipeline built yet); paste-text prototype covers the Alpha need. |
| Voice (speech input/output) | `FEATURE_FLAG_OFF` | Not built into the live UI (`public/index.html`); `routes/realtime` scaffolding exists server-side but is not wired into the Founder-facing chat. `DEFER_CLOSED_ALPHA`. |
| Audio Bible | `FEATURE_FLAG_OFF` | No implementation found; `DEFER_BETA`. |
| Avatar / orb presence | `ON_FOR_FOUNDER_ALPHA` (orb only) | The animated orb IS live and responds to real companion state (verified in Part 13 browser test) — this is the one "presence" feature that is real today. A more advanced avatar (face/video) is `DO_NOT_BUILD` for Alpha. |
| Food / ingredient scanner | `FEATURE_FLAG_OFF` | Confirmed stub-only in Part 10 (OCR hardcoded to return fixed dummy text; no barcode/Open-Food-Facts wiring). Correctly off; zero impact on core chat confirmed. |
| Health / wearable integration | `FEATURE_FLAG_OFF` | Confirmed placeholder-only in Part 10 (UI toggle exists but now explicitly marked "Coming soon" and disabled per Part 13 fix). No HealthKit/Health Connect code exists. |
| Groups / community | `DO_NOT_BUILD` | No requirement evidence found for Founder Alpha in Part 1's reconciliation; explicit scope-creep risk flagged in Part 8's competitive review (community features are a mature, resource-intensive category BibleBuddy should not chase this early). |
| Notifications (push/email/SMS) | `DEFER_CLOSED_ALPHA` | Provider integrations (Resend, Twilio) exist and are configurable but optional (`missing` is a valid, handled health state per Part 15); not required for a small, directly-engaged Founder pool who don't need push reminders to return. |
| Admin knowledge review console | `ADMIN_ONLY` | Fully verified live in Part 12 — approve/reject/bulk actions, evidence preview, KJV verification, duplicate comparison all confirmed working. |
| Coverage / drift analytics dashboard | `ADMIN_ONLY` | All 11 Phase 6E analytics snapshots verified fresh and readable via `/knowledge-coverage-dashboard` and the new `/founder-console` (Part 12). |

## What This Means for the Founder Test

**A Founder tester's experience is:** open the app, see the companion
orb and chat, ask real Bible questions (explicit verses, doctrine
topics, original-language questions, historical-context questions),
talk through real life situations (grief, anxiety, decisions, prayer),
and optionally explore a reading-plan or daily-verse prompt. Voice,
avatar video, food scanning, health integration, and groups are either
invisible or clearly marked "Coming soon" (per the Part 13 UI fix) —
never confusingly half-working.

**An Admin/Founder-as-operator's experience is:** the knowledge review
queue, coverage dashboard, founder-console status page, provider health,
and the new lesson-alignment paste-text tool — all token-gated by the
existing `checkAdminAuth` pattern, all verified live in Part 12.

## Explicit Non-Goals for This Alpha

Per the batch's own instruction ("Do not activate every planned feature
before Founder testing"), the following are deliberately **not**
activated even though scaffolding or partial code exists for some of
them: voice, audio Bible, avatar video, food scanner, health/wearable
sync, groups/community, push/SMS notifications, file-upload lesson
analysis, and a dedicated notes/highlights/bookmarks UI. Each has a
documented reason above and in its corresponding Part's report (7, 9,
10, 11, 13).
