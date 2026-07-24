# Architectural Retrospective — Certification v3.0

## Would you build today’s architecture the same way?

**No.**

## Evidence-supported mistakes

1. **Mutation stacking** — multiple polish layers rewriting the same opener caused recurring user-visible defects and green-test blindness.
2. **Ownership proliferation** — conversation_owner / phase5O / revision owners / contract polishers solved incidents incrementally but left competing mutation points.
3. **Readiness conflation** — health, routes, and keyword suites were treated as Alpha readiness; production Founder conversation quality was not.
4. **Evidence inventory without utilization proof** — IOG/ICOJ pipelines advanced without companion utilization certification.

## Better shape (evidence-backed)

- One conversation pipeline
- One response owner after retrieval/reasoning
- One memory owner for continuation
- One scripture retrieval pipeline with claim labels enforced before render
- Approved evidence as optional strengthening only
- Production Truth Corpus as a hard release gate

No speculative rewrite is recommended until P0 production failures are closed.
