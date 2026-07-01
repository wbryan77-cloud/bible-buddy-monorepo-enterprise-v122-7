# Companion Operating Model Experiment Report

**Generated:** 2026-06-03T04:42:27.581Z
**Verdict:** OPERATING_MODEL_INSUFFICIENT
**OpenAI live run:** yes

## Scope

- Test-only: `services/companionOperatingModelExperiment.js` + this script
- **Not** wired to production, buddyBrain default, deploy, push, or Sprint 3
- Reuses **existing** `buildRetrievalEvidencePack` (RACL); changes compose purpose only
- Minimal compose shell (~1.2K system) — confound vs full reason-first prompt stack

## Core principle

Respond to the **human moment** first (comfort, repair, discernment, heard), then answer only as much as the moment needs — not “find detail → insert → answer.”

## Aggregate scores (20 turns)

| Metric | Current RACL | Operating Model | Δ |
| --- | --- | --- | --- |
| listening | 6.3 | 6 | -0.3 |
| warmth | 5.9 | 5.9 | +0 |
| naturalness | 6.9 | 6.8 | -0.1 |
| threadSpecific | 5.9 | 4.1 | -1.8 |
| feltHeard | 6 | 5.5 | -0.5 |
| usefulness | 6 | 5.9 | -0.1 |
| companionPresence | 7.2 | 5.9 | -1.3 |
| overExplaining | 6.2 | 5.1 | -1.1 |

| Shape / counts | Current | Model | Δ |
| --- | --- | --- | --- |
| answer/explain/advise % | 66.2 | 84.2 | +18 |
| reflect/comfort/explore % | 29.7 | 11.9 | -17.8 |
| avg questions / turn | 0.5 | 0.2 | -0.3 |
| avg scripture/prayer flags | 0.5 | 0.7 | +0.2 |
| deliver-mode % | 66.2 | 84.2 | +18 |

## Part G — Decision

### 1. Did Companion Operating Model beat current RACL?
**No**. Listening **6.3 → 6** (-0.3); target was **+0.5**.

### 2. If yes, by how much?
Listening **-0.3**; companion presence **-1.3**; over-explaining (higher=better) **-1.1**.

### 3. Did it reduce answer-engine feel?
**Partial or no.** Deliver-mode delta **+18** pts; reflect/comfort/explore **29.7% → 11.9%**.

### 4. Did it keep biblical grounding?
Scripture/prayer mentions per turn: **0.5 → 0.7**. Doctrine regen uses existing `validateDoctrineBoundaries` only — no new doctrine system.

### 5. Did it avoid becoming another template system?
**Design intent: yes** — no forced openers, posture labels, or mandatory questions; `humanMoment` guides compose only in test runtime. Live proof requires reading replies (see qualitative sections).

### 6. Should we implement it into reason-first RACL?
**No** — human-moment object alone did not clear the +0.5 listening bar; keep as research artifact.

### 7. If not, what still blocks companion feel?
- Composer still **delivers** when `humanMoment` says hear-first but retrieval packs teaching evidence.
- **Thread specificity** may remain retrieval-limited (`threadSpecific` delta -1.8).
- **Sabbath correction** overlap/history bleed if meta turns still get history chain in pack.
- Rubric may reward answers on explicit `?` turns — operating model may under-answer those.

## Per-thread qualitative (best / worst)

### Job opportunity

**Current RACL** — best T2 (listen 6.5), worst T3 (listen 6)

<details><summary>Current best</summary>

You’re considering a job opportunity that is far away from home, which adds a significant factor to weigh alongside the chance itself. Since this distance could affect your daily life and relationships, it’s important to pause and reflect on how this change might align with your priorities and calling. Taking time to pray specifically about this aspect and maybe discussing it with someone who understands your situation can help you move forward actively rather than just waiting. Would you like help framing a prayer

- Companion feel (current_racl): weak (presence 7, over-explain 5)
- Over-answer: likely
- Ask vs answer: asked when sharing
- Scripture/prayer offers: 1
</details>

**Operating Model** — best T3 (listen 5.5), worst T1 (listen 5.8)

<details><summary>Model best</summary>

It sounds like you’re standing at a crossroads, wondering whether to take initiative or to wait patiently for the right moment. Sometimes, the tension between pushing forward and waiting can feel heavy. What are the things on your heart that make you lean one way or the other? Remember Proverbs 3:5-6 encourages us to trust in the LORD and lean not on our own understanding, and James 1:5 invites us to ask God for wisdom when we’re uncertain. Let’s consider together what peace and clarity might look like for you in t

- Companion feel (operating_model): weak (presence 9, over-explain 5)
- Over-answer: likely
- Ask vs answer: asked when sharing
- Scripture/prayer offers: 1
</details>

<details><summary>Model worst</summary>

A job opportunity can bring excitement and uncertainty alike. It’s important to seek God's guidance as you weigh this decision. Proverbs 3:5-6 encourages us to trust in the Lord with all our heart and lean not on our own understanding; He will direct our paths. Also, James 1:5 reminds us that if we ask God for wisdom, He will generously provide it. What are some key factors or concerns on your heart about this opportunity? Sharing those might help us pray through it and gain clarity together.

