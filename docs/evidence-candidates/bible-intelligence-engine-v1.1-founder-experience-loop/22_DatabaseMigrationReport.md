# 22 — Database Migration Report

No Postgres schema migration required for v1.1 foundation.

Experience events and learning records persist as append-only JSONL under `data/founder-experience/` (same durable file pattern used elsewhere). Durable user memory remains Postgres `bible_buddy_documents` when `DATABASE_URL` is set.

Future optional promotion of the ledger into Postgres documents can follow the existing durable-document pattern without changing governance.
