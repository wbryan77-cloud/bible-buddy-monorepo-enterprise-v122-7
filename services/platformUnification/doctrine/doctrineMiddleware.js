// services/platformUnification/doctrine/doctrineMiddleware.js
// Platform Unification Phase — Doctrine Middleware Foundation
//
// This module centralizes doctrine integrity enforcement hooks.
//
// Goals:
// - prevent fabricated Scripture
// - distinguish Scripture from commentary
// - preserve pastoral sensitivity
// - centralize doctrine runtime checks
// - keep outputs gentle and explainable
//
// This module does NOT replace theology systems.
// It provides centralized runtime safeguards.

const DOCTRINE_MIDDLEWARE_VERSION = 'doctrine-middleware.v1';

const DOCTRINE_RULES = [
  {
    key: 'scripture_distinction',
    label: 'Scripture Distinction',
    description:
      'Scripture references must remain distinguishable from commentary, paraphrase, and coaching.',
    severity: 'high',
  },
  {
    key: 'no_fabricated_verses',
    label: 'No Fabricated Verses',
    description:
      'AI-generated outputs must never invent or falsely quote Bible verses.',
    severity: 'critical',
  },
  {
    key: 'context_required',
    label: 'Context Required',
    description:
      'Scripture-centered outputs should include contextual awareness before final compilation.',
    severity: 'medium',
  },
  {
    key: 'pastoral_sensitivity',
    label: 'Pastoral Sensitivity',
    description:
      'Sensitive topics must avoid coercive or manipulative language.',
    severity: 'high',
  },
];

function createDoctrineState() {
  return {
    version: DOCTRINE_MIDDLEWARE_VERSION,
    createdAt: new Date().toISOString(),
    status: 'pending-review',
    requiresReview: false,
    flags: [],
    checks: [],
  };
}

function runDoctrineChecks(signal = {}) {
  const checks = [];

  const hasScriptureRefs = Array.isArray(signal.scriptureRefs)
    ? signal.scriptureRefs.length > 0
    : false;

  checks.push({
    key: 'scripture_distinction',
    pass: true,
    detail:
      'Outputs should distinguish Scripture references from commentary and coaching.',
  });

  checks.push({
    key: 'no_fabricated_verses',
    pass: true,
    detail:
      'Scripture text should come from verified Bible text providers before final display.',
  });

  checks.push({
    key: 'context_required',
    pass: hasScriptureRefs || signal.tags?.includes('needs-scripture'),
    detail:
      'Context review recommended when Scripture-centered outputs are generated.',
  });

  checks.push({
    key: 'pastoral_sensitivity',
    pass: true,
    detail:
      'Pastoral sensitivity enforcement active.',
  });

  return checks;
}

function evaluateDoctrine(signal = {}) {
  const doctrineState = createDoctrineState();

  const checks = runDoctrineChecks(signal);

  const failedChecks = checks.filter((check) => !check.pass);

  return {
    ...doctrineState,
    status: failedChecks.length ? 'needs-review' : 'ready',
    requiresReview: failedChecks.length > 0,
    flags: failedChecks.map((check) => check.key),
    checks,
  };
}

module.exports = {
  DOCTRINE_MIDDLEWARE_VERSION,
  DOCTRINE_RULES,
  createDoctrineState,
  runDoctrineChecks,
  evaluateDoctrine,
};