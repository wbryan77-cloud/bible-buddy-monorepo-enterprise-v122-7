# Phase 6F — Part 13: UX and Founder Experience Review

## Scope

Reviewed the actual front-door web experience (`public/index.html`,
served at `/`) with a live browser session against the running server on
this working tree. Did **not** attempt a brand redesign — only repaired
verified Founder Alpha usability blockers.

## Checklist Review

| Item | Finding | Action |
|---|---|---|
| User immediately understands what BibleBuddy does | Hero copy ("Meet Buddy where life actually happens") + companion framing is clear | OK, no change |
| No technical route names shown | **BLOCKER FOUND**: `<p>Real backend route: /buddy/chat...</p>` was shown directly to users | **FIXED** — replaced with plain-language description |
| Prompt input is obvious | Clear placeholder text, visible Send button | OK |
| Scripture is readable | Verse text rendered in a visually distinct block below the reply (`.scripture` class, gold accent) | OK |
| KJV and study material visually distinct | Scripture block is visually separated from the conversational reply; explicitly labeled "(King James Version)" in reply text by the backend | OK for Founder Alpha; deeper structured witness/cross-reference/OL sectioning is a `DEFER_POST_ALPHA` presentational enhancement (see note below) |
| Primary/supporting witnesses understandable | Verified live: doctrine-topic answers list primary witnesses inline in prose (e.g. "approved Scripture witnesses (1 Corinthians 15; 1 Thessalonians 4:13-16; Daniel 12:2; John 11:25)") | Understandable but plain-text; not a blocker |
| Historical context clearly supplemental | Backend labels historical content explicitly (verified in Part 5); not yet visually boxed/badged in this UI | `DEFER_POST_ALPHA` — text label is present and honest, just not a colored UI card yet |
| Original-language view optional/usable | Verified live: returns readable KJV + Hebrew/transliteration/gloss text in the reply; not yet a separate collapsible "view" | `DEFER_POST_ALPHA` — functional and readable today, dedicated UI view is a nice-to-have not a blocker |
| Prayer/companion responses feel warm | Verified live tone in Part 9 multi-turn tests; UI framing ("Buddy listens first, adapts gently") reinforces this | OK |
| Errors are friendly and honest | `catch` block shows a plain apology + technical detail in parentheses, never a raw stack trace | OK |
| Loading states exist | "Buddy is thinking…" bubble + animated orb | OK, and now free of the stray-bubble bug (see below) |
| Empty states exist | Greeting message pre-populates the chat on load | OK |
| Mobile layout works | `@media (max-width: 850px)` collapses hero/settings to single column | OK (verified in CSS; no physical device test performed) |
| Keyboard navigation works | Standard `<form>`/`<input>`/`<button>` — native tab order and Enter-to-submit both work | OK |
| Screen-reader semantics reasonable | `aria-live="polite"` on orb status, `aria-hidden` on decorative orb/mini-orb elements | OK |
| Contrast and font sizing usable | Light text (`#f7f3e8`) on dark navy gradient background; `clamp()` responsive heading size | OK |
| No unsafe HTML | `addMessage` uses `textContent`, never `innerHTML`, for user- or model-supplied text | OK (verified by code read) |
| No confusing Admin controls in user UI | Only a single "Admin Console" link, clearly labeled, no embedded admin actions | OK |
| Feature-flagged systems hidden/clearly marked when off | **BLOCKER FOUND**: Voice/Camera and Health/Watch toggles looked fully interactive and functional even though none of those features are implemented (confirmed OFF in Parts 7 and 10) | **FIXED** — added "Coming soon" badges, disabled the toggle controls (`pointer-events: none`, dimmed), and rewrote the card copy to say "not yet available in this Founder Alpha build" |

## Bugs Found and Fixed (live-verified)

### 1. Technical route name exposed to end users

`public/index.html` showed `Real backend route: /buddy/chat` directly
under the "Companion Chat" heading. Replaced with: *"Talk with Buddy
below. The orb above changes as Buddy listens, thinks, and responds."*

### 2. Non-functional settings toggles looked live

"Voice sessions," "Expression coaching," "Wellness insights," "Watch
sync," and "Gentle check-ins" toggles were fully clickable
(`onclick="toggle(this)"`) and visually indistinguishable from the one
real, functioning setting ("Orb companion"). A Founder tester could
toggle "Wellness insights" ON, see nothing happen, and reasonably
conclude the app is broken. Fixed by:
- Adding a `.soon-badge` "Coming soon" pill next to each non-functional
  card heading/row.
- Disabling those toggle elements (`toggle.disabled` — `pointer-events:
  none`, `opacity: 0.35`, `title="Not yet available in this Founder
  Alpha build"`).
- Rewriting each card's description to state plainly that the feature is
  planned for a future release, not this Founder Alpha build.

### 3. Double-submission race / stray "thinking" bubble (found via live browser test)

Live-testing the chat in a real browser session surfaced a genuine race:
submitting a message while a previous request was still resolving (e.g.
pressing Enter and then clicking Send, or a fast double-click) fired
`sendMessage()` twice concurrently. The delayed `showThinkingBubble()`
timer from an in-flight call could fire *after* a reply had already
rendered, leaving a permanently stuck "Buddy is thinking…" bubble with no
further message to clear it — confusing and makes the app look hung.

**Fix**: added an `isSending` guard at the top of `sendMessage()` that
rejects a second submission while one is in flight, disabled the message
input and Send button for the duration of the request (re-enabled in a
`finally` block on success *or* failure), and now capture+clear the
"show thinking bubble" `setTimeout` handle as soon as a reply or error
arrives, instead of letting it fire unconditionally on a fixed delay.

**Live re-verification** (via the actual running server, real HTTP calls
to `/buddy/chat`, no mocks):

- First test message ("What does John 3:16 say?") — before the fix —
  reproduced the stray bubble exactly as described.
- After applying the fix and reloading, a second test message ("What
  does Genesis 1:1 say?") was sent via the same UI. The accessibility
  snapshot showed `Send` and the message input correctly reported
  `states: [disabled]` while the request was in flight, and a DOM read
  after completion showed a clean four-line transcript (greeting → user
  question → companion reply → scripture citation) with `inputDisabled:
  false` and no leftover thinking bubble.

## Not Attempted (explicitly out of scope for this batch)

- Splitting the single plain-text `reply` string into separate,
  visually-boxed "Primary Witness / Supporting Witnesses / Cross-References
  / Original Language / Historical Context" UI sections. This would
  require either a backend response-contract change (redesigning a
  verified, working response shape — forbidden by this batch) or a
  fragile client-side text-parsing heuristic. Documented as
  `DEFER_POST_ALPHA`; the content itself is present, honest, and labeled
  in the text today, just not yet visually sectioned.
- Physical mobile-device testing (only the CSS breakpoint was verified,
  not an actual iOS/Android device or emulator).
- `public/chat.html` ("Tester Chat") and `public/lab.html` were not the
  primary front door (`/` serves `index.html`) and were left unchanged;
  a future batch should confirm whether they are still linked from
  anywhere before deciding to update or retire them.

## Regression Check

`scripts/alpha/scriptureFidelitySmoke.js` — 4/4 PASS after the UI changes
(all edits were confined to `public/index.html`; no backend/runtime file
was touched in this Part).
