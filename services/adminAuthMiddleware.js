/**
 * services/adminAuthMiddleware.js
 *
 * BIBLEBUDDY ENTERPRISE SECURITY STABILIZATION — Phase 1A
 * v1.3F — normalize configured + provided secrets (trim) and accept
 * case-insensitive Bearer scheme. Never log token values.
 *
 * Unified admin authentication for every Admin-facing route in this codebase.
 *
 * Token precedence:
 *   1. BIBLE_AUTHORITY_ADMIN_TOKEN
 *   2. ALPHA_ADMIN_TOKEN
 *   3. BETA_REVIEW_TOKEN
 *
 * Fail-closed: if no admin token is configured, every protected route
 * returns 401 — never open access.
 */

const crypto = require('crypto');

function normalizeSecret(value) {
  return String(value || '').trim();
}

function resolveAdminToken() {
  const candidates = [
    process.env.BIBLE_AUTHORITY_ADMIN_TOKEN,
    process.env.ALPHA_ADMIN_TOKEN,
    process.env.BETA_REVIEW_TOKEN,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeSecret(candidate);
    if (normalized) return normalized;
  }
  return '';
}

/**
 * Short non-reversible fingerprint for parity checks. Never expose the secret.
 */
function adminAuthFingerprint(token = resolveAdminToken()) {
  const normalized = normalizeSecret(token);
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 12);
}

function extractProvidedToken(req) {
  const header = String(req.headers.authorization || '');
  const bearer = header.match(/^Bearer\s+(.+)$/i);
  if (bearer) return normalizeSecret(bearer[1]);
  return normalizeSecret(req.query && req.query.token);
}

/**
 * Drop-in Admin gate. Writes 401 and returns false on failure.
 */
function checkAdminAuth(req, res, options = {}) {
  const errorMessage = options.errorMessage || 'Admin token required';
  const token = resolveAdminToken();

  if (!token) {
    res.status(401).json({ ok: false, error: errorMessage });
    return false;
  }

  const provided = extractProvidedToken(req);
  if (!provided || provided !== token) {
    res.status(401).json({ ok: false, error: errorMessage });
    return false;
  }
  return true;
}

module.exports = {
  checkAdminAuth,
  resolveAdminToken,
  normalizeSecret,
  extractProvidedToken,
  adminAuthFingerprint,
};
