const { DISTINCTION_LINE } = require('./historicalContextRouter');
const { polishCompanionReply } = require('./companionReplyPolish');
const { stripInternalRuntimeLabels } = require('./runtimeLabelStripper');
const { buildMetaAnswerResponse } = require('./metaAnswerResponder');

const SCRIPTURE_BLOCK = [
  'Scripture first:',
  '',
  'Genesis 2:2-3 — God rested on the seventh day and blessed it.',
  'Exodus 20:8-11 — the fourth commandment identifies the seventh day as the Sabbath of the LORD your God.',
  'Isaiah 58:13-14 — the Sabbath is connected to delight and honoring the LORD.',
  'Luke 4:16 — Yeshua kept the Sabbath as His custom.',
  'Acts 17:2 — Paul reasoned in the synagogue on the Sabbath.',
  'Hebrews 4:9 — a Sabbath rest remains for the people of God.',
  '',
  'Scripture identifies the seventh day as the Sabbath and does not record God changing the Sabbath to Sunday.',
].join('\n');

const HISTORICAL_CHAIN = [
  'Historical chain (secondary to Scripture):',
  '',
  'A. Early Christians in some places gathered on the first day for worship and fellowship, while many still honored the seventh-day Sabbath.',
  'B. In AD 321, Emperor Constantine issued a civil law making Sunday — the venerable day of the Sun — a day of rest across the Roman Empire.',
  'C. The Council of Laodicea (circa AD 364) later discouraged Sabbath rest and encouraged Christians to honor the Lord\'s Day (Sunday).',
  'D. Over time, Roman Catholic canon and liturgical authority made Sunday the normal day of obligation for worship in much of Western Christianity.',
  'E. Sunday observance became established through Roman civil authority and church authority over time — not by an explicit biblical command changing the Sabbath.',
].join('\n');

const SOURCES_REFS = [
  'Sources and references (historical, secondary):',
  '- Constantine, Codex Justinianus 3.12.2 (AD 321 Sunday rest law)',
  '- Council of Laodicea, Canon 29 (circa AD 364)',
  '- Eusebius, Life of Constantine (early first-day imperial favor)',
  '- Roman Catholic catechisms and liturgical tradition on Sunday obligation',
].join('\n');

function detectQuestionFocus(message = '') {
  const text = String(message || '');
  const lower = text.toLowerCase();

  const asksRome =
    /\brome\b/i.test(text) ||
    /\broman empire\b/i.test(lower) ||
    /\bconstantine\b/i.test(lower);

  const asksCatholic =
    /\broman catholic\b/i.test(lower) ||
    /\bcatholic church\b/i.test(lower) ||
    /\bchurch authority\b/i.test(lower) ||
    /\bperform the change\b/i.test(lower) ||
    /\bpope\b/i.test(lower) ||
    /\bpapa(l|cy)\b/i.test(lower) ||
    /\bvatican\b/i.test(lower);

  const asksWhoChanged =
    /\bwho changed\b/i.test(lower) ||
    /\bchanged (the )?sabbath\b/i.test(lower) ||
    /\bsaturday to sunday\b/i.test(lower) ||
    /\bsat to sun(day)?\b/i.test(lower) ||
    /\bwhy did (they|rome|the church|he|the pope)\b/i.test(lower);

  const asksWhySunday =
    /\bwhy\b.*\bsunday\b/i.test(lower) ||
    /\bworship (on )?sunday\b/i.test(lower) ||
    /\bsunday observance\b/i.test(lower) ||
    /\bday of worship\b/i.test(lower) ||
    /\bkeep sunday\b/i.test(lower);

  const asksEvidence =
    /\bhistorical evidence\b/i.test(lower) ||
    /\bgive me (the )?historical\b/i.test(lower) ||
    /\bhistorical (references|context|record)\b/i.test(lower);

  const isYesNo =
    /^(did|so did|was|is|does)\b/i.test(text.trim()) ||
    /\bdid rome\b/i.test(lower) ||
    /\bdid the roman catholic\b/i.test(lower);

  return {
    asksRome,
    asksCatholic,
    asksWhoChanged,
    asksWhySunday,
    asksEvidence,
    isYesNo,
  };
}