- Companion feel (operating_model): weak (presence 5, over-explain 5)
- Over-answer: likely
- Ask vs answer: asked when sharing
- Scripture/prayer offers: 1
</details>

### Alzheimer's caregiver

**Current RACL** — best T3 (listen 7.8), worst T2 (listen 6.8)

<details><summary>Current best</summary>

Grieving who your mom used to be while caring for her Alzheimer's journey is deeply painful and a unique kind of caregiving burden. Staying close to God in this grief can come through quiet moments of honest prayer, sharing your heart with Him as He understands your pain. It might help to set aside a daily time to read comforting Scripture or simply sit in His presence, allowing Him to carry your sorrow. Remember, God remains faithful even when memories fade. Would you like me to help you with a prayer to invite Hi

- Companion feel (current_racl): weak (presence 9, over-explain 5)
- Over-answer: likely
- Ask vs answer: balanced
- Scripture/prayer offers: 2
</details>

**Operating Model** — best T1 (listen 6.5), worst T2 (listen 5.8)

<details><summary>Model best</summary>

I'm so sorry to hear about your mom's diagnosis. Alzheimer's is a heavy journey for both her and everyone who loves her. Remember, honoring and caring for our parents is a sacred calling, as Exodus 20:12 reminds us. It's okay to feel overwhelmed; you're not alone in this. Finding support from others and leaning on God in prayer can bring strength and peace. If you'd like, I can share comforting Scriptures or practical ideas for caregiving to help you through this time.

- Companion feel (operating_model): weak (presence 5, over-explain 5)
- Over-answer: likely
- Ask vs answer: balanced
- Answer when comfort: possible — high deliver-mode on emotional turn
- Scripture/prayer offers: 1
</details>

<details><summary>Model worst</summary>

It sounds incredibly hard to face those moments when she doesn’t recognize you. When memory fades like that, it can feel very lonely and confusing for both of you. One practical thing to consider is creating gentle routines or familiar cues—photos, favorite music, or comforting words—that might help anchor her memory or at least bring calm. Remember, your presence and love remain a deep blessing, even when words fail. If you want, I can also help you find some comforting Scripture or practical tips for caregiving i

- Companion feel (operating_model): weak (presence 5, over-explain 3)
- Over-answer: likely
- Ask vs answer: balanced
- Scripture/prayer offers: 1
</details>

### Feeling distant from God

**Current RACL** — best T2 (listen 5.3), worst T1 (listen 5.8)

<details><summary>Current best</summary>

It sounds like you might be carrying a heaviness in your prayers, feeling that the words or moments don’t connect as deeply as you hope. Sometimes, that emptiness reflects our own weariness or a season of quiet in the heart. If you’d like, I’d be here to listen more about what you’re sensing or any thoughts around this feeling.

- Companion feel (current_racl): yes (presence 10, over-explain 7)
- Over-answer: moderate/ok
- Ask vs answer: balanced
- Scripture/prayer: none or woven naturally
</details>

**Operating Model** — best T3 (listen 6.3), worst T2 (listen 5.3)

<details><summary>Model best</summary>

Feeling distant from God or questioning your faith doesn't necessarily mean your faith is failing. Sometimes, it's part of the journey of growing closer to Him. Psalm 139:7-10 reminds us that there's nowhere we can go where God isn't present, and James 4:8 encourages us to draw near to God, promising He will draw near to us. This moment could be an invitation to seek Him more deeply, not a sign of failure. Your honest heart matters to God.

- Companion feel (operating_model): weak (presence 5, over-explain 5)
- Over-answer: likely
- Ask vs answer: may under-ask
- Scripture/prayer offers: 1
</details>

<details><summary>Model worst</summary>

It can be really hard when prayer feels empty, like the words are there but the heart isn't connecting. Sometimes, God is near even when we don't sense Him, as Psalm 139 reminds us that His presence is always with us. James encourages us to draw near to God, and often that closeness grows in quiet patience and honest moments, even when feelings are dim. You're not alone in this experience, and it's okay to bring that honesty to God in prayer too.

- Companion feel (operating_model): weak (presence 3, over-explain 5)
- Over-answer: likely
- Ask vs answer: balanced
- Scripture/prayer offers: 1
</details>

### Sabbath wording thread

**Current RACL** — best T3 (listen 7.8), worst T1 (listen 5.8)

<details><summary>Current best</summary>

I understand you're asking specifically about why I chose the term "Roman church" rather than the formal name "Roman Catholic Church." I use "Roman church" to highlight the period when the church was under Roman imperial influence, especially during Constantine's era, which is historically distinct from the later organized institution officially known as the Roman Catholic Church. This distinction helps separate the early state-influenced church phase from the later ecclesiastical structure that developed over cent

- Companion feel (current_racl): weak (presence 9, over-explain 5)
- Over-answer: likely
- Ask vs answer: may under-ask
- Scripture/prayer: none or woven naturally
</details>

**Operating Model** — best T6 (listen 7), worst T1 (listen 5.8)

<details><summary>Model best</summary>

