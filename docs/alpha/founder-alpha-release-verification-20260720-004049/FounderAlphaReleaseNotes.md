# Founder Alpha — Release Notes

## What Founders can do in this build

- Ask Scripture questions and get direct, KJV-grounded answers with visible primary and supporting witnesses.
- Ask doctrine questions and get answers from the governed doctrine authority (Sabbath, dietary law, and 23+ other approved topics), never from open-ended guessing.
- Pray with Buddy and receive Scripture-anchored prayer.
- Talk through emotional struggles and life decisions with a companion that listens first, remembers the conversation, and never fabricates a "the Bible says exactly this" answer for something Scripture doesn't name.
- Ask about the original Hebrew/Greek/Aramaic behind a specific verse.
- Ask about the historical context of a specific passage (give a reference — "Daniel 3" or "Exodus 20:8-11" — for best results; an unreferenced request like "the book of Daniel" will get a clarifying question instead of a guess).
- See exactly how each answer was formed via a "How this answer was formed" disclosure on every reply.
- Paste a lesson or sermon paragraph into the Scripture Alignment tool and get every reference and quotation checked against the actual KJV text.
- Use the app fully on mobile or desktop, in a permanent dark theme, with keyboard and screen-reader accessible controls.

## What Admins/Founders reviewing the product can do

- View the Admin console's Command Center, Scripture Review, Engineering Intelligence, Knowledge Coverage Dashboard (all 66 books, 25 doctrine topics, witness quality, original-language coverage, historical-record coverage, and the IOG/ICOJ approval pipeline with its queue depth and bottleneck explanation).
- View the Founder Readiness tab: build info, validator results, System Health, and the new Founder Observation Layer (aggregate, non-identifying usage counts — no personal profiling).
- Review recent Scripture Alignment submissions.

## What's intentionally not turned on yet

- Voice / camera interaction — UI is present and clearly labeled "Coming soon"; not active in this build.
- Apple HealthKit / Android Health Connect — labeled "Coming soon"; not active.
- Proactive check-ins / background presence — the companion only responds to messages you send; it does not initiate contact yet.
- File upload for Scripture Alignment — paste-only for this build.
- Rate limiting and multi-instance scaling — this build is sized for a small trusted Founder Alpha cohort, not public traffic.

## Fixed in this verification pass

- A very long chat message could previously slow down or stall responses for everyone using the app at the same time. Messages are now capped at 4,000 characters with a clear, fast error if exceeded — plenty of room for any real conversation.

## Known, documented limitations (non-blocking for Founder Alpha)

- The Admin console has no Admin token entered/set for this cohort — appropriate for a small trusted group, but must change before any wider release. See `FounderAlphaKnownWarnings.md`.
- The Admin Command Center dashboard takes several seconds to load (it aggregates several large offline snapshots). It does not affect chat performance.
- Memory export/delete exist as internal capabilities but do not yet have a Founder-facing button — noted for a future release.
