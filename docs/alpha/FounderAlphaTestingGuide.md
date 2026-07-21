# BibleBuddy Founder Alpha — Testing Guide

Welcome, and thank you for testing BibleBuddy. This guide covers
everything you need to start the app, log in, and know what to expect.

## 1. How to start the app

```bash
cp .env.sample .env        # first time only
# open .env and set OPENAI_API_KEY (ask the team if you don't have one)
npm ci
npm start                  # runs: node server.js
```

The app prints `Bible Buddy vX.X.X listening on port 3000` when ready.

**Before you begin testing, run:**

```bash
npm run founder-alpha:validate
```

This confirms your local setup is healthy before you spend time testing.
It should report `READY_FOR_FOUNDER_ALPHA` or
`READY_WITH_DOCUMENTED_WARNINGS`. If it reports `BLOCKED`, stop and report
the exact failure listed at the top of
`docs/alpha/founder-readiness/<timestamp>/FounderReadinessReport.md`
before testing further.

## 2. Test URL

Local: **http://localhost:3000**
(If a shared/hosted URL has been provided to you separately, use that
instead — the same guide applies.)

## 3. Supported browser / device

Any modern desktop or mobile browser (Chrome, Safari, Firefox, Edge).
The chat interface is responsive; a quick mobile-layout check is included
in the checklist below. No app install is required — it is a web page.

## 4. Founder login

No separate Founder account/password is required for this Alpha — open
the app and start chatting. A lightweight tester identity is created
automatically for your session (see `routes/alphaTest.js`).

## 5. Admin login (optional — only if you were asked to review the knowledge queue)

Admin endpoints live under `/admin/api/bible-authority/...`. In this
local/Founder-Alpha environment, if no admin token has been configured
(`BIBLE_AUTHORITY_ADMIN_TOKEN` / `ALPHA_ADMIN_TOKEN` / `BETA_REVIEW_TOKEN`
/ `ADMIN_PASSWORD` in your `.env`), these routes are open on localhost —
just visit them directly, e.g.:

- `http://localhost:3000/admin/api/bible-authority/command-center`
- `http://localhost:3000/admin/api/bible-authority/review-queue`

If a token **has** been configured (required before any shared/public
deployment), send it as a header: `Authorization: Bearer <token>`.

## 6. Features enabled for this Alpha

Scripture chat, KJV verse retrieval, witnesses/cross-references,
original-language study (Hebrew/Aramaic/Greek), historical context,
prayer, therapeutic/reflection companion conversation, session memory,
reading-plan and daily-verse prompts, authentication (lightweight),
memory export/delete (conversational), lesson/sermon Scripture-alignment
review (Admin-only), and the Admin knowledge-review console.

## 7. Features disabled for this Alpha

Voice input/output, avatar video, food/ingredient scanning, health/
wearable integration, groups/community, push/SMS notifications, lesson
file upload (paste-text works; file upload does not), and a dedicated
notes/highlights/bookmarks UI. These are either invisible or clearly
marked **"Coming soon"** in the interface — they should never appear to
half-work. See `docs/alpha/phase6f-20260719-075444/FounderAlphaFeatureMatrix.md`
for the full disposition list and reasoning.

## 8. How to test Scripture questions

Ask directly, e.g. "What does John 3:16 say?" or "Give me the witnesses
for the Sabbath." Expect the actual KJV verse text (not a paraphrase),
with a reference cited. For doctrine topics (Sabbath, dietary law, the
nature of Jesus, etc.) expect multiple supporting Scripture witnesses,
not a single verse.

## 9. How to test prayer and companion mode

Say something like "Can you pray with me?" or describe a hard day
("Today has been rough..."). Expect a warm, present, non-clinical
response — BibleBuddy should never diagnose, guilt-trip, or give an empty
"just pray about it."

## 10. How to test decisions

Ask something ambiguous like "Should I take this job?" or "I need to
decide whether to move." Expect BibleBuddy to separate what Scripture
clearly commands from what is left to wisdom, offer practical factors,
and never claim "God told me you should..." or decide for you.

## 11. How to test original-language study

Ask "What does the Greek word for love mean in John 3:16?" or "What is
the Hebrew word for covenant?" Expect the original word, transliteration,
and a plain-language gloss — clearly labeled as original-language study,
separate from the KJV English text.

## 12. How to test history

Ask "What's the historical context of the Roman world when Jesus was
born?" Expect historical information clearly labeled as **historical
context**, never presented as equal to or overriding Scripture.

## 13. How to test lesson alignment (Admin/Founder-only)

Paste a paragraph from a sermon or Bible-study lesson into the alignment
tool (ask your team lead for the current URL/route if you weren't given
direct access) and review whether quoted Scripture is flagged as
accurate, misquoted, or unresolved.

## 14. How to review lineage

Any Scripture-grounded answer should let you see (via the Admin
command-center or by asking "where did that come from?") which authority
produced the answer (e.g. `doctrine_final_authority`, `bible_wide_reasoning`)
and which Scripture witnesses backed it — never a technical route name
shown directly in the chat itself.

## 15. How to report a problem

Use the issue template at `FounderAlphaIssueTemplate.md`. Include the
exact message you sent, what you expected, what you got, and whether the
answer felt biblically wrong (not just stylistically off) — that
distinction helps us triage fast.

## 16. Known non-blocking limitations

- The Admin knowledge-coverage dashboard can take several seconds to
  load (it's a large precomputed snapshot, not a live query) — this is
  expected, not a bug.
- If no admin token is configured, Admin routes are open on localhost —
  expected for local Founder testing only; never true on a shared/public
  deployment.
- Voice, avatar video, food scanning, health sync, and groups are
  intentionally not active this Alpha (see Section 7).

## 17. Privacy precautions

Everything you type is processed to generate your companion's response
and stored locally as session/memory data so BibleBuddy can remember
context across messages. Do not paste real personal medical record
numbers, passwords, or other sensitive identifiers you would not want
stored in a local test log. You can ask BibleBuddy to forget your memory
at any time ("forget what you know about me" / memory export and delete
both work conversationally).

## 18. How to stop the server

Press `Ctrl+C` in the terminal running `npm start`, or if it's running in
the background, find and stop the process listening on port 3000.
