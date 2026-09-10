# Issue #11 — Chief Recovery Checkpoint

Date: 2026-09-10
Goal: GOAL-BB-ISSUE11
Branch: `chief/issue-11-recovery-20260910`

## Purpose

This non-production branch is the controlled recovery path for Issue #11 after repeated priority drift into unrelated research artifacts. It does not authorize production deployment, doctrine changes, source-promotion changes, or issue closure.

## Known-good baseline

Branch created from commit `1b4609a8549c0b5fed659f18b97573cda2497095`.

## Acceptance sequence

1. Inventory the existing resource upload/metadata UI and route.
2. Prove the existing resource review service/API end-to-end, including note/review/approval behavior and no automatic ingestion/promotion.
3. Search for existing OCR/transcript extraction ownership. If absent, add only a provider-neutral interface behind the existing human-review gate.
4. Crosswalk original Issue #11 testing/quality metrics against current Admin Command Center, runtime health, alpha feedback, and Founder Experience Loop; add only genuine gaps.
5. Run targeted acceptance test #1 and preserve evidence.
6. Run targeted acceptance test #2 and preserve evidence.
7. Run full regression.
8. Perform safe live acceptance verification where available, then rerun regression.
9. Assemble evidence packet. Issue #11 remains open until all required acceptance evidence is directly verified.

## Anti-drift gate

Until the above sequence reaches a valid stop condition, unrelated BookBuddy, grief/loss, Holy Testaments, source-scavenging, workbook, or Q&A-candidate work does not count toward this goal and must not replace Issue #11 execution.

## Next executable step

Inspect the current repository for the concrete files/routes/services implementing resource upload/review and record the exact owner paths plus the smallest targeted test that proves metadata submission and human-review/no-auto-promotion behavior.
