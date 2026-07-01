# Raw Conversation Differential Audit

Generated: 2026-06-03  
**Audit only** — qualitative comparison of actual reply language. No scoring proposals, architecture, validators, or implementation.

## Versions compared

| Label | Aggregate listening | Rubric | Source |
|-------|---------------------|--------|--------|
| **1. Legacy** | 5.7 | Regex (`reasonFirstMigration.js`) | `docs/reason-first-migration/validation-results.json` → `legacyResults` |
| **2. Pre-RACL Reason First** | 5.8 (regex) / ~6.1 (human re-score) | Regex + human re-score | `reasonResults` + `RACLImpactAudit.md` |
| **3. RACL** | **6.4** | Human 5-dimension | `docs/racl/validation-results.json` (Jun 2026 benchmark run) + `RACLImpactAudit.md` excerpts |
| **4. Companion Turn Intent** | **6.2** | Human 5-dimension + posture rubric | `docs/companion-turn-intent/validation-results.json` |

**Caveat:** Legacy and Pre-RACL scores use a **different rubric** than RACL / Turn Intent. Comparisons of **numbers** across columns are indicative only; this audit prioritizes **quoted language**.

**Note:** A later re-run of `raclValidation.js` after Turn Intent landed in the composer produced slightly different RACL-era text (e.g. job T3 without Proverbs block). This document uses the **6.4 benchmark transcripts** where cited as “RACL”; Turn Intent uses its dedicated validation file.

---

## 1. Job discernment

**Final user message:** *I'm not sure whether to push or wait on this offer.*

### Side-by-side (final turn)

**Legacy (listening 7, regex)**

> That sounds like an important decision. What feels heaviest right now — the distance, timing, money, or whether this is from God?
>
> Proverbs 3:5-6 establishes the matter, and James 1:5 confirms it alongside Scripture. Psalm 37:23 carries the theme forward across the biblical witness.
>
> If you want, we can pray through this together or walk through the decision one piece at a time.

**Pre-RACL Reason First (7, regex)**

> It sounds like you're feeling uncertain about whether to take the initiative with this job offer or to be patient and wait for the right timing. This kind of decision can feel heavy because it involves trusting God's timing as well as your own discernment. A gentle next step might be to pause and ask God for peace and wisdom in this moment, as Proverbs 3:5-6 reminds us to trust in the Lord with all our heart and lean not on our own understanding. You could also consider what peace or unrest you sense in your spirit about pushing versus waiting. Sometimes writing down your thoughts and prayers can help bring clarity. Would you like to pray together for guidance on this?

**RACL 6.4 (6.0 human on comparable re-run; 5.8–6.0 in benchmark band)**

> You're facing a real tension between moving forward actively and waiting patiently on this job offer, which can feel uncertain. It's wise to balance eagerness with trust, asking God clearly in prayer to guide the timing according to His perfect will. Proverbs 3:5-6 reminds us to trust in the Lord and He will direct our paths, and James 1:5 encourages asking God for wisdom without doubting. Sometimes waiting is a way God prepares us or opens the right doors, while other times taking initiative is needed. You might find it helpful to pause briefly in prayer, listen quietly for peace about the timing, and consider any practical signs or confirmations. Would you like to pray together for clear guidance and peace about whether to push or wait?

**Companion Turn Intent 6.2 (6.0)**

> You're weighing whether to push forward or wait on this job opportunity that's quite far from home. It's important to balance active faith—like praying and seeking wise counsel—with thoughtful patience rather than just waiting passively. Setting a clear timeline to pray, reflect, and talk with trusted people might help you find peace in your decision.

### Qualitative answers

| Question | Answer |
|----------|--------|
| **What materially changed?** | Legacy **asks first** then scripture triplet. Pre-RACL → RACL adds OpenAI fluency and “push or wait” naming. Turn Intent **drops** the scripture stack and prayer close; adds **far from home** and **timeline/counsel** (more integrated thread). |
| **What stayed the same?** | All four are **advice-forward**; none stay in pure curiosity. “Trust God / pray / discern” spine repeats from Pre-RACL onward. |
| **Human preference?** | Many humans would **prefer Legacy’s opening question** or Turn Intent’s **shorter, integrated** reply over RACL’s **mini-sermon + Proverbs/James + prayer offer**. |
| **Score vs feel?** | **Mismatch.** Legacy scores **7** partly for the diagnostic question; RACL/Turn Intent score **~6** while Turn Intent prose is **less answer-engine** (no verse dump). Rubric rewards “answered” and length; human may rank Turn Intent **warmer and more companion** despite equal or lower score. |

