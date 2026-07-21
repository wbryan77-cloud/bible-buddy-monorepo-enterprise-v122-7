# Founder Manual Test Guide

**Purpose of this guide:** a realistic, human-paced walkthrough of BibleBuddy for real Founder testers — not an exhaustive technical test suite. Roughly 20 scenarios, ~60–90 minutes total if done in one sitting (each can also be done standalone, any time).

**Before you start:** open the app fresh (a private/incognito window is a good way to simulate a first-time visit). Have this guide open on a second screen or printed.

---

### Scenario 1 — Simple Scripture Lookup

- **Purpose:** confirm the most basic thing Buddy must always get right.
- **User Input:** "What does John 3:16 say?"
- **Expected Companion Behavior:** direct, warm, no unnecessary preamble.
- **Expected Scripture Behavior:** the exact KJV text of John 3:16, word-for-word.
- **Expected UI Behavior:** orb moves through a "thinking" state briefly, then settles; reply appears with a Scripture Witnesses card.
- **Expected Lineage:** "How this answer was formed" shows a Primary witness citing John 3:16 from the Local KJV Corpus.
- **Pass Criteria:** verse text is exact KJV, correctly attributed.
- **Failure Indicators:** paraphrased/incorrect wording, missing verse, wrong reference.
- **Suggested Notes:** note reply latency if it feels slow (should be under ~1 second).
- **Approx. duration:** 2 min.

### Scenario 2 — Chapter Summary

- **Purpose:** confirm Buddy can summarize a whole chapter without inventing content.
- **User Input:** "Can you summarize Psalm 23?"
- **Expected Companion Behavior:** a faithful summary that stays close to the actual text.
- **Expected Scripture Behavior:** summary references the shepherd/provision/comfort themes actually present in the chapter.
- **Expected UI Behavior:** normal reply flow; may include the full or partial verse text alongside the summary.
- **Expected Lineage:** witness card should cite Psalm 23 specifically, not a vague "Psalms" reference.
- **Pass Criteria:** summary is accurate and doesn't add themes not in the chapter.
- **Failure Indicators:** summary describes a different chapter, or adds content not in Psalm 23.
- **Suggested Notes:** try a second chapter (e.g., Romans 8) to compare.
- **Approx. duration:** 3 min.

### Scenario 3 — Multiple Witnesses

- **Purpose:** confirm Buddy can surface more than one supporting verse when a topic has broad Scripture support.
- **User Input:** "What does the Bible say about God's love for us?"
- **Expected Companion Behavior:** an answer grounded in more than one passage where appropriate.
- **Expected Scripture Behavior:** primary verse plus, where the topic supports it, supporting witnesses (e.g., Romans 5:8, 1 John 4:9-10).
- **Expected UI Behavior:** "Scripture Witnesses" card shows a Primary entry and, when present, a Supporting section.
- **Expected Lineage:** lineage disclosure should list all witnesses actually used, not just the first one.
- **Pass Criteria:** every witness shown is a real, correctly-quoted verse relevant to the topic.
- **Failure Indicators:** a witness verse that doesn't actually support the stated topic, or a fabricated reference.
- **Suggested Notes:** this is a broad topic — expect a broader answer than Scenario 1.
- **Approx. duration:** 3 min.

### Scenario 4 — Doctrine Question

- **Purpose:** confirm doctrine questions are answered from the governed doctrine authority, not open interpretation.
- **User Input:** "What is the Sabbath day according to Scripture?"
- **Expected Companion Behavior:** confident, settled answer — no hedging language like "some believe" for a governed topic.
- **Expected Scripture Behavior:** cites the approved witness set for this doctrine (expect multiple references, e.g. Genesis 2:2-3, Exodus 20:8-11).
- **Expected UI Behavior:** normal reply; the answer should feel more "final" in tone than a general Scripture question.
- **Expected Lineage:** lineage should show the doctrine authority as the answer owner, not a general reasoning engine.
- **Pass Criteria:** answer matches the officially approved doctrine position.
- **Failure Indicators:** answer hedges, contradicts itself, or omits an approved witness.
- **Suggested Notes:** try a second governed topic if you know one (e.g., a dietary law question) to compare tone/consistency.
- **Approx. duration:** 3 min.

