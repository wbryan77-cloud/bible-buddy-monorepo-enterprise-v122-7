# 01 — Durability And Storage Audit

v1.1 gap: experience events + learning records were local JSONL under `data/founder-experience/` (gitignored), not `bible_buddy_documents`.

v1.1A fix: `founderExperienceDurableStore` dual-writes via existing Postgres document adapter with transactional `updateJsonDocument`.
