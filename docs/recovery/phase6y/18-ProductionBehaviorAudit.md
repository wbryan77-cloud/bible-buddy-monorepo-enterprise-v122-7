# 18 — Production Behavior Audit (Phase 6Y)

**Tip:** `741084f`

## Behavior matrix

| Domain | Observed production behavior | Status |
|---|---|---|
| Bible study / explicit refs | `bible_wide_reasoning` quotes KJV (John 1:1, 3:16) | PASS |
| Scripture interpretation | Doctrine final authority on sabbath/death_state; silence honesty on Matt 28 timing | PASS |
| Prayer | Prayer companion lanes; warm Amen close | PASS |
| Encouragement / daily talk | OpenAI companion listens; asks follow-up | PASS |
| General knowledge | Paris, photosynthesis, gravity, Lincoln → `reason_first_openai`, no clarifier | PASS |
| Historical WHO-changed | Pre-fix: doctrine template FAIL → Post-fix: history content via OpenAI | PASS |
| Mixed Bible/history | Sunday not commanded; Scripture vs later practice | PASS |
| Original language | Greek agape John 3:16 lane | PASS |
| Follow-up / pivot | Sabbath → John 1:1 current-message wins | PASS |
| Corrections | Restate + acknowledge | PASS |
| Multi simultaneous | Paris + Genesis 1:1 both answered | PASS |
| Short turns | Amen answered | PASS |
| Memory | Favorite verse recall works; suite intermittent at 10-turn once | PASS w/ residual |
| Clarifier | Only unknown-bible / ambiguous non-fact (e.g. FTC Z1) | PASS by design |

## Architecture protection

Auth, streaming, memory ownership model, claim verifier, and certified runtime path were not replaced. Changes were extend/repair only.
