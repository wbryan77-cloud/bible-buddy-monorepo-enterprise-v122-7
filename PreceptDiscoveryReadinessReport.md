# Precept Discovery Readiness Report

**Phase:** 2H Part E — audit only (no discovery implementation)

---

## supportGraphCandidateQueue evaluation

| Control | Status |
|---------|--------|
| Auto-apply | **Disabled** (`autoApplied: false`) |
| Review required | **Yes** (`reviewRequired: true`, `status: pending_review`) |
| Affects live answers | **No** — queue is append-only JSONL |
| Doctrine mutation | **Blocked** — candidates never enter APPROVED_SUPPORT_EDGES without admin |

---

## Answers

1. **Can candidate discovery run safely?** Yes in **shadow/pilot** mode — enqueue only, no promotion.
2. **Controls preventing doctrine drift?** Frozen cards, approval gate, `approved: true` edge flag, no auto-promote, ownership hard cutover.
3. **Approval workflow required?** Admin review → manual edge promotion → regression → readiness check.
4. **Candidates without affecting answers?** Yes — `proposeCandidateFromUnverifiedClaim` writes queue only.
5. **Readiness before activation?** **≥95 readiness V5** + Class C inventory <10 on doctrine topics + 0 ownership violations.

**Pilot recommendation:** Enable enqueue-only at readiness **≥90**; activation at **≥95**.
