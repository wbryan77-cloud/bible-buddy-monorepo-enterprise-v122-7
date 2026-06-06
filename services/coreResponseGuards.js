/**
 * Detect and strip dangerous fallback/template speakers from final replies.
 */

const DANGEROUS_FALLBACK_PATTERNS = [
  { id: 'study_general', re: /You've been studying\s+general\b/i },
  { id: 'study_topic', re: /You've been studying [^.\n]+\.\s*We can continue that study/i },
  { id: 'study_frequently', re: /You've been studying [^.\n]+ frequently\./i },
  { id: 'continue_study', re: /We can continue that study/i },
  { id: 'continue_your_study', re: /continue your study journey/i },
  { id: 'if_it_would_help_study', re: /If it would help, we could continue your study/i },
  { id: 'witness_establishes', re: /establishes the matter/i },
  { id: 'witness_confirms', re: /confirms it alongside Scripture/i },
  { id: 'witness_carries', re: /carries the theme forward/i },
  { id: 'pray_glad', re: /glad you asked to pray/i },
  { id: 'pray_since', re: /How have you been doing since we prayed/i },
  { id: 'psalm_46_loop', re: /^God is our refuge and strength, a very present help in trouble\.\s*$/im },
  { id: 'genesis_revelation_path', re: /Genesis-to-Revelation Study Path/i },
  { id: 'witness_path_label', re: /Witness path:/i },
  { id: 'tell_me_more', re: /I'm here with you\. Tell me a little more\./i },
];

const STUDY_LOOP_PATTERNS = [
  /You've been studying/i,
  /Would you like to continue studying this topic together/i,
  /continue your study journey/i,
];

const PRAYER_TEMPLATE_PATTERNS = [/glad you asked to pray/i, /bring this before the Lord together/i];

const WITNESS_TEMPLATE_PATTERNS = [
  /establishes the matter/i,
  /confirms it alongside Scripture/i,
  /carries the theme forward/i,
];

function detectDangerousFallbackSpeaker(reply = '') {
  const text = String(reply || '');
  const hits = DANGEROUS_FALLBACK_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.id);
  return {
    detected: hits.length > 0,
    hits,
    studyLoopUsed: STUDY_LOOP_PATTERNS.some((p) => p.test(text)),
    prayerTemplateUsed: PRAYER_TEMPLATE_PATTERNS.some((p) => p.test(text)),
    scriptureWitnessTemplateUsed: WITNESS_TEMPLATE_PATTERNS.some((p) => p.test(text)),
  };
}

function stripDangerousFallbackSpeaker(reply = '') {
  let text = String(reply || '');
  const blocks = [
    /You've been studying[^.!?]*[.!?]\s*/gi,
    /We can continue that study[^.!?]*[.!?]\s*/gi,
    /If it would help, we could continue your study[^.!?]*[.!?]\s*/gi,
    /Would you like to continue studying this topic together\??\s*/gi,
    /When we last spoke you mentioned[^.!?]*[.!?]\s*/gi,
    /[^.!?]*establishes the matter[^.!?]*[.!?]\s*/gi,
    /[^.!?]*confirms it alongside Scripture[^.!?]*[.!?]\s*/gi,
    /[^.!?]*carries the theme forward[^.!?]*[.!?]\s*/gi,
    /Witness path:[^\n]*\n?/gi,
  ];
  for (const p of blocks) {
    text = text.replace(p, '');
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

const CONNECTION_ERROR_USER_MESSAGE =
  "I'm having trouble reaching the AI service right now. Please try again in a moment.";

function buildConnectionErrorReply({ error = 'unknown', safety = {} } = {}) {
  const detail = String(error || 'unknown').slice(0, 120);
  return {
    reply: CONNECTION_ERROR_USER_MESSAGE,
    scripture: [],
    mode: 'companion',
    confidence: 'low',
    memory_used: false,
    safety_level: safety.level || 'standard',
    admin_flags: ['core_connection_error'],
    runtime: {
      masterRoute: 'core_connection_error',
      openAiCalled: false,
      connectionError: detail,
      buildConnectionErrorReplyUsed: true,
      companionPresentation: {
        skipRelationshipEnrichment: true,
        skipStudyPrompts: true,
      },
    },
  };
}

module.exports = {
  DANGEROUS_FALLBACK_PATTERNS,
  CONNECTION_ERROR_USER_MESSAGE,
  detectDangerousFallbackSpeaker,
  stripDangerousFallbackSpeaker,
  buildConnectionErrorReply,
};
