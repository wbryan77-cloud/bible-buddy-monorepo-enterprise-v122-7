# Phase 4F Render Manual Smoke Plan

Run on Render browser UI after deploy (not before local verification).

## Preconditions

- `OPENAI_API_KEY` set for non-doctrine companion turns
- Optional: `BUDDY_LIVE_TRACE=1` for trace review
- Check `GET /api/runtime-health` returns `ok: true`

## Tests (exact prompts)

| # | Prompt | Expected |
|---|--------|----------|
| 1 | What does Acts 10 mean? | Exact Acts 10:28 wording; people/Gentiles not food permission |
| 2 | Why are you saying primarily? | "You are right. I should not use 'primarily.'" + Acts 10:28 |
| 3 | Acts 10 means food is clean. | Rejection; Acts 10:28; no food permission |
| 4 | Show me another verse. ×10 | Approved witnesses only; exhaustion message at end; no random verses |
| 5 | What happens when a person dies? | Dead know nothing / sleep; no soul continues, Luke 16, 2 Cor 5:8 |
| 6 | Show me another verse. ×10 | Death_state witnesses; no drift verses |
| 7 | Can you remember what we were talking about? | Recalls active topic; no "I cannot remember" |
| 8 | Before that? | Recalls previous topic |
| 9 | Set `BIBLEBUDDY_DISABLE_OPENAI=1`, repeat Acts 10 + continuation | Strict doctrine still answers locally |
| 10 | Full session 15+ turns mixed | No manual redeploy; no "AI service unavailable" |

## Pass criteria

- 0 hedge phrases (primarily, mainly, while, Jewish dietary law)
- 0 internal diagnostic strings in UI
- 0 service-unavailable loops
- `/api/runtime-health` errors count stable (not climbing per session)

## Rollback signal

If any test shows OpenAI hedge language on strict doctrine → stop; do not promote build.
