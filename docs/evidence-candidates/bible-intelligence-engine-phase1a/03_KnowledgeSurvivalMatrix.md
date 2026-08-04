# 03 — Knowledge Survival Matrix (BIE Phase 1A)

Statuses: `CONNECTED` · `CONNECTED_BUT_UNUSED` · `PARTIAL` · `INDEXED_ONLY` · `DISCONNECTED` · `UNKNOWN`

| Source | Status | Evidence |
|---|---|---|
| KJV | CONNECTED | Scripture refs + text on evidence pack → composer |
| Study Chains | PARTIAL | Offline ledgers remain; **live adapter now builds ephemeral chain** for packet — not loading durable VERIFIED ledger rows into pack |
| Lesson Engine | PARTIAL | Called live by adapter (`assembleLessonFromStudyChain` / `buildVerifiedLessonPacket`); engines themselves frozen / unchanged |
| Verified Lesson Packet | CONNECTED | Attached nested → slim → system prompt → OpenAI messages |
| Evidence Cards | CONNECTED | Pack → slim → composer (pre-existing) |
| Historical Layer | PARTIAL | Pack history / parse path; not full Phase 5D provider; frozen corpus |
| Original Language | PARTIAL | Hints / semantic flags only; not full OL packet authority |
| Relationship Graph | INDEXED_ONLY | approved-book-relationships not selected into chat pack |
| Topic Graph | PARTIAL | Topic selection on pack; witness registry used inside adapter chain eval |
| Support Graph | INDEXED_ONLY | Candidates JSONL frozen; admin path only |
| IOG | DISCONNECTED | Governed ingest offline / NEEDS_ADMIN_REVIEW; not production-activated into pack |
| ICOJ | DISCONNECTED | Same — offline candidates; citation gaps frozen |
| Three approved books (Phase 5D corpus) | DISCONNECTED | Frozen candidate ledger; not production-activated |
| Founder-approved corrections | PARTIAL | Correction ledger / prefs on pack when present |
| Founder companion learnings | PARTIAL | Pins / prefs / doctrine contracts constrain compose |
| Durable Memory | PARTIAL | Prod durable disk gaps remain (prior inventory) |
| Conversation Memory | CONNECTED | Thread / recent sessions / semantic understanding on pack |

## Delta vs Phase 1 matrix

| Source | Phase 1 | Phase 1A |
|---|---|---|
| Lesson / VLP | DISCONNECTED (adapter missing) | CONNECTED (runtime attach) |
| Study Chains | DISCONNECTED from runtime | PARTIAL (ephemeral build for packet only) |
| Lesson Engine | Offline-only | PARTIAL (invoked, not modified) |

## Still not solved by this adapter

- Loading durable VERIFIED study-chain ledger rows into production
- Activating IOG/ICOJ/Phase 5D books under governance
- Wiring relationship / support graphs into retrieval pack
- Proving model *obedience* to packet contract in live OpenAI turns (next: Live Production Validation)
