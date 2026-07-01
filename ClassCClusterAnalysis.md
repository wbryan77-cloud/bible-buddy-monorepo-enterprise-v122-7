# Class C Cluster Analysis

**Phase:** 2G Part B  
**Total Class C:** 82

---

## Root-cause clusters

| Cluster | Count | % | Description |
|---------|-------|---|-------------|
| missing_affirmation | 23 | 28% | Citation and card present; frozen affirmation rules do not cover OpenAI claim phrasing |
| missing_retrieval_trigger | 22 | 26.8% | Topic inferable but evidence card not retrieved for turn |
| missing_chain | 17 | 20.7% | Ref in scripture but not in approved teaching-order chain |
| missing_support_edge | 14 | 17.1% | Doctrine on card; specific ref+claim pairing lacks approved support graph edge |
| missing_card | 5 | 6.1% | Scripture cited for topic with no frozen evidence card (often pastoral) |
| weak_claim_extraction | 1 | 1.2% | Claim extracted without scripture mapping |

---

## Validator supportReason (ground truth)

| Support reason | Count | % |
|----------------|-------|---|
| The citation mentions a related topic but lacks verified affirmation under froze… | 37 | 45.1% |
| Scripture was cited but no approved evidence pack is available.… | 27 | 32.9% |
| The citation is not in the approved evidence graph for this turn.… | 14 | 17.1% |
| Only caution passages were cited without an approved teaching chain.… | 3 | 3.7% |
| No supporting scriptures were mapped to this claim.… | 1 | 1.2% |

---

## Topic sub-cluster breakdown

| Sub-cluster | Root clusters | Count |
|-------------|---------------|-------|
| sabbath_cluster | missing_affirmation + missing_chain | 19 |
| isaiah58_sabbath_edge | missing_support_edge | 14 |
| general_cluster | missing_affirmation + missing_chain + missing_retrieval_trigger | 13 |
| death_resurrection_cluster | missing_retrieval_trigger + missing_chain | 11 |
| holy_cluster | missing_affirmation + missing_retrieval_trigger | 9 |
| pastoral_no_evidence_card | missing_card | 5 |
| kingdom_cluster | missing_affirmation + missing_retrieval_trigger | 4 |
| dietary_cluster | missing_affirmation | 3 |
| caution_without_teaching_chain | missing_chain | 3 |
| unmapped_doctrine_claim | weak_claim_extraction | 1 |

---

## Cluster examples

### missing_affirmation (23)

- **CC-002** [sabbath]: "Early Christians continued meeting on the Sabbath for teaching.…" — Acts 17:2
- **CC-004** [holiness]: "Peter reiterates the call to holiness, emphasizing it as a lifestyle reflecting God's character.…" — 1 Peter 1:15-16
- **CC-005** [holiness]: "For example, Leviticus 19:2 says, "Be ye holy; for I the LORD your God am holy," showing that holine…" — Leviticus 19:2

### missing_retrieval_trigger (22)

- **CC-012** [deathState]: "Jesus refers to death as sleep, indicating inactivity rather than conscious existence.…" — John 11:11-14
- **CC-013** [deathState]: "It states that the dead know not anything, supporting the idea of unconsciousness in death.…" — Ecclesiastes 9:5
- **CC-014** [deathState]: "Paul comforts believers by describing the dead in Christ as sleeping, awaiting resurrection.…" — 1 Thessalonians 4:13-14

### missing_chain (17)

- **CC-016** [grief]: "This Scripture reassures that God is close to those hurting deeply.…" — Psalm 34:18
- **CC-017** [grief]: "Jesus’ tears show that grief is natural and He understands your pain.…" — John 11:35
- **CC-024** [grief]: "This verse reminds us that God is close to those who are brokenhearted in grief.…" — Psalm 34:18

### missing_support_edge (14)

- **CC-001** [sabbath]: "Encourages delighting in the Sabbath and refraining from personal business.…" — Isaiah 58:13-14
- **CC-003** [sabbath]: "Isaiah encourages delighting in the Sabbath by calling it a holy day and refraining from pursuing ou…" — Isaiah 58:13-14
- **CC-007** [sabbath]: "Encourages delighting in the Sabbath as the holy day of the Lord.…" — Isaiah 58:13-14

### missing_card (5)

- **CC-078** [emotional_pastoral]: "This verse assures us God is near to those who are brokenhearted, showing His understanding of our p…" — Psalm 34:18
- **CC-079** [emotional]: "Jesus' tears show His personal empathy and understanding of human grief.…" — John 11:35
- **CC-080** [deathState]: "For example, the psalmist says, "The LORD is nigh unto them that are of a broken heart" (Psalm 34:18…" — Psalm 34:18, John 11:35

