/**
 * PHASE_3_AUTONOMOUS_OPERATIONS — Enterprise Operations AI (objective 1).
 *
 * Composes the five net-new Phase 3 services into one consolidated,
 * cacheable summary, following the exact same section-envelope contract
 * (status/lastUpdated/sourceSystem/dataFreshness/errors/drillDownTarget/
 * data) as services/adminCommandCenterAggregator.js — reusing its
 * `buildSection` helper directly rather than re-implementing it.
 *
 * Deliberately kept as a SEPARATE aggregator/route from the existing,
 * heavily-tested Admin Command Center summary (31/31 passing smoke checks
 * as of Phase 2) rather than folding these sections into it. That keeps
 * this entire phase strictly additive: zero risk of regressing the
 * existing aggregator's tested behavior or its caching semantics.
 *
 * Every section here is observational/advisory only. Nothing in this file
 * writes to any store, approves anything, or triggers a deploy.
 */

const { buildSection } = require('./adminCommandCenterAggregator');

// Longer TTL than the Admin Command Center's own cache: the Developer
// Intelligence section runs a real `npm outdated` call plus a repo-wide
// file walk (~15s observed), so a 30s TTL would mean most requests pay
// that cost. Nothing in here needs sub-minute freshness.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = null;
let cacheAt = 0;

function invalidateEnterpriseIntelligenceCache() {
  cache = null;
  cacheAt = 0;
}

function buildEnterpriseIntelligenceSummary({ skipCache = false } = {}) {
  const now = Date.now();
  if (!skipCache && cache && now - cacheAt < CACHE_TTL_MS) return cache;

  const summary = {
    generatedAt: new Date().toISOString(),
    phase: 'PHASE_3_AUTONOMOUS_OPERATIONS',
    governanceNote: 'Every section below is observe/analyze/recommend only. No AI Chief of Staff capability in this phase modifies production, deploys anything, publishes knowledge, or approves evidence — human approval remains authoritative for all of it.',
    sections: {
      operationalHealthScore: buildSection({
        sourceSystem: 'operational-health-scorer',
        drillDownTarget: '/unified/enterprise-intelligence/health-score',
        dataFreshness: 'live',
        fn: () => require('./operationalHealthScorer').computeOperationalHealthScore(),
      }),
      releaseReadiness: buildSection({
        sourceSystem: 'release-intelligence',
        drillDownTarget: '/unified/enterprise-intelligence/release-readiness',
        dataFreshness: 'depends on latest Founder Alpha Readiness report',
        fn: () => require('./releaseIntelligenceEngine').evaluateReleaseReadiness(),
      }),
      productionAnomalies: buildSection({
        sourceSystem: 'production-anomaly-detector',
        drillDownTarget: '/unified/enterprise-intelligence/anomalies',
        dataFreshness: 'last 24h of operational metrics history',
        fn: () => require('./productionAnomalyDetector').detectAnomalies(),
      }),
      developerIntelligence: buildSection({
        sourceSystem: 'developer-intelligence-scanner',
        drillDownTarget: '/unified/enterprise-intelligence/developer-intelligence',
        dataFreshness: 'live (npm outdated + static require() scan)',
        fn: () => require('./developerIntelligenceScanner').buildDeveloperIntelligenceReport(),
      }),
      recommendationLearning: buildSection({
        sourceSystem: 'recommendation-learning-engine',
        drillDownTarget: '/unified/enterprise-intelligence/recommendation-learning',
        dataFreshness: 'live (Founder Intelligence store + unified audit trail)',
        fn: () => require('./recommendationLearningEngine').buildRecommendationLearningSummary(),
      }),
    },
  };

  cache = summary;
  cacheAt = now;
  return summary;
}

module.exports = { buildEnterpriseIntelligenceSummary, invalidateEnterpriseIntelligenceCache };
