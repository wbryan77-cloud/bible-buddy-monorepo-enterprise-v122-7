# Bible Authority Readiness Score V2

**Date:** 2026-06-07  
**Overall: 76 / 100**  
**Push target: 85+** — NOT MET  
**Expansion target: 95+** — NOT MET

---

## Scoring breakdown

| Category | Weight | Score | Max | Notes |
|----------|--------|-------|-----|-------|
| Evidence coverage | 15 | 12 | 15 | 11/12 topics retrieve cards; holy gap |
| Claim validation (offline) | 15 | 15 | 15 | 9/9 fixtures |
| **Support verification** | 15 | 14 | 15 | Citation≠support fixed Phase 1B |
| Doctrine traceability matrix | 15 | 14 | 15 | Full schema + trace integration |
| Approval gate effectiveness | 10 | 9 | 10 | Regen + degrade + decision field |
| Render stability | 10 | 10 | 10 | Offline verified |
| **OpenAI happy-path (live)** | 20 | **0** | 20 | **BLOCKED — no API key** |

**Total: 76 / 100** (+14 vs V1 score of 62 from citation support + traceability)

---

## Category detail

### Evidence coverage (12/15)

- ✅ heavens, kingdom, death, dietary, sabbath, feasts, logos, ascension, cannot-come
- ❌ holy generic word study
- ⚠️ logos chain incomplete

### Support verification (14/15)

- ✅ Ref-specific denial rules (2 Cor 12:2, Matt 6:10, Acts 10, John 3:13, John 13:33, Lev 11)
- ✅ Removed auto-B on citation mention
- ⏳ Live OpenAI compliance unproven

### OpenAI happy-path (0/20)

Requires:

```bash
export OPENAI_API_KEY=sk-...
node scripts/baePhase1bValidation.js
# expect summary.allPass: true
```

---

## Readiness by gate

| Gate | Required | V2 Status |
|------|----------|-----------|
| Claim validation passes | Yes | ✅ offline |
| Unsupported claims blocked | Yes | ✅ offline |
| Citation≠support blocked | Yes | ✅ offline |
| Render stable | Yes | ✅ |
| Live allPass | Yes | ❌ |
| IOG admin-only | Yes | ✅ |
| Push | 85+ | ❌ 76 |
| Large expansion | 95+ | ❌ |

---

## Path to 85 (push-ready)

| Action | Points |
|--------|--------|
| Live `baePhase1bValidation.js` allPass | +18 |
| claims[] populated on 12/12 live tests | +4 |
| Staging Render smoke | +3 |

## Path to 95 (expansion-ready)

| Action | Points |
|--------|--------|
| Above + holy thin-evidence policy proven live | +5 |
| Logos chain wired (if admin approves catalog entry) | +3 |
| IOG pilot 3 lessons cross-checked (manual) | +5 |
| 30-day staging stability | +6 |

---

## Authority system verdict

Phase 1B solves the **system-level** citation ≠ support failure. The authority engine can now:

1. Extract claims (compose JSON)
2. Judge claim text against cited Scripture
3. Reject unsupported/contradicted claims
4. Produce traceability matrix per turn
5. Degrade with canonical denial phrase

**Remaining blocker is operational:** live OpenAI validation, not architecture.

**Do not push. Do not deploy. Do not ingest IOG at scale.**
