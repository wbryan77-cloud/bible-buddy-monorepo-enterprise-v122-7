# 05 — Memory Root Cause Report

## Proven defects this execution

### MEM-V5-001 — Go deeper dumps wrong topic (Acts 10)
**Symptom:** After John 3:16, “Go deeper.” returned Acts 10 dietary witnesses.  
**Root cause:** `responseRevisionOwner` classified any prior scripture refs as `scripture` and always emitted dietary Acts 10 expansion.  
**Repair:** Context-aware scripture/explanation revision using prior reply + topic.  
**Validation:** local JD1 PASS.

### MEM-V5-002 — Forget incomplete
**Symptom:** “forget” clears preference/relationship stores but not continuation/doctrine/buddy-memory.  
**Status:** Documented residual (P1). Not fully repaired this cycle (privacy surface; needs careful product contract).

### MEM-V5-003 — Dual write continuation
Orchestrator early-exit + `finalizeBuddyResponse` both call `saveContinuationMemory`. Same store; ordered. Residual complexity, not proven production failure after recovery.

## Working capabilities (local + prior production)

- Immediate prior Q/A via `conversationContinuationMemory` keyed by `userId`
- Tell me more / go deeper continuation after identity (corpus A2/A3)
- Reference “verse we just discussed” resolved via OpenAI with memory context (probe)
