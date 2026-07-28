# 99 — Memory Consent and Lifecycle

| Action | API |
|---|---|
| Capture / upsert | `upsertMemory` |
| Resolve burden | `resolveBurden` |
| Soft delete | `softDeleteMatching` / `clearAllForUser` |
| Hydrate (request) | `ensureHydrated` |
| Persist | `flushUser` |

Consent: `user_requested` vs `implied_conversation`. Long-term retention preferred when user says “please remember”.

No admin/governance language in Companion chat (unchanged 7A/7B polish).