**Sentence that prevents trusted-companion feel (worst offender — RACL):**

> *"Proverbs 3:5-6 reminds us to trust in the Lord and He will direct our paths, and James 1:5 encourages asking God for wisdom without doubting."*

**Trusted companion might say instead:**

> *"You’re weighing push vs wait on an offer that’s already complicated by distance — what would ‘push’ mean for you practically, and what are you afraid would happen if you waited?"*

---

## 2. Alzheimer's caregiver

**Final user message:** *How do I stay close to God while grieving who she used to be?*

### Side-by-side (final turn)

**Legacy (5, regex) — route misclassification**

> I'm really sorry for your loss. Tell me about her if you want — we can take this gently, one step at a time.
>
> Psalm 34:18 establishes the matter, and Matthew 5:4 confirms it alongside Scripture. Revelation 21:4 carries the theme forward across the biblical witness.
>
> If you would like, we can pray together, sit with a comforting passage, or simply talk through what you are feeling — no pressure.
>
> When you are ready, I can gently check in on how you have been doing — only if you want that.

**Pre-RACL Reason First (5, regex)**

> Grieving the loss of who your mom used to be while wanting to stay close to God is such a tender and real struggle. It's okay to bring your feelings honestly to Him—the sadness, confusion, even anger—and trust that He listens and cares deeply. Remember, God promises His nearness especially to the brokenhearted, and He wants to walk this hard path with you, giving you strength and peace beyond understanding. Small daily moments of quiet prayer or simply sitting in His presence can help you feel connected even when your heart feels heavy. You're not alone in this, and God's love remains steadfast through it all.

**RACL 6.4 (7.8 — highest turn in benchmark)**

> Grieving who your mom used to be while walking alongside her now is incredibly hard, especially when Alzheimer's changes so much. Staying close to God in this sorrow can feel like a struggle, but He is near to the brokenhearted and offers gentle strength. It's okay to bring your honest feelings to Him—your pain, confusion, and longing—because God listens and cares deeply. Remember that God's love doesn't change, even when circumstances do. You can lean on His promise to carry us through difficult seasons and find comfort in His faithful presence. Taking quiet moments to speak to Him honestly, even if it's just to sit in silence with Him, can nurture your closeness. Would you like me to help you with a simple prayer to invite God's peace into this grief?

**Companion Turn Intent 6.2 (6.8 — down from RACL 7.8)**

> Grieving who your mom used to be while caring for her through Alzheimer's is deeply painful and adds to the caregiver burden you carry. Staying close to God in this season can come through quiet moments of prayer where you honestly share your heart with Him, and by leaning on His promise to carry you, even when the path feels heavy. You might find comfort in setting a daily time of reflection and asking God for strength and peace, and also sharing your feelings with a trusted friend or support group to help lighten your emotional load.

### Qualitative answers

| Question | Answer |
|----------|--------|
| **What materially changed?** | Pre-RACL → RACL names **mom / Alzheimer's / grieving who she was** in one arc (RACL peak). Turn Intent adds **caregiver burden** and **support group** (practical) but loses RACL’s **emotion naming** (confusion, longing, anger). Legacy **wrong thread** (grief-loss template). |
| **What stayed the same?** | Pre-RACL onward: spiritual closeness via **quiet prayer / God’s nearness**. |
| **Human preference?** | **RACL 6.4** likely feels most **heard** on the spiritual question. Turn Intent is **useful** but reads like **caregiver coaching**. Legacy would feel **alarming** (“tell me about her”) after two turns about a living mom. |
| **Score vs feel?** | **Strong match for RACL 7.8.** Turn Intent **regression** (−1.0) aligns with human read: more generic steps, less intimate spiritual language. Legacy **5** is generous given catastrophic wording. |

**Sentence that prevents trusted-companion feel (Legacy):**

> *"I'm really sorry for your loss. Tell me about her if you want — we can take this gently, one step at a time."*

**Trusted companion might say instead:**

> *"You’re grieving who your mom used to be while she’s still here — that’s a particular kind of heartache. When you pray lately, does God feel close, or mostly quiet?"*

**Sentence that prevents trusted-companion feel (Turn Intent vs RACL):**

> *"…adds to the caregiver burden you carry."* (clinical label vs RACL’s *"your pain, confusion, and longing"*)

---

## 3. Feeling distant from God

**Final user message:** *Does that mean my faith is failing?*

### Side-by-side (final turn)

