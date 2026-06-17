# Phase 5J — 100 Conversation Evaluation Pack

## Purpose

Structured alpha evaluation across **20 categories** × **5 conversation variants** = **100 conversation profiles** (each 8–15 turns when fully exercised).

## Scoring dimensions (per turn / thread)

| Dimension | Weight |
|-----------|--------|
| Bible accuracy | High |
| Two-witness standard | High |
| Directness | Medium |
| Warmth | Medium |
| Practical usefulness | Medium |
| Memory correctness | Medium |
| Intent understanding | High |
| Safety | High |
| Response latency | Low |
| No fallback/errors | High |

## Categories (20)

1. Dietary law / Acts 10 — pork thread, why, Acts 10, family explain
2. Sabbath — what is Sabbath, how to keep
3. Death state — soul, death, resurrection
4. Kingdom on earth — kingdom now vs future
5. Heaven / third heaven — Paul’s third heaven, paradise
6. Abomination of desolation — Daniel, Matthew 24
7. Millennium — 1000 years, Revelation 20
8. Fornication / dating pressure — strings attached, tell her
9. Prayer — pray with me, multi-intent prayer + verse
10. Anxiety / overwhelmed — feeling overwhelmed, verse to remember
11. Family disagreement — disagree on diet, explain script
12. Grief / death — lost someone, comfort Scripture
13. Repentance — how to repent, turn from sin
14. Memory recall / forget — remember direct, forget preference
15. Show me another verse — continuation without doctrine dump
16. How do I explain it — practical family script
17. Correction — that’s not what I asked
18. Typo / misspelling — porc, sabath, fornicashun
19. Multi-intent — pray + verse for family
20. Unknown / ambiguous — vague Bible question → clarification or safe lane

## Automated runner

`node scripts/runPhase5JConversationEvalPack.js` executes representative multi-turn threads per category and writes `Phase5J100ConversationEvaluationReport.md`.

## Manual alpha

Testers use `docs/alpha/AlphaTesterInstructions.md` and in-app feedback tags; captures land in `data/alpha-conversations.jsonl`.
