/**
 * Phase 5P — Canonical Scripture retrieval provider.
 *
 * Reuses the repository's existing axios-based external-fetch pattern
 * (see services/phase3fContentExtraction.js) to retrieve real verse text
 * for a canonical reference from a public-domain King James Version
 * source, instead of building another offline Bible text corpus.
 */

const axios = require('axios');
const {
  isCorpusReady: isLocalCorpusReady,
  getLocalPassage,
} = require('./localKjvCorpusProvider');

const USER_AGENT = 'BibleBuddyCompanion/1.0 (+scripture-retrieval)';
const SCRIPTURE_API_BASE =
  process.env.SCRIPTURE_API_BASE_URL || 'https://bible-api.com';
const SCRIPTURE_TRANSLATION =
  process.env.SCRIPTURE_API_TRANSLATION || 'kjv';
const SCRIPTURE_SOURCE_NAME = 'bible-api.com (King James Version, public domain)';
const SCRIPTURE_FETCH_TIMEOUT_MS = Number(
  process.env.SCRIPTURE_API_TIMEOUT_MS || 8000
);
const PROVIDER_NAME = 'bible-api.com';

// PHASE_5T — bounded, TTL-aware cache. Successful lookups only: an invalid
// reference result is stable, but a transient network error is not, so
// failures are never cached (a blip must never become a persistent false
// "does not exist" answer). Bounded size + TTL prevent unbounded memory
// growth on a long-lived process (Phase 5T cleanup concern).
const SCRIPTURE_CACHE_TTL_MS = Number(process.env.SCRIPTURE_CACHE_TTL_MS || 6 * 60 * 60 * 1000);
const SCRIPTURE_CACHE_MAX_ENTRIES = Number(process.env.SCRIPTURE_CACHE_MAX_ENTRIES || 2000);
const scriptureTextCache = new Map();

function cleanVerseText(text = '') {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cacheKeyFor(reference = '') {
  return `${String(reference).trim().toLowerCase()}::${SCRIPTURE_TRANSLATION}`;
}

function readFromCache(cacheKey) {
  const entry = scriptureTextCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > SCRIPTURE_CACHE_TTL_MS) {
    scriptureTextCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

function writeToCache(cacheKey, value) {
  if (scriptureTextCache.size >= SCRIPTURE_CACHE_MAX_ENTRIES) {
    // Evict the oldest entry (Map preserves insertion order) rather than
    // growing without bound.
    const oldestKey = scriptureTextCache.keys().next().value;
    if (oldestKey !== undefined) scriptureTextCache.delete(oldestKey);
  }
  scriptureTextCache.set(cacheKey, { value, storedAt: Date.now() });
}

/** PHASE_5T — cache controls (Part 3/Part 4: bounded cache observability). */
function clearScriptureCache() {
  scriptureTextCache.clear();
}

function getScriptureCacheStats() {
  return {
    size: scriptureTextCache.size,
    maxEntries: SCRIPTURE_CACHE_MAX_ENTRIES,
    ttlMs: SCRIPTURE_CACHE_TTL_MS,
  };
}

/**
 * Retrieve canonical verse text for a single reference (e.g. "John 3:16",
 * "Romans 8:1-4"). Never throws — callers get a structured ok/error result
 * so an unresolvable reference (bad chapter/verse) can be reported to the
 * user honestly instead of producing a hallucinated quote.
 */
async function fetchCanonicalScripture(reference = '') {
  const ref = String(reference || '').trim();
  const startedAt = Date.now();
  if (!ref) {
    return {
      ok: false,
      reference: ref,
      error: 'empty_reference',
      providerName: PROVIDER_NAME,
      cacheHit: false,
      latencyMs: 0,
    };
  }

  const cacheKey = cacheKeyFor(ref);
  const cached = readFromCache(cacheKey);
  if (cached) {
    return { ...cached, cacheHit: true, latencyMs: 0 };
  }

  // PHASE_6 — Local KJV Corpus Completion: the vendored, validated 66-book
  // corpus (data/kjv-corpus) is now the production default for every caller
  // of this function (services/scriptureAuthorityEngine.js,
  // services/groundedScriptureEngine.js), eliminating the external-API
  // rate-limit risk documented in Phase 5T for the common case. The
  // external provider below remains a genuine fallback — used only when
  // the local corpus cannot resolve this specific reference (e.g. an
  // out-of-range verse) or is unavailable, never removed.
  if (isLocalCorpusReady()) {
    const local = getLocalPassage(ref);
    if (local.ok) {
      const localLatencyMs = Date.now() - startedAt;
      const localResult = { ...local, latencyMs: localLatencyMs };
      writeToCache(cacheKey, localResult);
      return localResult;
    }
  }

  const url = `${SCRIPTURE_API_BASE}/${encodeURIComponent(ref)}?translation=${SCRIPTURE_TRANSLATION}`;

  let result;
  try {
    const res = await axios.get(url, {
      timeout: SCRIPTURE_FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });

    const text = res?.data?.text;
    if (res.status >= 400 || !text) {
      result = { ok: false, reference: ref, error: `HTTP ${res.status}` };
    } else {
      result = {
        ok: true,
        reference: res.data.reference || ref,
        text: cleanVerseText(text),
        translation: String(
          res.data.translation_name || res.data.translation_id || SCRIPTURE_TRANSLATION
        ),
        source: SCRIPTURE_SOURCE_NAME,
      };
    }
  } catch (e) {
    const isTimeout = e?.code === 'ECONNABORTED' || /timeout/i.test(String(e?.message || ''));
    result = {
      ok: false,
      reference: ref,
      error: isTimeout ? 'timeout' : String(e?.message || e),
    };
  }

  const latencyMs = Date.now() - startedAt;
  result.providerName = PROVIDER_NAME;
  result.cacheHit = false;
  result.latencyMs = latencyMs;

  if (result.ok) writeToCache(cacheKey, result);
  return result;
}

/**
 * Retrieve canonical verse text for multiple references, preserving order.
 * Each entry independently succeeds or fails, so a mix of valid and invalid
 * references (e.g. "John 3:16" + "John 99:99") returns partial results
 * rather than failing the whole request.
 */
async function fetchCanonicalScriptureForReferences(references = []) {
  const list = Array.isArray(references) ? references : [references];
  const results = [];
  for (const ref of list) {
    results.push(await fetchCanonicalScripture(ref));
  }
  return results;
}

/**
 * PHASE_5T — Provider health reporting (Part 3). A lightweight, cheap probe
 * (Genesis 1:1 is always valid) used by admin/observability endpoints and
 * by the alpha test matrix to report honest provider status without
 * spending a real user request's latency budget on every call.
 */
async function getScriptureProviderHealth() {
  const probe = await fetchCanonicalScripture('Genesis 1:1');
  return {
    providerName: PROVIDER_NAME,
    baseUrl: SCRIPTURE_API_BASE,
    translation: SCRIPTURE_TRANSLATION,
    reachable: !!probe.ok,
    latencyMs: probe.latencyMs ?? null,
    error: probe.ok ? null : probe.error || null,
    cache: getScriptureCacheStats(),
  };
}

module.exports = {
  fetchCanonicalScripture,
  fetchCanonicalScriptureForReferences,
  getScriptureProviderHealth,
  clearScriptureCache,
  getScriptureCacheStats,
  PROVIDER_NAME,
};