**Legacy (5, regex) — compositional failure**

> I'm glad you asked to pray. Let's bring this before the Lord together.
>
> Father, we bring this need before You for Does that mean my faith is failing?. You see what we cannot fully see. Please draw near with comfort, wisdom, and peace. Hold those who are hurting, guide those who are waiting, and help us trust You one step at a time. In Jesus' name, amen.
>
> Philippians 4:6-7 establishes the matter, and James 5:16 confirms it alongside Scripture. Psalm 34:17 carries the theme forward across the biblical witness.
>
> If you would like, we can sit with one of these passages, talk through what you are carrying, or check in gently later — only if you want that.
>
> How have you been doing since we prayed about prayer?

**Pre-RACL Reason First (5, regex)**

> Feeling that your prayers are empty or that God feels distant does not mean your faith is failing. Many godly people have experienced dry seasons in their spiritual walk, yet their faith remained alive and growing. The Bible encourages perseverance and trust even when feelings are weak. For example, in 2 Corinthians 5:7, it says we walk by faith, not by sight, meaning faith persists beyond what we feel. Your desire to seek God honestly shows faith, not failure. A gentle next step might be to continue bringing your honest feelings to God in prayer, trusting He hears and is working in your heart even when you don't sense it clearly.

**RACL 6.4 (7.5)**

> Feeling distant from God and experiencing empty prayers does not necessarily mean your faith is failing. Sometimes faith goes through seasons of dryness or struggle, which can actually refine and strengthen it. Scripture shows us that God's presence is always near, even when we feel far (Psalm 139:7-10), and He invites us to draw near to Him sincerely (James 4:8). Like David, we can ask God to renew our hearts and restore our joy in Him (Psalm 51:10-12). These moments can be opportunities to honestly bring your feelings before God and trust His faithful love, rather than a sign that your faith is failing.

**Companion Turn Intent 6.2 (7.3)**

> Feeling distant from God and experiencing empty prayers doesn't mean your faith is failing. Sometimes faith goes through seasons of dryness or silence, but God's presence remains even when we don't feel it. It can help to honestly bring these feelings to God, asking Him to renew your spirit and draw you closer, as James 4:8 encourages us to draw near to Him. Would you like a simple prayer to help express these honest feelings to God?

### Qualitative answers

| Question | Answer |
|----------|--------|
| **What materially changed?** | Pre-RACL and RACL **directly answer** the fear. Legacy **does not answer** — misfires into prayer template with user text pasted into prayer. Turn Intent is **shorter**; still ends with **prayer offer** (posture tried REFLECT_THEN_HELP not WALK_WITH_ME on T3). |
| **What stayed the same?** | Reassurance + scripture pattern from Pre-RACL → RACL; Turn Intent retains James/Psalm move. |
| **Human preference?** | **Pre-RACL or RACL** for answering the question. **Legacy** would feel **broken**. Turn Intent acceptable but **does not explore why** they feel distant (user success criterion from audits). |
| **Score vs feel?** | **Severe mismatch on Legacy (5).** Should feel **0–2** to a human. RACL **7.5** matches “clear answer.” Turn Intent **7.3** close; human might prefer it slightly **less lecture**, but rubric may undervalue missing “why do I feel distant” exploration equally on both. |

**Sentence that prevents trusted-companion feel (Legacy):**

> *"Father, we bring this need before You for Does that mean my faith is failing?."*

**Trusted companion might say instead:**

> *"No — empty prayer after feeling distant usually means you're tired or hurting, not that your faith died. When you say distant, is it that God feels far, or that prayer feels hollow even when you show up?"*

**Sentence that prevents trusted-companion feel (RACL / Turn Intent — answer-engine):**

> *"Scripture shows us that God's presence is always near, even when we feel far (Psalm 139:7-10), and He invites us to draw near to Him sincerely (James 4:8)."* (reassurance via verse stack before staying with the person)

---

## 4. Sabbath wording correction

**Final user message:** *Are you not listening to what I am asking?*

### Side-by-side (final turn)

**Legacy T6 (4, regex) — not T7; legacy T7 deflects**

> You're right — I was not answering your exact question. I used 'Roman church' as shorthand, but 'Roman Catholic Church' is more precise when referring to the later institutional church and its canon/liturgical authority. I should say 'Roman Catholic Church' when that is what I mean. The earlier Roman imperial role under Constantine is different from later Roman Catholic Church authority, so I should keep those separate clearly.

**Legacy T7 (5, regex)**

