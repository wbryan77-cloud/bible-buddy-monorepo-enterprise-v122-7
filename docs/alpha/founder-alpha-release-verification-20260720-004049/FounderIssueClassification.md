# Founder Issue Classification Guide

When something feels wrong during testing, it helps everyone if you classify it before reporting. Here's how to tell the five kinds apart.

## Bug

**Definition:** the product did something it explicitly should not do, or failed to do something it explicitly should do, according to `FounderManualTestGuide.md`'s "Pass Criteria" for that scenario.

**Examples:**
- A verse is misquoted or the wrong reference is cited.
- A doctrine answer contradicts the approved position.
- The app crashes, freezes, or loses your conversation.
- A button doesn't respond, or a page layout breaks.

**How to tell it's a Bug and not something else:** you can point to a specific, expected, documented behavior that did not happen.

## Suggestion

**Definition:** the product works correctly and as designed, but you have an idea for how it could be better.

**Examples:**
- "I wish the orb glowed a bit brighter during Thinking."
- "It would be nice if the Send button had a subtle animation."

**How to tell it's a Suggestion and not a Bug:** nothing is actually broken — you're proposing a polish idea, not reporting a failure.

## Knowledge Gap

**Definition:** Buddy honestly said it doesn't have enough information, or gave a thin/generic answer, on a topic that Scripture, doctrine, original-language, or historical data *should* be able to cover more fully.

**Examples:**
- Asking about the historical context of a lesser-known passage and getting a very short or generic answer instead of specific detail.
- A doctrine topic you expected to be "governed" instead getting a general Scripture-reasoning answer.

**How to tell it's a Knowledge Gap and not a Bug:** Buddy is being honest (not fabricating), it's just that the underlying knowledge base doesn't yet have deep coverage of that specific topic. This is valuable feedback for prioritizing future knowledge work — it is not the same as Buddy being wrong.

## UI Improvement

**Definition:** something about the visual design, layout, or interaction pattern could be clearer, more attractive, or more usable — without anything being functionally broken.

**Examples:**
- Text contrast feels a little low in a specific card.
- A section could use more visual separation from the one above it.
- The mobile Send button feels slightly too small to tap confidently.

**How to tell it's a UI Improvement and not a Bug:** the feature works; the way it looks or feels could be refined.

## Feature Request

**Definition:** you want the product to do something it was never designed to do in this build.

**Examples:**
- "I want to be able to export my conversation history myself." (This is actually already a documented known limitation — see `FounderAlphaKnownWarnings.md` #7 — but if you hit it during testing without having read that doc first, log it as a Feature Request / known-limitation confirmation, not a Bug.)
- "I want voice interaction." (Documented as intentionally not active yet — see `FounderAlphaReleaseNotes.md`.)
- "I want push notifications instead of just an in-app banner."

**How to tell it's a Feature Request and not a Bug:** check `FounderAlphaReleaseNotes.md` ("What's intentionally not turned on yet") and `FounderAlphaKnownWarnings.md` first. If it's already listed there, it's an already-known future item, not a new bug — still worth a quick +1 note, but no need to write a full report.

---

## Severity definitions (repeated from the main guide for convenience)

- **Severity 1 — Critical:** Scripture misquoted/fabricated/misattributed; doctrine answer contradicts approved position; app crash or lost conversation.
- **Severity 2 — High:** a described feature doesn't work as documented; a clearly broken UI state.
- **Severity 3 — Medium:** works, but confusing/slow/awkward; an undocumented surprise around a known limitation.
- **Severity 4 — Low:** cosmetic, wording, minor polish.

Severity generally only applies to **Bugs**. Suggestions, UI Improvements, and Feature Requests don't need a severity — just a short description of the idea and why it'd help.

## How to report an issue

1. Note the scenario number (if applicable) from `FounderManualTestGuide.md`.
2. Classify it: Bug / Suggestion / Knowledge Gap / UI Improvement / Feature Request.
3. If it's a Bug, assign a severity (1–4).
4. Include: exact input you typed, what you expected, what actually happened, and a screenshot if it's visual.
5. Send it to the team along with your completed `FounderScenarioChecklist.md` if you have one.

**When in doubt, over-report rather than under-report.** It's easy to downgrade a report that turns out to be expected behavior; it's much harder to recover a real issue nobody wrote down.
