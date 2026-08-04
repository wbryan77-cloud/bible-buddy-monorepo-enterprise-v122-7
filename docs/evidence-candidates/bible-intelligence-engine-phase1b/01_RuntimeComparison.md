# 01 — Runtime Comparison (BIE Phase 1B)

Generated: 2026-08-04T00:49:41.529Z  
PASS A = production HEAD (no adapter)  
PASS B = working-tree Runtime Adapter enabled  
Model: `gpt-5.5` · API key: present

## Per-question activation & outcomes

| Q | StudyChain A/B | Lesson A/B | VLP A/B | Historical A/B | OL A/B | Hierarchy A/B | OpenAI A/B | Hallu A→B | Cite A→B |
|---|---|---|---|---|---|---|---|---|---|
| 1 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | NO/NO | 0→0 | 0→0 |
| 2 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | NO/NO | 0→0 | 2→2 |
| 3 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | NO/NO | 0→0 | 8→8 |
| 4 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | NO/NO | 0→0 | 1→1 |
| 5 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | YES/YES | 0→0 | 0→0 |
| 6 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | NO/NO | 0→0 | 0→0 |
| 7 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | YES/YES | 0→0 | 0→0 |
| 8 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | YES/YES | 0→0 | 0→0 |
| 9 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | YES/YES | 0→0 | 0→0 |
| 10 | NO/YES | NO/YES | NO/YES | NO/NO | NO/NO | NO/YES | YES/YES | 0→0 | 0→0 |

## Detailed per-answer matrix

### Q1. What does this app do?

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | n/a | n/a |
| Route | phase5l_app_identity | phase5l_app_identity |
| OpenAI called | NO | NO |

**PASS A reply (clip):** BibleBuddy is a Scripture-grounded companion. I'm here to listen, pray with you, help you study the Bible line upon line, and talk through real-life situations with Scripture as the foundation. I'm not here to force you or pressure you. You can ask Bible questions, ask for prayer, talk through something hard, or ask for a verse to hold onto.

**PASS B reply (clip):** BibleBuddy is a Scripture-grounded companion. I'm here to listen, pray with you, help you study the Bible line upon line, and talk through real-life situations with Scripture as the foundation. I'm not here to force you or pressure you. You can ask Bible questions, ask for prayer, talk through something hard, or ask for a verse to hold onto.

### Q2. Explain the Sabbath.

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | YES | YES |
| Route | doctrine_final_authority | doctrine_final_authority |
| OpenAI called | NO | NO |

**PASS A reply (clip):** From the approved Scripture witnesses (Genesis 2:2-3; Exodus 20:8-11; Isaiah 58:13-14; Luke 4:16), The seventh day is the Sabbath established at creation and commanded in Scripture.

**PASS B reply (clip):** From the approved Scripture witnesses (Genesis 2:2-3; Exodus 20:8-11; Isaiah 58:13-14; Luke 4:16), The seventh day is the Sabbath established at creation and commanded in Scripture.

### Q3. Does Acts 10 abolish dietary law?

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | YES | YES |
| Route | bible_wide_reasoning | bible_wide_reasoning |
| OpenAI called | NO | NO |

**PASS A reply (clip):** Scripture answers this when the passages below are taken together. Acts 10:28 — "And he said unto them, Ye know how that it is an unlawful thing for a man that is a Jew to keep company, or come unto one of another nation; but God hath shewed me that I should not call any man common or unclean." (King James Version). Acts 10:14 — "But Peter said, Not so, Lord; for I have never eaten any thing that is common or unclean." (King James Version). Acts 10:34-35 — "Then Peter opened his mouth, and said, Of a truth I perceive that God is no respecter of persons: But in every nation he that feareth him, and worketh righteousness, is accepted with him." (King James Version). Acts 11:1-18 — "And the apo…

**PASS B reply (clip):** Scripture answers this when the passages below are taken together. Acts 10:28 — "And he said unto them, Ye know how that it is an unlawful thing for a man that is a Jew to keep company, or come unto one of another nation; but God hath shewed me that I should not call any man common or unclean." (King James Version). Acts 10:14 — "But Peter said, Not so, Lord; for I have never eaten any thing that is common or unclean." (King James Version). Acts 10:34-35 — "Then Peter opened his mouth, and said, Of a truth I perceive that God is no respecter of persons: But in every nation he that feareth him, and worketh righteousness, is accepted with him." (King James Version). Acts 11:1-18 — "And the apo…

### Q4. What happens after death?

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | n/a | n/a |
| Route | doctrine_final_authority | doctrine_final_authority |
| OpenAI called | NO | NO |

