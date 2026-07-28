# 91 — Architecture Decision

## Decision: **B — Existing components need small contract/ownership corrections**

Not A (7A overstated thin-selector / durability).  
Not C (selector still useful as shared view; reduced, not merged away).  
Not D (no new component).

### Code-path rationale

Care failures were in extraction, need detection, burden lifecycle, and a selector write side-effect — all fixable inside existing owners. Continuity across instances remains a topology limitation of existing file stores, not a missing engine.