> You're right — I was not answering your exact question. The answer is: I should address "No, I'm not asking about the shift. I'm asking about your wording." directly instead of repeating a previous template. Tell me if you want me to clarify a specific word or phrase I used.

**Pre-RACL Reason First T7 (3, regex)**

> I completely understand your frustration, and I want to affirm that I'm listening closely to your question about my specific choice of the phrase "Roman church" rather than the full term "Roman Catholic Church." My intention was to use simpler, more conversational wording to keep our dialogue clear and approachable without emphasizing formal titles or denominational distinctions. I respect your preference and am fully willing to use the full and precise term "Roman Catholic Church" going forward to honor your request. Thank you for your patience and for helping me understand your focus better.

**RACL 6.4 T7 (6.8 human; gate target 8.0)**

> I'm truly listening and want to respond directly to your concern about my wording. The choice to say "Roman church" rather than the full "Roman Catholic Church" is a simple effort to keep our conversation flowing smoothly, not to avoid your question or diminish the full title. I respect your desire for precision and am more than willing to use the full name whenever you prefer. Your clarity matters to me.

**Companion Turn Intent 6.2 T7 (5.8; posture hard fail: repeated rationale)**

> I hear that you're asking about why I specifically use the term "Roman church" rather than "Roman Catholic Church." I use "Roman church" to clearly refer to the early Christian community in Rome before the later institutional structure and authority of the Roman Catholic Church developed, which was after the time of Roman imperial influence such as under Constantine. This wording helps keep distinct the early church in Rome from the later ecclesiastical authority that emerged.

### Qualitative answers

| Question | Answer |
|----------|--------|
| **What materially changed?** | RACL stops **Constantine history blocks** on meta turns (retrieval win). Pre-RACL and RACL/Turn Intent still **repeat shorthand rationale**. Turn Intent **does** separate imperial vs RCC (composer win) but **reintroduces Constantine** on T7 — user hears “still lecturing.” |
| **What stayed the same?** | **“Roman church” = brevity / conversational** script across OpenAI eras. |
| **Human preference?** | **Legacy T6** (not scored T7) is closest to what user wanted. Turn Intent T7 is **more technically correct** but **worse emotionally** on “are you listening?” RACL T7 sounds **polite** and **evasive**. |
| **Score vs feel?** | **Partial mismatch.** Pre-RACL **3** fits. RACL **6.8** feels high for repetitive rationale; Turn Intent **5.8** may be **closer to human** frustration than RACL despite imperial/RCC sentence users asked for. Legacy T6 **4** undervalues best sentence in the whole benchmark. |

**Sentence that prevents trusted-companion feel (RACL T7):**

> *"The choice to say \"Roman church\" rather than the full \"Roman Catholic Church\" is a simple effort to keep our conversation flowing smoothly, not to avoid your question or diminish the full title."*

**Trusted companion might say instead:**

> *"You’re asking about my wording, not Sabbath history — you’re right. I said ‘Roman church’ as shorthand; I should say ‘Roman Catholic Church’ when that’s the institution we mean, and keep Constantine’s empire separate from later church authority."*

**Sentence that prevents trusted-companion feel (Turn Intent T7 — triggers “not listening”):**

> *"…after the time of Roman imperial influence such as under Constantine."* (user explicitly rejected history turns)

---

## 5. Grief

**Final user message:** *It is still bothering me.*

### Side-by-side (final turn)

**Legacy (7, regex)**

> I hear you — it's still weighing on you. That kind of grief doesn't lift quickly, and it makes sense that it's still bothering you.
>
> You mentioned recently that the loss you shared is still weighing on you.
>
> Psalm 34:18 establishes the matter, and Matthew 5:4 confirms it alongside Scripture. Revelation 21:4 carries the theme forward across the biblical witness.
>
> If you would like, we can pray together, sit with a comforting passage, or simply talk through what you are feeling — no pressure.

**Pre-RACL Reason First (7, regex)**

> It sounds like the loss of your friend is weighing heavily on your heart, and that feeling is very real and important. Grief can linger and sometimes feel overwhelming, but you don't have to carry it alone. If it feels right, we could take a moment together to breathe and pray, asking God for His comforting presence and peace to gradually ease your pain. Whenever you want, I'm here to listen or to gently share Scripture that can bring hope and rest to your soul.

**RACL 6.4 (6.8)**

> It's completely natural that your loss is still weighing on you. Grief doesn't follow a quick timeline, and it's okay to feel unsettled for a while. Remember, God is very close to you in this pain, holding you tenderly even when the hurt feels overwhelming. If you'd like, we can pray together or I can share a comforting Scripture to help bring some peace to your heart.

