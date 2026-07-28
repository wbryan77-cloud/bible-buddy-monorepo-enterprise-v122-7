/**
 * Phase 6Y — Explicit historical-causation asks must not be owned by
 * doctrine_final_authority templates (those answer WHAT Scripture teaches,
 * not WHO changed practice historically).
 */

function isExplicitHistoricalCausationAsk(message = '') {
  const m = String(message || '').trim();
  if (!m) return false;
  if (
    /\b(who changed|historical evidence|historically|saturday to sunday|constantine|laodicea|roman catholic)\b/i.test(
      m,
    )
  ) {
    return true;
  }
  if (/\bhow did (the )?sabbath change\b/i.test(m)) return true;
  if (/\bwhen did\b.{0,40}\b(sabbath|sunday).{0,40}\bchange\b/i.test(m)) return true;
  if (/\b(history of|historical context|background (on|of|context))\b/i.test(m)) return true;
  if (/\bgive historical context\b/i.test(m)) return true;
  return false;
}

module.exports = {
  isExplicitHistoricalCausationAsk,
};