function buildAcknowledgment(message = '', correction = false, focus = {}) {
  if (correction) {
    return "You're right — I drifted back to the Sabbath definition. You asked a direct historical question, and I'll answer that now.";
  }

  const text = String(message || '');

  if (focus.asksCatholic && focus.isYesNo) {
    return 'Yes — you are asking whether Rome and later Roman church authority were involved in establishing Sunday observance instead of the seventh-day Sabbath.';
  }

  if (focus.asksRome && focus.isYesNo) {
    return 'Yes — you are asking whether Roman civil authority and later Roman church authority played a major role in shifting common Christian observance toward Sunday.';
  }

  if (focus.asksWhoChanged) {
    return 'You are asking who changed Sabbath observance from Saturday to Sunday — and whether that change came from Scripture or from later human authority.';
  }

  if (focus.asksWhySunday) {
    return 'You are asking why many Christians worship on Sunday rather than the biblical seventh-day Sabbath.';
  }

  if (focus.asksEvidence) {
    return 'You want the historical evidence for how Sunday observance became common — not a repeat of the Sabbath definition.';
  }

  if (/\brome\b|\broman\b|\bcatholic\b/i.test(text)) {
    return 'You are asking about Rome and Roman church authority in the shift from Sabbath to Sunday observance.';
  }

  return "You're asking the historical side — who changed Sabbath observance to Sunday and how that happened — not just what the Sabbath is.";
}

function buildDirectConclusion(focus = {}) {
  if (focus.asksCatholic || focus.asksRome || /\bpope\b/i.test(String(focus._message || ''))) {
    return [
      'Direct answer:',
      'Yes — later papal and Roman church authority helped preserve and normalize Sunday observance across much of Western Christianity.',
      'But history does not show one single pope personally changing God\'s Sabbath command by himself. The shift happened through Roman civil law (Constantine, AD 321), councils (Laodicea, circa AD 364), bishops, canon law, and church tradition over time.',
      'Scripture itself does not record God changing the seventh-day Sabbath to Sunday.',
    ].join('\n');
  }

  if (focus.asksWhoChanged || focus.asksWhySunday) {
    return [
      'Direct answer:',
      'Scripture does not name a person who changed the Sabbath. Historically, the shift toward Sunday happened gradually through early first-day gatherings, Roman civil law (Constantine, AD 321), the Council of Laodicea (circa AD 364), and later Roman Catholic liturgical authority.',
      'So if the question is whether Rome and Roman church authority helped establish Sunday observance, the historical answer is yes — but that is not the same as a biblical command from God.',
    ].join('\n');
  }

  return [
    'Direct answer:',
    'So if the question is, "Did Rome/Roman Catholic authority play a major role in changing common Christian observance from Sabbath to Sunday?" the historical answer is yes.',
    'But the Bible answer remains: God did not record a command changing the seventh-day Sabbath.',
  ].join('\n');
}

