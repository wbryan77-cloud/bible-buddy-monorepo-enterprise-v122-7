/**
 * services/adminAuthMiddleware.js
 *
 * BIBLEBUDDY ENTERPRISE SECURITY STABILIZATION — Phase 1A
 *
 * Unified admin authentication for every Admin-facing route in this codebase.
 *
 * PRIOR STATE (fixed by this module): three separate, independently
 * hand-written authentication checks existed —
 *   routes/bibleAuthorityAdmin.js  checkAdminAuth()
 *   routes/alphaAdmin.js           checkAdminAuth()
 *   routes/beta.js                 checkReviewAuth()
 * — each with different environment-variable precedence, and each
 * containing the same defect: `if (!token) return true;`, i.e. every one of
 * them FAILED OPEN (granted unauthenticated access) whenever its specific
 * token environment variable was not set. `routes/adminAssistant.js` had no
 * authentication code path at all, in any configuration.
 *
 * This was independently verified, live, in production, during the
 * Enterprise Architecture Review (2026-07-22) and re-confirmed during this
 * remediation batch: `/admin/api/alpha/feedback`, `/admin/api/alpha/summary`,
 * `/admin/assistant/project-brain`, `/admin/api/selftest`,
 * `/admin/api/providers`, and `/api/beta/review*` were all reachable with
 * zero authentication because only `BIBLE_AUTHORITY_ADMIN_TOKEN` was
 * configured in production, and the other route files never fell back to it.
 *
 * NEW BEHAVIOR (this module): fail-closed, unconditionally, with no
 * environment-specific bypass. If no admin token is configured anywhere,
 * every admin route protected by this module returns 401 — never open
 * access. This matches the explicit regression contract required by the
 * Security Stabilization batch: anonymous requests must always receive 401.
 *
 * Token precedence (unchanged from the most permissive of the three prior
 * implementations, so any deployment that already had ANY of these three
 * variables set continues to work identically with zero configuration
 * changes):
 *   1. BIBLE_AUTHORITY_ADMIN_TOKEN
 *   2. ALPHA_ADMIN_TOKEN
 *   3. BETA_REVIEW_TOKEN
 *
 * See docs/alpha/security-stabilization- (timestamped folder) for the full
 * validation report, before/after comparison, and regression test results
 * for this change.
 */

function resolveAdminToken() {
  return (
    process.env.BIBLE_AUTHORITY_ADMIN_TOKEN ||
    process.env.ALPHA_ADMIN_TOKEN ||
    process.env.BETA_REVIEW_TOKEN ||
    ''
  );
}

/**
 * Drop-in replacement for every prior per-file checkAdminAuth/checkReviewAuth
 * function. Same call signature and same "write the response and return
 * false on failure" contract, so every route call site needs no change
 * beyond importing this function instead of defining its own.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ errorMessage?: string }} [options] - optional custom 401 body
 *   text, used only to preserve a pre-existing route file's exact prior
 *   wording (e.g. routes/beta.js's "Review access requires valid token.").
 * @returns {boolean} true if the request is authorized (caller should
 *   continue); false if this function has already written a 401 response
 *   (caller must return immediately without sending its own response).
 */
function checkAdminAuth(req, res, options = {}) {
  const errorMessage = options.errorMessage || 'Admin token required';
  const token = resolveAdminToken();

  // Fail closed: no configured token means no access, full stop. This is
  // the single line that fixes the confirmed live vulnerability — the prior
  // implementations returned `true` (open access) here instead.
  if (!token) {
    res.status(401).json({ ok: false, error: errorMessage });
    return false;
  }

  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : req.query.token || '';
  if (provided !== token) {
    res.status(401).json({ ok: false, error: errorMessage });
    return false;
  }
  return true;
}

module.exports = { checkAdminAuth, resolveAdminToken };
