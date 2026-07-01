# Contradiction Logic Reset Report

**Phase:** Simplification Reset Part A
**Date:** 2026-06-09T05:05:04.822Z

Contradiction machinery demoted or removed from automatic admin decision flow.

| ID | Location | Status |
|----|----------|--------|
| contradiction_score_penalty | scriptureDiscoveryGenesisRevelation.computeCoverageScore | removed |
| contradiction_auto_reject | scriptureDiscoveryGenesisRevelation.recommendAction | removed |
| contradiction_auto_hold | scriptureStrengthReview.mapRecommendedAction | removed |
| caution_score_penalty | scriptureStrengthReview.buildScoreExplanation | removed |
| contradiction_score_penalty_explanation | scriptureStrengthReview.buildScoreExplanation | removed |
| interpretation_conflict_issues | scriptureResearchReviewConsole.detectIssues | disabled |
| potential_contradiction_issues | scriptureResearchReviewConsole.detectIssues | disabled |
| pack_hold_on_contradictions | topicApprovalPacks.recommendedPackAction | removed |
| batch4_contradiction_exclusion | implementationValueScore.buildBatch4CandidatePool | removed |
| third_batch_contradiction_filter | scriptureRelationshipConsolidation.buildThirdBatchPool | removed |
| green_yellow_red | admin review model | retired (2J-Q) |
| classification_labels_interpretation | scriptureStrengthReview.CLASSIFICATION_LABELS | retired |

**Caution scriptures:** visible as informational notes only — no auto-block, no score penalty.

