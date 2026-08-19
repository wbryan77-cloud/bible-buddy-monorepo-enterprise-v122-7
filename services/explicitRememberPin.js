/**
 * Explicit user "remember …" pins that must survive short conversation windows
 * and (Sprint A pattern) Render redeploy via founderExperienceDurableStore.
 *
 * Local hot cache: data/explicit-remember-pins.json (ephemeral on Render).
 * Durable owner: founderExperienceDurableStore DOC.explicitRememberPins
 *   (Postgres when DATABASE_URL is set; file projection offline).
 *
 * Durable facts requested by the user — not preference-style answer tuning.
 * Does not invent implicit permanent memory or store full transcripts.
 */

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'explicit-remember-pins.json');
const MAX_PINS_PER_USER = 20;

const PREFERENCE_SKIP =
  /\b(i like|prefer|direct answers|say no first|tone|reminders?)\b/i;

const CAPTURE_PATTERNS = [
  /\bremember\s+this\s+marker\s*:\s*(.+)$/i,
  /\bremember\s+(?:this|that)\s+marker\s*:\s*(.+)$/i,
  /\bremember\s+that\s+my\s+favorite\s+verse\s+is\s+(.+)$/i,
  /\bremember\s+this\s+for\s+later\s*:\s*(.+)$/i,
  /\bremember\s+this\s+for\s+later[,;]\s*(.+)$/i,
  /\bremember\s+(?:this|that)\s*:\s*(.+)$/i,
  /\bremember\s+this\s+(?:fact|note|for\s+me)\s*:\s*(.+)$/i,
  /\bremember\s+that\s+(.+)$/i,
];

const RECALL_PATTERNS = [
  /\bwhat\s+marker\s+did\s+i\s+(?:ask\s+you\s+to\s+)?remember\b/i,
  /\bwhat\s+did\s+i\s+ask\s+you\s+to\s+remember\b/i,
  /\bwhat\s+is\s+my\s+favorite\s+verse\b/i,
  /\bwhat(?:'s| is) my favorite verse\b/i,
  /\bthe\s+marker\s+(?:from\s+)?(?:the\s+)?start\b/i,
  /\bwhat\s+did\s+you\s+remember\s+(?:for\s+me|about\s+me)\b/i,
];

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8') || '{}');
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (e) {
    console.warn('[explicitRememberPin] write failed:', e.message);
  }
}

function localUserCount() {
  return Object.keys(readStore()).length;
}

/**
 * Dual-write one user's pin list to the approved durable owner (best-effort).
 * Empty pins array clears durable so forget survives redeploy.
 */
function scheduleDualWriteUserPins(userId, pins) {
  if (!userId) return;
  const payload = {
    userId: String(userId),
    pins: Array.isArray(pins) ? pins : [],
    updatedAt: new Date().toISOString(),
  };
  setImmediate(() => {
    try {
      const { upsertById, DOC, MAX } = require('./founderExperienceDurableStore');
      upsertById(DOC.explicitRememberPins, 'userId', payload, MAX.explicitRememberPins).catch((err) => {
        console.warn(
          '[explicitRememberPin] durable dual-write failed:',
          err && err.message ? err.message : err,
        );
      });
    } catch (err) {
      console.warn(
        '[explicitRememberPin] durable dual-write wire failed:',
        err && err.message ? err.message : err,
      );
    }
  });
}

/** Awaitable dual-write (tests). */
async function dualWriteUserPinsNow(userId, pins) {
  if (!userId) return null;
  const { upsertById, DOC, MAX } = require('./founderExperienceDurableStore');
  return upsertById(
    DOC.explicitRememberPins,
    'userId',
    {
      userId: String(userId),
      pins: Array.isArray(pins) ? pins : [],
      updatedAt: new Date().toISOString(),
    },
    MAX.explicitRememberPins,
  );
}

/**
 * After Render redeploy, ephemeral local pin file is empty while durable
 * projections may still hold explicit user memory. Hydrate when empty.
 */
async function hydrateExplicitRememberPinsFromDurableIfNeeded() {
  const existing = localUserCount();
  if (existing > 0) {
    return { ok: true, hydrated: false, reason: 'local_present', existing };
  }
  let items = [];
  let backend = 'UNKNOWN';
  try {
    const { readItems, DOC } = require('./founderExperienceDurableStore');
    const result = await readItems(DOC.explicitRememberPins);
    items = Array.isArray(result.items) ? result.items : [];
    backend = result.backend || 'UNKNOWN';
  } catch (err) {
    return {
      ok: false,
      hydrated: false,
      reason: 'durable_read_failed',
      error: err && err.message ? err.message : String(err),
    };
  }
  if (!items.length) {
    return { ok: true, hydrated: false, reason: 'durable_empty', backend };
  }
  const store = {};
  for (const item of items) {
    if (!item || typeof item !== 'object' || !item.userId) continue;
    const pins = Array.isArray(item.pins) ? item.pins.slice(0, MAX_PINS_PER_USER) : [];
    if (!pins.length) continue;
    store[String(item.userId)] = pins;
  }
  if (!Object.keys(store).length) {
    return { ok: true, hydrated: false, reason: 'durable_items_empty_pins', backend };
  }
  writeStore(store);
  return { ok: true, hydrated: true, count: Object.keys(store).length, backend };
}

