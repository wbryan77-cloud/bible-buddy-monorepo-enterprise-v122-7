/**
 * Phase 6 — Enterprise Architecture Decision Gate
 * Protects BibleBuddy from route sprawl, repeated mistakes, and architecture drift.
 */

function evaluateArchitectureDecision(decision = {}) {
  const simplifiesArchitecture = decision.simplifiesArchitecture === true;
  const strengthensCompanionCore = decision.strengthensCompanionCore === true;
  const preservesScriptureAuthority = decision.preservesScriptureAuthority === true;
  const keepsOneVoice = decision.keepsOneVoice === true;
  const followsEnterpriseStandard = decision.followsEnterpriseStandard === true;
  const reviewsHistoricalLearning = decision.reviewsHistoricalLearning === true;

  const passed =
    simplifiesArchitecture &&
    strengthensCompanionCore &&
    preservesScriptureAuthority &&
    keepsOneVoice &&
    followsEnterpriseStandard &&
    reviewsHistoricalLearning;

  return {
    passed,
    required: {
      simplifiesArchitecture,
      strengthensCompanionCore,
      preservesScriptureAuthority,
      keepsOneVoice,
      followsEnterpriseStandard,
      reviewsHistoricalLearning,
    },
    rule:
      'No BibleBuddy change enters unless it simplifies architecture, strengthens Companion Core, preserves Scripture authority, keeps one voice, follows enterprise standards, and learns from prior audits/mistakes.',
  };
}

module.exports = {
  evaluateArchitectureDecision,
};
