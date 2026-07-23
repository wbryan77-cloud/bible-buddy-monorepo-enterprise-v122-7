/**
 * ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — Notification Framework.
 *
 * BUGFIX (discovered during this batch, not introduced by it): see the
 * matching note in lib/providers/email/resend.js — this file had the same
 * latent ESM-syntax-in-a-CommonJS-project defect and was never actually
 * `require()`'d anywhere.
 *
 * Real send only happens when TWILIO_SID/TWILIO_TOKEN/TWILIO_FROM (or the
 * legacy TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN names already checked
 * elsewhere in this codebase) are configured. With no credentials
 * configured (every environment this batch was built/tested in) this
 * remains the exact same safe, no-op "stub" behavior as before.
 */

function resolveCreds() {
  const sid = process.env.TWILIO_SID || process.env.TWILIO_ACCOUNT_SID || '';
  const token = process.env.TWILIO_TOKEN || process.env.TWILIO_AUTH_TOKEN || '';
  const from = process.env.TWILIO_FROM || '';
  return { sid, token, from };
}

async function sendSmsTwilio({ to, body } = {}) {
  const { sid, token, from } = resolveCreds();

  if (!(sid && token && from)) {
    console.log('[sms:twilio] (stub — Twilio credentials not configured) to=%s', to);
    return { ok: true, stub: true, sent: false, provider: 'twilio', reason: 'Twilio credentials not configured' };
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });
    const respBody = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[sms:twilio] send failed status=%s', res.status);
      return { ok: false, stub: false, sent: false, provider: 'twilio', error: respBody.message || `HTTP ${res.status}` };
    }
    return { ok: true, stub: false, sent: true, provider: 'twilio', sid: respBody.sid || null };
  } catch (e) {
    console.warn('[sms:twilio] send error:', e.message);
    return { ok: false, stub: false, sent: false, provider: 'twilio', error: e.message };
  }
}

module.exports = { sendSmsTwilio };
