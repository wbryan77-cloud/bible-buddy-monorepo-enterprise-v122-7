# Admin Queue Diagnostics — Phase 6E Part 6

Generated: 2026-07-19T09:43:56.839Z

> Known Verified State estimated ~100 pending candidates; this analyzer measured the real count: 475. Reporting the measured number, not the estimate.

- Total pending: 475
- By primary reason: {"WEAK_TOPIC_MATCH":448,"VALID_NEW_SCRIPTURE_RELATIONSHIP":27}
- By discovery source: {"IOG/ICOJ":475}
- By topic: {"prayer_comfort":14,"dietary_law":94,"sabbath":185,"death_state":100,"fornication_sexual_sin":13,"david":7,"kingdom":21,"abomination_desolation":9,"holy_spirit":17,"heavens":7,"marriage_bed":1,"repentance":4,"overwhelmed_comfort":1,"heartbreak_comfort":2}
- By rule outcome: {"NEEDS_HUMAN_REVIEW":472,"REJECT":3}
- Duplicate groups remaining: 0 (0 rows)
- Already approved elsewhere: 0
- Safely auto-approvable: 0
- Safely auto-rejectable: 0
- Genuine human-judgment candidates: 475
- False positives: 0

> Zero candidates are classified safelyAutoApprovable by design: services/knowledgeApprovalRulesEngine.js requires source to be on the internal TRUSTED_SOURCES allowlist to reach AUTO_APPROVE, and every IOG/ICOJ candidate is intentionally excluded from that allowlist (new-topic-relationship judgment always requires a human) — this is the Phase 6D governance contract working as designed, not a diagnostics gap.

## Oldest 10 Pending

- sgc_icoj_c468122ace65 (prayer_comfort) — age 343m — WEAK_TOPIC_MATCH
- sgc_icoj_a260173c3ca2 (dietary_law) — age 343m — WEAK_TOPIC_MATCH
- sgc_icoj_c29fd4baf8f4 (dietary_law) — age 343m — WEAK_TOPIC_MATCH
- sgc_icoj_6fa71549a375 (dietary_law) — age 343m — WEAK_TOPIC_MATCH
- sgc_icoj_0792e93ea618 (sabbath) — age 343m — WEAK_TOPIC_MATCH
- sgc_icoj_4c607e545c49 (sabbath) — age 343m — WEAK_TOPIC_MATCH
- sgc_icoj_0985f4bac4ee (sabbath) — age 343m — WEAK_TOPIC_MATCH
- sgc_icoj_87bdac1f85ec (sabbath) — age 343m — WEAK_TOPIC_MATCH
- sgc_icoj_2d8864d00e12 (death_state) — age 343m — WEAK_TOPIC_MATCH
- sgc_icoj_cdcda2e15eaf (death_state) — age 343m — WEAK_TOPIC_MATCH
