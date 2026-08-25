/**
 * Single source of truth for tester-facing Alpha public origin.
 * Prefer PUBLIC_ALPHA_ORIGIN; fall back to legacy env names; never invent a brand domain.
 */

function resolvePublicAlphaOrigin(explicit = '') {
  const raw = String(
    explicit ||
      process.env.PUBLIC_ALPHA_ORIGIN ||
      process.env.ALPHA_TESTER_BASE_URL ||
      process.env.PUBLIC_APP_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      '',
  )
    .trim()
    .replace(/\/+$/, '');

  if (!raw) {
    return { ok: false, origin: '', reason: 'unset' };
  }

  let url;
  try {
    url = new URL(raw);
  } catch (_) {
    return { ok: false, origin: '', reason: 'malformed' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, origin: '', reason: 'unsupported_protocol' };
  }

  const host = String(url.hostname || '').toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (!isLocal && url.protocol !== 'https:') {
    return { ok: false, origin: '', reason: 'https_required' };
  }

  // Origin only — path/query discarded so invite URLs stay canonical.
  return { ok: true, origin: url.origin, reason: 'ok' };
}

module.exports = {
  resolvePublicAlphaOrigin,
};
