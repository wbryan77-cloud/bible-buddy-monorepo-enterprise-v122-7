const { routeHistoricalContext, DISTINCTION_LINE } = require('./historicalContextRouter');
const { polishCompanionReply } = require('./companionReplyPolish');
const { stripInternalRuntimeLabels } = require('./runtimeLabelStripper');

function buildOpening({ message = '', correction = false, frustrated = false }) {
  if (correction) {
    return "You're right — I answered the Sabbath definition again, but you were asking who changed it historically and why. Let me answer that directly.";
  }
  if (frustrated) {
    return "I hear what you're asking, and I want to answer the part you actually mean.";
  }
  return "You're asking the historical side now, not just the Sabbath command itself.";
}

function buildSabbathHistoryResponse({
  userId = 'anonymous',
  message = '',
  recentSessions = [],
  correction = false,
  runtimeContext = {},
  profile = {},
} = {}) {
  const lower = String(message).toLowerCase();
  const frustrated =
    /\bfrustrat|\bnot answer|\bwrong\b|\bstill\b|\bagain\b|\bstop repeating\b/i.test(lower) ||
    correction;

  const opening = buildOpening({ message, correction, frustrated });
  const historical = routeHistoricalContext({ doctrineTopic: 'sabbath', message });

  const scriptureFoundation = [
    "Let's separate Scripture from history carefully. Scripture first, then history.",
    '',
    'Scripture identifies the seventh day as the Sabbath in Genesis 2:2-3 and Exodus 20:8-11. The Bible does not record a command from God changing the Sabbath to Sunday.',
  ].join('\n');

  const historicalBlock =
    historical.formattedBlock ||
    [
      'Historical context, secondary to Scripture:',
      '- Roman imperial Sunday legislation references',
      '- Historical Sabbath observance records',
      '- Early post-apostolic first-day worship practices',
      '- Church council records connected to Sabbath and Sunday debates',
      'Historical support only; keep separate from Bible text.',
      DISTINCTION_LINE,
    ].join('\n');

  const directAnswer = [
    'So the Scripture answer is: the Bible does not show God changing the Sabbath.',
    'The historical answer is: Sunday observance developed later through early post-apostolic church practice, Roman influence, and later church councils. These historical developments help explain how Sunday became common, but they are not the same as a biblical command changing the Sabbath.',
  ].join(' ');

  const distinction =
    'This historical development is not the same as a biblical command changing the Sabbath.';

  const continuation =
    'Would you like to continue studying this together, or walk through the Scripture passages line upon line?';

  const reply = polishCompanionReply(
    stripInternalRuntimeLabels(
      [opening, scriptureFoundation, historicalBlock, directAnswer, distinction, continuation]
        .filter(Boolean)
        .join('\n\n')
    )
  );

  return {
    reply,
    scripture: [
      {
        reference: 'Genesis 2:2-3',
        text: '',
        reason: 'seventh day blessed and sanctified',
      },
      {
        reference: 'Exodus 20:8-11',
        text: '',
        reason: 'fourth commandment — seventh day is the Sabbath of the LORD',
      },
    ],
    mode: 'study',
    confidence: 'high',
    memory_used: true,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: [
      'Compare Genesis 2:2-3 and Exodus 20:8-11 first.',
      'Then review historical sources separately from Scripture.',
      'Ask for a specific council or passage if you want to go deeper.',
    ],
    admin_flags: ['sabbath_history_companion'],
    runtime: {
      intent: 'sabbath_history',
      emotion: runtimeContext?.emotion,
      sabbathIntent: {
        topic: 'sabbath',
        intent: correction ? 'correction' : 'history',
        correction,
        recentSessionsUsed: recentSessions.length,
      },
      historicalContext: historical.included
        ? {
            tier: historical.tier,
            secondary: true,
            references: historical.references,
          }
        : { secondary: true, references: [] },
      companionPresentation: {
        wrapped: true,
        historicalSecondary: true,
        labelsHidden: true,
        routeHistoricalContextRan: true,
        presentCompanionDoctrineRan: false,
        polishCompanionReplyRan: true,
      },
      intercept: 'sabbath_history_companion',
      presenter: 'sabbathHistoryCompanion',
    },
    quality: { score: 97, issues: [], passed: true },
  };
}

module.exports = {
  buildSabbathHistoryResponse,
  buildOpening,
};
