/**
 * Composer guidance facts — not user-facing prose.
 */

const { isMetaAboutPreviousAnswer } = require('./questionIntentResolver');

function isYesNoDirectQuestion(message = '') {
  const t = String(message || '');
  return (
    /\b(yes or no|so yes or no)\b/i.test(t) ||
    (/^(can|should|may|is|are|do|does|did)\b/i.test(t.trim()) && /\?/.test(t)) ||
    /\bcan i eat\b/i.test(t) ||
    /\bshould i eat\b/i.test(t)
  );
}

function isSearchCapabilityQuestion(message = '') {
  return /\bcan you search\b/i.test(String(message || '')) && /\bbible|scripture|directly\b/i.test(String(message || ''));
}

function isHowManyQuestion(message = '') {
  return /\bhow many\b/i.test(String(message || ''));
}

function isDirectQuestion(message = '') {
  const t = String(message || '').trim();
  return (
    isYesNoDirectQuestion(t) ||
    isSearchCapabilityQuestion(t) ||
    isHowManyQuestion(t) ||
    /^(what|where|why|how|who|when|is|are|can|should|did|do|does)\b/i.test(t) ||
    /\b(what is|where does it say|how do i|how do we|just answer)\b/i.test(t)
  );
}

function isHomeworkQuestion(message = '') {
  return /\b(homework|assignment|essay|paper due|study for class|before school)\b/i.test(String(message || ''));
}

function isWordingOrNameQuestion(message = '') {
  const t = String(message || '');
  return (
    isMetaAboutPreviousAnswer(t) ||
    /\bwhy do you say\b/i.test(t) ||
    /\bwhy (are you|did you) (say|call|use)\b/i.test(t) ||
    /\byahweh\b/i.test(t) ||
    /\binstead of jesus\b/i.test(t) ||
    /\bwording\b/i.test(t)
  );
}

function isNewQuestionOverridesProfile(message = '') {
  const t = String(message || '');
  return (
    isDirectQuestion(t) ||
    isHomeworkQuestion(t) ||
    isWordingOrNameQuestion(t) ||
    /\b(didn'?t ask|not what i asked|won'?t you answer|you didn'?t answer|correction)\b/i.test(t) ||
    /\b(grief|alzheimer|homework|pork|swine|heaven|sabbath|easter|tradition)\b/i.test(t)
  );
}

function buildAnswerGuidance(message = '', evidencePack = {}) {
  const practicalSabbathHow = !!evidencePack.practicalSabbathHow;
  const explicitHistorical = !!evidencePack.explicitHistorical;
  const historyAllowed = evidencePack.historyAllowed === true;
  const wording = isWordingOrNameQuestion(message);
  const yesNo = isYesNoDirectQuestion(message);
  const homework = isHomeworkQuestion(message);
  const searchCap = isSearchCapabilityQuestion(message);
  const howMany = isHowManyQuestion(message);
  const correction =
    !!evidencePack.correctionLedger?.active ||
    !!evidencePack.understanding?.isCorrection ||
    /\b(didn'?t ask|not what i asked|won'?t you answer|you'?re glitching|reconnect|you didn'?t answer)\b/i.test(message);

  const guidance = {
    directAnswerFirst: isDirectQuestion(message) || correction || yesNo || wording || homework || searchCap,
    requireYesNoLead: yesNo,
    requireHowManyLead: howMany,
    requireSearchCapabilityAnswer: searchCap,
    forbidSundayHistory: practicalSabbathHow || wording || yesNo || homework || searchCap || howMany,
    forbidSabbathHistoryChain: wording || yesNo || homework || practicalSabbathHow || searchCap || howMany,
    allowHistoryEvidence: historyAllowed && explicitHistorical && !practicalSabbathHow && !wording,
    currentIntent: evidencePack.currentIntent || null,
    historyAllowed,
    forbidStudyContinuation: true,
    suppressPriorStudyTopic: isNewQuestionOverridesProfile(message),
    focus: null,
  };

  if (practicalSabbathHow) guidance.focus = 'sabbath_how_observe';
  else if (wording) guidance.focus = 'wording_or_divine_names';
  else if (yesNo) guidance.focus = 'yes_no_scripture_first';
  else if (searchCap) guidance.focus = 'search_capability_honest';
  else if (howMany) guidance.focus = 'how_many_bible_teaching';
  else if (homework) guidance.focus = 'homework_help';
  else if (evidencePack.topic === 'dietary_law') guidance.focus = 'dietary_law_scripture';
  else if (/heaven/i.test(message)) guidance.focus = 'heavens_bible_teaching';
  else if (/logos|old testament.*jesus|jesus.*old testament/i.test(message)) {
    guidance.focus = 'messiah_logos_identity';
  } else if (/easter|christmas|tradition/i.test(message)) guidance.focus = 'traditions_scripture';

  if (correction) {
    guidance.directAnswerFirst = true;
    guidance.forbidStudyContinuation = true;
    guidance.forbidSabbathHistoryChain = true;
    guidance.suppressPriorStudyTopic = true;
  }

  return guidance;
}

module.exports = {
  buildAnswerGuidance,
  isYesNoDirectQuestion,
  isDirectQuestion,
  isHomeworkQuestion,
  isWordingOrNameQuestion,
  isSearchCapabilityQuestion,
  isHowManyQuestion,
  isNewQuestionOverridesProfile,
};