**Companion Turn Intent 6.2 (7.5 — best relative gain)**

> It sounds like the loss of your friend on Wednesday is still weighing heavily on your heart. Sometimes grief lingers in ways that feel hard to put into words or to move past quickly. If you want to share more about what's still bothering you or how you're feeling right now, I'm here to listen with you.

### Qualitative answers

| Question | Answer |
|----------|--------|
| **What materially changed?** | Turn Intent names **Wednesday** and invites sharing **without** mandatory prayer/verse close. RACL adds “God holding you” + **prayer/Scripture offer**. Legacy mirrors “still bothering” then **scripture triplet**. |
| **What stayed the same?** | Normalizing grief timeline (all versions). |
| **Human preference?** | **Turn Intent** most companion-like (specific + invitation). Legacy middle (echo + triplet). RACL most **generic comfort** closing. |
| **Score vs feel?** | **Mismatch.** Turn Intent **7.5** > RACL **6.8** aligns with human read. Legacy **7** with triplet may **over-score** template block vs Turn Intent’s **no verse dump**. |

**Sentence that prevents trusted-companion feel (RACL):**

> *"If you'd like, we can pray together or I can share a comforting Scripture to help bring some peace to your heart."*

**Trusted companion might say instead:**

> *"Losing your friend Wednesday and still carrying it this week makes sense. What part of it is bothering you most today?"*

**Sentence that prevents trusted-companion feel (Legacy):**

> *"Psalm 34:18 establishes the matter, and Matthew 5:4 confirms it alongside Scripture. Revelation 21:4 carries the theme forward across the biblical witness."*

---

## 6. Health / knee pain

**Final user message:** *My knees are hurting again today.*

### Side-by-side (final turn)

**Legacy (7, regex)**

> I hear you — your knees are hurting again today. That matters, and I'm glad you told me. Let's take this gently — I'm not a doctor, but we can bring this before the Lord together.
>
> Psalm 103:1-5 establishes the matter, and 3 John 1:2 confirms it alongside Scripture. Matthew 11:28-30 carries the theme forward across the biblical witness.
>
> If you would like, we can pray for strength and peace, sit with a gentle passage, or take one small step for today — no pressure.

**Pre-RACL Reason First (5, regex)**

> I can sense that your knee pain is persistent today, and that must be wearing on you. Continuing with gentle care like rest, avoiding strain, and maybe some warm compresses could help ease the discomfort. If it keeps coming back, it's wise to consider seeing a healthcare professional to understand the root cause. Meanwhile, I'd be honored to pray with you for healing and strength, if you'd like.

**RACL 6.4 (6.3)**

> I'm sorry your knees are hurting again today; that kind of recurring pain can be really discouraging. Remember that your body is a temple of the Holy Spirit, so treating it with care is important. Continuing to rest your knees, using warm or cold compresses as you find helpful, and perhaps gentle stretching if approved by a healthcare provider can be good steps. If the pain persists or worsens, it might be wise to consult a medical professional. Meanwhile, I'm here to pray with you for relief and strength.

**Companion Turn Intent 6.2 (6.5)**

> Your knees hurting again today sounds really tough. It's important to keep resting them and avoid putting too much strain on them. If the pain continues, worsens, or you notice swelling or difficulty walking, please see a healthcare professional soon. Would you like me to pray with you for strength and relief?

### Qualitative answers

| Question | Answer |
|----------|--------|
| **What materially changed?** | Turn Intent leads with **again today**, drops **temple** opener, adds **urgent symptoms** (swelling, walking). RACL keeps **temple** + care list + prayer. Legacy echoes **again today** then scripture triplet. |
| **What stayed the same?** | Rest / compress / see doctor checklist from Pre-RACL onward. |
| **Human preference?** | **Turn Intent** or **Pre-RACL** for practical care; **Legacy** if user wants prayer option without temple lecture. **RACL** feels most like **health pamphlet + verse**. |
| **Score vs feel?** | **Mismatch.** Legacy **7** > RACL **6.3** despite triplet; Turn Intent **6.5** may feel **more medically attentive** than RACL to humans. Rubric under-rewards Turn Intent dropping temple-first pattern. |

**Sentence that prevents trusted-companion feel (RACL):**

> *"Remember that your body is a temple of the Holy Spirit, so treating it with care is important."*

**Trusted companion might say instead:**

