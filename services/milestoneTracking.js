const fs = require('fs');
const path = require('path');
const { getRelationshipMemory, getRelationshipMemoryByCategory } = require('./runtimeRelationshipMemoryEngine');
const { getPrayerContinuity } = require('./runtimePrayerContinuityEngine');
const { getLifeTimeline } = require('./lifeTimelineMemory');
const { analyzeEmotionalArc } = require('./emotionalArcEngine');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MILESTONE_FILE = path.join(DATA_DIR, 'companion-milestones.json');

const ACK_WINDOW_MS = 7 * 86400000;

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(MILESTONE_FILE)) return {};
    return JSON.parse(fs.readFileSync(MILESTONE_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(MILESTONE_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Milestone write failed:', error.message);
  }
}

function recordMilestone({ userId, category, label, detail = '' }) {
  const store = readStore();
  const milestones = store[userId] || [];

  const key = `${category}:${label}`;
  const exists = milestones.some((m) => `${m.category}:${m.label}` === key);
  if (exists) return null;

  const entry = {
    category,
    label,
    detail: String(detail).slice(0, 200),
    achievedAt: new Date().toISOString(),
  };

  milestones.push(entry);
  store[userId] = milestones.slice(-60);
  writeStore(store);
  return entry;
}

function getMilestones(userId, limit = 15) {
  return (readStore()[userId] || []).slice(-limit);
}

function detectStudyMilestone(doctrineTopic = '', sessionCount = 0) {
  const labels = {
    sabbath: 'completed Sabbath study milestone',
    feast_days: 'completed Feast Days study milestone',
    kingdom: 'completed Kingdom study milestone',
    resurrection_timeline: 'completed Resurrection study milestone',
    messiah: 'completed Messiah study milestone',
    covenant: 'completed Covenant study milestone',
  };
  if (sessionCount >= 2 && labels[doctrineTopic]) {
    return { category: 'study', label: labels[doctrineTopic] };
  }
  return null;
}

function normalizeTopic(text = '') {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
}

function prayerTopicKey(message = '') {
  const text = normalizeTopic(message);
  const forMatch = text.match(/pray for (.+)/);
  if (forMatch) return normalizeTopic(forMatch[1]);
  const aboutMatch = text.match(/pray about (.+)/);
  if (aboutMatch) return normalizeTopic(aboutMatch[1]);
  return text.slice(0, 60);
}

function countPrayerTopic(prayers = [], topicKey = '') {
  if (!topicKey) return 0;
  return prayers.filter((p) => normalizeTopic(p.prayerRequest || '').includes(topicKey)).length;
}

function detectPrayerMilestones({ userId, message = '' }) {
  const lower = String(message).toLowerCase();
  const prayers = getPrayerContinuity(userId, 10);
  const prayerMem = getRelationshipMemoryByCategory(userId, 'prayer_requests', 15);
  const topicKey = prayerTopicKey(message);
  const milestones = [];

  if (/answered|thankful|prayer answered|good news|heard our prayer|God answered/.test(lower)) {
    if (prayers.length || prayerMem.length) {
      milestones.push({
        category: 'prayer',
        label: 'answered prayer reported',
        detail: message.slice(0, 120),
      });
    }
  }

  const topicCount = countPrayerTopic(prayers, topicKey) + countPrayerTopic(
    prayerMem.map((m) => ({ prayerRequest: m.detail })),
    topicKey
  );
  if (/\b(pray|prayer)\b/.test(lower) && topicCount >= 2) {
    milestones.push({
      category: 'prayer',
      label: 'recurring prayer topic milestone',
      detail: topicKey || message.slice(0, 80),
    });
  }

  if (prayers.length >= 3 || prayerMem.length >= 3) {
    milestones.push({
      category: 'prayer',
      label: 'long-running prayer journey',
      detail: `${Math.max(prayers.length, prayerMem.length)} prayer concerns recorded`,
    });
  }

  return milestones;
}

function healthIssueKey(memories = []) {
  const latest = memories[memories.length - 1];
  return normalizeTopic(latest?.issue || latest?.detail || '');
}

function detectHealthMilestones({ userId, message = '' }) {
  const lower = String(message).toLowerCase();
  const healthMem = getRelationshipMemoryByCategory(userId, 'health_concerns', 20);
  const milestones = [];
  const issueKey = healthIssueKey(healthMem);

  const sameIssueCount = healthMem.filter((m) =>
    normalizeTopic(m.issue || m.detail).includes(issueKey)
  ).length;

  if (/improved|better now|feeling better|good news|progress|a little better/.test(lower) && healthMem.length) {
    milestones.push({
      category: 'health',
      label: 'health improvement noted',
      detail: issueKey || message.slice(0, 80),
    });
  }

  if (sameIssueCount >= 2 && (healthMem.length || /health|knee|pain|blood pressure|cholesterol|goal/.test(lower))) {
    milestones.push({
      category: 'health',
      label: 'ongoing health journey milestone',
      detail: issueKey || 'health concerns',
    });
  }

  if (/health goal|weight goal|blood pressure goal|cholesterol goal|exercise goal/.test(lower) && sameIssueCount >= 1) {
    milestones.push({
      category: 'health',
      label: 'health goal journey milestone',
      detail: message.slice(0, 100),
    });
  }

  return milestones;
}

function detectCompanionMilestones({ userId, message = '', doctrineTopic = null }) {
  const out = [];

  if (doctrineTopic) {
    const { getRecentStudySessions } = require('./continuityStudySessionRuntime');
    const sessionCount = getRecentStudySessions(userId, 30).filter((s) => s.topic === doctrineTopic).length;
    const study = detectStudyMilestone(doctrineTopic, sessionCount);
    if (study) out.push(study);
  }

  for (const m of detectPrayerMilestones({ userId, message })) out.push(m);
  for (const m of detectHealthMilestones({ userId, message })) out.push(m);

  return out;
}

function formatMilestoneAck(latest) {
  if (!latest) return null;
  const label = latest.label.replace(/ milestone$/, '').replace(/^completed /, '');

  switch (latest.category) {
    case 'prayer':
      if (/answered/.test(latest.label)) {
        return `I remember you shared that a prayer was answered — that is a meaningful step.`;
      }
      if (/recurring/.test(latest.label)) {
        return `You've been faithfully bringing ${latest.detail || 'this concern'} before the Lord — I notice that prayer journey.`;
      }
      if (/long-running/.test(latest.label)) {
        return `You've been walking a long prayer journey together — I am holding that gently with you.`;
      }
      return `I notice a meaningful step in your prayer journey: ${label}.`;
    case 'health':
      if (/improvement/.test(latest.label)) {
        return `I remember you mentioned some improvement — I am glad to hear things may be moving in a better direction. (I am not a doctor; we can still bring this to the Lord.)`;
      }
      if (/goal/.test(latest.label)) {
        return `You've been working toward a health goal — I notice that journey, without offering medical advice.`;
      }
      return `You've been walking a health journey around ${latest.detail || 'what you shared'} — I am holding that with you gently.`;
    case 'study':
    default:
      return `I notice you've reached a meaningful step: ${label}.`;
  }
}

function buildMilestoneAcknowledgment(userId) {
  const recent = getMilestones(userId, 5);
  const latest = recent[recent.length - 1];
  if (!latest) return null;

  const ageMs = Date.now() - new Date(latest.achievedAt).getTime();
  if (ageMs > ACK_WINDOW_MS) return null;

  return formatMilestoneAck(latest);
}

module.exports = {
  recordMilestone,
  getMilestones,
  detectStudyMilestone,
  detectPrayerMilestones,
  detectHealthMilestones,
  detectCompanionMilestones,
  buildMilestoneAcknowledgment,
  formatMilestoneAck,
};
