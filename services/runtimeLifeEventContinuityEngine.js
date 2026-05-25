const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LIFE_EVENT_FILE = path.join(DATA_DIR, 'runtime-life-event-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(LIFE_EVENT_FILE)) return {};
    return JSON.parse(fs.readFileSync(LIFE_EVENT_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(LIFE_EVENT_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Life event continuity write failed:', error.message);
  }
}

function saveLifeEvent({
  userId,
  type,
  title,
  notes = '',
  scriptures = [],
  status = 'active',
}) {
  const store = readStore();
  const events = store[userId] || [];

  events.push({
    type,
    title,
    notes,
    scriptures,
    status,
    createdAt: new Date().toISOString(),
  });

  store[userId] = events.slice(-500);
  writeStore(store);
}

function updateLifeEventStatus({ userId, title, status }) {
  const store = readStore();

  store[userId] = (store[userId] || []).map((event) => {
    if (event.title === title) {
      return {
        ...event,
        status,
        updatedAt: new Date().toISOString(),
      };
    }

    return event;
  });

  writeStore(store);
}

function getLifeEvents(userId, limit = 25) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildLifeEventContinuity(userId) {
  const events = getLifeEvents(userId, 50);

  return {
    scriptureFirst: true,
    lifeEventContinuityEnabled: true,
    activeEvents: events.filter((event) => event.status === 'active'),
    completedEvents: events.filter((event) => event.status === 'resolved'),
    continuityEnabled: true,
  };
}

module.exports = {
  saveLifeEvent,
  updateLifeEventStatus,
  getLifeEvents,
  buildLifeEventContinuity,
};
