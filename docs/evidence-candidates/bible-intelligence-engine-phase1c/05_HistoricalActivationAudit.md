# 05 — Historical Activation Audit

**First failing stage (pre-repair):** `currentMessageIntent` HISTORY_RE too narrow + pack never called provider.

**Repair:** broaden history intent; `buildGovernedHistoryAttachment` wires `historicalKnowledgeProvider` (productionEligible only).

| Question | History | Governed | Sunday chain |
|---|---|---:|---|
| Why do Christians celebrate Sunday? | true | 0 | true |
| What was the transatlantic slave trade? | true | 0 | false |
| What happened to Jerusalem under Rome? | true | 4 | false |
| What Hebrew word is translated forever in Leviticus 23? | false | 0 | false |
| Explain the Sabbath. | false | 0 | false |
| Does Acts 10 abolish dietary law? | false | 0 | false |
| What does Deuteronomy 28:68 explicitly say? | false | 0 | false |
| Explain the history behind Sunday worship. | true | 1 | true |

Irrelevant doctrine asks (Explain the Sabbath) remain history=false.
Phase 5D books remain inactive (freeze / missing bodies).