/** Test helper: wipe local pin file only (simulates ephemeral disk loss). */
function wipeLocalPinStoreForTests() {
  try {
    if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
  } catch (_) {
    /* ignore */
  }
}

function extractPinText(message = '') {
  const text = String(message || '').trim();
  if (!text || PREFERENCE_SKIP.test(text)) return null;
  for (const re of CAPTURE_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) return String(m[1]).trim().replace(/[.!?]+$/, '').trim();
  }
  return null;
}

function maybeCapturePin(userId, message = '') {
  if (!userId) return null;
  const pinText = extractPinText(message);
  if (!pinText) return null;
  const store = readStore();
  const list = Array.isArray(store[userId]) ? store[userId] : [];
  const entry = {
    text: pinText,
    raw: String(message).slice(0, 300),
    at: new Date().toISOString(),
  };
  const next = [entry, ...list.filter((p) => p.text !== pinText)].slice(0, MAX_PINS_PER_USER);
  store[userId] = next;
  writeStore(store);
  scheduleDualWriteUserPins(userId, next);
  return entry;
}

function getPins(userId) {
  if (!userId) return [];
  const store = readStore();
  return Array.isArray(store[userId]) ? store[userId] : [];
}

function clearPinsForUser(userId) {
  if (!userId) return false;
  const store = readStore();
  const had = Object.prototype.hasOwnProperty.call(store, userId);
  if (had) {
    delete store[userId];
    writeStore(store);
  }
  // Always clear durable for this user so forget survives redeploy / hydrate.
  scheduleDualWriteUserPins(userId, []);
  return had;
}

function isPinRecallQuery(message = '') {
  return RECALL_PATTERNS.some((re) => re.test(String(message || '')));
}

function isBareRememberForLater(message = '') {
  return /^remember this for later\.?$/i.test(String(message || '').trim());
}

function tryAnswerPinRecall(userId, message = '') {
  if (isBareRememberForLater(message)) {
    return {
      reply: 'What would you like me to remember for later? Say it in one short sentence and I will keep it.',
      scripture: [],
      mode: 'companion',
      confidence: 'high',
      memory_used: false,
      runtime: {
        masterRoute: 'explicit_remember_pin_prompt',
        openAiCalled: false,
        buddyRuntime: 'core_openai_first',
        companionPresentation: { skipRelationshipEnrichment: true, skipStudyPrompts: true },
      },
    };
  }
  if (!isPinRecallQuery(message)) return null;
  const pins = getPins(userId);
  const wantsFavorite = /\bfavorite\s+verse\b/i.test(message);
  if (!pins.length) {
    return {
      reply: wantsFavorite
        ? "I don’t have a favorite verse saved for you yet. If you want me to keep one, say: Remember that my favorite verse is John 3:16."
        : "I don’t have something saved from earlier in this conversation for that recall. If you want me to keep a fact, say: Remember that …",
      scripture: [],
      mode: 'companion',
      confidence: 'high',
      memory_used: true,
      runtime: {
        masterRoute: 'explicit_remember_pin_honest_miss',
        openAiCalled: false,
        buddyRuntime: 'core_openai_first',
        companionPresentation: { skipRelationshipEnrichment: true, skipStudyPrompts: true },
      },
    };
  }
  const latest = pins[0];
  const reply = wantsFavorite
    ? `You asked me to remember that your favorite verse is ${latest.text}.`
    : `You asked me to remember: ${latest.text}.`;
  return {
    reply,
    scripture: [],
    mode: 'companion',
    confidence: 'high',
    memory_used: true,
    runtime: {
      masterRoute: 'explicit_remember_pin',
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      companionPresentation: { skipRelationshipEnrichment: true, skipStudyPrompts: true },
      rememberedPin: latest.text,
    },
  };
}

function pinsForPrompt(userId) {
  return getPins(userId).map((p) => p.text).slice(0, 5);
}

module.exports = {
  maybeCapturePin,
  getPins,
  clearPinsForUser,
  tryAnswerPinRecall,
  isPinRecallQuery,
  isMarkerRecallQuery: isPinRecallQuery,
  pinsForPrompt,
  extractPinText,
  hydrateExplicitRememberPinsFromDurableIfNeeded,
  dualWriteUserPinsNow,
  wipeLocalPinStoreForTests,
  STORE_PATH,
};
