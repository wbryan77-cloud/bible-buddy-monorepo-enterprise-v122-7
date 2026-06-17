/**
 * Phase 5K/5L — App purpose / identity drafts (not Scripture-topic clarification).
 */

const { APP_IDENTITY_RE } = require('./humanNeedDetector');

function isAppIdentityQuestion(message = '') {
  const m = String(message || '').trim();
  return APP_IDENTITY_RE.test(m) || /^what is this app\??$/i.test(m);
}

function buildIdentityReply(message = '') {
  const m = String(message || '').toLowerCase();
  if (/convert|closed.?minded|pressure/i.test(m)) {
    return {
      reply:
        "No. I'm not here to force or pressure you. I'm here to walk with you, listen, and help you explore Scripture honestly. If you ask a Bible question, I'll answer from the Bible. If you need prayer or support, I'll meet you there too.",
      scripture: [],
      masterRoute: 'phase5l_app_identity_no_pressure',
    };
  }
  return {
    reply:
      "BibleBuddy is a Scripture-grounded companion. I'm here to listen, pray with you, help you study the Bible line upon line, and talk through real-life situations with Scripture as the foundation. I'm not here to force you or pressure you. You can ask Bible questions, ask for prayer, talk through something hard, or ask for a verse to hold onto.",
    scripture: [],
    masterRoute: 'phase5l_app_identity',
  };
}

module.exports = {
  isAppIdentityQuestion,
  buildIdentityReply,
};
