# Phase 4N — Response Clarity, Companion Warmth, and Follow-up Routing Audit

**Date:** 2026-06-12  
**Scope:** Yes/no polarity, direct answers, validator leak fix, emotional Scripture warmth, kingdom-on-earth routing.  
**Constraints:** No corpus, doctrine packs, evidence cards, witness chains, or Phase 3 changes. No deploy or push.

---

## Root causes

### 1. Yes/no polarity bug
`buildDietaryLawFinalAnswer` used a warm opener **“Yes — staying with Scripture, pork remains unclean”**, which reads as permission when the user asked a permission question (`Can we eat pork?`). Warmth was applied without matching question polarity.

### 2. Validator leak
`applyClaimDegradation` in `claimToScriptureValidator.js` appended **“Scripture does not state that directly.”** whenever claim validation failed or forbidden patterns matched — even when the reply already cited approved witnesses (Leviticus, Deuteronomy, Isaiah, etc.).

### 3. Kingdom / heaven-on-earth routing
`DOCTRINE_CONTINUATION_PATTERNS` matched **“more scriptures”** in long Bible requests. With no `activeDoctrineTopic`, `immediateCompanionReply` fired the orphan message **“Which Bible topic would you like to continue?”** instead of routing to `kingdom` strict doctrine.

`doctrineTopicDetector` lacked **heaven on earth / man staying on earth / kingdom coming here** patterns.

### 4. Emotional companion warmth
Emotional turns had canned empathy but no optional Scripture for relationship hurt (e.g. love life crashing).

---

## Implementation

| Component | Change |
|-----------|--------|
| `services/directAnswerFormatter.js` | **New** — yes/no detection, polarity guard, validator leak suppression, witness counting |
| `services/doctrineFinalAuthorityEngine.js` | Dietary answers start with **No.** for yes/no questions; `buildKingdomOnEarthFinalAnswer` with 6 witnesses; `formatDirectDoctrineReply` on authority output |
| `services/doctrineTopicDetector.js` | `can we eat pork`, clarify patterns, `KINGDOM_ON_EARTH_PATTERNS` |
| `services/companionDoctrineRouter.js` | Orphan continuation only when no detected topic; love-life emotional + Psalm 34:18; fornication fallback with **No.** + 3 refs |
| `services/claimToScriptureValidator.js` | No denial append when Scripture support exists |
| `services/openAiFirstCompanionRuntime.js` | `polishFinalReply` applies formatter with message/topic/scripture |
| `scripts/runPhase4NResponseClarityRegression.js` | **New** — 8-case regression |

---

## Regression results

| Suite | Result |
|-------|--------|
| Phase 4N response clarity | **8/8 PASS** |
| Phase 4M companion routing | **15/15 PASS** |
| Phase 4H doctrine parity | **28/28 PASS** |

Reports: `Phase4NResponseClarityRegressionReport.md`, `docs/regression-trace/phase4n-response-clarity-results.json`

---

## Safe for controlled deploy?

**Yes** — with standard staging smoke:

- `Can we eat pork?` → **No.** + Leviticus / Deuteronomy
- Heaven-on-earth scripture request → kingdom witnesses, not orphan prompt
- Emotional turn → warm + optional Psalm 34:18
- No **“Scripture does not state that directly”** after supported doctrine answers
- Continuation after strict doctrine still works; after **stop** asks which topic

No commit, push, or deploy performed in this phase.
