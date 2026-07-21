# Composer Prompt Audit — Reason-First OpenAI Layer

**Files:** `services/reasonFirstComposer.js`, `services/buddyBrain.js` (`buildSystemPrompt`), `services/runtimeOrchestrator.js` (`buildRuntimeInstructions`)  
**Validation:** 20 turns, 100% OpenAI composition (`masterRoute: reason_first_openai`)

---

## Prompt Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ SYSTEM MESSAGE (~12,700 chars for typical turn)             │
├─────────────────────────────────────────────────────────────┤
│ 1. buildSystemPrompt()          ~3,500 chars base persona   │
│ 2. buildRuntimeInstructions()   ~8,000+ chars mode rules    │
│ 3. COMPOSER_INSTRUCTION         ~450 chars reason-first add │
│ 4. Evidence pack JSON           ~500–4,000 chars varies     │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ USER MESSAGE (JSON string)                                  │
├─────────────────────────────────────────────────────────────┤
│ userMessage, conversationHistory (text block),              │
│ activeConversation, evidence { memory, scripture, history,  │
│   doctrine, understanding, companionContext },              │
│ regenInstruction (null unless doctrine validation retry)  │
└─────────────────────────────────────────────────────────────┘
```

**Model:** `gpt-4.1-mini` (default), temperature 0.72 (0.55 on regen)  
**Response format:** JSON object with `reply` field  
**Post-process:** `lightPolish` → doctrine sanitize → label strip → `finalizeBuddyResponse` with `skipRelationshipEnrichment: true`

---

## Exact Composer Instructions

From `services/reasonFirstComposer.js`:

```
Answer the user's exact question. Listen first. Be warm and human.
Use Scripture as foundation. Do not teach Sunday as biblical Sabbath, heaven at death,
law abolished, dietary law abolished, or man-made tradition as biblical command.
History may explain practice but may not override Scripture.
On correction or meta/wording turns: acknowledge what you heard before answering.
Do not paste retrieved evidence verbatim — compose fresh prose.
Do not add unsolicited study prompts unless the user asks to study.
```

Appended **after** the full legacy `buildSystemPrompt` block, which already includes:

```
Permanent North Star:
- Help the user feel heard before instructed.
...
Companion style:
- Reflect the user's actual situation in one sentence before advising.
...
Return JSON only using this shape: { "reply": "...", ... }
```

---

## Base System Prompt — Listening-Relevant Excerpts

The composer inherits the entire legacy Bible Buddy persona (~57 lines) including:

| Instruction | Location | Enforced in output? |
|-------------|----------|---------------------|
| "Help the user feel heard before instructed" | North Star | Partial — reflection phrases appear on ~45% of turns |
| "Reflect the user's actual situation in one sentence before advising" | Companion style | Often generic ("It sounds like…") not specific |
| "Respond to the specific user message, not a generic template" | Companion style | Violated on Sabbath T2–7 loop |
| "Do not be pushy, robotic, shame-based…" | North Star | Robotic repetition on meta thread |
| "Do not keep asking vague questions when the user needs guidance" | Companion style | Job/distant threads end with offers — borderline |
| JSON-only response shape | End of prompt | Honored |

---

## Runtime Instructions Layer

`buildRuntimeInstructions(runtimeContext)` injects additional mode-specific rules (companion, safety, loop risk, etc.). For a typical Sabbath historical turn this adds thousands of characters of runtime policy **before** the short COMPOSER_INSTRUCTION.

**Effect:** The 7-line composer addendum is a small tail on a very large legacy instruction stack. Doctrine boundaries appear **twice** — once in runtime instructions and again in `evidence.doctrine` JSON.

---

## User Payload Structure (per turn)

Example shape sent as user message JSON:

```json
{
  "userMessage": "<exact user text>",
  "conversationHistory": "Turn 1 user: ...\nTurn 1 assistant: ...",
  "activeConversation": null,
  "evidence": {
    "memory": { "snippets": [], "hits": [], "recallRequested": false },
    "scripture": { "topic": "...", "references": [...] },
    "history": { "included": true/false, "chainSteps": [...] },
    "doctrine": { "boundaries": [...], "forbiddenTeachings": [...] },
    "understanding": {
      "exactUserQuestion": "...",
      "plainEnglishRestatement": "...",
      "questionType": "...",
      "requestedAnswerType": "...",
      "forbiddenDistractions": [...],
      "strictAnswerMode": false
    },
    "companionContext": { "health": false, "grief": false, ... }
  },
  "regenInstruction": null
}
```

The model must synthesize persona + runtime rules + evidence + history text into a single JSON `reply`.

---

## Weaknesses

### 1. Instruction hierarchy conflict

- Base prompt: "Reflect user's situation in one sentence **before advising**."
- Composer addendum: "Answer the user's **exact question**. Listen first."
- Evidence `understanding.plainEnglishRestatement` sometimes reframes the question generically (e.g., all Job turns: "life decision… not a template answer") — may pull model toward template discernment voice.

### 2. Listening instruction is underspecified

"Listen first" and "acknowledge what you heard" have no operational definition:

- No requirement to quote user's distinctive words ("Wednesday", "doesn't remember who I am")
- No prohibition on repeating prior reply structure
- No loop-break rule when `isCorrection: true` or `strictAnswerMode: true`

### 3. Doctrine weight dominates companion weight

~90% of system prompt volume is doctrine/runtime/safety. Companion listening guidance is ~5% by character count. Model optimizes for doctrinal safety and historical accuracy over conversational nuance.

### 4. JSON reply constraint

Forcing JSON output encourages complete, self-contained answers in one block — discouraging short, human acknowledgments followed by depth. Model fills the `reply` string with balanced paragraphs.

### 5. No prior-reply diff instruction

On meta/wording turns, prompt never says: "Your previous answer was X; user rejects rationale Y; provide a substantively different explanation."

### 6. Relationship enrichment skipped

`skipRelationshipEnrichment: true` in reason-first finalize path removes a layer that might have added personal continuity — traded for purity of OpenAI ownership, possibly reducing warmth.

### 7. Temperature 0.72

Moderate-high temperature on a 12K system prompt still produces **mode collapse** on repeated meta questions — same "informal shorthand" rationale across 4 turns suggests attractor basin in policy interpretation, not randomness failure.

---

## Repetitive Language (observed across 20 turns)

### Opening formulas

| Phrase | Approx. count |
|--------|---------------|
| "It sounds like…" | 8 |
| "I'm so sorry to hear…" | 2 |
| "Thank you for your thoughtful question" | 1 |
| "I hear you…" / "I hear your concern" | 2 |
| "I completely understand your frustration" | 1 |
| "Feeling distant from God can be really hard" | 1 |

### Closing formulas

| Pattern | Count |
|---------|-------|
| "Would you like…" / "If you want…" / "If you'd like…" | 9 |
| "I'm here to listen" | 3 |
| "gentle next step" / "A gentle step" | 6 |

### Sabbath wording thread — near-duplicate block

Turns 2, 3, 4, 5, 6, 7 all contain variants of:

> I use "Roman church" as a simpler / conversational / informal way… without implying formal titles… I can use "Roman Catholic Church" going forward…

**Same semantic content, six times** — classic template loop despite OpenAI composition.

### Discernment thread homogeneity

All three Job turns: "It sounds like…" → challenges/opportunities → "gentle next step" → prayer/pros/cons → optional question.

---

## Opportunities to Improve Listening (prompt-only levers)

These are audit recommendations — **not implemented**:

1. **Lead with COMPOSER_INSTRUCTION** or a dedicated "Turn contract" block at the **top** of system prompt, not buried after 8K runtime rules.

2. **Add explicit micro-structure for companion turns:**
   - Sentence 1: mirror user's exact concern (must include one distinctive detail from their message)
   - Sentence 2+: answer or guide
   - Ban reuse of same opening phrase within a thread

3. **Meta/correction turn override:** When `understanding.isCorrection` or `strictAnswerMode`, replace generic persona with:
   - "Do not repeat any sentence from your previous reply"
   - "Explain the system reason for your wording, or state you do not know"

4. **Inject `priorAssistantPhrase` into evidence** for wording questions so the model has a concrete referent.

5. **Short-reply mode** for grief/health first turns: cap length; prioritize presence over advice.

6. **Weight scripture from evidence only:** "Do not cite verses unless listed in evidence.scripture.references" — would force retrieval to do its job and reduce generic verse padding.

7. **Separate prompts by `requestedAnswerType`** (discernment vs wording_explanation vs companion_support) instead of one mega-prompt.

8. **Lower temperature on correction turns** (already 0.55 on regen — extend to correction class).

---

## Composer vs Legacy Listening Delta (+0.1)

| Factor | Effect |
|--------|--------|
| OpenAI replaces template/responder prose | Eliminates worst template matches |
| Same base system prompt as legacy OpenAI path | Preserves robotic attractors |
| Reflection phrase regex | Easy +2 path → clusters at 7 |
| No relationship enrichment | Continuity unchanged |
| Empty memory retrieval | No improvement in "remember me" |
| Sabbath loop | Proves composer can fail listening while OpenAI=100% |

**Net:** OpenAI activation fixes **ownership** (who writes text) but not **prompt design, retrieval grounding, or loop-breaking** — hence 5.7 → 5.8, not 7+.
