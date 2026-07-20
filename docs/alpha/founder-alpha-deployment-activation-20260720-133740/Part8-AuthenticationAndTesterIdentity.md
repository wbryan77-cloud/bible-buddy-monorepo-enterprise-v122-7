# Part 8 — Authentication and Tester Identity

*(No standalone output files are specified for Part 8 in the batch instructions; this evidence
file records the findings that feed directly into Part 10 and the Final Report.)*

## Founder/Tester Authentication

**State: Anonymous, client-supplied session identifier. Not account-based. Not invitation-gated
at the application layer.**

- The client (`public/index.html`) generates/holds a `testerId`/`userId` value and a `sessionId`,
  sent with every `/buddy/chat` request (`routes/buddy.js`: `const testerId = body.testerId ||
  body.userId || 'anonymous'`).
- There is no login form, password, magic link, or account system anywhere in the codebase for
  the Founder-facing app. Anyone with the URL can use it as any tester identity they choose to
  supply (or none, falling back to `'anonymous'`).
- Sessions are distinguishable from each other (each has its own ID and, where used, its own
  continuation/memory state keyed by that ID) but are not cryptographically bound to a real person
  — a tester code, not a login.
- **This is an acceptable, already-documented pattern for a 10–20 person invitation-only Founder
  cohort**, per the batch's own stated tolerance ("anonymous or session-based access may remain
  acceptable... if consent is clearly displayed... testers understand what data is collected...").
  It becomes a defect only if the *invitation* itself is not tightly controlled (i.e., if the URL
  were public/discoverable rather than sent privately to named Founders) — that is an operational
  practice for whoever sends the invitations (Part 11), not a code change.

## Admin Authentication

**State: Token-gated, but currently unconfigured everywhere it has been checked (local
verification environment, and — per Part 7 — not even deployed yet on the live host).**

- `routes/bibleAuthorityAdmin.js` `checkAdminAuth()` reads `BIBLE_AUTHORITY_ADMIN_TOKEN` (falling
  back to `ALPHA_ADMIN_TOKEN`, then `BETA_REVIEW_TOKEN`). If none are set, the check is a no-op —
  Admin routes are open.
- `routes/alphaAdmin.js` and `routes/beta.js` implement the same fallback-to-open pattern for their
  respective route groups.
- **Classification: this is a release blocker until a real secret value is set**, exactly as
  flagged in Part 4's repair (declaring `BIBLE_AUTHORITY_ADMIN_TOKEN` in `render.yaml` so it is
  configurable) and reiterated in Part 5's manual deployment sequence. No login system, role
  system, or new authentication architecture was built in this batch — that would exceed scope.
  The existing token check is the "smallest established protection supported by the current
  application," and this batch's job was limited to making it deployable and clearly documented,
  which is now done at the source level. **Setting the actual secret value in the Render dashboard
  remains an outstanding manual action** — this batch does not generate or transmit secret values.

## Compliance With Part 8 Constraints

- No login credentials were fabricated.
- No full user-authentication platform was invented.
- No keystroke-level, password, or unrelated browsing capture exists or was added.
- Telemetry actually implemented is documented in Part 9, not overstated here.

## Conclusion

| | State |
|---|---|
| Founder/Tester authentication | Anonymous / session-based (acceptable for 10–20 invitation-only Founders, provided the invitation itself is kept private — see Part 11) |
| Admin authentication | Token-gated mechanism exists in code; **no token value is currently set** in the local verification environment or (confirmed) on the live host — **release blocker until set**, tracked through Part 5/13 |
