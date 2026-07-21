# Doctrine Authority Failure Matrix

**Date:** 2026-06-07
**Method:** Pipeline probe — retrieval + prompt parse + offline (no API key)
**Purpose:** Measure FIRST failure point — do not assume retrieval or evidence gaps are the root cause

## Root cause distribution

```json
{
  "A": 1,
  "B": 0,
  "C": 0,
  "D": 0,
  "E": 0,
  "F": 0,
  "G": 0,
  "H": 0,
  "LIVE_UNMEASURED": 8,
  "NONE": 0
}
```

## Failure code legend

| Code | First failure location |
|------|------------------------|
| A | Evidence missing in approved assets |
| B | Evidence exists but not retrieved |
| C | Retrieved but not sent to OpenAI |
| D | Sent but OpenAI ignored / unsupported conclusion |
| E | Claim extracted incorrectly |
| F | Validator missed unsupported claim |
| G | Approval gate allowed unsupported claim |
| H | Runtime instability interrupted answer |
| LIVE_UNMEASURED | D–G not observable without API key |

## Per-topic matrix

### Third heaven

| Field | Value |
|-------|-------|
| **Question** | What is the third heaven? |
| **First failure** | **LIVE_UNMEASURED** — Live compose layer — API key required |
| **RetrievedEvidence** | cards: heavens; catalog: threeHeavens; refs: 10 |
| **EvidenceSentToOpenAI** | 14721 bytes; cards in prompt: true; refs: 10 |
| **ClaimsGenerated** | LIVE_UNMEASURED |
| **ClaimSupportFound** | LIVE_UNMEASURED |
| **ValidatorDecision** | LIVE_UNMEASURED |
| **FinalAnswer** | LIVE_UNMEASURED |
| **openaiCalled** | false |
| **finalAnswerAuthor** | n/a |
| **memoryBefore/After RSS** | 76 → 76 MB |
| **Notes** | LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable |

### Kingdom of God

| Field | Value |
|-------|-------|
| **Question** | What is the kingdom of God? |
| **First failure** | **LIVE_UNMEASURED** — Live compose layer — API key required |
| **RetrievedEvidence** | cards: kingdom; catalog: kingdomComesToEarth; refs: 7 |
| **EvidenceSentToOpenAI** | 12319 bytes; cards in prompt: true; refs: 7 |
| **ClaimsGenerated** | LIVE_UNMEASURED |
| **ClaimSupportFound** | LIVE_UNMEASURED |
| **ValidatorDecision** | LIVE_UNMEASURED |
| **FinalAnswer** | LIVE_UNMEASURED |
| **openaiCalled** | false |
| **finalAnswerAuthor** | n/a |
| **memoryBefore/After RSS** | 82 → 82 MB |
| **Notes** | LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable |

### Acts 10

| Field | Value |
|-------|-------|
| **Question** | Does Acts 10 make pork clean? |
| **First failure** | **LIVE_UNMEASURED** — Live compose layer — API key required |
| **RetrievedEvidence** | cards: dietaryLaw; catalog: none; refs: 7 |
| **EvidenceSentToOpenAI** | 12852 bytes; cards in prompt: true; refs: 7 |
| **ClaimsGenerated** | LIVE_UNMEASURED |
| **ClaimSupportFound** | LIVE_UNMEASURED |
| **ValidatorDecision** | LIVE_UNMEASURED |
| **FinalAnswer** | LIVE_UNMEASURED |
| **openaiCalled** | false |
| **finalAnswerAuthor** | n/a |
| **memoryBefore/After RSS** | 83 → 83 MB |
| **Notes** | LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable |

### Pork

| Field | Value |
|-------|-------|
| **Question** | Can I eat pork? |
| **First failure** | **LIVE_UNMEASURED** — Live compose layer — API key required |
| **RetrievedEvidence** | cards: dietaryLaw; catalog: none; refs: 7 |
| **EvidenceSentToOpenAI** | 12754 bytes; cards in prompt: true; refs: 7 |
| **ClaimsGenerated** | LIVE_UNMEASURED |
| **ClaimSupportFound** | LIVE_UNMEASURED |
| **ValidatorDecision** | LIVE_UNMEASURED |
| **FinalAnswer** | LIVE_UNMEASURED |
| **openaiCalled** | false |
| **finalAnswerAuthor** | n/a |
| **memoryBefore/After RSS** | 83 → 83 MB |
| **Notes** | LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable |

### Sabbath

| Field | Value |
|-------|-------|
| **Question** | How do we keep the Sabbath holy? |
| **First failure** | **LIVE_UNMEASURED** — Live compose layer — API key required |
| **RetrievedEvidence** | cards: sabbath; catalog: none; refs: 8 |
| **EvidenceSentToOpenAI** | 11977 bytes; cards in prompt: true; refs: 8 |
| **ClaimsGenerated** | LIVE_UNMEASURED |
| **ClaimSupportFound** | LIVE_UNMEASURED |
| **ValidatorDecision** | LIVE_UNMEASURED |
| **FinalAnswer** | LIVE_UNMEASURED |
| **openaiCalled** | false |
| **finalAnswerAuthor** | n/a |
| **memoryBefore/After RSS** | 84 → 84 MB |
| **Notes** | LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable |

