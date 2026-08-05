/**
 * BIE v1.1A — Cost and performance ledger linked to traces.
 * Async/recording only; does not change answer quality controls.
 */

const { appendItem, readItems, DOC, MAX } = require('./founderExperienceDurableStore');

const BUDGET_POLICY = Object.freeze({
  maxSynchronousLearningOverheadMs: 5,
  dailyEvaluationBudgetUsd: 5,
  dailyWatcherBudgetUsd: 1,
  maxCostPerConversationUsd: 0.15,
  maxCostPerAcceptedAnswerUsd: 0.25,
  maxDatabaseGrowthMbPerDay: 50,
  alertThresholds: {
    conversationCostUsd: 0.2,
    dailyEvalUsd: 4,
  },
  controls: [
    'deterministic_before_model',
    'async_post_response_evaluation',
    'evaluate_founder_rejected_and_critical',
    'sample_routine_successes',
    'dedupe_identical_eval_work',
    'cache_immutable_evidence_refs',
    'reuse_retrieval_within_request',
    'bounded_context_budgets',
    'expensive_watchers_off_when_idle',
    'retain_high_value_traces_longer',
  ],
});

function estimateCostFromRuntime(runtime = {}, latencyMs = 0) {
  const openAi = !!runtime.openAiCalled;
  // Conservative placeholder until provider usage fields are plumbed.
  const inputTokens = openAi ? 1200 : 0;
  const outputTokens = openAi ? Math.min(800, Math.max(80, Math.round((latencyMs || 0) / 40))) : 0;
  const usdPer1kIn = 0.0025;
  const usdPer1kOut = 0.01;
  const modelCost = (inputTokens / 1000) * usdPer1kIn + (outputTokens / 1000) * usdPer1kOut;
  const evalCost = 0.0001; // async local deterministic
  return {
    model: openAi ? 'openai' : 'deterministic',
    inputTokens,
    outputTokens,
    cachedInputTokens: 0,
    reasoningTokens: null,
    retrievalCostUsd: 0,
    embeddingCostUsd: 0,
    evaluationCostUsd: evalCost,
    watcherCostUsd: 0,
    estimatedCostUsd: Number((modelCost + evalCost).toFixed(6)),
    estimated: true,
  };
}

async function recordTurnCost({
  requestId = null,
  route = null,
  clientType = 'biblebuddy',
  runtime = {},
  latencyMs = 0,
  accepted = null,
} = {}) {
  const cost = estimateCostFromRuntime(runtime, latencyMs);
  const entry = {
    costId: `cost_${requestId || Date.now()}`,
    requestId,
    route,
    clientType,
    latencyMs,
    accepted,
    ...cost,
    at: new Date().toISOString(),
    releaseCommit: process.env.RENDER_GIT_COMMIT || null,
  };
  await appendItem(DOC.costLedger, entry, MAX.costLedger);
  return { ok: true, entry, withinConversationBudget: entry.estimatedCostUsd <= BUDGET_POLICY.maxCostPerConversationUsd };
}

async function buildCostBaseline({ limit = 500 } = {}) {
  const { items, backend, durable } = await readItems(DOC.costLedger);
  const rows = items.slice(-limit);
  const sum = rows.reduce((a, r) => a + Number(r.estimatedCostUsd || 0), 0);
  const byRoute = {};
  for (const r of rows) {
    const k = r.route || 'unknown';
    byRoute[k] = byRoute[k] || { count: 0, cost: 0 };
    byRoute[k].count += 1;
    byRoute[k].cost += Number(r.estimatedCostUsd || 0);
  }
  return {
    backend,
    durable,
    sampleSize: rows.length,
    totalEstimatedCostUsd: Number(sum.toFixed(6)),
    avgCostPerConversationUsd: rows.length ? Number((sum / rows.length).toFixed(6)) : 0,
    byRoute,
    budgetPolicy: BUDGET_POLICY,
    qualityReductionForCost: false,
  };
}

module.exports = {
  BUDGET_POLICY,
  estimateCostFromRuntime,
  recordTurnCost,
  buildCostBaseline,
};
