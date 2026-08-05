# 01 — Repository Usage

## UNUSED / DEAD_CODE (legacy runtimes)
`masterBuddyRuntime`, `reasonFirstBuddyRuntime`, `reasonFirstLiteRuntime`, `shadowReasonFirstRuntime`, `bibleBuddyLiteRuntime`, `companionConversationExperimentRuntime` — bypassed at `buddyBrain.runBuddy` hard-cut to OpenAI-first. **Do not delete in this sprint** (scripts/tests may reference); consolidation deferred as non-blocking cleanup.

## DUPLICATE / COMPETING
Multiple memory writers coexist (durable + relationship + session/continuity). Durable Postgres is authoritative for user memory; others are supplementary. Smallest consolidation: keep durable owner; do not add new memory stores.

## SHADOW (by design)
Discovery, recommendations, Mission Control aggregation — correctly nonmutating.

## Immediate repair this sprint
False correction hijack (`answer yes or no` → revision owner) + chronology detector over-match on satan/thousand-years — fixed in existing owners.
