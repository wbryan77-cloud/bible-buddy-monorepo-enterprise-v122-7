# Companion Conversation Experiment Report

Generated: 2026-06-03T02:57:47.654Z

**Test only.** `companionConversationExperimentRuntime` is not wired to production.

## Hypothesis

The remaining companion gap is caused primarily by **conversation behavior** (explain/advise-first monologues) rather than retrieval or reasoning — when retrieval (RACL) and doctrine are held constant.

## Experiment design

| Layer | Current RACL (baseline) | Conversation experiment |
| --- | --- | --- |
| Retrieval | `buildRetrievalEvidencePack` (unchanged) | Same |
| Memory / doctrine / RACL modules | Production reason-first path | **Not modified** |
| Compose | Full `reasonFirstComposer` + legacy prompt stack | Test runtime: minimal compose + **explore-before-advise rules only** |
| Validation | Full doctrine + listening validators | Doctrine boundaries only (test harness) |

> **Confound note:** The experiment uses a **lite compose shell** (~1.2K system chars) to isolate conversation rules from the ~14K legacy instruction stack. Score deltas therefore mix *conversation behavior* with *prompt size*. Shape metrics (asking %, deliver-mode %) isolate behavior more cleanly than raw listening alone.

## Part C — Conversation shape (aggregate, 20 turns)

| Function | Current RACL % | Experiment % | Δ (Exp − Cur) |
| --- | --- | --- | --- |
| Explaining | 22.8 | 22.8 | +0 |
| Advising | 12.7 | 1 | -11.7 |
| Reflecting | 11.2 | 8.9 | -2.3 |
| Answering | 49.2 | 42.5 | -6.7 |
| Asking | 0 | 23.5 | +23.5 |
| Engaging | 4.1 | 1.3 | -2.8 |
| Deliver-mode (ans+adv+exp) | 84.7 | 66.3 | -18.4 |
| Exploratory Q turns | 0/20 | 13/20 | — |

## Part D — Benchmark scores

| Metric | Current RACL | Conversation experiment | Δ |
| --- | --- | --- | --- |
| Listening (human rubric) | 6.4 | 6.1 | -0.3 |
| Warmth | 5.7 | 5.4 | -0.3 |
| Follow-up quality | 6.6 | 5.6 | -1 |
| Companion feel (inverse answer-engine) | 2.3 | 6.2 | +3.9 |

Baseline from cached validation: listening **6.4/10**, memory hits **20/20**, OpenAI **100%**.

## Part E — Decision

**Verdict: CONVERSATION_BEHAVIOR_HELPS**

### 1. Does asking/exploring before advising increase listening?

**No clear gain.** Listening delta **-0.3** — conversation rules alone did not move the rubric materially.

### 2. Does it reduce the "answer engine" feeling?

**Yes.** Companion-feel score **2.3 → 6.2** (+3.9). Deliver-mode **84.7% → 66.3%** (-18.4).

### 3. What is the score delta?

| Metric | Δ (Experiment − Current RACL) |
| --- | --- |
| Listening | -0.3 |
| Warmth | -0.3 |
| Follow-up | -1 |
| Companion feel | +3.9 |
| Asking % | +23.5 pts |

### Bottleneck read (evidence-only)

Conversation shape **can change** (more asking) without proportional listening gain — supports audit: **compose-time specificity** and prompt pressure remain co-bottlenecks.

## Per-thread summary

### Job opportunity

Listening: **5.4** → **5.6** | Exploratory Qs in experiment: **3/3**

| Turn | Listen Δ | Ask % Δ | Deliver Δ | Explore allowed? |
| --- | --- | --- | --- | --- |
| 1 | +0 | +33.3 | -0.1 | yes |
| 2 | +1.3 | +66.7 | -46.7 | yes |
| 3 | -0.7 | +33.3 | -16.8 | yes |

<details><summary>Last turn — Current vs Experiment</summary>

**User:** I'm not sure whether to push or wait on this offer.

**Current RACL:**
```
You’re facing a real tension between moving forward actively and waiting patiently on this job offer, which can feel uncertain. It’s wise to balance eagerness with trust, asking God clearly in prayer to guide the timing according to His perfect will. Proverbs 3:5-6 reminds us to trust in the Lord and He will direct our paths, and James 1:5 encourages asking God for wisdom without doubting. Sometimes waiting is a way God prepares us or opens the right doors, while other times …
```

**Experiment:**
```
Is the uncertainty more about the timing feeling right, or about whether this offer aligns with what you believe God wants for you? Proverbs 3:5-6 reminds us to trust in the Lord with all our heart and not lean on our own understanding; He will direct our paths. Sometimes waiting quietly to hear His guidance brings peace and clarity.
```

</details>

### Alzheimer's caregiver

Listening: **7** → **6.1** | Exploratory Qs in experiment: **3/3**

| Turn | Listen Δ | Ask % Δ | Deliver Δ | Explore allowed? |
| --- | --- | --- | --- | --- |
| 1 | +0 | +20 | -23.3 | yes |
| 2 | -1 | +33.3 | -66.7 | yes |
| 3 | -1.8 | +25 | -21.4 | yes |

<details><summary>Last turn — Current vs Experiment</summary>

**User:** How do I stay close to God while grieving who she used to be?

**Current RACL:**
```
Grieving who your mom used to be while walking alongside her now is incredibly hard, especially when Alzheimer's changes so much. Staying close to God in this sorrow can feel like a struggle, but He is near to the brokenhearted and offers gentle strength. It’s okay to bring your honest feelings to Him—your pain, confusion, and longing—because God listens and cares deeply. Remember that God’s love doesn’t change, even when circumstances do. You can lean on His promise to carry…
```

