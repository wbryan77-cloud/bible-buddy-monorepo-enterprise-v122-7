# 27 — Admin Workflow Validation

- Learning records surface as `founder-experience:*` Decision Queue items
- approve/reject/defer call `transitionLearningRecord` + audit trail
- Approval explicitly sets `productionMutation=false` / `evidenceActivated=false`
- BibleBuddy cannot invoke Admin mutation routes (admin auth required)
