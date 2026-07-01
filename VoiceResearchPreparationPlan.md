# Voice Research Preparation Plan

**Phase:** 2J-P Part F
**Date:** 2026-06-09T01:55:40.377Z

## Design layer

```
Voice → Text → Research Command → Research Console
```

Voice support remains **optional**. No production impact.

## Sample voice → console routing

### "Show me every Sabbath chain"

- Command: `topic_chains`
- Status: structured
- Console route: Scripture Research & Review Console

### "Find more scriptures for Logos"

- Command: `find_witnesses`
- Status: structured
- Console route: Scripture Research & Review Console

### "Merge Death State and Resurrection"

- Command: `merge_topics`
- Status: structured
- Console route: Scripture Research & Review Console

### "Show me candidates above 95"

- Command: `unparsed`
- Status: needs_manual_mapping
- Console route: Scripture Research & Review Console

## Implementation notes

- Speech-to-text handled externally (not in scope for 2J-P)
- `parseVoiceToResearchCommand()` normalizes transcript to research command
- All voice-initiated research remains review-only
- Human approval required before any staging or promotion
