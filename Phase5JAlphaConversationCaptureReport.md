# Phase 5J Alpha Conversation Capture Report

**Date:** 2026-06-15

## Store

`data/alpha-conversations.jsonl` via `safeJsonlWriter`

## Fields Captured

testerId, sessionId, timestamp, userMessagePreview, buddyReplyPreview, intent, concept, scripturesUsed, answerLane, responseTimeMs, openAiCalled, strictDoctrineUsed, memoryUsed, fallbackUsed, errorCode

## Hook

`routes/buddy.js` → `captureAlphaTurn()` after successful chat for active alpha testers.

## Bounds

- Preview chars: 500 (configurable)
- Retention trim: 30 days / max lines
- File rotation: 5MB via safeJsonlWriter

## Load Smoke

680+ turns captured across simulated cohorts without unbounded growth failure.

## Verdict

Automatic capture **operational** with privacy defaults.
