# Phase 4F Doctrine Drift Audit

Generated: 2026-06-11

## Live path (verified)

```
POST /buddy/chat
  routes/buddy.js → withBuddyChatGuarantee(timeout + fallback)
    → runBuddy → openAiFirstCompanionRuntime
      → runStrictDoctrineGate (FIRST)
        → ensureStrictDoctrineOnPack (session-bound turns lock active topic)
        → tryDoctrineLivePathHandlers
        → doctrineFinalAuthorityEngine
        → doctrineWitnessInventory
        → doctrineStrictPhraseGuard
      → mustBlockOpenAi → blocks composeReasonFirstReply
      → returnStrictDoctrineStructured
        → applyDoctrineFinalityPipeline (phrase guard + firewall + session)
    → applyDoctrineErrorFirewall (outbound JSON)
```

## Audit questions

| # | Question | Finding | Phase 4F fix |
|---|----------|---------|--------------|
| 1 | Strict initial reaches `composeReasonFirstReply`? | **Blocked** when `mustBlockOpenAi()` true; gate returns before compose | Session-bound + detector hardening |
| 2 | Strict continuation reaches OpenAI? | **Blocked** via live handlers + witness inventory | `isSessionBoundStrictTurn` locks active topic |
| 3 | Guard regen calls OpenAI for strict? | **Blocked** — regen uses `buildFinalAuthorityAnswer` when `mustBlockOpenAi` | Already in 4E; verified |
| 4 | Fallback calls OpenAI after gate fails? | **Blocked** — authority/safe local fallback | `responseGuarantee` emergency strict reply |
| 5 | Phrase guard after response sent? | **No** — runs in gate `finalizeStrictStructured` and `applyDoctrineFinalityPipeline` before route returns | Finality pipeline |
| 6 | Acts 10 / death_state indirect phrasing fails? | **Was weak** — limited regex in `resolveStrictTopic` | `doctrineTopicDetector.js` with 40+ live patterns |
| 7 | Session-bound turns bypass gate? | **Could** — correction on active topic might re-detect wrong topic | `sessionBoundTurn` forces `activeDoctrineTopic` |
| 8 | Correction-memory bypass strict handling? | **No** — `tryDoctrineLivePathHandlers` handles corrections | Session lock prevents topic drift |
| 9 | `activeDoctrineTopic` lost between requests? | **Risk** if state file write throws | Safe `saveAll` + TTL trim; persists on every finality pipeline |
| 10 | Non-strict route classifies strict as companion? | **Possible** for vague messages without patterns | Expanded detection; active session recovery |

## Hard rule compliance

For strict topics (`acts_10`, `dietary_law`, `death_state`, `sabbath`, `kingdom`, `resurrection`, `holy_spirit`, `david`, `new_jerusalem`):

- Conclusion: **local** (`doctrineFinalAuthorityEngine`)
- Witnesses: **local** (`doctrineWitnessInventory`)
- OpenAI: **bypassed** (`strictDoctrineGate` + `mustBlockOpenAi`)
- Phrase guard: **pre-outbound** (`doctrineStrictPhraseGuard`)
- Firewall: **pre-outbound** (`doctrineErrorFirewall`)
- Session: **updated** (`applyDoctrineFinalityPipeline`)

## Remaining bypass risks (low)

1. **Brand-new session, vague message** — e.g. "tell me more" with no active topic → non-strict companion path (acceptable).
2. **Topic switch mid-session** — explicit new doctrine question may change topic (intentional).
3. **OpenAI enabled + non-strict companion** — still uses OpenAI (by design).

## Regression

Phase 4F combined stability: **1352/1352 PASS** (strict doctrine OpenAI calls: 0).
