# 30 — Performance And Cost Report

Synchronous chat path unchanged until response emission. Instrumentation runs in `setImmediate` after JSON response.

Budgets (targets):
- event-write overhead: <5ms amortized async
- grounding/shadow: async, non-blocking
- no added model calls in the instrumentation path
