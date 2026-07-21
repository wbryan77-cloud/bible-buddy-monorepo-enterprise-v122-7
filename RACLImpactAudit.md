# RACL Impact Audit

Generated: 2026-06-02  
Audit only — no code changes.

## Executive Summary

| Runtime | Listening (headline) | Rubric | OpenAI |
|---------|---------------------|--------|--------|
| Legacy | 5.7/10 | Regex (`reasonFirstMigration.js`) | 0% |
| Reason-first (pre-RACL) | 5.8/10 | Regex | 100% |
| Reason-first + RACL | **6.3/10** | Human 5-dimension (`raclValidation.js`) | 100% |

**First measurable listening improvement:** +0.5 vs legacy, +0.5 vs pre-RACL (headline aggregates).

Apples-to-apples (same human rubric re-scored on pre-RACL replies): **6.1 → 6.3 (+0.2)**.

Sources:
- Pre-RACL: `docs/reason-first-migration/validation-results.json` (`reasonResults`)
- RACL: `docs/racl/validation-results.json`

---

## Per-Thread Summary

| Thread | Pre-RACL (human) | RACL (human) | Delta | Best RACL turn | Weakest RACL turn |
|--------|------------------|--------------|-------|----------------|-------------------|
| Job opportunity | 5.1 | 5.6 | +0.5 | T3 (5.8) | T2 (5.3) |
| Alzheimer's caregiver | 6.7 | 7.0 | +0.3 | T3 (7.8) | T1 (6.5) |
| Feeling distant from God | 5.9 | 6.2 | +0.3 | T3 (7.5) | T2 (5.0) |
| Sabbath wording | 6.5 | 6.5 | 0.0 | T3 (7.3) | T2 (5.6) |
| Grief | 5.6 | 5.9 | +0.3 | T2 (6.0) | T1 (5.8) |
| Health | 6.1 | 6.4 | +0.3 | T2 (6.5) | T1 (6.3) |

**Biggest gain:** Job (+0.5) — companion scripture stubs + thread context replaced generic OpenAI-only advice.  
**Flat:** Sabbath (0.0) — loop-control stopped history repeats but rationale paragraph still loops at 47–55% overlap.  
**Near target:** Alzheimer's T3 hit 7.8; distant T3 hit 7.5.

---

## 1. Job Opportunity

### Turn 1 — "I have a job opportunity."

**A. Before RACL**
> It sounds like you're standing at an important crossroads with this job opportunity, which can bring both excitement and uncertainty… How are you feeling about this opportunity so far?

**B. After RACL**
> You're facing an important decision about a job opportunity, and that can feel both exciting and a little uncertain… Proverbs 3:5-6 encourages us to trust in the LORD… James 1:5… Psalm 37:23…

**C. Listening delta:** 5.0 → 5.8 (+0.8)

**D. Why improved**
- RACL injected companion scripture stubs (Proverbs 3:5-6, James 1:5, Psalm 37:23) tied to discernment topic.
- `companionThreadContext` detected job/discernment on turn 1.
- Thread-local memory active (`threadLocalHitCount: 1`).

**E. What still prevented 8/10+**
- `threadSpecific: 4` — no follow-up question mirroring user's exact concern yet.
- Generic scripture stack without naming user's unstated factors (timing, God's leading).
- Ends with "Would you like… prayer" before exploring what user already shared.

---

### Turn 2 — "The company is far away from home."

**A. Before RACL**
> It sounds like the distance of this job from home is an important factor weighing on your heart… list the pros and cons of relocating…

**B. After RACL**
> You're thoughtfully considering a job opportunity that involves a significant change because the company is far from home… Proverbs 3:5-6 reminds us… James encourages…

**C. Listening delta:** 5.0 → 5.3 (+0.3)

**D. Why improved**
- Explicitly names "far from home" from thread.
- Thread memory grew (`threadLocalHitCount: 3`).

**E. What still prevented 8/10+**
- **50% token overlap** with T1 reply — repeated Proverbs/James/Prayer structure.
- `noRepeat: 5`, `threadSpecific: 4` — same generic discernment frame, not a fresh response to distance-specific grief.
- No clarifying question about who "home" is or what leaving would cost.

---

### Turn 3 — "I'm not sure whether to push or wait on this offer."

**A. Before RACL**
> It sounds like you're feeling uncertain about whether to take the initiative… Proverbs 3:5-6 reminds us… Would you like to pray together for guidance on this?

**B. After RACL**
> You're weighing whether to actively pursue this job offer or to wait patiently… Proverbs 3:5-6… Psalm 37:7 advises being still… James 1:5…

**C. Listening delta:** 5.3 → 5.8 (+0.5)

