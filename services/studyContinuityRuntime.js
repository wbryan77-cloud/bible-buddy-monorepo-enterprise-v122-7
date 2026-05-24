const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STUDY_FILE = path.join(DATA_DIR, 'buddy-study-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const TOPIC_REFERENCES = {
  sabbath: ['Genesis 2:1-3', 'Exodus 20:8-11', 'Isaiah 58:13-14', 'Luke 4:16', 'Acts 13:42-44', 'Hebrews 4:9'],
  food: ['Leviticus 11:1-47', 'Deuteronomy 14:1-21', 'Daniel 1:8-16', 'Acts 10:14', 'Acts 10:28', 'Acts 11:1-18', 'Isaiah 66:15-17'],
  law: ['Matthew 5:17-19', 'Daniel 9:26-27', 'Matthew 27:50-51', 'Romans 3:31', 'Hebrews 7:11-28', 'Hebrews 9:1-28', 'Hebrews 10:1-18'],
  prophecy: ['Daniel 2:31-45', 'Daniel 7:1-28', 'Matthew 24:1-31', 'Revelation 13:1-18', 'Revelation 17:1-18'],
  resurrection: ['Daniel 12:1-3', 'John 5:24-29', '1 Corinthians 15:1-58', '1 Thessalonians 4:13-18', 'Revelation 20:1-15'],
  order: ['Leviticus 10:10-11', 'Deuteronomy 33:10', 'Malachi 2:7', '1 Corinthians 11:1-16', '1 Corinthians 14:26-40', '1 Timothy 2:8-15'],
  samaritan: ['2 Kings 17:24-41', 'Ezra 4:1-6', 'Nehemiah 2:19-20', 'Nehemiah 4:1-3', 'John 4:7-26'],
};

function readStore() {
  try {
    if (!fs.existsSync(STUDY_FILE)) return {};
    return JSON.parse(fs.readFileSync(STUDY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(STUDY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Study continuity write failed:', error.message);
  }
}

function detectStudyTopic(message = '') {
  const lower = String(message).toLowerCase();
  if (lower.includes('remember') || lower.includes('last conversation') || lower.includes('previous')) return 'memory';
  if (lower.includes('sabbath')) return 'sabbath';
  if (lower.includes('unclean') || lower.includes('dietary') || lower.includes('swine') || lower.includes('pork') || lower.includes('food')) return 'food';
  if (lower.includes('law') || lower.includes('sacrifice') || lower.includes('priesthood') || lower.includes('veil')) return 'law';
  if (lower.includes('prophecy') || lower.includes('revelation') || lower.includes('daniel') || lower.includes('beast')) return 'prophecy';
  if (lower.includes('resurrection') || lower.includes('death') || lower.includes('dead')) return 'resurrection';
  if (lower.includes('teach') || lower.includes('teacher') || lower.includes('women') || lower.includes('covering')) return 'order';
  if (lower.includes('samaritan') || lower.includes('samaria') || lower.includes('nehemiah')) return 'samaritan';
  if (lower.includes('bible') || lower.includes('scripture') || lower.includes('verse')) return 'general';
  return null;
}

function getStudyContext({ userId, message }) {
  const topic = detectStudyTopic(message);
  const store = readStore();
  const user = store[userId] || { studies: [] };
  const prior = Array.isArray(user.studies) ? user.studies.slice(-10) : [];
  const refs = topic === 'memory'
    ? Array.from(new Set(prior.flatMap((item) => item.references || []))).slice(-30)
    : (TOPIC_REFERENCES[topic] || []);

  return {
    enabled: !!topic,
    topic: topic || 'companion',
    references: refs,
    prior,
    memoryUsed: prior.length > 0,
  };
}

function saveStudyContext({ userId, message, response, context }) {
  if (!context?.enabled) return;
  const store = readStore();
  const user = store[userId] || { studies: [] };
  const studies = Array.isArray(user.studies) ? user.studies : [];

  studies.push({
    topic: context.topic,
    message: String(message || '').slice(0, 500),
    references: context.references || [],
    replyPreview: String(response?.reply || '').slice(0, 500),
    at: new Date().toISOString(),
  });

  store[userId] = {
    ...user,
    studies: studies.slice(-50),
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
}

function buildStudyFallback(context) {
  const refs = context.references || [];
  const priorCount = context.prior?.length || 0;
  return {
    reply: [
      `Topic: ${context.topic}`,
      refs.length ? `Primary Scripture Chain: ${refs.join('; ')}` : 'Primary Scripture Chain: No direct chain found yet.',
      `Prior Study Continuity: ${priorCount ? `${priorCount} prior study note(s) found for this user.` : 'No stored prior study found yet.'}`,
      'Continuity Notes: This answer is using stored study continuity before generic conversation.'
    ].join('\n\n'),
    scripture: refs.map((reference) => ({ reference, text: '', reason: 'study continuity reference' })),
    mode: 'study',
    confidence: refs.length ? 'high' : 'medium',
    memory_used: priorCount > 0,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: ['Continue this topic with the next related Scripture chain.'],
    admin_flags: [],
  };
}

module.exports = {
  getStudyContext,
  saveStudyContext,
  buildStudyFallback,
};
