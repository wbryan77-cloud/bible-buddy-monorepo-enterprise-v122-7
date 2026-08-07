/**
 * Effective Buddy runtime configuration — safe startup diagnostics (no secrets).
 */

function getEffectiveRuntimeConfig() {
  const openAiFirstExplicit = process.env.BUDDY_OPENAI_FIRST;
  const openAiFirstEnabled = openAiFirstExplicit !== '0';
  const buddyRuntime = String(process.env.BUDDY_RUNTIME || 'legacy').toLowerCase();
  const templateProseEnabled = process.env.BUDDY_TEMPLATE_PROSE === '1';
  const studyFallbackDisabled =
    process.env.BUDDY_TEMPLATE_PROSE !== '1' || process.env.BUDDY_DISABLE_STUDY_FALLBACK === '1';

  let pathLabel = 'openAiFirstCompanionRuntime';
  if (buddyRuntime === 'reason_first') {
    pathLabel = 'openAiFirstCompanionRuntime'; // hard cutover — reason_first disabled in buddyBrain.runBuddy
  } else if (!openAiFirstEnabled) {
    pathLabel = 'openAiFirstCompanionRuntime'; // hard cutover — BUDDY_OPENAI_FIRST=0 ignored in buddyBrain.runBuddy
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    buddyRuntime,
    openAiFirstEnabled,
    openAiFirstEnv: openAiFirstExplicit == null ? 'unset_defaults_on' : openAiFirstExplicit,
    templateProseEnabled,
    studyFallbackDisabled,
    studyFallbackEnabled: !studyFallbackDisabled,
    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
    finalAnswerAuthorMode: openAiFirstEnabled && buddyRuntime === 'legacy' ? 'openai' : pathLabel,
    activePath: pathLabel,
    debugEnabled: process.env.BUDDY_DEBUG === '1' || process.env.BUDDY_CORE_DEBUG === '1',
  };
}

function logStartupDiagnostics() {
  const cfg = getEffectiveRuntimeConfig();
  const mem = process.memoryUsage();
  const lines = [
    '=== BibleBuddy Runtime Startup ===',
    `runtime mode: ${cfg.buddyRuntime} → ${cfg.activePath}`,
    `template prose: ${cfg.templateProseEnabled ? 'ENABLED' : 'disabled'}`,
    `study fallback: ${cfg.studyFallbackEnabled ? 'ENABLED' : 'disabled'}`,
    `OpenAI ready: ${cfg.openAiKeyPresent}`,
    `final answer author mode: ${cfg.finalAnswerAuthorMode}`,
    `NODE_ENV: ${cfg.nodeEnv}`,
    `heapUsedMB: ${Math.round(mem.heapUsed / 1024 / 1024)}`,
    `rssMB: ${Math.round(mem.rss / 1024 / 1024)}`,
    '==================================',
  ];
  for (const line of lines) {
    console.log(line);
  }
  if (cfg.nodeEnv === 'production' && cfg.templateProseEnabled) {
    console.warn('WARN: BUDDY_TEMPLATE_PROSE=1 on production — study template prose may speak.');
  }
  if (cfg.nodeEnv === 'production' && !cfg.openAiFirstEnabled) {
    console.warn(
      'WARN: BUDDY_OPENAI_FIRST=0 is ignored by hard cutover — openAiFirstCompanionRuntime remains the only live path.'
    );
  }
  if (!cfg.openAiKeyPresent) {
    console.warn('WARN: OPENAI_API_KEY missing — all turns will use connection error path.');
  }
  return cfg;
}

module.exports = {
  getEffectiveRuntimeConfig,
  logStartupDiagnostics,
};
