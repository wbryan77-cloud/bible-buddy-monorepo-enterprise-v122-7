# 07 — Engineering Retrospective Update

## Why this defect occurred
Append-only JSONL was treated as the read model while Admin state lived in a separate index/durable overlay. Recommendation suppression hashed a different field set than package identity.

## Why previous implementations missed it
Happy-path tests asserted transition return values and soft `typeof suppressed === 'number'`, not list materialization or fingerprint equality after reject→rebuild.

## Permanent prevention
1. **Read-model rule:** any overlay status must be merged on every list/get API used by Admin/ranking.  
2. **One fingerprint function:** package identity, stored learning-record fingerprint, and rejection suppress set must share one formula.  
3. **Loop regression:** reject → list → rebuild → suppress must remain in CI (`bieV12aRecursiveLearningLoop`).
