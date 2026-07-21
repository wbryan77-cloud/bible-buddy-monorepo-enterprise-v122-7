# Phase 5J Alpha Tester Onboarding Report

**Date:** 2026-06-15

## Flow

1. Admin creates invite → `POST /admin/api/alpha/invites`
2. Tester opens `/alpha?token=...`
3. Intake form + consent + NDA checkboxes
4. `POST /api/alpha/onboard` → `testerId` stored in `data/alpha-testers.json`
5. `POST /api/alpha/session/start` → chat enabled
6. Chat via `/buddy/chat` with automatic capture for active alpha testers

## Intake Fields

name, emailOrPhone, ageRange, role, deviceType, timeZone, bibleFamiliarity, testFocus, notificationPreference, consentAccepted, ndaAccepted

## Gate

Chat capture and feedback require `isActiveAlphaTester()` — consent + NDA + active flag.

## Verdict

Onboarding + consent gate **operational**.
