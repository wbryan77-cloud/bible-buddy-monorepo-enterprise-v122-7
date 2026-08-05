# 02 — Migration And Compatibility Plan

No new database product. Reuse `bible_buddy_documents`. Document keys under `data/founder-experience/*.json`. File fallback when DATABASE_URL absent. No schema migration DDL beyond existing ensureSchema.
