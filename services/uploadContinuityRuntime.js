const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOAD_FILE = path.join(DATA_DIR, 'upload-continuity-runtime.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(UPLOAD_FILE)) return [];
    return JSON.parse(fs.readFileSync(UPLOAD_FILE, 'utf8')) || [];
  } catch (_) {
    return [];
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(UPLOAD_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Upload continuity runtime write failed:', error.message);
  }
}

function detectUploadIntent(message = '') {
  const text = String(message || '').toLowerCase();

  return {
    resume: text.includes('resume') || text.includes('résumé'),
    image: text.includes('image') || text.includes('picture') || text.includes('photo'),
    document: text.includes('document') || text.includes('pdf') || text.includes('file'),
    study: text.includes('study') || text.includes('scripture'),
  };
}

function saveUploadContinuity({ userId, fileName, type, context }) {
  const store = readStore();

  store.push({
    userId,
    fileName,
    type,
    context,
    createdAt: new Date().toISOString(),
  });

  writeStore(store.slice(-500));
}

function getRecentUploads(userId, limit = 10) {
  const store = readStore();

  return store
    .filter((item) => item.userId === userId)
    .slice(-limit);
}

function buildUploadRuntime({ userId, message }) {
  return {
    enabled: true,
    intents: detectUploadIntent(message),
    recentUploads: getRecentUploads(userId),
    multimodalReady: true,
    ocrReady: true,
    continuityEnabled: true,
  };
}

module.exports = {
  detectUploadIntent,
  saveUploadContinuity,
  getRecentUploads,
  buildUploadRuntime,
};
