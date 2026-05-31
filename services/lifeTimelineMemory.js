const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TIMELINE_FILE = path.join(DATA_DIR, 'life-timeline-memory.json');

const IMPORTANCE = Object.freeze({ HIGH: 'high', MEDIUM: 'medium', LOW: 'low' });
const STATUS = Object.freeze({
  OPEN: 'open',
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  FOLLOW_UP: 'follow_up',
});

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(TIMELINE_FILE)) return {};
    return JSON.parse(fs.readFileSync(TIMELINE_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(TIMELINE_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Life timeline write failed:', error.message);
  }
}

function appendTimelineEvent({
  userId,
  eventType,
  summary,
  importance = IMPORTANCE.MEDIUM,
  status = STATUS.OPEN,
  outcome = null,
  linkedCategory = null,
}) {
  const store = readStore();
  const events = store[userId] || [];

  events.push({
    eventType,
    summary: String(summary || '').slice(0, 280),
    importance,
    status,
    outcome: outcome ? String(outcome).slice(0, 200) : null,
    linkedCategory,
    createdAt: new Date().toISOString(),
  });

  store[userId] = events.slice(-120);
  writeStore(store);
  return events[events.length - 1];
}

function updateTimelineStatus({ userId, eventType, status, outcome = null }) {
  const store = readStore();
  const events = store[userId] || [];

  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].eventType === eventType && events[i].status !== STATUS.RESOLVED) {
      events[i] = {
        ...events[i],
        status,
        outcome: outcome || events[i].outcome,
        updatedAt: new Date().toISOString(),
      };
      break;
    }
  }

  store[userId] = events;
  writeStore(store);
}

function getLifeTimeline(userId, limit = 30) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function getActiveJourneys(userId) {
  const events = getLifeTimeline(userId, 40);
  const journeys = [];

  const grief = events.filter((e) => e.eventType === 'grief').slice(-1)[0];
  if (grief && grief.status !== STATUS.RESOLVED) {
    journeys.push({
      type: 'grief',
      stages: events
        .filter((e) => e.eventType === 'grief' || (e.linkedCategory === 'grief_events' && e.eventType === 'follow_up'))
        .map((e) => ({ summary: e.summary, status: e.status, at: e.createdAt })),
    });
  }

  const health = events.filter((e) => e.eventType === 'health').slice(-1)[0];
  if (health && health.status !== STATUS.RESOLVED) {
    journeys.push({
      type: 'health',
      stages: events
        .filter((e) => e.eventType === 'health' || e.linkedCategory === 'health_concerns')
        .slice(-4)
        .map((e) => ({ summary: e.summary, status: e.status, at: e.createdAt })),
    });
  }

  const prayer = events.filter((e) => e.eventType === 'prayer').slice(-1)[0];
  if (prayer && prayer.status !== STATUS.RESOLVED) {
    journeys.push({
      type: 'prayer',
      stages: events
        .filter((e) => e.eventType === 'prayer' || e.linkedCategory === 'prayer_requests')
        .slice(-4)
        .map((e) => ({ summary: e.summary, status: e.status, at: e.createdAt })),
    });
  }

  const job = events.filter((e) => e.eventType === 'job').slice(-1)[0];
  if (job && job.status !== STATUS.RESOLVED) {
    journeys.push({
      type: 'job',
      stages: events.filter((e) => e.eventType === 'job').map((e) => ({
        summary: e.summary,
        status: e.status,
        at: e.createdAt,
      })),
    });
  }

  return journeys;
}

module.exports = {
  IMPORTANCE,
  STATUS,
  appendTimelineEvent,
  updateTimelineStatus,
  getLifeTimeline,
  getActiveJourneys,
};
