/**
 * Phase 4D.3 — Correction memory (session learning without corpus mutation).
 */

const fs = require('fs');
const path = require('path');
const { addCorrectionPreference } = require('./doctrineConversationState');

const MEMORY_PATH = path.join(__dirname, '..', 'data', 'doctrine-correction-memory.json');

const BUILTIN_CORRECTIONS = {
  acts_10: [
    {
      avoidPhrase: 'primarily',
      preferredWording:
        'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean.',
      topic: 'acts_10',
      validatedByContract: true,
    },
    {
      avoidPhrase: 'mainly',
      preferredWording:
        'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean.',
      topic: 'acts_10',
      validatedByContract: true,
    },
    {
      avoidPhrase: 'while it mentions food',
      preferredWording: 'Acts 10 is about people/Gentiles. Peter explains that in Acts 10:28.',
      topic: 'acts_10',
      validatedByContract: true,
    },
    {
      avoidPhrase: 'broader point',
      preferredWording: 'Acts 10 is about Gentiles/people, as Peter explains in Acts 10:28 and Acts 11:1-18.',
      topic: 'acts_10',
      validatedByContract: true,
    },
    {
      avoidPhrase: 'not just',
      preferredWording: 'Acts 10 is about people/Gentiles. Peter explains that in Acts 10:28.',
      topic: 'acts_10',
      validatedByContract: true,
    },
    {
      avoidPhrase: 'jewish dietary',
      preferredWording: 'Acts 10 is about people/Gentiles, not permission to eat unclean food.',
      topic: 'acts_10',
      validatedByContract: true,
    },
  ],
  dietary_law: [
    {
      avoidPhrase: 'primarily',
      preferredWording:
        'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean.',
      topic: 'acts_10',
      validatedByContract: true,
    },
  ],
  death_state: [
    {
      avoidPhrase: 'soul continues',
      preferredWording:
        'Scripture describes the dead as knowing nothing until resurrection — Ecclesiastes 9:5, Psalm 146:4, John 11:11-14.',
      topic: 'death_state',
      validatedByContract: true,
    },
    {
      avoidPhrase: 'continued existence after death',
      preferredWording: 'The dead know nothing and are described as asleep until resurrection.',
      topic: 'death_state',
      validatedByContract: true,
    },
  ],
};

const CORRECTION_MESSAGE_PATTERNS = [
  { re: /why are you saying (primarily|mainly|largely)/i, avoid: 'primarily', topic: 'acts_10' },
  { re: /stop saying/i, avoid: 'hedge phrase', topic: 'acts_10' },
  { re: /that is confusing/i, avoid: 'confusing hedge', topic: 'acts_10' },
  { re: /it is about people, not food/i, avoid: 'food framing', topic: 'acts_10', preferred: 'Acts 10 is about people/Gentiles. Peter explains that in Acts 10:28.' },
  { re: /peter explains it in acts\s*10:28/i, avoid: 'missing Acts 10:28', topic: 'acts_10', preferred: 'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean.' },
];

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

function getCorrectionsForUser(userId, topic) {
  const mem = loadMemory();
  const userCorrections = mem.users[userId]?.corrections || [];
  const builtin = BUILTIN_CORRECTIONS[topic] || [];
  const actsBuiltin = topic === 'dietary_law' ? BUILTIN_CORRECTIONS.acts_10 || [] : [];
  const topicCorrections = userCorrections.filter((c) => c.topic === topic || c.topic === 'acts_10');
  return [...builtin, ...actsBuiltin, ...topicCorrections];
}

function logDoctrineCorrection({
  userId,
  topic,
  avoidPhrase,
  preferredWording,
  userMessage = '',
  validatedByContract = true,
} = {}) {
  const mem = loadMemory();
  if (!mem.users[userId]) mem.users[userId] = { corrections: [] };
  const entry = {
    topic,
    avoidPhrase,
    preferredWording,
    userMessage: String(userMessage).slice(0, 200),
    validatedByContract,
    loggedAt: new Date().toISOString(),
  };
  const exists = mem.users[userId].corrections.some(
    (c) => c.topic === topic && c.avoidPhrase === avoidPhrase,
  );
  if (!exists) mem.users[userId].corrections.push(entry);
  saveMemory(mem);
  if (userId) {
    addCorrectionPreference(userId, entry);
  }
  return entry;
}

function buildCorrectionPromptAppendix(userId, topic) {
  const corrections = getCorrectionsForUser(userId, topic);
  if (!corrections.length) return '';
  const lines = corrections.map(
    (c) => `Avoid "${c.avoidPhrase}". Use: "${c.preferredWording}"`,
  );
  return `USER/SESSION CORRECTION MEMORY:\n${lines.join('\n')}`;
}

function detectCorrectionFromMessage(message = '', topic = '') {
  const m = String(message).trim();
  for (const pat of CORRECTION_MESSAGE_PATTERNS) {
    if (pat.re.test(m)) {
      return {
        avoidPhrase: pat.avoid,
        topic: pat.topic || topic || 'acts_10',
        preferredWording: pat.preferred,
      };
    }
  }
  if (/why are you saying (primarily|mainly|largely)/i.test(m)) {
    return { avoidPhrase: m.match(/saying\s+(\w+)/i)?.[1]?.toLowerCase() || 'primarily', topic: 'acts_10' };
  }
  if (/why did you say/i.test(m)) {
    const phrase = m.match(/say\s+["']?([^"'.?]+)/i)?.[1]?.trim();
    if (phrase) return { avoidPhrase: phrase, topic };
  }
  return null;
}

function buildActs10CorrectionReply() {
  return {
    reply:
      "You are right. I should not use 'primarily.' Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about people/Gentiles, not permission to eat unclean foods.",
    scripture: [
      { reference: 'Acts 10:28', theme: 'acts_10' },
      { reference: 'Acts 11:1-18', theme: 'acts_10' },
    ],
    doctrineCorrectionApplied: true,
  };
}

function applyCorrectionsToReply(reply = '', userId, topic) {
  let text = String(reply);
  const corrections = getCorrectionsForUser(userId, topic);
  for (const c of corrections) {
    if (c.avoidPhrase && text.toLowerCase().includes(c.avoidPhrase.toLowerCase())) {
      if (c.preferredWording && c.avoidPhrase.length > 3) {
        text = text.replace(new RegExp(c.avoidPhrase, 'gi'), '');
      }
    }
  }
  return text.replace(/\s{2,}/g, ' ').trim();
}

module.exports = {
  getCorrectionsForUser,
  logDoctrineCorrection,
  buildCorrectionPromptAppendix,
  detectCorrectionFromMessage,
  buildActs10CorrectionReply,
  applyCorrectionsToReply,
  BUILTIN_CORRECTIONS,
  CORRECTION_MESSAGE_PATTERNS,
};
