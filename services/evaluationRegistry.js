/**
 * BIE v1.1 — Versioned evaluation registry.
 * Indexes deterministic / model-assisted / human evaluators.
 * No model evaluator may overrule Founder/Admin judgment.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'data', 'founder-experience', 'evaluation-registry.json');

const DEFAULT_REGISTRY = {
  schemaVersion: 'bie-evaluation-registry-v1',
  updatedAt: null,
  authority: {
    humanJudgmentOverridesModel: true,
    founderJudgmentOverridesAdminRecommendation: true,
    noAutonomousProductionMutation: true,
  },
  evaluators: [
    {
      evaluatorId: 'det.required_scripture_present',
      version: '1.0.0',
      class: 'deterministic',
      owner: 'doctrineFinalAuthorityEngine/scripturePolicyValidator',
      purpose: 'Required Scripture witnesses appear when doctrine contract requires them',
      passThreshold: 1.0,
      status: 'active',
    },
    {
      evaluatorId: 'det.prohibited_claim_absent',
      version: '1.0.0',
      class: 'deterministic',
      owner: 'doctrineStrictPhraseGuard',
      purpose: 'Forbidden doctrinal phrases absent',
      passThreshold: 1.0,
      status: 'active',
    },
    {
      evaluatorId: 'det.direct_answer_first',
      version: '1.0.0',
      class: 'deterministic',
      owner: 'directAnswerFormatter',
      purpose: 'Yes/no and direct asks lead with a direct answer',
      passThreshold: 1.0,
      status: 'active',
    },
    {
      evaluatorId: 'det.final_owner_unchanged',
      version: '1.0.0',
      class: 'deterministic',
      owner: 'liveResponseOwner/finalizeBuddyResponse',
      purpose: 'Sole final response owner remains finalizeBuddyResponse',
      passThreshold: 1.0,
      status: 'active',
    },
    {
      evaluatorId: 'det.release_sha_match',
      version: '1.0.0',
      class: 'deterministic',
      owner: 'server.js/health',
      purpose: 'Local/origin/health release identities match for certified runs',
      passThreshold: 1.0,
      status: 'active',
    },
    {
      evaluatorId: 'det.no_internal_metadata',
      version: '1.0.0',
      class: 'deterministic',
      owner: 'experienceTraceAdapter/forbiddenProseGuard',
      purpose: 'User reply does not expose packet/route/owner internals',
      passThreshold: 1.0,
      status: 'active',
    },
    {
      evaluatorId: 'det.claim_grounding_supported',
      version: '1.0.0',
      class: 'deterministic',
      owner: 'claimGroundingEvaluator',
      purpose: 'Critical claims link to evidence available at generation',
      passThreshold: 0.85,
      status: 'active',
      knownLimitations: ['Does not create doctrine; defers to doctrineFinalAuthorityEngine'],
    },
    {
      evaluatorId: 'model.answered_current_question',
      version: '1.0.0',
      class: 'model_assisted',
      owner: 'answerMatchGate',
      purpose: 'Reply addresses current-message snapshot',
      passThreshold: 0.8,
      status: 'active',
      prohibitedInputs: ['private health details to external graders by default'],
    },
    {
      evaluatorId: 'model.companion_quality',
      version: '1.0.0',
      class: 'model_assisted',
      owner: 'companionPostureValidator',
      purpose: 'Warmth and companion posture without preachiness',
      passThreshold: 0.7,
      status: 'active',
    },
    {
      evaluatorId: 'human.founder_accepted',
      version: '1.0.0',
      class: 'human',
      owner: 'founderExperienceFeedback',
      purpose: 'Founder ACCEPTED / EXCELLENT_ANSWER marks',
      passThreshold: 1.0,
      status: 'active',
    },
    {
      evaluatorId: 'human.founder_rejected',
      version: '1.0.0',
      class: 'human',
      owner: 'founderExperienceFeedback',
      purpose: 'Founder REJECTED and failure marks',
      passThreshold: 1.0,
      status: 'active',
    },
    {
      evaluatorId: 'human.admin_approved',
      version: '1.0.0',
      class: 'human',
      owner: 'adminDecisionQueue',
      purpose: 'Admin APPROVED recommendation packages',
      passThreshold: 1.0,
      status: 'active',
    },
  ],
  calibration: {
    falsePositiveHistory: [],
    falseNegativeHistory: [],
    notes: 'Initial registry indexes existing owners; calibration datasets accumulate via Founder/Admin marks.',
  },
};

function ensureRegistry() {
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(REGISTRY_PATH)) {
    const reg = { ...DEFAULT_REGISTRY, updatedAt: new Date().toISOString() };
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2), 'utf8');
    return reg;
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function getEvaluationRegistry() {
  return ensureRegistry();
}

function listEvaluators({ classFilter = null, status = 'active' } = {}) {
  const reg = ensureRegistry();
  return (reg.evaluators || []).filter((e) => {
    if (status && e.status !== status) return false;
    if (classFilter && e.class !== classFilter) return false;
    return true;
  });
}

function recordCalibrationOutcome({ evaluatorId, kind, note } = {}) {
  const reg = ensureRegistry();
  const entry = {
    evaluatorId,
    kind, // false_positive | false_negative
    note: String(note || '').slice(0, 500),
    at: new Date().toISOString(),
  };
  if (kind === 'false_positive') reg.calibration.falsePositiveHistory.push(entry);
  if (kind === 'false_negative') reg.calibration.falseNegativeHistory.push(entry);
  reg.updatedAt = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2), 'utf8');
  return { ok: true, entry };
}

module.exports = {
  REGISTRY_PATH,
  getEvaluationRegistry,
  listEvaluators,
  recordCalibrationOutcome,
  ensureRegistry,
};
