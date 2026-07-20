# PHASE 6F — PART 10: Food and Health Stewardship Readiness

## Verdict: NOT ALPHA-READY — correctly OFF, zero impact on core chat

## Audit findings

| Capability | Status | Evidence |
|---|---|---|
| Barcode scan | **NOT IMPLEMENTED** | No route, service, or client code found referencing barcode scanning. |
| OCR label upload | **STUB ONLY** | `lib/ocr/index.js` returns a hardcoded literal (`'WATER, SALT, SPICES'`) regardless of input — confirmed unchanged since Phase 5T inventory. **Not wired to any route or service** — `grep` across `routes/*.js` and `services/*.js` found zero callers. It cannot affect a live request because nothing calls it. |
| Manual ingredient paste | **NOT IMPLEMENTED** | No route or UI found. |
| Open Food Facts adapter | **NOT IMPLEMENTED** | No client/adapter code found; licensing was independently verified in Part 7 (ODbL, commercial use permitted) in case this is built post-Alpha, but no code exists yet. |
| Ingredient normalization | **NOT IMPLEMENTED** | N/A — no upstream data source. |
| Biblical dietary classification | **NOT IMPLEMENTED** as a food-scanner feature | Note: Scripture's own clean/unclean teaching (Leviticus 11, Acts 10) is already answerable through the normal Scripture-companion path (doctrine topic `dietary_law`) — that is a Bible-answer capability, not a food-scanning feature, and is unaffected by this finding. |
| Chemical/additive flags | **NOT IMPLEMENTED** | N/A |
| Allergens | **NOT IMPLEMENTED** | N/A |
| Nutrition facts | **NOT IMPLEMENTED** | N/A |
| Explain-why-flagged | **NOT IMPLEMENTED** | N/A |
| Medical disclaimers | **NOT APPLICABLE YET** | No feature exists to disclaim. |
| Health data (Apple HealthKit / Android Health Connect) | **NOT IMPLEMENTED** | `services/autonomousCompanion.js` contains one placeholder string (`'future_healthkit_healthconnect'`) marking a future signal source, never read from a real device API. `public/index.html` contains one sentence of forward-looking marketing copy ("Apple HealthKit and Android Health Connect can support wellness insights with permission...") — this is informational text, not a working integration, and does not collect, store, or transmit any health data today. |

## Required category separation (for when/if this is built)

Per the batch's instruction, any future implementation must keep these
categories distinct rather than blending them into one undifferentiated
"food advice" response:

- `BIBLICAL_DIETARY_CLASSIFICATION` — what Scripture calls clean/unclean (already answerable today via the existing Scripture-companion path, independent of any scanner).
- `GENERAL_NUTRITION_INFORMATION`
- `ALLERGEN_INFORMATION`
- `INGREDIENT_CONCERN`
- `MEDICAL_GUIDANCE_NOT_PROVIDED` — explicit, permanent disclaimer category; never recommend stopping medication, never diagnose, never assert a product record as fact when absent or ambiguous.

This structure is documented now so a future implementation has a clear,
governed contract to build against — no code implements it yet, and none
should be added in this batch (default position: feature-flagged off,
not a Founder Alpha blocker).

## Confirmed: zero impact on core chat

- `lib/ocr/index.js` has no caller anywhere in `routes/` or `services/` — dead code, not on any request path.
- No food/nutrition/health route exists in `routes/` to disable — there is nothing live to feature-flag off; the feature is simply absent, which is the safest possible "off" state.
- The one `HealthKit`/`Health Connect` mention in `public/index.html` is static descriptive text with no backing API call — confirmed it does not request device permissions or transmit data.
- Regression suites run throughout this batch (`scriptureFidelitySmoke`, `alphaCoreTruthSmoke`, `decisionOwnershipSmoke`, `phase6eTestMatrix`, `phase6cHistoricalKnowledgeSmoke`) all pass, confirming the core Scripture/companion path is fully unaffected by this feature's absence.

## Exact work remaining (if pursued post-Alpha)

1. Choose and implement a real OCR provider or replace the stub with genuine text extraction (Tesseract.js or a cloud OCR API — cost/licensing to be re-evaluated at that time, same discipline as Part 7).
2. Build the Open Food Facts adapter behind a feature flag (`PILOT_BEHIND_FLAG` per Part 7), respecting ODbL attribution + share-alike.
3. Implement the five-category response separation above, with `MEDICAL_GUIDANCE_NOT_PROVIDED` as a non-optional disclaimer block on every response.
4. Add consent, deletion, and auditability for any uploaded label/photo before any user-facing rollout.
5. Health integration requires native platform work (HealthKit/Health Connect entitlements + consent UI) that does not exist yet — defer until a specific, consented feature is scoped.

## Conclusion

Food and health stewardship features are correctly **OFF** for Founder
Alpha, require no action to keep off, and have zero measurable effect on
the core Scripture-companion experience. This satisfies the batch's
acceptance gate ("Food/health features are either safely bounded or off")
via the safer of the two options: off, with the remaining work explicitly
documented rather than silently missing.