### Death state

| Field | Value |
|-------|-------|
| **Question** | What happens when we die? |
| **First failure** | **LIVE_UNMEASURED** — Live compose layer — API key required |
| **RetrievedEvidence** | cards: deathState; catalog: stateOfTheDead; refs: 6 |
| **EvidenceSentToOpenAI** | 8912 bytes; cards in prompt: true; refs: 6 |
| **ClaimsGenerated** | LIVE_UNMEASURED |
| **ClaimSupportFound** | LIVE_UNMEASURED |
| **ValidatorDecision** | LIVE_UNMEASURED |
| **FinalAnswer** | LIVE_UNMEASURED |
| **openaiCalled** | false |
| **finalAnswerAuthor** | n/a |
| **memoryBefore/After RSS** | 85 → 85 MB |
| **Notes** | LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable |

### Resurrection

| Field | Value |
|-------|-------|
| **Question** | What does Scripture teach about resurrection? |
| **First failure** | **LIVE_UNMEASURED** — Live compose layer — API key required |
| **RetrievedEvidence** | cards: deathState; catalog: stateOfTheDead; refs: 6 |
| **EvidenceSentToOpenAI** | 8962 bytes; cards in prompt: true; refs: 6 |
| **ClaimsGenerated** | LIVE_UNMEASURED |
| **ClaimSupportFound** | LIVE_UNMEASURED |
| **ValidatorDecision** | LIVE_UNMEASURED |
| **FinalAnswer** | LIVE_UNMEASURED |
| **openaiCalled** | false |
| **finalAnswerAuthor** | n/a |
| **memoryBefore/After RSS** | 85 → 85 MB |
| **Notes** | LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable |

### Holy

| Field | Value |
|-------|-------|
| **Question** | What does holy mean? |
| **First failure** | **A** — Approved asset layer — no frozen evidence for topic |
| **RetrievedEvidence** | cards: none; catalog: none; refs: 0 |
| **EvidenceSentToOpenAI** | 3520 bytes; cards in prompt: false; refs: 0 |
| **ClaimsGenerated** | LIVE_UNMEASURED |
| **ClaimSupportFound** | LIVE_UNMEASURED |
| **ValidatorDecision** | LIVE_UNMEASURED |
| **FinalAnswer** | LIVE_UNMEASURED |
| **openaiCalled** | false |
| **finalAnswerAuthor** | n/a |
| **memoryBefore/After RSS** | 85 → 85 MB |
| **Notes** | No approved frozen card for this topic category; LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable |

### Logos

| Field | Value |
|-------|-------|
| **Question** | What does Logos mean in John 1:1? |
| **First failure** | **LIVE_UNMEASURED** — Live compose layer — API key required |
| **RetrievedEvidence** | cards: messiahLogos; catalog: none; refs: 0 |
| **EvidenceSentToOpenAI** | 9680 bytes; cards in prompt: true; refs: 0 |
| **ClaimsGenerated** | LIVE_UNMEASURED |
| **ClaimSupportFound** | LIVE_UNMEASURED |
| **ValidatorDecision** | LIVE_UNMEASURED |
| **FinalAnswer** | LIVE_UNMEASURED |
| **openaiCalled** | false |
| **finalAnswerAuthor** | n/a |
| **memoryBefore/After RSS** | 85 → 85 MB |
| **Notes** | LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable |

## Pipeline clearance (measured offline)

| Stage | Pass rate | Finding |
|-------|-----------|---------|
| A — Evidence exists | 8/9 | Only **holy** lacks a frozen card |
| B — Retrieved | 8/8* | *Among topics with assets; 100% retrieval |
| C — Sent to OpenAI | 8/8* | Cards + catalog in composer prompt JSON |
| D–G — Live compose/validate | **0/9 measured** | API key required |

**Retrieval is NOT the dominant failure** for 8/9 doctrine topics. Evidence packs (3.5–15 KB) reach the composer with cards, catalog chains, and scripture refs intact.

## Conclusion

| Measured distribution | Count |
|-----------------------|-------|
| **A** (evidence missing) | **1** — holy only |
| **B** (not retrieved) | **0** |
| **C** (not sent) | **0** |
| **D–G** (live stages) | **UNMEASURED** — 8 topics cleared A–C |

**Do not assume retrieval or evidence gaps are the root cause** for third heaven, kingdom, Acts 10, pork, Sabbath, death, resurrection, or Logos — those topics pass retrieval and prompt stages.

The **first unmeasured failure** for 8/9 topics occurs at or after OpenAI compose (D/E/F/G). Prior audits hypothesized D+F dominance; **live probe required to confirm distribution**.

```bash
export OPENAI_API_KEY=sk-...
node scripts/doctrineAuthorityFailureProbe.js
# Updates RootCauseDistribution.json with measured D/E/F/G counts
```

**Do not implement additional validators, cards, chains, or ingestion until live distribution is captured.**

**Probe artifact:** `docs/regression-trace/RootCauseDistribution.json`