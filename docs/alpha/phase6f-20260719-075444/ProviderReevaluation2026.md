# PHASE 6F — PART 7: Current API and Provider Re-Evaluation (2026)

Verified against current official terms (live-checked July 2026 where
noted) and current repository implementation. Full machine-readable version:
`ProviderReevaluation2026.json`.

Recommendation rule applied throughout, per the batch instruction: **do not
integrate a new provider merely because it exists.** Adopt only when it
closes a verified Founder Alpha blocker, licensing is clear, no adequate
local implementation exists, it sits behind an adapter + feature flag, and
outage behavior is safe.

## BIBLE TEXT / READER

| Provider | Current capability | Cost/plan | Commercial-use limitation | Founder Alpha need | Recommendation |
|---|---|---|---|---|---|
| **Local public-domain KJV** (`data/kjv-corpus/`) | Complete 66-book corpus, already primary path in `canonicalScriptureProvider.js`/`bibleTextProvider.js` | Free, no dependency | None — KJV is public domain | Required — already met | **KEEP_AS_PRIMARY** |
| **API.Bible** | Live-verified 2026 terms: open-access/public-domain/CC Bibles usable commercially at no extra cost; copyrighted translations (NIV, etc.) require individual paid commercial licenses from $10/mo/translation; no sub-licensing; overage billing per 1,000 calls | Free tier for non-commercial/open Bibles; paid commercial plan required once app has ads/fees/subscriptions | Must audit each Bible's specific license via `/bibles` endpoint before commercial use; NIV commercial use explicitly **not available** on standard terms | Not required — local KJV already covers baseline display Bible | **KEEP_AS_FALLBACK** *(already the existing fallback role — do not add paid copyrighted-translation licenses for Founder Alpha; only KJV/public-domain/open Bibles are in scope)* |
| **YouVersion Platform / Bible SDK** | Third-party developer platform for reading-plan/verse-of-day style integration; requires partner approval, not self-serve for arbitrary AI-answer redistribution of translations | Partner-negotiated | Historically restrictive about programmatic AI re-generation of licensed translation text outside the official app/reader UI | Not required | **DO_NOT_ADOPT** for Founder Alpha (no verified fit for an AI-companion redistribution use case; revisit only if a specific reader-widget partnership is pursued) |
| **Bible Brain (Faith Comes By Hearing)** | Audio/video Bible content API | Free for qualifying ministry/non-commercial use; commercial terms vary | Requires application/approval | Not required for Founder Alpha (no audio Bible feature is on for Alpha — Part 16) | **DEFER** |
| **Current external fallback (`bible-api.com`)** | Already wired as the tertiary fallback if local corpus misses | Free, no auth | Public-domain/open translations only | Already in place | **KEEP_AS_FALLBACK** |

## BIBLE AUDIO / VIDEO

| Provider | Recommendation |
|---|---|
| Bible Brain audio | **DEFER** — no audio Bible feature is scoped for Founder Alpha (Part 16); local KJV text covers the reading/study need. |
| YouVersion audio capabilities | **DO_NOT_ADOPT** for Alpha — same partner/licensing friction as above. |
| Local/audio scaffolds | **DEFER** — no working audio playback scaffold was found wired to a live route during Part 14 architecture review; would need real implementation before any adoption decision, not just a provider swap. |

## VOICE

| Provider | Current capability | Recommendation |
|---|---|---|
| OpenAI Realtime/audio | Real-time speech-to-speech via the OpenAI API; standard commercial API terms, metered by usage | **DEFER** — not needed for a text-first Founder Alpha companion test; adds cost/latency/complexity without a verified Alpha blocker. |
| Existing speech implementation | No live-wired STT/TTS route was found active in the current runtime during this batch's Part 13/14 review | **FEATURE_FLAG_OFF** |
| Browser-native speech (Web Speech API) | Free, no server dependency, works offline for STT/TTS on supporting browsers | **PILOT_BEHIND_FLAG** post-Alpha if voice becomes a priority — lowest cost, no vendor lock-in, no licensing risk. |

## AVATAR / PRESENCE

| Provider | Recommendation |
|---|---|
| Animated local orb (non-video, audio-reactive) | **PILOT_BEHIND_FLAG** — matches original product-identity guidance ("not a video avatar"), zero marginal cost, no vendor dependency. Not required for Founder Alpha (chat-first). |
| D-ID or similar video-avatar service | **DO_NOT_ADOPT** — per-minute cost, third-party video-generation dependency, and not aligned with BibleBuddy's "warm and humble companion, not a video avatar" identity. |