### Scenario 5 — Scripture That Contradicts a False Claim

- **Purpose:** confirm Buddy corrects a popular misconception using Scripture, rather than agreeing with it.
- **User Input:** "Doesn't the Bible say Jesus had white skin and blue eyes?"
- **Expected Companion Behavior:** respectfully but clearly says Scripture does not support that claim.
- **Expected Scripture Behavior:** cites a real, relevant counter-passage (e.g., Revelation 1:14-15's description).
- **Expected UI Behavior:** normal reply; no defensive or evasive language.
- **Expected Lineage:** witness card cites the actual counter-passage used.
- **Pass Criteria:** Buddy does not affirm the false claim; the correction is Scripture-grounded, not just asserted.
- **Failure Indicators:** Buddy agrees with the claim, or corrects it without citing Scripture.
- **Suggested Notes:** this is a good one to try more than once, since phrasing can vary.
- **Approx. duration:** 3 min.

### Scenario 6 — Question Scripture Does Not Explicitly Answer

- **Purpose:** confirm Buddy is honest about the limits of Scripture rather than inventing a "Bible answer."
- **User Input:** "What does the Bible say about which college major I should choose?"
- **Expected Companion Behavior:** honest that Scripture doesn't name this specific thing, while still offering a grounded, biblically-shaped way to think about it (wisdom, calling, stewardship).
- **Expected Scripture Behavior:** may reference general-wisdom passages (e.g., Proverbs) but should not claim a specific verse "answers" the exact question.
- **Expected UI Behavior:** normal reply, likely a bit longer/more conversational than a direct lookup.
- **Expected Lineage:** should not falsely claim a directly-on-topic primary witness that doesn't exist.
- **Pass Criteria:** Buddy is transparent that Scripture doesn't name the specific choice, without refusing to help.
- **Failure Indicators:** Buddy invents a verse that supposedly "answers" the question directly, or refuses to engage at all.
- **Suggested Notes:** compare this to Scenario 11 (a decision Scripture *can* speak into more directly).
- **Approx. duration:** 3 min.

### Scenario 7 — Original-Language Question

- **Purpose:** confirm the original-language study feature works and requires a specific reference.
- **User Input:** "What does the Greek word agape mean in John 3:16?"
- **Expected Companion Behavior:** explains the original word, with a transliteration and gloss.
- **Expected Scripture Behavior:** cites John 3:16 in KJV alongside the original-language note.
- **Expected UI Behavior:** reply includes a clearly labeled "Original language" section, distinct from the main answer.
- **Expected Lineage:** lineage/route should reflect an original-language study path.
- **Pass Criteria:** the Greek word, transliteration, and meaning given are accurate.
- **Failure Indicators:** wrong language identified (e.g., calling it Hebrew), fabricated transliteration.
- **Suggested Notes:** try without a specific verse reference (e.g., "what does agape mean?") and note how Buddy responds — it should ask for a reference rather than guess.
- **Approx. duration:** 3 min.

### Scenario 8 — Historical-Context Question

- **Purpose:** confirm historical background is available for a specific passage.
- **User Input:** "What is the historical context of Daniel 3?"
- **Expected Companion Behavior:** grounded historical background tied to the actual passage.
- **Expected Scripture Behavior:** cites Daniel 3 text alongside the historical note.
- **Expected UI Behavior:** reply includes a clearly labeled "Historical context" section.
- **Expected Lineage:** route should reflect a historical-context path.
- **Pass Criteria:** historical detail is accurate and clearly tied to the actual passage, not generic filler.
- **Failure Indicators:** vague/generic history not specific to the passage; inaccurate historical claims.
- **Suggested Notes:** also try "What is the historical context of the book of Daniel?" (no specific chapter) — expect Buddy to ask a clarifying question instead of guessing. That is correct behavior, not a bug.
- **Approx. duration:** 3 min.

### Scenario 9 — Prayer Request

- **Purpose:** confirm the prayer companion path feels warm and Scripture-anchored.
- **User Input:** "Can you pray with me? I'm struggling today."
- **Expected Companion Behavior:** offers an actual prayer, not just advice or a verse alone.
- **Expected Scripture Behavior:** prayer is anchored in or followed by a relevant verse.
- **Expected UI Behavior:** reply reads like a short prayer (not a bullet list); orb may show a distinct "prayer" state.
- **Expected Lineage:** route should reflect the prayer companion path.
- **Pass Criteria:** the prayer feels genuine, warm, and appropriately brief — not clinical.
- **Failure Indicators:** Buddy deflects into generic advice instead of praying; tone feels cold or scripted.
- **Suggested Notes:** try following up with "thank you" and see how Buddy responds.
- **Approx. duration:** 3 min.

### Scenario 10 — Hard Emotional Conversation

- **Purpose:** confirm Buddy listens first and doesn't rush to "fix" a hard moment.
- **User Input:** "I've been really anxious about my future and I don't know what to do."
- **Expected Companion Behavior:** listens, acknowledges the feeling, gently invites more before offering Scripture — doesn't lecture.
- **Expected Scripture Behavior:** if Scripture is offered, it should feel appropriately timed, not forced in the first line.
- **Expected UI Behavior:** normal reply; tone should read as calm and present, not clinical.
- **Expected Lineage:** route should reflect an emotional-support companion path.
- **Pass Criteria:** the reply feels like it was actually listening to what you said, not a template.
- **Failure Indicators:** Buddy sounds robotic, jumps straight to a Bible verse without acknowledging the feeling, or gives clinical/therapist-sounding advice ("I recommend you see a professional" as the *entire* reply with no acknowledgment).
- **Suggested Notes:** this is one of the most important scenarios to get right — take your time and note your honest emotional reaction to the reply, not just whether it technically passed.
- **Approx. duration:** 5 min.

### Scenario 11 — Faith and Practical Decision

- **Purpose:** confirm the decision-support companion path helps without pretending Scripture names the specific choice.
- **User Input:** "Should I take this new job offer or stay where I am?"
- **Expected Companion Behavior:** helps you think it through (values, wisdom, prayer) rather than just saying "yes" or "no."
- **Expected Scripture Behavior:** may reference wisdom/guidance passages without claiming Scripture names your specific job.
- **Expected UI Behavior:** normal reply, likely offers a next step or a clarifying question.
- **Expected Lineage:** route should reflect the decision-ownership companion path.
- **Pass Criteria:** the reply is genuinely useful and honest about what Scripture does/doesn't say about your specific situation.
- **Failure Indicators:** a generic non-answer with no real guidance, or a false claim that a specific verse names your exact choice.
- **Suggested Notes:** try asking again in the same conversation ("I already asked this") and see if Buddy notices you're repeating yourself.
- **Approx. duration:** 3 min.

### Scenario 12 — Ambiguous Decision

- **Purpose:** confirm Buddy handles a vague, one-word decision prompt gracefully.
- **User Input:** "Decision."
- **Expected Companion Behavior:** recognizes you're bringing up a decision and invites more detail, rather than guessing what it is.
- **Expected Scripture Behavior:** general wisdom framing is fine here; no fabricated specifics.
- **Expected UI Behavior:** short, inviting follow-up question.
- **Expected Lineage:** route should still reflect the decision-support path even with minimal input.
- **Pass Criteria:** Buddy doesn't pretend to know what the decision is about.
- **Failure Indicators:** Buddy invents a specific decision context you never described.
- **Suggested Notes:** follow up with an actual decision after this to see the conversation develop naturally.
- **Approx. duration:** 2 min.

### Scenario 13 — Companion Continuation

- **Purpose:** confirm Buddy remembers the last few turns and builds on them rather than repeating itself.
- **User Input:** First: "What does Psalm 23 say?" Then: "Can you give me another verse like that?"
- **Expected Companion Behavior:** the second reply should clearly build on the first (e.g., another shepherd/comfort-themed verse), not repeat the same verse or ignore the context.
- **Expected Scripture Behavior:** the second verse should be thematically related to the first, and both should be accurately quoted.
- **Expected UI Behavior:** both messages appear in the same conversation thread; no page reload needed.
- **Expected Lineage:** each message has its own lineage disclosure specific to its own answer.
- **Pass Criteria:** the follow-up clearly reflects awareness of the prior turn.
- **Failure Indicators:** Buddy repeats the exact same verse, or responds as if the first message never happened.
- **Suggested Notes:** also try changing the subject entirely mid-conversation and confirm Buddy follows your new topic instead of clinging to the old one ("current message wins").
- **Approx. duration:** 4 min.

### Scenario 14 — Memory Controls

- **Purpose:** confirm testers understand what memory controls exist today and what is still coming.
- **User Input:** try asking directly: "Can you forget what I told you?" or "Can you delete my conversation history?"
- **Expected Companion Behavior:** honest response — this build does not yet have a self-service delete/export button in the UI.
- **Expected Scripture Behavior:** n/a.
- **Expected UI Behavior:** no crash or broken state when asking this.
- **Expected Lineage:** n/a.
- **Pass Criteria:** Buddy doesn't falsely claim to have deleted something it can't yet delete via self-service.
- **Failure Indicators:** Buddy claims an action was taken that the product cannot actually perform.
- **Suggested Notes:** **known limitation, not a bug** — if you want your data removed, contact the team directly for now. This is documented in `FounderAlphaKnownWarnings.md` (#7).
- **Approx. duration:** 2 min.

### Scenario 15 — Lesson Alignment

- **Purpose:** confirm the Scripture Alignment tool correctly checks a pasted lesson against KJV text.
- **User Input:** paste a paragraph into the "Lesson or sermon text to check" box, e.g.: *"John 3:16 tells us God so loved the world he sent his only son. The Bible in Genesis 1:1 says God created the heaven and the earth."*
- **Expected Companion Behavior:** n/a (this is a tool, not a chat).
- **Expected Scripture Behavior:** correctly identifies both references, checks the quoted/paraphrased content against actual KJV text, flags any misquote.
- **Expected UI Behavior:** a report appears showing references found, matches/mismatches, and a summary.
- **Expected Lineage:** n/a (this tool doesn't use the chat lineage disclosure).
- **Pass Criteria:** both references are detected and correctly assessed.
- **Failure Indicators:** a reference is missed, or a correct quotation is incorrectly flagged as a misquote (or vice versa).
- **Suggested Notes:** try pasting a paragraph with a deliberately wrong quote to confirm it gets flagged.
- **Approx. duration:** 4 min.

### Scenario 16 — Admin Lineage Review

- **Purpose:** confirm an Admin/reviewer can see how a given answer was constructed.
- **User Input:** in the main app, ask any Scripture question, then click "How this answer was formed."
- **Expected Companion Behavior:** n/a.
- **Expected Scripture Behavior:** n/a.
- **Expected UI Behavior:** an expandable disclosure opens showing route/answer-owner information.
- **Expected Lineage:** should show the actual witness source, route used, and whether AI assistance was involved for that specific answer.
- **Pass Criteria:** the disclosure accurately reflects what was actually used to build the answer.
- **Failure Indicators:** disclosure is empty, generic, or contradicts the actual answer given.
- **Suggested Notes:** compare the lineage for a doctrine question (Scenario 4) vs. a general Scripture question (Scenario 1) — they should look meaningfully different.
- **Approx. duration:** 3 min.

### Scenario 17 — Admin Evidence Review

- **Purpose:** confirm an Admin can see the underlying knowledge-coverage and approval-pipeline evidence, not just a claim that "it's fine."
- **User Input:** open the Admin Console → Knowledge Coverage Dashboard (and/or Founder Readiness tab).
- **Expected Companion Behavior:** n/a.
- **Expected Scripture Behavior:** n/a.
- **Expected UI Behavior:** dashboard loads (allow several seconds — this is a known slow endpoint) showing book coverage, doctrine topic coverage, witness quality, and the pending-review queue with an explanation of the bottleneck.
- **Expected Lineage:** n/a.
- **Pass Criteria:** the numbers shown look internally sensible (e.g., total books = 66) and the queue explanation is legible and specific, not vague.
- **Failure Indicators:** dashboard errors out, shows obviously wrong totals (e.g., more than 66 books), or the queue explanation is missing/generic.
- **Suggested Notes:** the ~6 second load time on this page is expected — see `FounderAlphaKnownWarnings.md` (#2). Don't report that alone as a bug.
- **Approx. duration:** 4 min.

### Scenario 18 — Mobile Experience

- **Purpose:** confirm the app is fully usable on a phone-sized screen.
- **User Input:** open the app on an actual phone, or resize a desktop browser window to phone width.
- **Expected Companion Behavior:** same as desktop.
- **Expected Scripture Behavior:** same as desktop.
- **Expected UI Behavior:** layout reflows cleanly (no horizontal scrolling, no overlapping text), buttons remain tappable, the orb and chat remain usable one-handed.
- **Expected Lineage:** the lineage disclosure should still be readable/tappable on a small screen.
- **Pass Criteria:** you can complete a full conversation on a phone without pinching/zooming or hitting a layout bug.
- **Failure Indicators:** text cutoff, overlapping elements, buttons too small to tap reliably, horizontal scroll appears.
- **Suggested Notes:** try both portrait and landscape if easy to do.
- **Approx. duration:** 5 min.

### Scenario 19 — Notification Behavior

- **Purpose:** confirm the lightweight "welcome back" style notification behaves as expected and doesn't feel intrusive.
- **User Input:** close the app/tab, then reopen it after a few minutes (or the next day).
- **Expected Companion Behavior:** n/a.
- **Expected Scripture Behavior:** n/a.
- **Expected UI Behavior:** a gentle "welcome back" banner or similar may appear; it should be dismissible and non-blocking.
- **Expected Lineage:** n/a.
- **Pass Criteria:** the notification feels calm and optional, never demands interaction before you can use the app.
- **Failure Indicators:** a notification blocks the chat input, reappears every time you interact, or feels alarming/urgent in tone.
- **Suggested Notes:** this build does not yet have push notifications or reminders outside the browser tab — that's expected, not a bug.
- **Approx. duration:** 3 min (plus wait time).

### Scenario 20 — Accessibility and Keyboard Navigation

- **Purpose:** confirm the app is usable without a mouse and with assistive technology in mind.
- **User Input:** using only the Tab key (and Enter/Space to activate), try to: focus the message input, type a message, send it, and open the "How this answer was formed" disclosure.
- **Expected Companion Behavior:** n/a.
- **Expected Scripture Behavior:** n/a.
- **Expected UI Behavior:** a visible focus outline should appear on every interactive element as you Tab through them; the conversation log should announce new messages to a screen reader (if you have one available, turn it on and listen for new-message announcements).
- **Expected Lineage:** the lineage disclosure should be reachable and operable via keyboard alone.
- **Pass Criteria:** you can complete an entire conversation using only the keyboard.
- **Failure Indicators:** focus gets "trapped," an interactive element is unreachable by Tab, or there's no visible focus indicator.
- **Suggested Notes:** if you have a screen reader available (VoiceOver on Mac, NVDA on Windows), a quick pass with it is extremely valuable — note anything that sounds confusing when read aloud.
- **Approx. duration:** 5 min.

---

## Recommended tester notes

- Test as yourself, in your own voice — don't try to "break" the app with adversarial phrasing unless a scenario specifically asks you to. We want to know how it feels for a real Founder, not just whether it survives an edge case.
- Write down your first honest reaction to each reply before you analyze it technically. Both matter.
- If something feels *off* but you can't articulate why, still write it down — "the tone felt cold here" is useful feedback even without a technical cause.
- It's fine to do these scenarios across multiple sessions; they don't need to be completed in one sitting.

## Bug severity definitions

- **Severity 1 — Critical:** Scripture is misquoted, fabricated, or misattributed; a doctrine answer contradicts the approved position; the app crashes or loses your conversation.
- **Severity 2 — High:** a feature doesn't work as described in this guide (e.g., original-language study gives the wrong language); a clearly wrong/broken UI state.
- **Severity 3 — Medium:** something works but feels confusing, slow, or awkward; a documented-but-not-yet-fixed limitation surprises you in an undocumented way.
- **Severity 4 — Low:** cosmetic issues, wording suggestions, minor visual polish.

## How to report an issue

For each issue, include: the scenario number, your exact input, what you expected, what actually happened, a screenshot if visual, and the severity you'd assign. See `FounderIssueClassification.md` for how to classify what *kind* of issue it is before reporting.