**D. Why improved**
- Directly addresses "push or wait" — the user's exact fork.
- Adds Psalm 37:7 (waiting) — stub differentiation from T1/T2.

**E. What still prevented 8/10+**
- Still **37% overlap** with prior turn; `threadSpecific` stuck at 4.
- Does not reference accumulated thread facts (opportunity + distance + timing) in one integrated answer.
- `feltHeard: 5` — competent but not deeply personal.

---

## 2. Alzheimer's Caregiver

### Turn 1 — "My mom was recently diagnosed with Alzheimer's."

**A. Before RACL**
> I'm so sorry to hear that your mom has been diagnosed with Alzheimer's. That is a heavy and challenging situation…

**B. After RACL**
> I'm sorry to hear about your mom's recent Alzheimer's diagnosis… Exodus 20:12… Isaiah 46:4… Would you like some Scripture to pray for strength?

**C. Listening delta:** 6.5 → 6.5 (0.0)

**D. Why improved**
- Caregiver scripture stubs surfaced (Exodus 20:12, Proverbs 17:17, Isaiah 46:4).
- Gate check passed: thread references mom/Alzheimer's/caregiver.

**E. What still prevented 8/10+**
- Emotional specificity adequate but not exceptional (`feltHeard: 6`).
- Offers scripture prayer before inviting user story.
- Pre-RACL was already decent on T1; RACL added grounding without large listening lift.

---

### Turn 2 — "Some days she doesn't remember who I am."

**A. Before RACL**
> It sounds deeply painful and confusing to face days when your mom doesn't recognize you… Alzheimer's can steal precious moments…

**B. After RACL**
> It sounds deeply painful and confusing when your mom doesn't remember you some days… Proverbs 17:17… God is near to the brokenhearted…

**C. Listening delta:** 6.8 → 6.8 (0.0)

**D. Why improved**
- Thread memory hit count 3; names recognition loss explicitly.
- `noRepeat: 8` — low overlap (29%) with T1.

**E. What still prevented 8/10+**
- "It sounds like" opening without deeper recall of diagnosis turn specifics.
- `threadSpecific: 6` — good but not rich (no callback to "recently diagnosed").

---

### Turn 3 — "How do I stay close to God while grieving who she used to be?"

**A. Before RACL**
> Grieving the loss of who your mom used to be while wanting to stay close to God is such a tender and real struggle… God promises His nearness especially to the brokenhearted…

**B. After RACL**
> Grieving the loss of who your mom used to be while she faces Alzheimer's is deeply painful… bringing your honest feelings to Him—your sadness, confusion, and even anger… God is near to the brokenhearted…

**C. Listening delta:** 6.8 → **7.8 (+1.0)** — **best RACL turn in validation**

**D. Why improved**
- Integrates full thread arc: diagnosis → recognition loss → grief for who she was.
- `threadSpecific: 8`, `feltHeard: 8` — highest dimension scores in validation.
- `directConcernPhrase` from evidence pack matched "grieving who she used to be."
- Names emotions (sadness, confusion, anger) beyond template comfort.

**E. What still prevented 8/10+**
- Scored 7.8 — just below 8. Still ends with offer ("Would you like help with a simple prayer") rather than a direct spiritual practice suggestion tied to caregiver exhaustion.

---

## 3. Feeling Distant from God

### Turn 1 — "I feel distant from God lately."

**A. Before RACL**
> Feeling distant from God can be really hard… Psalm 42:1-2… Would you like me to share a short prayer structure…?

**B. After RACL**
> Feeling distant from God can be a heavy and confusing experience… Psalm 139:7-10… James 4:8… Psalm 51:10-12…

**C. Listening delta:** 5.3 → 6.0 (+0.7)

**D. Why improved**
- Companion stubs for `distant_from_god` replaced generic Psalm 42 dump.
- `feltHeard: 6` vs 3 pre-RACL on this turn.

**E. What still prevented 8/10+**
- `threadSpecific: 4` — does not ask what "lately" means for this user.
- Scripture list before personal exploration.

---

### Turn 2 — "I pray but it feels empty."

**A. Before RACL**
> It sounds like your prayers feel empty right now… Romans 8:26… Would you like some ideas on how to structure your prayers…?

**B. After RACL**
> It sounds like your prayers feel dry and lacking connection right now… Matthew 6:7… Psalm 62:8…

**C. Listening delta:** 5.0 → 5.0 (0.0) — **weakest RACL turn overall**

**D. Why improved**
- Minimal — thread memory present (`threadLocalHitCount: 3`).

