# 19 — Empty Production Queue Root Cause

**Timestamp:** 2026-08-12  
**Snapshot:** `data/bb-admin-production-readonly-snapshot.json`  
**SHA at diagnosis:** `16f1e47` (pre-repair tip; hydrate repair is local until committed/deployed)

## Executive diagnosis

Production `GET .../decision-queue` returning **HTTP 200 + `total: 0` + `items: []`** is **real**, not a parser defect (`bytes: 112` matches an empty envelope).  

The Decision Queue federates **gitignored instance-local `data/` JSON/JSONL**. Render does not ship local `data/` and disk is ephemeral. Local hundreds of queue rows were never production state.

Target `founder-experience:8d1e5cca-9edf-4995-9907-238903166163` is **local/evidence provenance only** (EVIDENCE-PROVENANCE defect). It was never present in the authenticated production snapshot (`wantRow: null`, learning `targetHitCount: 0`, audit defer hits `0`).

## Repair implemented (canonical owners)

1. `learningRecordStore.hydrateLearningRecordsFromDurableIfNeeded` — recover JSONL from durable dual-write after redeploy  
2. `server.js` boot calls hydrate (no new subsystem)  
3. Operator preflight logs `queueTotal` / `emptyStore`  
4. Certify labels queue semantics `local_only`; adds hydrate + empty-source contract tests  

## Not fixed in this pass (explicit)

- File-only stores without durable dual-write (support-graph, founder-intelligence index, audit JSONL, overlay) remain ephemeral on Render  
- Production DEFER of the local wantId is **NOT_REQUIRED_AFTER_ROOT_CAUSE** until a **production-native** candidate exists  
