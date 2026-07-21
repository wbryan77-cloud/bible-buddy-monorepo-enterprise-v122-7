# Phase 6F — Part 11: User File / Lesson Upload and Scripture Evaluation

## Decision

Implemented the **Admin/Founder paste-text prototype**. File upload is
**feature-flagged OFF** for Founder Alpha (see "Exact Blocker" below).

## What Was Built

- `services/lessonScriptureAlignmentAnalyzer.js` — new, isolated module.
  Reuses the SAME governed retrieval already used everywhere else in the
  repo:
  - `bibleWideReasoningEngine.extractExplicitScriptureReferences` to find
    every Scripture reference in the pasted text.
  - `bibleTextProvider.getPassage` (local KJV corpus → approved provider →
    external fallback, same tiering as the live answer path) to retrieve
    the actual verified KJV text for each reference.
  - A plain string quote-proximity check (looks for a quoted span near
    each reference mention) plus a **quote-anchored content-word
    precision score** (stopword-filtered) to flag whether a nearby quoted
    span substantially matches the real KJV wording. This is arithmetic
    string comparison, not an AI/interpretive judgment.
- `routes/bibleAuthorityAdmin.js` — two new Admin-token-protected
  endpoints (same `checkAdminAuth` pattern as every other endpoint in this
  router):
  - `POST /admin/api/bible-authority/lesson-alignment/analyze` — body
    `{ text, sourceLabel?, submittedBy? }`, returns a structured
    **Scripture Alignment Report**.
  - `GET /admin/api/bible-authority/lesson-alignment/limits` — reports the
    size limit and confirms file upload is off.

## Guardrails Verified (live HTTP tests)

| Guardrail | Test | Result |
|---|---|---|
| Never asserts a whole-lesson true/false verdict | `report.verdict` is always `null` with an explanatory `verdictNote` | PASS |
| No auto-promotion to production knowledge | `report.governance.promotedToProduction === false` always; module has no write path into any candidate/relationship store | PASS (verified by code inspection — module only returns a plain object) |
| Size limit enforced | POST with 20,001-char text | `{"ok":false,"error":"text_too_large", ...}` |
| Empty text rejected | POST with `text: ""` | `{"ok":false,"error":"empty_text"}` |
| Missing field rejected | POST with `{}` | `{"ok":false,"error":"Request body must include a \"text\" string field."}` |
| Admin auth required when token configured | Uses existing `checkAdminAuth` (env `BIBLE_AUTHORITY_ADMIN_TOKEN` / `ALPHA_ADMIN_TOKEN` / `BETA_REVIEW_TOKEN`) | PASS (shared pattern, unchanged) |
| No embedded-content execution | Input treated as inert plain text throughout; never rendered as HTML, never eval'd | PASS (by construction) |
| Correctly distinguishes real quote vs. misquotation | See below | PASS |

### Misquotation-detection proof (live HTTP)

Request text included three claims:

1. `John 3:16` quoted **accurately** (partial, genuine KJV wording).
2. `Genesis 1:1` quoted with the **same sentence skeleton but fabricated
   content** ("...created the moon and stars" instead of "...created the
   heaven and the earth").
3. `Nehemiah 99:99` — a reference that does not exist.

Live response:

- John 3:16 → `QUOTED_TEXT_MATCHES_KJV`, overlapRatio `1`.
- Genesis 1:1 → `QUOTED_TEXT_DOES_NOT_MATCH_KJV`, overlapRatio `0.5`,
  flagged for Admin review — **not** silently accepted.
- Nehemiah 99:99 → `REFERENCE_UNRESOLVED` (HTTP 404 from the KJV
  provider), flagged for Admin — **not** treated as verified.

This was caught and fixed during this batch: an earlier whole-word Jaccard
overlap metric scored the fabricated Genesis quote at `0.6`
(mis-classified as a match) because common function words ("in the...God
created the...and...") inflated the score. The metric was changed to
**quote-anchored, stopword-filtered content-word precision** (what
fraction of the lesson's own substantive claimed words are actually in
the real verse), which correctly separates a genuine partial quote
(scores `1.0`) from a fabricated-content quote (scores `0.5`, below the
`0.7` match threshold).

## Claim Types Returned

- `QUOTED_TEXT_MATCHES_KJV` — nearby quoted span substantially matches
  retrieved KJV text.
- `QUOTED_TEXT_DOES_NOT_MATCH_KJV` — nearby quoted span diverges from KJV
  wording; flagged for human/Admin review, not declared a lie.
- `REFERENCE_ONLY_NO_QUOTE` — reference cited but no nearby quoted text
  to compare; the real KJV text is still returned for human reading.
- `REFERENCE_UNRESOLVED` — reference could not be retrieved/verified at
  all (bad reference or provider failure); explicitly flagged, never
  silently dropped.

Claims requiring interpretation, historical verification, or
original-language verification are intentionally **not** auto-resolved —
the module has no code path that renders a doctrinal or historical
verdict; it only ever returns Scripture-comparison facts plus a human
note.

## Exact Blocker for File Upload

File upload (PDF/DOCX/audio-transcript upload) was **not** built in this
batch. Reasons:

1. **No existing safe file-parsing pipeline** in this repo for arbitrary
   Admin-uploaded documents (PDF/DOCX text extraction, virus/malware
   scanning, storage isolation) — building one safely (temp storage with
   TTL deletion, MIME sniffing, parser sandboxing, private-only storage,
   size/type allowlist) is a multi-day scope on its own and was correctly
   out of scope for "close the highest-value Founder Alpha gaps."
2. The paste-text prototype already satisfies the Part 11 objective for
   Founder/Admin testing (a founder or admin can paste any transcript
   text directly — including text extracted by hand from a PDF) without
   the additional attack surface of file parsing.
3. `routes/bibleAuthorityAdmin.js` already reports
   `fileUploadEnabled: false` with the blocker note via `GET
   /admin/api/bible-authority/lesson-alignment/limits`, so the Admin UI
   (or a future PR) can display this honestly instead of silently
   omitting the feature.

**Remaining work if file upload is pursued post-Alpha:** add a
size/type-limited upload endpoint behind the same admin auth, a text
extraction step (e.g. `pdf-parse` for PDF, plain read for `.txt`) writing
to a private, TTL-limited temp path (never public), then feed the
extracted text into the existing `analyzeLessonText` — no changes needed
to the analyzer itself.

## Regression Check

`scripts/alpha/scriptureFidelitySmoke.js` — 4/4 PASS after this change
(analyzer module is fully additive/isolated; no existing file was
behaviorally changed except the new route additions in
`routes/bibleAuthorityAdmin.js`, which only add new endpoints).