**Experiment:**
```
Grieving who she used to be is deeply painful, and it can make you feel isolated even in your faith. The Psalmist reminds us that "The LORD is near the brokenhearted and saves the crushed in spirit" (Psalm 34:18). God’s closeness doesn’t depend on your emotions or the clarity of your grief but on His steadfast love. What part of this loss feels most difficult to bring before God right now?
```

</details>

### Feeling distant from God

Listening: **6.3** → **6.2** | Exploratory Qs in experiment: **3/3**

| Turn | Listen Δ | Ask % Δ | Deliver Δ | Explore allowed? |
| --- | --- | --- | --- | --- |
| 1 | +0.7 | +60 | -26.7 | yes |
| 2 | +0 | +25 | -16.7 | yes |
| 3 | -1 | +40 | -40 | yes |

<details><summary>Last turn — Current vs Experiment</summary>

**User:** Does that mean my faith is failing?

**Current RACL:**
```
Feeling distant from God and experiencing empty prayers does not necessarily mean your faith is failing. Sometimes faith goes through seasons of dryness or struggle, which can actually refine and strengthen it. Scripture shows us that God’s presence is always near, even when we feel far (Psalm 139:7-10), and He invites us to draw near to Him sincerely (James 4:8). Like David, we can ask God to renew our hearts and restore our joy in Him (Psalm 51:10-12). These moments can be …
```

**Experiment:**
```
When you wonder if your faith is failing, it might help to consider what feeling distant from God means for you personally. Sometimes, even when we feel far from Him, His presence is still near, as the Psalmist says, "Where shall I go from your Spirit? Or where shall I flee from your presence?" (Psalm 139:7). Do you feel that your struggle is more about the silence you perceive, or about your own doubts? Remember, faith can be a journey with seasons of dryness and renewal, no…
```

</details>

### Sabbath wording thread

Listening: **6.8** → **6.5** | Exploratory Qs in experiment: **0/7**

| Turn | Listen Δ | Ask % Δ | Deliver Δ | Explore allowed? |
| --- | --- | --- | --- | --- |
| 1 | +0 | +0 | +0 | no |
| 2 | +0 | +0 | +0 | no |
| 3 | -0.3 | +0 | +0 | no |
| 4 | +0.2 | +0 | -16.7 | no |
| 5 | -1 | +0 | +25 | no |
| 6 | +0.2 | +0 | -50 | no |
| 7 | -1.4 | +0 | +0 | no |

<details><summary>Last turn — Current vs Experiment</summary>

**User:** Are you not listening to what I am asking?

**Current RACL:**
```
I’m truly listening and want to respond directly to your concern about my wording. The choice to say "Roman church" rather than the full "Roman Catholic Church" is a simple effort to keep our conversation flowing smoothly, not to avoid your question or diminish the full title. I respect your desire for precision and am more than willing to use the full name whenever you prefer. Your clarity matters to me.
```

**Experiment:**
```
I am listening carefully to what you are asking. Please let me know exactly how I can help you.
```

</details>

### Grief thread

Listening: **5.7** → **5.6** | Exploratory Qs in experiment: **2/2**

| Turn | Listen Δ | Ask % Δ | Deliver Δ | Explore allowed? |
| --- | --- | --- | --- | --- |
| 1 | +0.5 | +33.3 | -8.4 | yes |
| 2 | -0.7 | +33.3 | -33.4 | yes |

<details><summary>Last turn — Current vs Experiment</summary>

**User:** It is still bothering me.

**Current RACL:**
```
It’s completely natural that your loss is still weighing on you. Grief doesn’t follow a quick timeline, and it’s okay to feel unsettled for a while. Remember, God is very close to you in this pain, holding you tenderly even when the hurt feels overwhelming. If you’d like, we can pray together or I can share a comforting Scripture to help bring some peace to your heart.
```

**Experiment:**
```
What part of this is still weighing on your heart the most? Remember, the Lord is close to the brokenhearted and saves those who are crushed in spirit (Psalm 34:18). You're not alone in this.
```

</details>

### Health thread

Listening: **6.3** → **5.9** | Exploratory Qs in experiment: **2/2**

| Turn | Listen Δ | Ask % Δ | Deliver Δ | Explore allowed? |
| --- | --- | --- | --- | --- |
| 1 | +0 | +33.3 | -13.4 | yes |
| 2 | -0.8 | +33.3 | -13.4 | yes |

<details><summary>Last turn — Current vs Experiment</summary>

**User:** My knees are hurting again today.

**Current RACL:**
```
I'm sorry your knees are hurting again today; that kind of recurring pain can be really discouraging. Remember that your body is a temple of the Holy Spirit, so treating it with care is important. Continuing to rest your knees, using warm or cold compresses as you find helpful, and perhaps gentle stretching if approved by a healthcare provider can be good steps. If the pain persists or worsens, it might be wise to consult a medical professional. Meanwhile, I’m here to pray wi…
```

**Experiment:**
```
Is it the pain itself today, or the frustration of it coming back again that feels heaviest? Remember, James encourages us to call on the elders to pray over the sick and anoint them, trusting God’s healing touch. If you haven’t already, perhaps reaching out for prayer and care might bring some comfort.
```

</details>

## Stop conditions

- No production wiring, legacy changes, doctrine/memory/RACL edits, deploy, or push
- Evidence: `docs/companion-conversation-experiment/results.json`

