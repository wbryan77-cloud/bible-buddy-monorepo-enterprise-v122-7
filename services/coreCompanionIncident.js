/**
 * CORE COMPANION RECOVERY — Founder Alpha readiness freeze.
 *
 * Original CRITICAL companion failure (continuation / correction / opener mutation)
 * was production-validated closed at commit fb2cb52 (Truth Corpus 32/32).
 *
 * This file no longer forces a blanket Release Intelligence BLOCK for that
 * historical incident. Residual Founder Alpha gates (UI parity, full claim
 * classifier, full IOG utilization matrix, dual-lane consolidation) are tracked
 * in docs/recovery/certification-v3/rc4/ and may still yield NO_GO.
 *
 * Admin health ≠ Companion quality.
 * Route reachability ≠ correct answers.
 * Unit green ≠ real multi-turn success.
 * Local success ≠ production success.
 * Evidence existence ≠ evidence utilization.
 */

const INCIDENT_ID = 'CRITICAL_COMPANION_SCRIPTURE_CONVERSATION_AND_RUNTIME_ARCHITECTURE_FAILURE';
const STATUS = 'CRITICAL_COMPANION_FAILURE_CLOSED_PENDING_RC_RESIDUALS';

function getCoreCompanionIncident() {
  return {
    id: INCIDENT_ID,
    status: 'CLOSED',
    readiness: STATUS,
    openedAt: '2026-07-23T23:54:00.000Z',
    closedAt: '2026-07-24T01:35:00.000Z',
    closedByCommit: 'fb2cb52',
    closeEvidence: {
      productionTruthCorpus: '32/32 PASS',
      h1: 'opener duplication absent on production',
      h2: 'response_correction_restate_dietary on production',
      artifact: 'docs/recovery/certification-v3/rc4/founder-truth-corpus-production.txt',
    },
    summary:
      'Original critical companion failure closed after production Founder Truth Corpus 32/32. Residual RC gates may still block GO_FOR_FOUNDER_ALPHA.',
    rules: [
      'Admin health is not equivalent to Companion quality',
      'Route reachability is not equivalent to correct answers',
      'Isolated unit passes are not equivalent to real conversation success',
      'Local success is not equivalent to production success',
      'Evidence existence is not equivalent to evidence utilization',
    ],
    blocks: [],
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
