# 02 — Admin Auth Matrix

See `admin-auth-matrix.json`.

Proven:
- no token → 401 on Mission Control, learning-records, Command Center, decision-queue, events, durable status, recommendations (all sampled Admin routes)
- wrong token → 401
- malformed Authorization → 401
- error body generic (`Admin token required`); secret not echoed
- probe-env bearer against production → 401 (**MISMATCH**)

Not proven (blocked):
- valid matching production bearer → 200
- authorized mutation cycle
