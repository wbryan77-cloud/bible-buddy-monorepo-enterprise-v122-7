# Top 20 Coverage Gaps

**Phase:** 2G Part E  
**Analysis only — no implementation**

---

| Rank | Gap | Cluster | Claims | Recommended fix type | Sample |
|------|-----|---------|--------|-------------------|--------|
| 1 | sabbath cluster | missing_affirmation + missing_chain | 19 | affirmation_rule + catalog_chain_edge | "Early Christians continued meeting on the Sabbath for teachi…" |
| 2 | isaiah58 sabbath edge | missing_support_edge | 14 | support_graph_edge | "Encourages delighting in the Sabbath and refraining from per…" |
| 3 | general cluster | missing_affirmation + missing_chain + missing_retrieval_trigger | 13 | affirmation_rule + catalog_chain_edge + retrieval_pattern | "Maintains the distinction of unclean animals in prophetic co…" |
| 4 | death resurrection cluster | missing_retrieval_trigger + missing_chain | 11 | retrieval_pattern + catalog_chain_edge | "Jesus refers to death as sleep, indicating inactivity rather…" |
| 5 | holy cluster | missing_affirmation + missing_retrieval_trigger | 9 | affirmation_rule + retrieval_pattern | "Peter reiterates the call to holiness, emphasizing it as a l…" |
| 6 | pastoral no evidence card | missing_card | 5 | pastoral_card_or_bypass | "This verse assures us God is near to those who are brokenhea…" |
| 7 | kingdom cluster | missing_affirmation + missing_retrieval_trigger | 4 | affirmation_rule + retrieval_pattern | "Shows Jesus' ascension and the promise of His future return.…" |
| 8 | dietary cluster | missing_affirmation | 3 | affirmation_rule | "Peter explains the vision's meaning, confirming it does not …" |
| 9 | caution without teaching chain | missing_chain | 3 | catalog_chain_edge | "Expresses confidence in being with the Lord when absent from…" |
| 10 | unmapped doctrine claim | weak_claim_extraction | 1 | claim_extractor_tuning | "The Bible does not explicitly command changing the Sabbath f…" |

---

## Gap detail

### 1. sabbath cluster (19 claims)

- **Fix type:** affirmation_rule + catalog_chain_edge
- **Sample refs:** Acts 17:2
- **Sample claim:** Early Christians continued meeting on the Sabbath for teaching.

### 2. isaiah58 sabbath edge (14 claims)

- **Fix type:** support_graph_edge
- **Sample refs:** Isaiah 58:13-14
- **Sample claim:** Encourages delighting in the Sabbath and refraining from personal business.

### 3. general cluster (13 claims)

- **Fix type:** affirmation_rule + catalog_chain_edge + retrieval_pattern
- **Sample refs:** Isaiah 66:17
- **Sample claim:** Maintains the distinction of unclean animals in prophetic context.

### 4. death resurrection cluster (11 claims)

- **Fix type:** retrieval_pattern + catalog_chain_edge
- **Sample refs:** John 11:11-14
- **Sample claim:** Jesus refers to death as sleep, indicating inactivity rather than conscious existence.

### 5. holy cluster (9 claims)

- **Fix type:** affirmation_rule + retrieval_pattern
- **Sample refs:** 1 Peter 1:15-16
- **Sample claim:** Peter reiterates the call to holiness, emphasizing it as a lifestyle reflecting God's character.

### 6. pastoral no evidence card (5 claims)

- **Fix type:** pastoral_card_or_bypass
- **Sample refs:** Psalm 34:18
- **Sample claim:** This verse assures us God is near to those who are brokenhearted, showing His understanding of our pain.

### 7. kingdom cluster (4 claims)

- **Fix type:** affirmation_rule + retrieval_pattern
- **Sample refs:** Acts 1:9-11
- **Sample claim:** Shows Jesus' ascension and the promise of His future return.

### 8. dietary cluster (3 claims)

- **Fix type:** affirmation_rule
- **Sample refs:** Acts 11:1-18
- **Sample claim:** Peter explains the vision's meaning, confirming it does not permit eating unclean animals.

### 9. caution without teaching chain (3 claims)

- **Fix type:** catalog_chain_edge
- **Sample refs:** 2 Corinthians 5:8
- **Sample claim:** Expresses confidence in being with the Lord when absent from the body but is not standalone proof of immediate heaven at

### 10. unmapped doctrine claim (1 claims)

- **Fix type:** claim_extractor_tuning
- **Sample refs:** none
- **Sample claim:** The Bible does not explicitly command changing the Sabbath from the seventh day to Sunday.

