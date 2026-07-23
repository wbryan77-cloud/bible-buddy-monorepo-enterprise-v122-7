/**
 * ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — Notification Framework.
 *
 * BUGFIX (discovered during this batch, not introduced by it): this file
 * previously used `export`/ESM syntax in a project whose package.json
 * declares "type": "commonjs" and whose every other module uses
 * `require`/`module.exports`. Because nothing in the codebase ever
 * `require()`'d this file (confirmed by repo-wide search), the bug was
 * latent — but it meant this provider could never actually have been
 * loaded even after configuring RESEND_API_KEY. Fixed here as a direct
 * enabler of Deliverable 8 (Notification Framework) real dispatch.
 *
 * Real send only happens when RESEND_API_KEY is configured. With no key
 * configured (the case in every environment this batch was built/tested
 * in) this remains the exact same safe, no-op "stub" behavior as before —
 * no behavior change for any environment without the key set.
 */

async function sendEmailResend({ to, subject, html, text } = {}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'BibleBuddy <notifications@biblebuddy.app>';

  if (!key) {
    console.log('[email:resend] (stub — RESEND_API_KEY not configured) to=%s subj=%s', to, subject);
    return { ok: true, stub: true, sent: false, provider: 'resend', reason: 'RESEND_API_KEY not configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html: html || undefined, text: text || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[email:resend] send failed status=%s', res.status);
      return { ok: false, stub: false, sent: false, provider: 'resend', error: body.message || `HTTP ${res.status}` };
    }
    return { ok: true, stub: false, sent: true, provider: 'resend', id: body.id || null };
  } catch (e) {
    console.warn('[email:resend] send error:', e.message);
    return { ok: false, stub: false, sent: false, provider: 'resend', error: e.message };
  }
}

module.exports = { sendEmailResend };