function buildSabbathHistoryDeepResponse({
  userId = 'anonymous',
  message = '',
  recentSessions = [],
  correction = false,
  runtimeContext = {},
  profile = {},
  questionIntent = null,
} = {}) {
  const focus = detectQuestionFocus(message);
  focus._message = message;
  const hasPriorSabbathTurn = (recentSessions || []).some((s) =>
    /sabbath|seventh day|who changed|historical|sunday|worship/i.test(String(s?.message || '') + String(s?.reply || ''))
  );
  const strictAnswerMode =
    !!questionIntent?.strictAnswerMode || !!runtimeContext?.reasoningSnapshot?.strictAnswerMode;
  const compactMode =
    strictAnswerMode ||
    correction ||
    focus.asksEvidence ||
    hasPriorSabbathTurn ||
    (hasPriorSabbathTurn && (focus.asksWhoChanged || focus.asksRome || focus.asksCatholic || focus.asksWhySunday));

  if (strictAnswerMode && runtimeContext?.reasoningSnapshot?.requestedAnswerType === 'wording_explanation') {
    return buildMetaAnswerResponse({
      userId,
      message,
      recentSessions,
      activeConversation: runtimeContext?.activeConversation,
      questionIntent,
      strictAnswerMode: true,
      correctionMode: correction,
    });
  }

  const companionLead = correction
    ? "I hear you — that wasn't your question. Let me answer what you actually asked, with Scripture first and history second."
    : focus.asksWhySunday
      ? "I hear what you're asking — not what the Sabbath is, but why many people keep Sunday instead."
      : "Let's answer that directly, with Scripture first and history second.";

  const acknowledgment = buildAcknowledgment(message, correction, focus);
  const directConclusion = buildDirectConclusion(focus);
  const distinction =
    'History can explain how the practice changed, but history cannot override Scripture.';

  const compactScripture = [
    'Scripture foundation:',
    'Genesis 2:2-3 and Exodus 20:8-11 identify the seventh day as the Sabbath. Scripture does not record God changing the Sabbath to Sunday.',
  ].join('\n');

  const parts = compactMode
    ? [companionLead, acknowledgment, directConclusion, HISTORICAL_CHAIN, compactScripture, distinction, SOURCES_REFS]
    : [companionLead, acknowledgment, SCRIPTURE_BLOCK, HISTORICAL_CHAIN, directConclusion, distinction, DISTINCTION_LINE, SOURCES_REFS];

  const reply = polishCompanionReply(stripInternalRuntimeLabels(parts.filter(Boolean).join('\n\n')));

  return {
    reply,
    scripture: [
      { reference: 'Genesis 2:2-3', text: '', reason: 'seventh day blessed and sanctified' },
      { reference: 'Exodus 20:8-11', text: '', reason: 'fourth commandment — seventh day is the Sabbath' },
      { reference: 'Isaiah 58:13-14', text: '', reason: 'Sabbath delight and honor' },
      { reference: 'Luke 4:16', text: '', reason: 'Yeshua kept the Sabbath' },
      { reference: 'Acts 17:2', text: '', reason: 'Paul in the synagogue on the Sabbath' },
      { reference: 'Hebrews 4:9', text: '', reason: 'Sabbath rest remains' },
    ],
    mode: 'study',
    confidence: 'high',
    memory_used: false,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: [
      'Compare Genesis 2:2-3 and Exodus 20:8-11 first.',
      'Review Constantine AD 321 and Council of Laodicea separately from Scripture.',
    ],
    admin_flags: ['sabbath_history_deep'],
    runtime: {
      intent: 'sabbath_history',
      emotion: runtimeContext?.emotion,
      sabbathIntent: {
        topic: 'sabbath',
        intent: correction ? 'correction' : 'history_deep',
        correction,
        recentSessionsUsed: recentSessions.length,
      },
      questionIntent: questionIntent || runtimeContext?.questionIntent || null,
      historicalContext: {
        secondary: true,
        deep: true,
        chainSteps: ['early_first_day', 'constantine_321', 'laodicea', 'catholic_liturgy', 'gradual_establishment'],
      },
      companionPresentation: {
        wrapped: true,
        historicalSecondary: true,
        labelsHidden: true,
        sabbathHistoryDeep: true,
        skipRelationshipEnrichment: true,
      },
      intercept: 'sabbath_history_companion',
      presenter: 'sabbathHistoryDeepResponder',
    },
    quality: { score: 97, issues: [], passed: true },
  };
}

module.exports = {
  buildSabbathHistoryDeepResponse,
  detectQuestionFocus,
  buildAcknowledgment,
  SCRIPTURE_BLOCK,
  HISTORICAL_CHAIN,
};