## ORIGINAL LANGUAGE

| Provider | Status | Recommendation |
|---|---|---|
| OSHB (Open Scriptures Hebrew Bible) | ✅ Already vendored locally, CC0/CC BY, in production (Part 4) | **KEEP_AS_PRIMARY** |
| Nestle 1904 / MorphGNT | ✅ Already vendored locally (biblicalhumanities.org, CC0), in production (Part 4) | **KEEP_AS_PRIMARY** |
| Strong's Hebrew/Greek Dictionaries | ✅ Already vendored locally (Open Scriptures, CC BY-SA), in production (Part 4) | **KEEP_AS_PRIMARY** |
| STEPBible-derived data / MACULA | Not currently integrated | **DEFER** — current OSHB/Nestle 1904/Strong's coverage is already complete for 66/66 books (Part 4 verification); no verified gap justifies adding a second overlapping dataset for Founder Alpha. |

## FOOD

| Provider | Current capability (live-verified July 2026) | Recommendation |
|---|---|---|
| **Open Food Facts** | ODbL (database) + Database Contents License (individual entries) + CC BY-SA (images); explicitly permits commercial use; requires attribution + share-alike on derivative works; data is crowd-sourced with no accuracy guarantee (server's own docs: "user assumes the entire risk of using the data") | **PILOT_BEHIND_FLAG** — legally clear and free, but the crowd-sourced no-accuracy-guarantee caveat means any biblical-dietary-classification feature built on it must never present an absent/ambiguous product record as settled fact (see Part 10). Not required for Founder Alpha core companion test. |
| Barcode scanning | Client-side capability, no separate licensing concern | **PILOT_BEHIND_FLAG**, same gating as above. |
| OCR label options | `lib/ocr/index.js` remains a stub (hardcoded output) — confirmed during this batch (Part 1) | **DEFER** — not implemented, do not claim otherwise. |
| Offline/manual label entry | No third-party dependency | **PILOT_BEHIND_FLAG** — safest entry point if food feature is piloted at all. |

## HEALTH

| Provider | Recommendation |
|---|---|
| Apple HealthKit | **DEFER** — requires native iOS integration and platform consent flows not present in current web-first runtime. |
| Android Health Connect | **DEFER** — same reasoning. |
| Google Fit migration status | **DEFER** — Google Fit's consumer API is being sunset industry-wide in favor of Health Connect; do not build new integration against the deprecated API. |
| Privacy/minimum-data architecture | No health data is currently collected | **KEEP_AS_PRIMARY** posture: minimum-data-by-default until a specific, consented feature is built. |

## AUTH / DATABASE / MEMORY

| Provider | Current implementation | Recommendation |
|---|---|---|
| Current repository implementation | Local JSON/JSONL file-backed stores under `data/` (memory, conversations, quality events, alpha testers) | **KEEP_AS_PRIMARY** for Founder Alpha scale (see Part 14 for scale-readiness classification); adequate for a bounded Founder tester cohort. |
| Supabase/Clerk/Auth0 | Not integrated | **DEFER** — only adopt if Founder Alpha needs multi-device account sync beyond what local file-backed session state supports; no verified blocker found. |
| Postgres/pgvector | Not integrated | **DEFER** — current JSON/JSONL stores are sufficient at Founder Alpha's data volume; premature to adopt a database dependency before proving the product itself. |
| Encryption, consent, retention, export/delete | Export/delete flows exist (confirmed live in Part 1 code inspection) | **KEEP_AS_PRIMARY** — continue hardening as user count grows (see Part 14/15). |

## NOTIFICATIONS

| Channel | Current implementation | Recommendation |
|---|---|---|
| Push | Not verified as wired to a live provider in this batch | **DEFER** |
| Email | Not verified as wired to a live provider in this batch | **DEFER** |
| SMS | Not verified as wired to a live provider in this batch | **DEFER** |
| Opt-in / quiet-hours controls | Not verified as implemented | **DEFER** — build the control model before adopting any specific channel provider, so consent is never an afterthought. |

## Overall Part 7 conclusion

No new provider integration is required to reach Founder Alpha readiness.
The two providers with real Founder Alpha exposure — the local KJV corpus
(primary, verified complete) and OpenAI (primary reasoning dependency,
verified to degrade safely on outage) — both already have current-terms
verification and a safe disposition. Every other evaluated provider is
correctly `DEFER`red, `PILOT_BEHIND_FLAG`, or `DO_NOT_ADOPT` for this phase,
consistent with the batch's instruction not to activate every planned
feature before Founder testing.
