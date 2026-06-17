/**
 * Phase 4O — Session user correction memory for answer style preferences.
 */

const fs = require('fs');
const path = require('path');
const { addCorrectionPreference } = require('./doctrineConversationState');

const MEMORY_PATH = path.join(__dirname, '..', 'data', 'user-correction-memory.json');

const CORRECTION_PATTERNS = [
  {
    re: /\bwhy are you still saying yes\b/i,
    preference: { forbidYesOpener: true, requireNoForForbidden: true, yesNoDirect: true },
    label: 'why_still_saying_yes',
  },
  {
    re: /\bdon'?t (ever )?do (it|that) again\b/i,
    preference: { forbidYesOpener: true, requireNoForForbidden: true },
    label: 'dont_do_that_again',
  },
  {
    re: /\bdon'?t say yes before a question\b/i,
    preference: { forbidYesOpener: true, requireNoForForbidden: true },
    label: 'no_yes_before_question',
  },
  {
    re: /\byou didn'?t learn\b/i,
    preference: { forbidYesOpener: true, requireNoForForbidden: true },
    label: 'didnt_learn',
  },
  {
    re: /\bstop saying yes\b.*\bsay no\b/i,
    preference: { forbidYesOpener: true, requireNoForForbidden: true, yesNoDirect: true },
    label: 'stop_saying_yes_say_no',
  },
  {
    re: /\bsay no first\b/i,
    preference: { forbidYesOpener: true, requireNoForForbidden: true, yesNoDirect: true },
    label: 'say_no_first',
  },
  {
    re: /\bsay no and\b/i,
    preference: { forbidYesOpener: true, requireNoForForbidden: true, yesNoDirect: true },
    label: 'say_no_and_explanation',
  },
  {
    re: /\b(remember that i|i like) direct answers?\b/i,
    preference: { yesNoDirect: true, directAnswerFirst: true },
    label: 'direct_answers_first',
  },
  {
    re: /\banswer yes or no\b/i,
    preference: { yesNoDirect: true },
    label: 'yes_no_direct',
  },
  {
    re: /\bthat is confusing\b/i,
    preference: { yesNoDirect: true },
    label: 'confusing',
  },
  {
    re: /\blisten\b.*\b(answer|then)\b/i,
    preference: { listenFirst: true },
    label: 'listen_then_answer',
  },
  {
    re: /\bdon'?t say primarily\b/i,
    preference: { forbidPhrases: ['primarily', 'mainly', 'largely'] },
    label: 'no_primarily',
  },
  {
    re: /\bdon'?t say\b.*\binterpretations vary\b/i,
    preference: { forbidPhrases: ['interpretations vary', 'traditions vary', 'some christians believe'] },
    label: 'no_hedge',
  },
  {
    re: /\bdon'?t use parables\b.*\bdoctrine\b/i,
    preference: { forbidParableDoctrineProof: true },
    label: 'no_parable_doctrine',
  },
  {
    re: /\bstop saying\b/i,
    preference: { forbidYesOpener: true },
    label: 'stop_saying',
  },
];

const DEFAULT_PREFERENCES = {
  forbidYesOpener: false,
  requireNoForForbidden: false,
  yesNoDirect: false,
  listenFirst: false,
  forbidPhrases: ['primarily', 'mainly', 'largely', 'interpretations vary', 'traditions vary'],
  forbidParableDoctrineProof: true,
  directAnswerFirst: true,
  giveTwoThreeScriptures: true,
  companionWarmth: true,
};

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    }
  } catch {
    /* fresh */
  }
  return { users: {} };
}

function saveMemory(mem) {
  const dir = path.dirname(MEMORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2), 'utf8');
}

function mergePreferences(base, patch) {
  const next = { ...base };
  if (patch.forbidPhrases) {
    next.forbidPhrases = [...new Set([...(base.forbidPhrases || []), ...patch.forbidPhrases])];
  }
  for (const key of Object.keys(patch)) {
    if (key !== 'forbidPhrases') next[key] = patch[key];
  }
  return next;
}

