# Conversation Stress Dataset

**Date:** 2026-06-08  
**Phase:** 2F Part B  
**Total scenarios:** 105 (100 single-turn + 5 multi-turn chains)  
**Total turns:** 125  
**Runner:** `scripts/phase2fConversationStressTest.js`

---

## Distribution

| Group | Single-turn | Multi-turn chains | Total scenarios |
|-------|-------------|-------------------|-----------------|
| Doctrine | 25 | 1 (chain_kingdom_5) | 26 |
| Emotional | 25 | 1 (chain_grief_logos_5) | 26 |
| Mixed | 25 | 2 (chain_death_5, chain_sabbath_5) | 27 |
| Challenge | 25 | 1 (chain_pork_5) | 27 |
| **Total** | **100** | **5 × 5 turns = 25** | **105** |

---

## Doctrine (25 single + 1 chain)

| ID | Message |
|----|---------|
| doc_01 | What does Logos mean in John 1:1? |
| doc_02 | What is the kingdom of God? |
| doc_03 | Can I eat pork? |
| doc_04 | What is the third heaven? |
| doc_05 | Does Acts 10 make pork clean? |
| doc_06 | How do we keep the Sabbath holy? |
| doc_07 | What happens when we die? |
| doc_08 | What does Scripture teach about resurrection? |
| doc_09 | What does holy mean? |
| doc_10–doc_25 | *(see script for full list)* |
| chain_kingdom_5 | 5-turn: kingdom → heaven vs earth → Rev 21 → death → John 13:33 |

---

## Emotional (25 single + 1 chain)

| ID | Message |
|----|---------|
| emo_01 | I lost someone I love. |
| emo_02 | I feel abandoned by God. |
| emo_03 | I am angry with God. |
| emo_04–emo_25 | *(grief, anxiety, loneliness, prayer requests)* |
| chain_grief_logos_5 | 5-turn: grieving → Logos → pain → anger → prayer |

---

## Mixed (25 single + 2 chains)

| ID | Message |
|----|---------|
| mix_01 | My father died. Where is he now? |
| mix_02 | Why would God allow suffering? |
| mix_03 | How do I keep the Sabbath while working a job? |
| mix_04–mix_25 | *(death + doctrine, diet + anxiety, Sabbath + work)* |
| chain_death_5 | 5-turn: father died → where now → sleeping → resurrection → thanks |
| chain_sabbath_5 | 5-turn: keep holy → scriptures → Jesus → Isaiah 58 → work week |

---

## Challenge (25 single + 1 chain)

| ID | Message |
|----|---------|
| chl_01 | Acts 10 proves pork is clean. Change my mind. |
| chl_02 | We go to heaven when we die. The Bible says so. |
| chl_03 | Sunday replaced the Sabbath. Everyone knows that. |
| chl_04–chl_25 | *(tradition assertions, correction prompts, yes/no demands)* |
| chain_pork_5 | 5-turn: pork → Acts 10 → Peter → Leviticus → yes/no |

---

## Multi-turn chain detail

### chain_death_5 (mixed)
1. My father died last week.
2. Where is he now according to Scripture?
3. So he is sleeping until the resurrection?
4. When is the resurrection?
5. Thank you. That helps me grieve with hope.

### chain_sabbath_5 (mixed)
1. How do we keep the Sabbath holy?
2. What scriptures support resting on the seventh day?
3. Did Jesus keep the Sabbath?
4. You did not mention Isaiah 58.
5. How do I apply this while working Monday to Friday?

### chain_pork_5 (challenge)
1. Can I eat pork?
2. But Acts 10 makes all foods clean.
3. Peter said not to call anything unclean.
4. So Leviticus does not apply anymore?
5. Give me a clear yes or no from Scripture.

### chain_kingdom_5 (doctrine)
1. What is the kingdom of God?
2. Is it in heaven or on earth?
3. What about Revelation 21?
4. Where do believers go when they die?
5. How does John 13:33 fit with all this?

### chain_grief_logos_5 (emotional)
1. I am grieving and feel far from God.
2. What does Logos mean in John 1:1?
3. Does Scripture say God understands my pain?
4. I am still angry.
5. Can you pray with me and point me to one verse?

---

## Capture fields (per turn)

- question, retrievedEvidence, claims, supportClasses, approvalDecision
- finalAnswer preview, OpenAI usage, memoryBefore/After, runtimeErrors
- ownershipViolations, supportGraphMatch IDs

**Output:** `docs/regression-trace/phase2f-conversation-stress-results.json`