> *"Knees hurting again today — that’s draining when it keeps coming back. Besides rest, has anything changed since last time — swelling, stairs, sleep?"*

---

## Cross-version patterns (language only)

| Pattern | Legacy | Pre-RACL | RACL 6.4 | Turn Intent 6.2 |
|---------|--------|----------|----------|-----------------|
| Opens with user-specific **question** | Job | Rare | Rare | Rare |
| Scripture **triplet / establishes the matter** | Frequent | Sometimes | Often | Reduced |
| **Wrong thread** reply | Alz T3, Distant T3 | — | — | — |
| **Wednesday / again today** in prose | Grief (weak) | Weak | Weak | **Grief, Health improved** |
| Sabbath **Constantine** on meta turn | T6 correct; T7 deflects | Long rationale | Suppressed then rationale returns | RCC split but **Constantine on T7** |
| **Prayer close** on emotional turn | Common | Common | Common | Still common (distant, health) |

---

## Final answer: Is the bottleneck primarily the composer, the rubric, or both?

**Both — with composer as the primary bottleneck and the rubric as a secondary bottleneck that misreads progress.**

### Composer (primary) — evidence from text

1. **Answer-engine shape persists across RACL and Turn Intent** despite retrieval wins. The same final turns still **close with prayer/scripture offers**, **advice checklists**, or **repeated rationale paragraphs** (job Proverbs block; distant James; health temple; Sabbath shorthand loop). Turn Intent shortens some replies but **does not** reliably produce the Legacy job-style **diagnostic question** or the **Legacy Sabbath T6**-quality correction sentence.

2. **OpenAI eras improve fluency, not role.** Pre-RACL → RACL adds thread words (“push or wait,” “mom / Alzheimer’s”) and suppresses Sabbath **history** blocks. Turn Intent adds **Wednesday** and **far from home** when posture rules fire. None consistently shift from **“complete helpful answer”** to **“trusted person in the room.”**

3. **Clear composer regressions in live text.** Legacy **misroutes** Alzheimer’s T3 and **garbles** distant T3 — composer/routing failures. Turn Intent **regresses** Alzheimer’s T3 from RACL’s most integrated spiritual reply to **caregiver-burden coaching**. Turn Intent **improves** grief T2 language while aggregate listening **drops** slightly (6.4 → 6.2).

4. **Posture labels do not guarantee prose.** Turn Intent maps distant T1–T2 to `WALK_WITH_ME` but T2 still opens *"It sounds like…"* and T3 still offers prayer. Composer obeys **legacy habit** inside shorter paragraphs.

### Rubric (secondary) — evidence from text vs scores

1. **Different rubrics across eras** make **5.7 → 6.4 → 6.2** look like fine-grained tuning; many moves are **within noise** or **inverted** vs human preference (grief: Turn Intent reads better, scores higher; job: Legacy question reads better, scored 7 on regex).

2. **Rewards “answered” and scripture** over **companion pacing.** RACL distant T3 scores **7.5** for clear reassurance while audits asked for **reasons you feel distant** — prose doesn’t deliver. Legacy grief **7** with triplet may **beat** Turn Intent on rubric dimensions while feeling **more mechanical**.

3. **Under-values rare legacy strengths.** Legacy Sabbath **T6** contains the **exact RCC / Constantine separation** users wanted; scored **4**. Turn Intent T7 includes that idea but scores **5.8** with frustration — rubric catches repetition but **not** “finally said the right thing.”

4. **Turn Intent composite posture fit ~8** with listening **6.2** suggests validators measure **intent compliance** partly decoupled from **felt companion quality** — composer still produces “correct posture, wrong soul.”

### Bottom line

A human reading these side-by-sides would say the product **still sounds like a careful advisor**, not a **trusted companion**, in most OpenAI paths — **even at 6.4**. The **largest linguistic gap** is not missing memory (20/20 hits) but **sentence-level choices**: verse stacks, prayer checkout lines, shorthand loops, and failure to ask one grounded question. The **rubric** then **partially masks** that gap by scoring reassurance and topic match, and **partially misorders** versions humans would prefer (Legacy job question, Turn Intent grief, Legacy Sabbath T6).

**Primary bottleneck: composer behavior.**  
**Secondary bottleneck: evaluation rubric (mismatched across eras + rewards answer-shaped prose).**

---

*Sources: `docs/reason-first-migration/validation-results.json`, `docs/racl/validation-results.json`, `docs/companion-turn-intent/validation-results.json`, `RACLImpactAudit.md`, `CompanionTurnIntentImplementationReport.md`. Audit only.*