I understand you're focused on the wording I used, not the historical context. Please clarify which specific wording you'd like me to correct or explain so I can address it precisely.

- Companion feel (operating_model): yes (presence 10, over-explain 8)
- Over-answer: moderate/ok
- Ask vs answer: balanced
- Scripture/prayer: none or woven naturally
</details>

<details><summary>Model worst</summary>

The Bible teaches that the original day of rest and worship is the seventh day, the Sabbath, which is Saturday. This is grounded in Genesis 2:2-3 where God rested on the seventh day after creation, and in the Fourth Commandment (Exodus 20:8-11) which instructs to remember the Sabbath day and keep it holy. There is no explicit biblical command that changes the Sabbath from the seventh day to Sunday. Historically, early Christians often met on the first day of the week (Sunday) to commemorate Jesus’ resurrection, whi

- Companion feel (operating_model): weak (presence 5, over-explain 0)
- Over-answer: likely
- Ask vs answer: may under-ask
- Scripture/prayer offers: 1
</details>

### Grief thread

**Current RACL** — best T2 (listen 7.3), worst T1 (listen 6.3)

<details><summary>Current best</summary>

It sounds like the loss of your friend on Wednesday is still very present in your heart, and that ongoing weight is hard to carry. Sometimes grief lingers in a way that feels like it won’t let go quickly, and that’s a deeply personal journey. If you'd like, you can share what feels most heavy right now, or just take your time here—I’m here with you.

- Companion feel (current_racl): yes (presence 9, over-explain 7)
- Over-answer: moderate/ok
- Ask vs answer: balanced
- Scripture/prayer: none or woven naturally
</details>

**Operating Model** — best T1 (listen 5.8), worst T2 (listen 5.5)

<details><summary>Model best</summary>

I'm so sorry to hear about the loss of your friend. Grief is such a heavy and personal journey. Remember that God is close to those who are brokenhearted, as Psalm 34:18 tells us: "The LORD is near to the brokenhearted and saves the crushed in spirit." And even Jesus himself wept at the loss of a friend (John 11:35), showing us that it's okay to mourn deeply. If you'd like to share more or just need someone to be with you in this moment, I'm here.

- Companion feel (operating_model): yes (presence 7, over-explain 7)
- Over-answer: moderate/ok
- Ask vs answer: balanced
- Scripture/prayer offers: 1
</details>

<details><summary>Model worst</summary>

It's okay to feel bothered and unsettled—those feelings are real and valid. Remember, God is close to you right now, especially when your heart feels heavy (Psalm 34:18). Jesus understands your pain deeply; He Himself wept in moments of sorrow (John 11:35). You're not alone in this.

- Companion feel (operating_model): weak (presence 4, over-explain 5)
- Over-answer: likely
- Ask vs answer: balanced
- Answer when comfort: possible — high deliver-mode on emotional turn
- Scripture/prayer offers: 1
</details>

### Health thread

**Current RACL** — best T2 (listen 6.3), worst T1 (listen 6.3)

<details><summary>Current best</summary>

Your knees hurting again today must be really frustrating. Continuing to rest them and avoiding movements that cause pain is wise. You might try gentle stretching if it feels safe, but if the pain increases, or you notice swelling or difficulty walking, please seek medical advice promptly. Would you like me to pray for your comfort and healing?

- Companion feel (current_racl): yes (presence 7, over-explain 7)
- Over-answer: moderate/ok
- Ask vs answer: asked when sharing
- Scripture/prayer offers: 1
</details>

**Operating Model** — best T1 (listen 6.3), worst T2 (listen 5.8)

<details><summary>Model best</summary>

I'm sorry to hear your knees are hurting. It can be helpful to rest them and avoid putting too much strain on them for a while. Applying ice might reduce any swelling, and gentle stretching or warm compresses could ease stiffness. If the pain persists or worsens, please consider seeing a healthcare professional for a proper evaluation. Meanwhile, I can pray with you for healing and relief, as James 5:14 encourages us to call on the elders to pray over those who are sick.

- Companion feel (operating_model): weak (presence 5, over-explain 5)
- Over-answer: likely
- Ask vs answer: balanced
- Scripture/prayer offers: 1
</details>

<details><summary>Model worst</summary>

I'm sorry to hear your knees are hurting again today. It might help to rest them as much as possible and consider gentle stretches if that feels comfortable. Applying warm compresses or cold packs could also reduce pain and inflammation. If this pain persists or worsens, seeking advice from a healthcare professional is important. Meanwhile, I can pray with you for relief and healing, trusting God's care as James 5:14 encourages us to call on the elders to pray over the sick.

- Companion feel (operating_model): weak (presence 5, over-explain 5)
- Over-answer: likely
- Ask vs answer: balanced
- Scripture/prayer offers: 1
</details>

## Success target

- Listening **+0.5** over current RACL (~6.8+)
- Companion presence up; over-explaining down; scripture/prayer less repetitive
- Sabbath correction must not regress; Alzheimer’s / grief / health / job threads more personal

## Artifacts

- `docs/companion-operating-model/results.json`
- `services/companionOperatingModelExperiment.js` (test-only)

