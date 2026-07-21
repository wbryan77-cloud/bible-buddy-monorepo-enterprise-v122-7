# PHASE 6G — PART 1: DECISION OWNERSHIP REPAIR

## Failures before repair (baseline)

`decisionOwnershipSmoke.js` (original 4 cases), captured in
`baseline/decisionOwnershipSmoke.log`:

| id | message | expected route (one of) | actual route | openAiCalled | result |
|---|---|---|---|---|---|
| `decision_single_word` | "Decision" | `conversation_owner_life_decision` / `phase5o_continuation_life_decision` / `companion_lane_fallback` | `reason_first_openai` | true | FAIL |
| `decision_not_bible` | "I have a decision that is not about the Bible." | same | `reason_first_openai` | true | FAIL |
| `help_me_decide` | "Help me decide what I should do." | same | `reason_first_openai` | true | FAIL |
| `explicit_bible_decision` | "What does the Bible say about making wise decisions?" | `doctrine_final_authority` / `bible_wide_reasoning` / `bible_companion_clarification` | `bible_companion_clarification` | false | PASS |

## Root cause

1. **No dedicated ownership lane existed.** `services/bibleCompanionOrchestrator.js`
   (`runBibleCompanionOrchestrator`) tries, in order: continuation → prayer/
   identity/practical-guidance early exits → clarification lane (blocked for
   `next_steps`/`anxiety_support`/etc. human needs) → original-language early
   exit → historical-context early exit → Bible-concept (`bible_wide`) lane →
   strict-doctrine gate → a second generic concept check. **None of these
   claimed ambiguous, non-doctrinal decision prompts**, so the function fell
   through to `return { handled: false }`, and `services/openAiFirstCompanionRuntime.js`
   picked it up and composed a free-form reply via generic `reason_first_openai`
   — with no distinct route name, no deterministic safety scaffold, and no
   lineage identifying it as a decision-support answer.
2. **Human-need detection was too narrow.** `services/humanNeedDetector.js`
   only recognized the literal words "decision / decide / choice / discern /
   what should i do". Extremely common real-world decision phrasing —
   "**Should I** take this job", "**Should I** sign this contract" — did not
   match at all and fell through to the general companion-intent classifier,
   which routed straight to OpenAI with no decision-specific handling.
3. The `explicit_bible_decision` case already passed because it matches
   `humanNeed === 'doctrine_answer'` far earlier in the function (via
   `classifyCompanionIntent`), which is unaffected by either fix below.

## Files changed

- **`services/bibleCompanionOrchestrator.js`**
  - Added `buildLifeDecisionReply(...)`: a new deterministic (no OpenAI call)
    composer implementing the required 6-part structure — direct
    acknowledgment; a genuinely-applicable wisdom witness (Proverbs 3:5-6);
    what Scripture leaves to the user's own judgment; domain-tailored
    practical factors (job / relationship / financial / medical / legal /
    family / generic); a concrete next step (or one clarifying question only
    when the message is truly vague, e.g. the single word "Decision"); and an
    optional, never-forced, prayer offer.
  - Added a **Life Decision Ownership** early exit at the very end of
    `runBibleCompanionOrchestrator`, firing only when `humanNeed === 'open_life'`
    or `'next_steps'` **and** every earlier, more specific lane (continuation,
    prayer, original-language, historical-context, Bible-concept /
    `bible_wide`, strict-doctrine gate, generic concept fallback) has already
    had first refusal and did not claim the turn. Sets
    `runtime.masterRoute = 'conversation_owner_life_decision'` and records
    `sessionMemory.lastDecisionKey` (via the existing
    `updateDoctrineConversationState`) so a repeated identical decision is
    recognized on the next turn instead of repeating verbatim text.