function recordUserCorrection(userId, message = '') {
  const m = String(message || '').trim();
  if (!userId || !m) return null;

  const mem = loadMemory();
  if (!mem.users[userId]) {
    mem.users[userId] = { preferences: { ...DEFAULT_PREFERENCES }, corrections: [] };
  }

  let matched = null;
  for (const pat of CORRECTION_PATTERNS) {
    if (pat.re.test(m)) {
      matched = { ...pat.preference, label: pat.label, userMessage: m.slice(0, 200) };
      mem.users[userId].preferences = mergePreferences(mem.users[userId].preferences, pat.preference);
      const entry = {
        label: pat.label,
        userMessage: m.slice(0, 200),
        loggedAt: new Date().toISOString(),
      };
      const exists = mem.users[userId].corrections.some((c) => c.label === pat.label);
      if (!exists) mem.users[userId].corrections.push(entry);
      addCorrectionPreference(userId, {
        topic: 'answer_style',
        avoidPhrase: pat.label,
        preferredWording: 'Direct yes/no according to Scripture polarity',
      });
      break;
    }
  }

  saveMemory(mem);
  return matched;
}

function getUserAnswerPreferences(userId) {
  if (!userId) return { ...DEFAULT_PREFERENCES };
  const mem = loadMemory();
  const prefs = mem.users[userId]?.preferences;
  return prefs ? { ...DEFAULT_PREFERENCES, ...prefs } : { ...DEFAULT_PREFERENCES };
}

function applyUserAnswerPreferences(reply = '', context = {}) {
  let result = String(reply || '').trim();
  const prefs = context.userPreferences || getUserAnswerPreferences(context.userId);
  const message = context.message || '';

  if (prefs.forbidYesOpener || prefs.requireNoForForbidden) {
    if (/^yes\b/i.test(result) || /^yes[—,\-–]/i.test(result)) {
      const isForbidden =
        context.polarity === 'no' ||
        /\b(pork|unclean|fornication|swine)\b/i.test(message) ||
        /\b(pork|unclean|fornication)\b/i.test(result);
      if (isForbidden || prefs.forbidYesOpener) {
        result = result.replace(/^yes[—,\-–\s]*/i, '');
        if (!/^no\b/i.test(result.trim())) result = `No. ${result}`;
      }
    }
  }

  if (prefs.yesNoDirect && message && /\?/.test(message)) {
    const polarity = context.polarity;
    if (polarity === 'no' && !/^no\b/i.test(result)) {
      result = `No. ${result}`;
    } else if (polarity === 'yes' && !/^yes\b/i.test(result) && !/^no\b/i.test(result)) {
      result = `Yes. ${result}`;
    }
  }

  for (const phrase of prefs.forbidPhrases || []) {
    if (phrase && result.toLowerCase().includes(phrase.toLowerCase())) {
      result = result.replace(new RegExp(phrase, 'gi'), '').replace(/\s+/g, ' ').trim();
    }
  }

  return result.replace(/\bNo\.\s+No\./i, 'No.').trim();
}

function buildCorrectionAcknowledgment(message = '') {
  const m = String(message || '');
  if (/\bstop saying yes\b/i.test(m) || /\bsay no\b/i.test(m)) {
    return "You're right. I'll answer with a direct No or Yes first, then the Scripture explanation.";
  }
  if (/\blisten\b/i.test(m)) {
    return "I hear you. I'll listen to your question first and answer directly from Scripture.";
  }
  return "I hear your correction. I'll adjust how I answer.";
}

function isCorrectionMessage(message = '') {
  return CORRECTION_PATTERNS.some((p) => p.re.test(String(message || '')));
}

function clearUserPreferences(userId) {
  if (!userId) return false;
  const mem = loadMemory();
  if (!mem.users[userId]) {
    mem.users[userId] = { preferences: { ...DEFAULT_PREFERENCES }, corrections: [] };
  }
  mem.users[userId].preferences = {
    ...DEFAULT_PREFERENCES,
    directAnswerFirst: false,
    yesNoDirect: false,
    forbidYesOpener: false,
    requireNoForForbidden: false,
  };
  mem.users[userId].corrections = [];
  saveMemory(mem);
  return true;
}

module.exports = {
  recordUserCorrection,
  getUserAnswerPreferences,
  applyUserAnswerPreferences,
  buildCorrectionAcknowledgment,
  isCorrectionMessage,
  clearUserPreferences,
  CORRECTION_PATTERNS,
};