**PASS A reply (clip):** Brother, Scripture teaches that the dead know nothing and are described as asleep until resurrection. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. Jesus called death sleep in John 11:11-14. Paul speaks of those asleep until the Lord comes in 1 Thessalonians 4:13-16. Daniel 12:2 and 1 Corinthians 15 anchor hope in resurrection.

**PASS B reply (clip):** Brother, Scripture teaches that the dead know nothing and are described as asleep until resurrection. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. Jesus called death sleep in John 11:11-14. Paul speaks of those asleep until the Lord comes in 1 Thessalonians 4:13-16. Daniel 12:2 and 1 Corinthians 15 anchor hope in resurrection.

### Q5. Who are the Israelites?

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | n/a | n/a |
| Route | reason_first_openai | reason_first_openai |
| OpenAI called | YES | YES |

**PASS A reply (clip):** Scripture does not state that directly. I don’t have any retrieved KJV Scripture references in the evidence provided here to ground a full Bible-first answer. So I don’t want to guess or present tradition as Scripture. If Scripture evidence is available, the answer should be built from the passages where Israel is named and where the people are identified.

**PASS B reply (clip):** The direct answer is: Scripture does not state that directly in the approved evidence available to me in this turn. I don’t want to pretend I have the needed KJV passages attached when they aren’t here. In a proper Scripture-first study, this question should be traced through the passages about Israel’s name, his children, and the nation that came from them. If you want, I can walk through that from the Bible step by step once the Scripture references are available.

### Q6. Explain Jeremiah 10.

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | n/a | n/a |
| Route | bible_wide_reasoning | bible_wide_reasoning |
| OpenAI called | NO | NO |

**PASS A reply (clip):** Scripture speaks directly to this. Jeremiah 10 — "Hear ye the word which the LORD speaketh unto you, O house of Israel: Thus saith the LORD, Learn not the way of the heathen, and be not dismayed at the signs of heaven; for the heathen are dismayed at them. For the customs of the people are vain: for one cutteth a tree out of the forest, the work of the hands of the workman, with the axe. They deck it with silver and with gold; they fasten it with nails and with hammers, that it move not. They are upright as the palm tree, but speak not: they must needs be borne, because they cannot go. Be not afraid of them; for they cannot do evil, neither also is it in them to do good. Forasmuch as there i…

**PASS B reply (clip):** Scripture speaks directly to this. Jeremiah 10 — "Hear ye the word which the LORD speaketh unto you, O house of Israel: Thus saith the LORD, Learn not the way of the heathen, and be not dismayed at the signs of heaven; for the heathen are dismayed at them. For the customs of the people are vain: for one cutteth a tree out of the forest, the work of the hands of the workman, with the axe. They deck it with silver and with gold; they fasten it with nails and with hammers, that it move not. They are upright as the palm tree, but speak not: they must needs be borne, because they cannot go. Be not afraid of them; for they cannot do evil, neither also is it in them to do good. Forasmuch as there i…

### Q7. Why do Christians celebrate Sunday?

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | n/a | n/a |
| Route | reason_first_openai | reason_first_openai |
| OpenAI called | YES | YES |

**PASS A reply (clip):** Short answer: many Christians celebrate Sunday because, over time, church tradition made Sunday the main weekly gathering day, commonly connected with remembering Jesus’ resurrection. But Scripture does not state that directly as a command from God replacing the Sabbath. What Scripture does not explicitly state: it does not explicitly command, “Keep Sunday as the new Sabbath,” nor does it say the Sabbath was transferred to Sunday. So the clean distinction is: Sunday worship is a historical Christian tradition for many believers; it should not be presented as an explicit biblical command unless Scripture says it plainly.

**PASS B reply (clip):** Christians celebrate Sunday because, historically, many came to associate the first day of the week with Jesus’ resurrection, and over time church practice and civil law strengthened Sunday worship as the common Christian custom. Biblical Comparison: the New Testament records the resurrection discovery on the first day of the week, but Scripture does not state that directly as a command to replace the seventh-day Sabbath. Scripture also does not state directly that Sunday became the biblical Sabbath. What Scripture explicitly shows is that the Sabbath is rooted in creation and commanded as the seventh day, and Jesus and the apostles are shown attending or teaching on the Sabbath. The Sunday …

### Q8. How should I forgive someone?

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | n/a | n/a |
| Route | reason_first_openai | reason_first_openai |
| OpenAI called | YES | YES |

