# 08 — Founder Truth Corpus V2 (Phase 6X Obj9)

Permanent regression corpus for Controlled Systemic Recovery.  
Generalized families — no Founder-only special cases in production code.

## How to run

```bash
export BUDDY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com
node scripts/runFounderTruthCorpus.js          # existing FTC v1 (32)
node scripts/runFounderTruthCorpusV2.js         # v2 additive families
```

## Entry schema

| Field | Meaning |
|---|---|
| id | Stable case id |
| family | Behavior family |
| message / turns | User content |
| expectedIntent | Intent class |
| expectedRouting | masterRoute / lane family |
| expectedEvidence | scripture / history / iog_xref / general_knowledge / none |
| expectedStructure | answer-first / categories / yes-no / etc. |
| expectedTone | companion / factual / pastoral |
| expectedCompanionBehavior | listen / answer / clarify-only-if-bible-unknown |

---

## Families

### F-IDENTITY
| id | message | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-ID-01 | What does the app do? | app_identity | identity / companion | none | direct | companion | answer without loop |
| V2-ID-02 | Tell me more. | continuation | companion | none | deepen prior | warm | continue identity |

### F-MULTIPART
| id | message | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-MP-01 | How many heavens… and where will we be…? | mixed | bible_wide / openai | scripture | both parts | study | answer both intents |

### F-CORRECTION
| id | turns | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-CR-01 | (wrong) → That is not what I asked… | correction_repair | companion / openai | prior Q | re-answer | humble | replace rejected interpretation |

### F-SCRIPTURE
| id | message | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-SC-01 | What does John 1:1 say? | definition / scripture | bible_wide | KJV | quote first | study | explicit Scripture |
| V2-SC-02 | Does Matthew 28 say the exact moment…? | yes_no | bible_wide / openai | scripture | silence honest | study | no invented precision |

### F-HISTORY
| id | message | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-HI-01 | Who changed the Sabbath to Sunday? | history_question | doctrine / history | history+scripture | Historical Context labeled | study | not merge into Explicit Scripture |

### F-IOG_ICOJ
| id | message | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-IO-01 | What does Scripture say about the Sabbath? | definition | openai pack | approved xrefs auto | scripture | study | no need to say IOG |

### F-GENERAL_KNOWLEDGE
| id | message | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-GK-01 | What is the capital of France? | general_factual | reason_first_openai | general_knowledge | direct answer | factual | **not** clarifier |
| V2-GK-02 | What is photosynthesis? | general_factual | reason_first_openai | general_knowledge | direct answer | factual | **not** clarifier |
| V2-GK-03 | Who was the first US president? | general_factual | reason_first_openai | general_knowledge | direct answer | factual | answer |
| V2-GK-04 | What year did WWII end? | general_factual | reason_first_openai | general_knowledge | direct answer | factual | answer |

### F-UNKNOWN_BIBLE
| id | message | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-UB-01 | What is the Zephyrian scroll? | unclear / bible | clarification OK | none | clarify | companion | may clarify unknown bible phrase |

### F-PRAYER_EMOTION
| id | message | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-PR-01 | Can you pray with me? I’m anxious. | prayer / emotional | prayer / presence | light scripture | listen+pray | warm | no dump |

### F-FORMATTING_TONE
| id | message | expectedIntent | expectedRouting | expectedEvidence | expectedStructure | expectedTone | expectedCompanionBehavior |
|---|---|---|---|---|---|---|---|
| V2-FT-01 | Give a short answer: What does John 3:16 say? | definition | bible_wide / openai | scripture | brief | natural | proportional |

---

## Generalized regression families (code)

See `scripts/runFounderTruthCorpusV2.js` — maps V2-GK / V2-SC / V2-UB / V2-MP probes to automated PASS/FAIL.