**E. What still prevented 8/10+**
- **`threadSpecific: 2`, `feltHeard: 3`** — lowest dimension scores in entire run.
- Shallow "It sounds like" without linking empty prayer to prior "distant" statement.
- Does not answer implicit thread question: *why does prayer feel empty when I already feel distant?*
- Generic Matthew 6:7 / Psalm 62:8 rather than thread-anchored reasoning.

---

### Turn 3 — "Does that mean my faith is failing?"

**A. Before RACL**
> Feeling that your prayers are empty or that God feels distant does not mean your faith is failing… 2 Corinthians 5:7… walk by faith, not by sight…

**B. After RACL**
> It's understandable to wonder if feeling distant and having empty prayers means your faith is failing… Even the heroes of faith experienced doubts… James 4:8… persisting in prayer—even when it feels empty—is a sign of faith…

**C. Listening delta:** 7.5 → 7.5 (0.0)

**D. Why improved (already strong pre-RACL)**
- Directly answers yes/no anxiety.
- Chains prior turns (distant + empty → faith failing).
- `answeredLatest: 8`, `feltHeard: 8`.

**E. What still prevented 8/10+**
- Does not offer plausible *reasons* user might feel distant (only reassures faith isn't failing).
- User success criterion: "Why do you think I feel distant?" should draw from prior conversation — not fully met.

---

## 4. Sabbath Wording (T1–T7)

### Turn 1 — Historical question

**A. Before RACL**
> You are asking why Sunday has become the chosen day… Constantine AD 321… Council of Laodicea…

**B. After RACL**
> You are asking why Sunday has historically become the day many Christians keep for worship… Constantine's civil law in AD 321… Council of Laodicea… seventh day (Saturday) as the Sabbath…

**C. Listening delta:** 5.8 → 5.8 (0.0)

**D/E.** Adequate historical answer; not the RACL test zone. `historyIncluded: true` on T1 only.

---

### Turn 2 — First wording challenge

**A. Before RACL**
> I appreciate you pointing that out. I chose to say "Roman church" as a simpler, informal way… If you prefer, I can use the full name going forward…

**B. After RACL**
> I understand you're curious why I used the term "Roman church" instead of the full formal title "Roman Catholic Church." I use "Roman church" as a simpler shorthand… focused on biblical teaching and history without adopting official church titles…

**C. Listening delta:** 6.2 → 5.6 (**−0.6**)

**D. Why score dropped**
- **`feltHeard: 2`** — human rubric penalized shallow acknowledgment without separating Constantine from Roman Catholic Church authority (user's eventual need).
- `correctionLedger` active but `priorAssistantQuote` pulled T1 historical opener, not the Roman church phrase user challenged.

**E. What still prevented 8/10+**
- Did not say: "You're right — Roman Catholic Church is more precise for later institutional authority."
- Pre-RACL legacy meta responder actually scored higher on regex rubric for this turn.

---

### Turn 4 — "No, I'm not asking about the shift. I'm asking about your wording."

**A. Before RACL**
> I hear you clearly that your question is about why I chose the phrase "Roman church"… simpler, more conversational shorthand… happy to use the full name…

**B. After RACL**
> Thank you for clarifying that you're asking specifically about my choice of wording… "Roman church" as a concise way… neutral shorthand rather than a denial or full endorsement…

**C. Listening delta:** 7.2 → 6.8 (−0.4)

**D. Why improved vs pre-RACL T5–T7 chaos**
- **`correctionRecovery: 9`** — best correction score in Sabbath thread.
- History suppressed (`historyIncluded: false`) — no Constantine/Laodicea repeat.
- Gate: "No repeated Roman church paragraph after correction" — **PASS**.

**E. What still prevented 8/10+**
- **`noRepeat: 5`, overlap 55%** — same rationale paragraph structure as T2–T3.
- Still doesn't distinguish Roman imperial vs Roman Catholic Church authority.

---

### Turn 7 — "Are you not listening to what I am asking?" (critical gate turn)

**A. Before RACL**
> I completely understand your frustration… I'm listening closely to your question about my specific choice of the phrase "Roman church"… simpler, more conversational wording… fully willing to use "Roman Catholic Church"…

**B. After RACL**
> I hear your frustration and realize I have not directly answered your question about why I use the specific wording "Roman church"… My choice of the shorter term is to keep our conversations focused and clear… happy to use the full formal name "Roman Catholic Church" from now on…

**C. Listening delta:** 6.4 → **6.8 (+0.4)** — gate target was ≥8.0, **missed by 1.2**

**D. Why improved vs pre-RACL (regex 3/10)**
- Acknowledges failure to answer directly ("I have not directly answered").
- No Sabbath history chain repeated.
- `threadSpecific: 8`, `feltHeard: 7`, overlap 47% (below pre-RACL template-identical loops).

**E. What still prevented 8/10+**
- **`correctionRecovery: 5`** — still re-explains shorthand rationale user rejected 5 times.
- 47% overlap with T6 — loop-control passed gate but human rubric still penalizes repetition.
- Never delivers the model answer from spec: *"I used 'Roman church' as shorthand. You're right that 'Roman Catholic Church' is more precise… I should separate Constantine from later RCC authority."*

---

## 5. Grief Thread

### Turn 1 — "I lost a friend Wednesday."

**A. Before RACL**
> I'm so sorry to hear about your loss. Losing a friend is deeply painful… I'm here to listen…

**B. After RACL**
> I'm truly sorry to hear about your loss… Jesus Himself wept… If you want, I can hold a space for you to share more about your friend…

**C. Listening delta:** 5.8 → 5.8 (0.0)

**D/E.** Warm opening; `threadSpecific: 4` — does not reference "Wednesday" specifically. John 11:35 stub present but grief thread still generic.

---

### Turn 2 — "It is still bothering me."

**A. Before RACL**
> It sounds like the loss of your friend is weighing heavily on your heart… Grief can linger… I'm here to listen…

**B. After RACL**
> It's completely understandable that your friend's loss is still weighing heavily on your heart… Grief often lingers and can surface in waves, even days after a loss…

**C. Listening delta:** 5.3 → 6.0 (+0.7)

**D. Why improved**
- "even days after a loss" acknowledges temporal thread (Wednesday → still bothering).
- `noRepeat: 8`, overlap 21%.

**E. What still prevented 8/10+**
- `threadSpecific: 4`, `feltHeard: 5` — never says "Wednesday" or "friend" by name.
- No invitation to name the friend; stays at generalized grief comfort.

---

## 6. Health / Knee Thread

### Turn 1 — "My knees hurt."

**A. Before RACL**
> I'm sorry to hear your knees are hurting… gentle movement, rest, warm compresses… healthcare professional…

**B. After RACL**
> It sounds uncomfortable to have knee pain… rest… ice and elevation… healthcare provider… praying for healing…

**C. Listening delta:** 6.3 → 6.3 (0.0)

**D. Why improved**
- Health companion topic detected; James 5:14 / 1 Cor 6:19-20 stubs available in evidence (not all cited).

**E. What still prevented 8/10+**
- `feltHeard: 5` — practical but clinical tone.
- No follow-up question (legacy health responder asked "few days or started today?").

---

### Turn 2 — "My knees are hurting again today."

**A. Before RACL**
> I can sense that your knee pain is persistent today… Continuing with gentle care like rest… pray with you for healing…

**B. After RACL**
> It's tough to face that knee pain again today… Continuing to care gently for your knees—resting… praying for relief and strength…

**C. Listening delta:** 5.8 → 6.5 (+0.7)

**D. Why improved**
- Names "again today" — recurrence pattern from thread.
- `noRepeat: 8`, `threadSpecific: 6`.

**E. What still prevented 8/10+**
- Repeats same care advice list from T1 (rest, ice, medical advice, prayer).
- `feltHeard: 5` — acknowledges recurrence but doesn't explore emotional/spiritual weight of chronic pain.

---

## Cross-Cutting RACL Wins

1. **In-thread memory:** 20/20 turns had thread-local hits (was 0/20 memory hits pre-RACL in prompt hierarchy experiment).
2. **Alzheimer's gate:** Thread references mom/Alzheimer's/caregiver — PASS.
3. **Sabbath history loop:** No Constantine/Laodicea block after correction — PASS.
4. **OpenAI ownership:** 100% with 0.1% template prose.
5. **Companion stubs:** Job, Alzheimer's, distant, grief, health all received topic-appropriate scripture refs in evidence.

## Cross-Cutting RACL Gaps

1. **Weakest dimension:** `threadSpecific` avg **5.4/10** across 20 turns.
2. **All 20 turns scored below 8/10** on human listening rubric.
3. **Sabbath rationale loop:** 47–55% overlap T3–T7 on same "neutral shorthand" paragraph.
4. **Shallow acknowledgments:** 10 turns with `feltHeard ≤ 5`; "I hear" / "It sounds like" without proof of understanding.
5. **Job thread:** Generic Proverbs/James/Psalm stack repeated across all 3 turns (37–50% overlap).

## Scoring Note

Headline comparison (5.7 / 5.8 / 6.3) mixes regex rubric (legacy, pre-RACL) with human rubric (RACL). Per-turn deltas in this report use the **human rubric applied to both** for fair comparison. Pre-RACL human average: 6.1 → RACL: 6.3.
