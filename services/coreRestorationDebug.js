/**
 * Internal debug proof for core restoration (development / BUDDY_DEBUG=1).
 */

function isCoreRestorationDebugEnabled() {
  return (
    process.env.BUDDY_DEBUG === '1' ||
    process.env.BUDDY_CORE_DEBUG === '1' ||
    process.env.BUDDY_LIVE_TRACE === '1' ||
    process.env.NODE_ENV !== 'production'
  );
}

function buildCoreRestorationDebug({
  runtimeUsed = 'core_openai_first',
  currentIntent = null,
  historyAllowed = false,
  openaiCalled = false,
  openaiResponseReceived = false,
  finalAnswerAuthor = 'openai',
  templateUsed = false,
  fallbackUsed = false,
  responderUsed = false,
  routeUsed = 'core_companion',
  studyLoopUsed = false,
  prayerTemplateUsed = false,
  scriptureWitnessTemplateUsed = false,
  doctrineValidatorUsed = false,
  scriptureEvidenceUsed = false,
  activeTopicUsedAsContextOnly = true,
  evidenceTopic = null,
  validation = null,
  errorMessage = null,
  evidenceCardsUsed = false,
  approvedDoctrineFrozen = true,
  discoveryReinforcementCount = 0,
  buildConnectionErrorReplyUsed = false,
  sourceGroundedResponderUsed = false,
  sabbathHistoryDeepResponderUsed = false,
  studyFallbackUsed = false,
  relationshipEnrichmentUsed = false,
  forbiddenPhraseDetected = false,
  answerMatchesLatestQuestion = null,
  correctionRepair = null,
  regenerated = false,
} = {}) {
  return {
    runtimeUsed,
    currentIntent,
    historyAllowed: !!historyAllowed,
    evidenceCardsUsed: !!evidenceCardsUsed,
    openaiCalled: !!openaiCalled,
    openaiResponseReceived: !!openaiResponseReceived,
    finalAnswerAuthor,
    templateUsed: !!templateUsed,
    fallbackUsed: !!fallbackUsed,
    studyFallbackUsed: !!studyFallbackUsed,
    responderUsed: responderUsed === true || responderUsed === 'reasonFirstComposer',
    relationshipEnrichmentUsed: !!relationshipEnrichmentUsed,
    sourceGroundedResponderUsed: !!sourceGroundedResponderUsed,
    sabbathHistoryDeepResponderUsed: !!sabbathHistoryDeepResponderUsed,
    forbiddenPhraseDetected: !!forbiddenPhraseDetected,
    answerMatchesLatestQuestion,
    regenerated: !!regenerated,
    routeUsed,
    studyLoopUsed: !!studyLoopUsed,
    prayerTemplateUsed: !!prayerTemplateUsed,
    scriptureWitnessTemplateUsed: !!scriptureWitnessTemplateUsed,
    doctrineValidatorUsed: !!doctrineValidatorUsed,
    scriptureEvidenceUsed: !!scriptureEvidenceUsed,
    activeTopicUsedAsContextOnly: !!activeTopicUsedAsContextOnly,
    evidenceTopic: evidenceTopic || null,
    validationPassed: validation?.passed ?? null,
    validationIssues: validation?.issues || [],
    errorMessage: errorMessage || null,
    approvedDoctrineFrozen: !!approvedDoctrineFrozen,
    discoveryReinforcementCount: discoveryReinforcementCount || 0,
    buildConnectionErrorReplyUsed: !!buildConnectionErrorReplyUsed,
    correctionRepair,
  };
}

module.exports = {
  isCoreRestorationDebugEnabled,
  buildCoreRestorationDebug,
};
