# Founder Alpha Controlled Testing Plan

**Status:** Production is live at `biblebuddy-intelligence-platform-phase3-v1.0.0` (commit `94db29e`). This plan governs the first controlled exposure of real testers.

## Readiness status

**READY FOR CONTROLLED FOUNDER ALPHA**, with one disclosed, monitored, pre-existing known limitation (below) — not a new defect introduced by this release.

## Recommended tester group size

**5–10 testers** for the first wave. Small enough that the Founder can personally read every transcript and every escalation; large enough to surface real variation in phrasing/behavior beyond what deterministic test scripts cover.

## Recommended test duration

**2 weeks** for wave 1, with a go/no-go checkpoint at day 7. Extend to a larger wave only after the day-14 review.

## User-consent requirements

- Explicit opt-in disclosure that this is a pre-release Alpha build, conversations may be reviewed by the Admin/Founder for quality and support purposes (aggregated statistics + support escalations only — per Deliverable 4's Shared-vs-Private Memory Matrix, raw conversation content stays scoped to that tester's own session and is not surfaced to Admin AI, but a human Founder reviewing a specific escalation the tester raised is expected and should be disclosed).
- Disclosure that this is a companion/support tool, not a substitute for pastoral or professional care, and that spiritual/doctrinal answers are Scripture-referenced but the tool can still make operational (non-doctrinal) mistakes.
- A way to withdraw at any time with data deleted on request.

## Privacy boundaries

- Testers are identified by a tester ID, not scraped from personal accounts.
- Per Deliverable 4: no cross-tester data bleed by design (session/memory stores are keyed strictly by userId).
- Known limitation to disclose internally (not to testers as a privacy notice, but as an Admin operating constraint): `userId` is client-asserted with no server-side identity binding today. For a small, known, consented Alpha group this is an acceptable, disclosed risk; it should be revisited before any wider/public rollout.

## Feedback workflow

Testers submit feedback in-app via the existing User Assistance escalation path → lands in the unified Decision Queue → Founder reviews via `POST /unified/assistant` ("what's happening with my Alpha testers today?") or directly via `GET /unified/decision-queue`.

## Support escalation workflow

Unresolved tester questions escalate automatically via `userAssistanceEscalationStore.js` → visible in the Decision Queue with `sourceSystem: user-assistance` → Founder resolves directly or delegates; resolution outcome feeds `recommendationLearningEngine`'s approval-rate tracking for that source over time.

## Incident-response workflow

1. Anomaly/degradation detected (automatically, via `productionAnomalyDetector` / `runtimeHealthMonitor`) or reported by a tester.
2. Founder checks `GET /unified/enterprise-intelligence` for consolidated health/anomaly/release status.
3. If severity is HIGH: pause new tester traffic (informal — no kill-switch exists today; recommend the Founder be ready to message the small tester group directly given the size of wave 1) and address before continuing.
4. Every incident logged in the audit trail regardless of resolution path.

## Daily Admin briefing format

Use the existing `POST /unified/assistant` with a question like *"What happened today?"* / *"What needs my attention?"* — returns a grounded summary + evidence + confidence + `requiredApproval` flag, exactly as verified in Deliverable 11. No new format needed; this is the existing Chief of Staff contract, now additionally covering release/health/dev-debt/anomaly questions.

## Weekly learning and improvement report

Pull `GET /unified/enterprise-intelligence` once per week: Operational Health Score trend, Release Readiness trend, Developer Intelligence findings, and `recommendation-learning` approval-rate-by-source. This is a read-only report — no automatic action is taken from it.

## Success metrics

- Escalation resolution time (from Decision Queue timestamps).
- Operational Health Score staying in the A/B range across the Alpha window.
- Release Intelligence returning GO or CAUTION (not BLOCK) for any candidate follow-up release during the Alpha window, absent the known pre-existing item below.
- Zero doctrinal/Scripture-fidelity regressions (`scriptureFidelitySmoke` / `alphaCoreTruthSmoke` must stay at 100% for any code touched during the Alpha window).

## Stop conditions

- Any HIGH-severity anomaly alert with user-facing impact.
- Any doctrinal/Scripture-fidelity regression (0% tolerance — any single new failure in `scriptureFidelitySmoke`/`alphaCoreTruthSmoke` stops the Alpha immediately pending fix).
- Escalation volume or unresolved-escalation backlog growing faster than the Founder can review within 48 hours.
- **Named, disclosed watch item:** if the Phase 5O-style continuation issue (vague short follow-ups occasionally triggering a generic clarification instead of continuing context) is reported by more than 1 in 5 testers as noticeably disruptive, treat that as a stop condition for wave 2 expansion (not necessarily wave 1 termination) pending a scoped fix to companion-continuation routing — explicitly out of scope for this release but a legitimate fast-follow engineering ticket.

## Rollback conditions

- Any stop condition above that cannot be mitigated within 24 hours → revert production to the pre-Alpha release commit (`7429f1c`, still tagged in git history) via a new deploy of that commit; this is a standard `git`/Render redeploy, not a data rollback (no database migrations shipped in this release, so there is no destructive-migration rollback risk).
- Governed learning loop guarantee: even under rollback, no doctrine/production content was ever auto-mutated by anything in this release, so a code rollback alone is sufficient — there is no learned-state to also roll back.