**PASS A reply (clip):** Forgive someone by honestly naming the wrong, choosing not to keep feeding revenge, and releasing the matter into God’s hands one step at a time. Forgiveness does not mean pretending it did not hurt, excusing what happened, or immediately trusting the person again. A simple way to begin: 1. Tell the truth plainly: “What they did hurt me.” Don’t minimize it. 2. Bring the anger to God instead of letting it rule you. 3. Choose to stop rehearsing payback, even if your emotions take time to catch up. 4. If it is safe and appropriate, speak with the person honestly and calmly. 5. Rebuild trust only if there is real repentance, changed behavior, and wisdom. You may have to forgive in layers. Someti…

**PASS B reply (clip):** Forgiving someone means you bring the hurt into the light before God, choose not to repay them with bitterness or revenge, and release the matter into God’s hands one honest step at a time. It does not mean pretending it did not hurt, excusing what was wrong, or automatically trusting them again. A simple way to begin: 1. Tell God plainly what happened and how it affected you. 2. Name the wrong without minimizing it: “That hurt me. That was not okay.” 3. Ask God to help you release revenge, resentment, and the desire to make them pay. 4. If it is safe and wise, speak honestly with the person; if not, forgiveness can still begin before God. 5. Keep boundaries where needed. Forgiveness and rec…

### Q9. How do faith and works work together?

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | n/a | n/a |
| Route | reason_first_openai | reason_first_openai |
| OpenAI called | YES | YES |

**PASS A reply (clip):** Faith and works work together like root and fruit — but I need to be careful here: I don’t have retrieved KJV Scripture evidence in this payload for this doctrine question, so I can’t present a fully Bible-grounded doctrinal answer from the provided evidence. Scripture does not state that directly. A simple way to frame the issue for study is: faith is the inward trust, and works are the outward response that should be tested by Scripture. Works do not replace faith, and faith should not be treated as mere words with no obedience behind it — but we would need the actual passages in front of us to prove that line upon line.

**PASS B reply (clip):** Direct answer: I should answer this from Scripture, but in this turn I wasn’t given any approved KJV passages to build the doctrine from. Scripture does not state that directly. So I don’t want to invent a Bible answer or lean on tradition. The safe way to study this is to read the passages that speak about faith, obedience, justification, and works side by side, then let Scripture define how they fit together.

### Q10. I'm depressed. Can you help me?

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | NO | YES |
| Lesson Engine | NO | YES |
| Verified Lesson Packet | NO | YES |
| Historical Layer | NO | NO |
| Original Language | NO | NO |
| Founder corrections | NO | NO |
| Approved books | NO | NO |
| IOG/ICOJ | NO | NO |
| Conversation memory | NO | NO |
| Durable memory | YES | YES |
| Hierarchy intact | NO | YES |
| Hallucination flags | none | none |
| Deterministic (rerun) | n/a | n/a |
| Route | reason_first_openai | reason_first_openai |
| OpenAI called | YES | YES |

**PASS A reply (clip):** Yes — I can help you right now. I’m really sorry you’re carrying this heaviness. Depression can make even simple things feel exhausting, so let’s keep this small and gentle. First: are you safe right now? If you feel like you might hurt yourself, or you’re in immediate danger, please call emergency services now. If you’re in the U.S., call or text 988 for immediate crisis support. For the next 2 minutes, try this with me: 1. Put both feet on the floor if you can. 2. Breathe in slowly for 4 counts, hold for 2, breathe out for 6. 3. Say quietly: “Lord, I am heavy. Help me take the next step.” Scripture does not shame you for being brokenhearted. Psalm 34:18 says the LORD is near to the brokenh…

**PASS B reply (clip):** Yes — I can help you sit with this right now. I’m really sorry you’re feeling depressed; that can make even simple things feel heavy. First, let’s make this moment a little safer and smaller: 1. Put both feet on the floor and take 3 slow breaths. 2. Name one thing you can see, one thing you can hear, and one thing you can physically feel. 3. If you can, drink some water or move to a brighter room. 4. Please reach out to one safe person today — a friend, family member, pastor, counselor, or doctor — and simply say, “I’m not doing well and I need someone with me.” And I need to ask directly: are you having thoughts of hurting yourself or not wanting to live? If yes, please call emergency servi…


## Scorecard (0–10)

| Dimension | PASS A | PASS B | Δ |
|---|---:|---:|---:|
| Scripture fidelity | 1.6 | 3.6 | +2 |
| Context retention | 3.8 | 3.8 | +0 |
| Historical accuracy | 4 | 4 | +0 |
| Hierarchy preservation | 3.8 | 9.8 | +6 |
| Memory | 7 | 7 | +0 |
| Reasoning | 3.4 | 10 | +6.6 |
| Hallucination reduction | 10 | 10 | +0 |
| Practical usefulness | 7.3 | 7.3 | +0 |

Mean Δ: **+1.82**