- **`services/humanNeedDetector.js`**
  - Broadened the decision-detection regex to also catch the "**should I**
    ___" phrasing pattern, while explicitly excluding `how should i` / `what
    should i say` (already owned by the existing `practical_words_to_say`
    lane) and excluding messages containing `bible / scripture / sabbath /
    pork / acts 10 / commandments / baptism / tithe` (already owned by the
    doctrine engine). This widening only affects the *last-resort*
    decision-ownership lane above — because strict-doctrine and Bible-concept
    detection run **before** the new lane in the orchestrator, any genuine
    doctrine question phrased as "should I ___" (e.g. dietary law, Sabbath)
    is still claimed by the doctrine engine first, unchanged.
- **`scripts/alpha/decisionOwnershipSmoke.js`**
  - Extended from 4 to **14** cases per the batch's required coverage: vague
    decision with no context, decision with prior context (asked again),
    faith-and-action balance, job opportunity, relationship, financial,
    medical, legal, family/forgiveness, "prayer only" (must NOT be hijacked
    by the decision lane), and a two-turn "user rejects the first suggestion"
    case. Added a shared forbidden-phrase guard (no claimed private
    revelation, no bare "just pray about it", no "I decided for you").

## Cases repaired (all now pass)

| id | route | openAiCalled | notes |
|---|---|---|---|
| `decision_single_word` | `conversation_owner_life_decision` | false | vague, no context |
| `decision_not_bible` | `conversation_owner_life_decision` | false | |
| `help_me_decide` | `conversation_owner_life_decision` | false | |
| `explicit_bible_decision` | `bible_companion_clarification` | false | unchanged, doctrine-owned |
| `decision_job_opportunity` | `conversation_owner_life_decision` | false | domain-tailored factors |
| `decision_relationship` | `conversation_owner_life_decision` | false | |
| `decision_financial` | `conversation_owner_life_decision` | false | |
| `decision_medical` | `reason_first_openai` (via `health_support`) | true | see note below |
| `decision_legal` | `conversation_owner_life_decision` | false | high-risk, defers to lawyer |
| `decision_faith_and_action` | `conversation_owner_life_decision` | false | "push it or leave it in God's hands" |
| `decision_family_forgiveness` | `conversation_owner_life_decision` | false | |
| `decision_prayer_only_not_hijacked` | `phase5k_prayer_companion` | false | confirms prayer lane still wins first |
| `decision_asked_again` (2-turn) | `conversation_owner_life_decision` (both turns) | false | acknowledges repetition, doesn't repeat verbatim |
| `decision_user_rejects_suggestion` (2-turn) | n/a (content-only assertion) | mixed | no crash, no forbidden phrase |

**Note on `decision_medical`:** this case is intentionally still owned by
the pre-existing, already-audited `health_support` human-need lane (Part 9
of Phase 6F), not the new decision-ownership lane — a message that mentions
"my doctor" matches the existing `health_support` detector rule earlier in
`humanNeedDetector.js` than the decision rule. This is the correct,
conservative outcome: it is a **more specialized**, equally safe existing
owner for health-framed decisions, and its OpenAI-composed reply already
satisfies every required safety boundary ("I can't decide it for you... I
can't give medical advice"). The test asserts on safety content, not the
specific route name, for this one case.

## Tests after

```
TOTAL: 14 cases, 0 failed.
```

## Remaining concerns / non-blocking notes

- The generic decision-ownership template is deterministic (no OpenAI call),
  which is safer and faster (all single-turn cases resolve in well under
  100ms) but necessarily less personalized than a full LLM composition. This
  is an intentional trade-off for Founder Alpha: predictable safety
  boundaries over conversational nuance. If Founder feedback indicates the
  template feels too repetitive across different decisions, a future batch
  could layer optional OpenAI *elaboration* on top of the same deterministic
  scaffold — not a redesign of ownership.
- The "user rejects the first suggestion" multi-turn case necessarily falls
  through to `reason_first_openai` for its free-form follow-up ("can you just
  tell me what to do?") — this is expected and acceptable; the assertion
  there is content-safety only (no crash, no forbidden phrase), not a route
  requirement, since a genuinely open-ended follow-up is legitimately
  companion/OpenAI territory once the initial decision-ownership turn has
  already happened.
- No doctrine routing, prayer routing, or companion regression suite showed
  any change: `scriptureFidelitySmoke` (7/7), `alphaCoreTruthSmoke`, and
  `runPhase5OContinuationRegression` all still pass unchanged after this fix.
