# 97 — Durable Memory Contract

Implemented in `services/durableUserMemory.js`.

## Types

`IDENTITY`, `IMPORTANT_PERSON`, `FAMILY_RELATIONSHIP`, `PRAYER_SUBJECT`, `ACTIVE_BURDEN`, `RESOLVED_BURDEN`, `SPIRITUAL_GOAL`, `ONGOING_STUDY`, `USER_PREFERENCE`, `ACCEPTED_CORRECTION`, `ONGOING_TOPIC`, `TEMPORARY_CONTEXT`, `DO_NOT_RETAIN`

## Confidence

`CONFIRMED` · `HIGH` · `MEDIUM` · `LOW` · `UNKNOWN`

## Provenance

`CURRENT_TURN` · `CURRENT_CONVERSATION` · `PRIOR_CONVERSATION` · `USER_CONFIRMED_MEMORY` · `SYSTEM_DERIVED_SUMMARY`

## Record fields

memoryId, userId, memoryType, subject, relationship, content, normalizedValue, status, confidence, provenance, createdAt, updatedAt, lastConfirmedAt, retentionScope, consentStatus, sensitivityLevel, isActive, supersedesMemoryId, deletedAt

Schema SQL: `fixtures/bible_buddy_documents.sql`
