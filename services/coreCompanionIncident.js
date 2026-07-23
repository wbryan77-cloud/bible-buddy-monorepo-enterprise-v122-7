/**
 * CORE COMPANION RECOVERY — Founder Alpha readiness freeze.
 *
 * While this incident file exists with status OPEN, release aggregators and
 * Founder readiness surfaces MUST NOT report READY / GO for Alpha.
 *
 * Admin health ≠ Companion quality.
 * Route reachability ≠ correct answers.
 * Unit green ≠ real multi-turn success.
 * Local success ≠ production success.
 * Evidence existence ≠ evidence utilization.
 */

const INCIDENT_ID = 'CRITICAL_COMPANION_SCRIPTURE_CONVERSATION_AND_RUNTIME_ARCHITECTURE_FAILURE';
const STATUS = 'NOT_READY_FOR_FOUNDER_ALPHA';

function getCoreCompanionIncident() {
  return {
    id: INCIDENT_ID,
    status: 'OPEN',
    readiness: STATUS,
    openedAt: '2026-07-23T23:54:00.000Z',
    summary:
      'Founder Alpha paused. Companion failed real Founder testing: conversation continuity, multi-part Scripture answers, correction recovery, and competing runtime ownership.',
    rules: [
      'Admin health is not equivalent to Companion quality',
      'Route reachability is not equivalent to correct answers',
      'Isolated unit passes are not equivalent to real conversation success',
      'Local success is not equivalent to production success',
      'Evidence existence is not equivalent to evidence utilization',
    ],
    blocks: ['FOUNDER_ALPHA', 'CONTROLLED_FOUNDER_ALPHA', 'RELEASE_GO'],
  };
}

function isCoreCompanionIncidentOpen() {
  return getCoreCompanionIncident().status === 'OPEN';
}

module.exports = {
  INCIDENT_ID,
  STATUS,
  getCoreCompanionIncident,
  isCoreCompanionIncidentOpen,
};
