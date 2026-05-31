const SABBATH_HISTORY_PATTERNS = [
  /\bwho changed (the )?sabbath\b/i,
  /\bwhy (do )?(some|people|christians|many)\b.*\bsunday\b/i,
  /\bwhy\b.*\bsunday\b/i,
  /\bchanged (to|the)?\s*sunday\b/i,
  /\bhistorical (references|evidence|context|record)\b/i,
  /\bgive me (the )?historical\b/i,
  /\bconstantine\b/i,
  /\bcouncil of laodicea\b/i,
  /\broman church\b/i,
  /\bfirst day worship\b/i,
  /\bsunday worship\b/i,
  /\bsabbath.*\bhistory\b/i,
  /\bhistory of (the )?sabbath\b/i,
  /\bwhen did (the )?sabbath change\b/i,
  /\bwho moved (the )?sabbath\b/i,
];

const SABBATH_DEFINITION_PATTERNS = [
  /^what is the sabbath\b/i,
  /\bwhat (is|does) (the )?sabbath\b/i,
  /\bseventh day sabbath\b/i,
  /\blord'?s sabbath\b/i,
  /\bfourth commandment\b/i,
  /\bdefine (the )?sabbath\b/i,
];

const CORRECTION_PATTERNS = [
  /\bthat was not my question\b/i,
  /\bnot my question\b/i,
  /\bnot what i asked\b/i,
  /\byou repeated\b/i,
  /\bwrong answer\b/i,
  /\bthat'?s not what i\b/i,
  /\bthat is not what i\b/i,
  /\byou didn'?t answer\b/i,
  /\bthat wasn'?t my question\b/i,
];

const SABBATH_CONTEXT_FOLLOWUP_PATTERNS = [
  /\bhistorical (references|evidence|context|record)\b/i,
  /\bgive me (the )?historical\b/i,
  /\bwho changed\b/i,
  /\bwhy sunday\b/i,
  /\bmore (history|evidence|references)\b/i,
  /\bwhat about (the )?history\b/i,
];

function hasRecentSabbathContext(recentSessions = []) {
  return (recentSessions || []).some((session) => {
    const msg = String(session?.message || '');
    const reply = String(session?.reply || '');
    const topic =
      session?.runtime?.doctrineTopic ||
      session?.structured?.runtime?.doctrineTopic ||
      session?.runtime?.sabbathIntent?.topic ||
      '';
    return (
      /sabbath/i.test(msg) ||
      /sabbath/i.test(reply) ||
      topic === 'sabbath' ||
      session?.runtime?.intent === 'sabbath_history'
    );
  });
}

function isSabbathCorrectionIntent(message = '') {
  return CORRECTION_PATTERNS.some((pattern) => pattern.test(String(message)));
}

function isSabbathHistoryIntent(message = '', recentSessions = []) {
  const text = String(message || '');
  if (SABBATH_HISTORY_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }
  if (hasRecentSabbathContext(recentSessions) && SABBATH_CONTEXT_FOLLOWUP_PATTERNS.some((p) => p.test(text))) {
    return true;
  }
  return false;
}

function isSabbathDefinitionIntent(message = '') {
  const text = String(message || '');
  if (!/\bsabbath\b/i.test(text) && !/\bseventh day\b/i.test(text) && !/\bfourth commandment\b/i.test(text)) {
    return false;
  }
  if (isSabbathHistoryIntent(text)) {
    return false;
  }
  return SABBATH_DEFINITION_PATTERNS.some((pattern) => pattern.test(text)) || /\bsabbath\b/i.test(text);
}

function resolveSabbathCompanionIntent({ message = '', recentSessions = [] } = {}) {
  const text = String(message || '');
  const correction = isSabbathCorrectionIntent(text);
  const recentSabbath = hasRecentSabbathContext(recentSessions);

  if (correction && (recentSabbath || /\b(historically|who changed|historical)\b/i.test(text))) {
    return {
      intent: 'correction',
      topic: 'sabbath',
      correction: true,
      historyFollowUp: true,
      recentSabbathContext: recentSabbath,
    };
  }

  if (isSabbathHistoryIntent(text, recentSessions)) {
    return {
      intent: 'history',
      topic: 'sabbath',
      correction: false,
      historyFollowUp: true,
      recentSabbathContext: recentSabbath || /\bsabbath\b/i.test(text),
    };
  }

  if (isSabbathDefinitionIntent(text)) {
    return {
      intent: 'definition',
      topic: 'sabbath',
      correction: false,
      historyFollowUp: false,
      recentSabbathContext: false,
    };
  }

  return {
    intent: null,
    topic: null,
    correction: false,
    historyFollowUp: false,
    recentSabbathContext: recentSabbath,
  };
}

module.exports = {
  resolveSabbathCompanionIntent,
  isSabbathHistoryIntent,
  isSabbathDefinitionIntent,
  isSabbathCorrectionIntent,
  hasRecentSabbathContext,
  SABBATH_HISTORY_PATTERNS,
  CORRECTION_PATTERNS,
};
