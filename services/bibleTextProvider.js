/**
 * Phase 5T — BibleTextProvider adapter boundary.
 *
 * A single, stable internal contract for retrieving canonical Scripture
 * text, sitting in front of the Phase 5P `canonicalScriptureProvider`
 * (the current live external KJV source). Nothing about the working
 * retrieval path is replaced — this module adds an adapter boundary and
 * documented provider-order fallback around it so a future local KJV
 * corpus (see docs/alpha/LocalKjvImportRequirement.md) or an approved
 * production Bible provider can be slotted in later without touching any
 * caller.
 *
 * Preferred provider order:
 *   1. Verified local public-domain KJV corpus   — PRESENT as of Phase 6
 *      (Local KJV Corpus Completion). See data/kjv-corpus/CORPUS-METADATA.json
 *      for source/license/validation provenance and
 *      services/localKjvCorpusProvider.js for the lookup implementation.
 *      Only activated when the vendored 66-book corpus validates as ready;
 *      otherwise this tier is honestly skipped, never fabricated.
 *   2. Configured approved production Bible provider — only used if
 *      BIBLE_TEXT_APPROVED_PROVIDER_URL is explicitly set in the
 *      environment. Not configured by default.
 *   3. Current external KJV fallback — services/canonicalScriptureProvider
 *      (bible-api.com), the provider already proven in Phases 5P-5S. Now
 *      used only when the local corpus cannot resolve a given reference
 *      (e.g. non-canonical/malformed reference) or fails to load.
 *   4. Honest "unavailable" — never fabricated, never silently swapped to
 *      a different translation, never answered from OpenAI.
 */

const axios = require('axios');
const {
  fetchCanonicalScripture: fetchFromExternalFallback,
  getScriptureProviderHealth: getExternalFallbackHealth,
  getScriptureCacheStats,
  clearScriptureCache,
} = require('./canonicalScriptureProvider');
const {
  isCorpusReady: isLocalCorpusReady,
  getLocalPassage,
  getCorpusLoadError: getLocalCorpusLoadError,
} = require('./localKjvCorpusProvider');
const APPROVED_PROVIDER_URL = process.env.BIBLE_TEXT_APPROVED_PROVIDER_URL || null;
const APPROVED_PROVIDER_TIMEOUT_MS = Number(
  process.env.BIBLE_TEXT_APPROVED_PROVIDER_TIMEOUT_MS || 8000
);
const DEFAULT_TRANSLATION = 'KJV';

const PROVIDER_MODE = {
  LOCAL_CORPUS: 'local_corpus',
  APPROVED_PROVIDER: 'approved_provider',
  EXTERNAL_FALLBACK: 'external_fallback',
  UNAVAILABLE: 'unavailable',
};

function hasLocalCorpus() {
  // PHASE_6 — a verified, complete 66-book local KJV corpus now exists
  // (data/kjv-corpus/raw, validated by services/localKjvCorpusProvider and
  // scripts/alpha/localKjvCorpusValidation.js). This still only reports
  // true when the corpus actually loads and validates at call time — never
  // activate from an unverified or partial dataset.
  return isLocalCorpusReady();
}

function hasApprovedProvider() {
  return !!APPROVED_PROVIDER_URL;
}

async function fetchFromApprovedProvider(reference) {
  const startedAt = Date.now();
  try {
    const res = await axios.get(APPROVED_PROVIDER_URL, {
      params: { reference, translation: DEFAULT_TRANSLATION },
      timeout: APPROVED_PROVIDER_TIMEOUT_MS,
      validateStatus: (s) => s < 500,
    });
    const text = res?.data?.text;
    if (res.status >= 400 || !text) {
      return {
        ok: false,
        reference,
        error: `HTTP ${res.status}`,
        providerName: 'approved_provider',
        latencyMs: Date.now() - startedAt,
      };
    }
    return {
      ok: true,
      reference: res.data.reference || reference,
      text: String(res.data.text).replace(/\s+/g, ' ').trim(),
      translation: res.data.translation || DEFAULT_TRANSLATION,
      source: 'approved_provider',
      providerName: 'approved_provider',
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
    };
  } catch (e) {
    return {
      ok: false,
      reference,
      error: String(e?.message || e),
      providerName: 'approved_provider',
      latencyMs: Date.now() - startedAt,
    };
  }
}

/**
 * Retrieve a single passage, walking the preferred provider order and
 * recording exactly which tier answered (or that none could). Never
 * throws — every failure mode returns a structured, honest result.
 */
async function getPassage(reference, { translation = DEFAULT_TRANSLATION } = {}) {
  const ref = String(reference || '').trim();
  if (!ref) {
    return {
      ok: false,
      reference: ref,
      translation,
      providerName: null,
      providerMode: PROVIDER_MODE.UNAVAILABLE,
      fallbackUsed: false,
      error: 'empty_reference',
    };
  }

  // Tier 1: local corpus. Only trusted when isLocalCorpusReady() confirms a
  // full, validated 66-book load — if the local lookup can't resolve this
  // specific reference (bad book/chapter/verse, or the corpus itself is
  // unavailable), fall through honestly to the remaining tiers rather than
  // reporting a false "does not exist".
  if (hasLocalCorpus()) {
    const local = getLocalPassage(ref);
    if (local.ok) {
      return { ...local, providerMode: PROVIDER_MODE.LOCAL_CORPUS, fallbackUsed: false };
    }

    if (hasApprovedProvider()) {
      const approved = await fetchFromApprovedProvider(ref);
      if (approved.ok) {
        return { ...approved, providerMode: PROVIDER_MODE.APPROVED_PROVIDER, fallbackUsed: true, localCorpusError: local.error };
      }
      const fallback = await fetchFromExternalFallback(ref);
      return {
        ...fallback,
        providerMode: fallback.ok ? PROVIDER_MODE.EXTERNAL_FALLBACK : PROVIDER_MODE.UNAVAILABLE,
        fallbackUsed: true,
        localCorpusError: local.error,
        approvedProviderError: approved.error,
      };
    }

    const fallback = await fetchFromExternalFallback(ref);
    return {
      ...fallback,
      providerMode: fallback.ok ? PROVIDER_MODE.EXTERNAL_FALLBACK : PROVIDER_MODE.UNAVAILABLE,
      fallbackUsed: true,
      localCorpusError: local.error,
    };
  }

  // Tier 2: configured approved provider, only if explicitly configured.
  if (hasApprovedProvider()) {
    const approved = await fetchFromApprovedProvider(ref);
    if (approved.ok) {
      return { ...approved, providerMode: PROVIDER_MODE.APPROVED_PROVIDER, fallbackUsed: false };
    }
    // Approved provider failed — fall through honestly to tier 3, marking
    // fallbackUsed so this is never silent.
    const fallback = await fetchFromExternalFallback(ref);
    return {
      ...fallback,
      providerMode: fallback.ok ? PROVIDER_MODE.EXTERNAL_FALLBACK : PROVIDER_MODE.UNAVAILABLE,
      fallbackUsed: true,
      approvedProviderError: approved.error,
    };
  }

  // Tier 3: current external KJV fallback (the proven Phase 5P-5S provider).
  const fallback = await fetchFromExternalFallback(ref);
  return {
    ...fallback,
    providerMode: fallback.ok ? PROVIDER_MODE.EXTERNAL_FALLBACK : PROVIDER_MODE.UNAVAILABLE,
    fallbackUsed: false,
  };
}

/**
 * BibleTextProvider.getPassages — the stable internal contract required by
 * Phase 5T Part 3. Retrieves multiple references, preserving order and
 * partial success, and returns both the per-reference results and an
 * observability summary.
 */
async function getPassages({ references = [], translation = DEFAULT_TRANSLATION } = {}) {
  const list = Array.isArray(references) ? references : [references];
  const results = [];
  for (const ref of list) {
    results.push(await getPassage(ref, { translation }));
  }

  const missingReferences = results.filter((r) => !r.ok).map((r) => r.reference);
  const errors = results.filter((r) => !r.ok).map((r) => ({ reference: r.reference, error: r.error }));
  const anySuccess = results.find((r) => r.ok);

  // PHASE_5T — providerMode reflects what ACTUALLY answered this request,
  // not merely which tier is configured: if every reference failed, the
  // honest report is "unavailable", even though a fallback tier was
  // attempted and is normally reachable.
  const providerMode = anySuccess
    ? anySuccess.providerMode
    : results.length
      ? PROVIDER_MODE.UNAVAILABLE
      : hasLocalCorpus()
        ? PROVIDER_MODE.LOCAL_CORPUS
        : hasApprovedProvider()
          ? PROVIDER_MODE.APPROVED_PROVIDER
          : PROVIDER_MODE.EXTERNAL_FALLBACK;

  return {
    results,
    observability: {
      providerName: anySuccess?.providerName || (hasApprovedProvider() ? 'approved_provider' : 'bible-api.com'),
      providerMode,
      translation,
      cacheHit: results.some((r) => r.cacheHit),
      latencyMs: results.reduce((sum, r) => sum + (r.latencyMs || 0), 0),
      fallbackUsed: results.some((r) => r.fallbackUsed),
      partial: missingReferences.length > 0 && missingReferences.length < results.length,
      missingReferences,
      errors,
    },
  };
}

/**
 * PHASE_5T — Provider health report across all configured tiers, used by
 * admin/observability and the alpha test matrix. Honest about which tier
 * is actually live.
 */
async function getProviderHealth() {
  const externalFallback = await getExternalFallbackHealth();
  const localReady = hasLocalCorpus();
  return {
    localCorpus: {
      status: localReady ? 'PRESENT_AND_VALIDATED' : `NOT_PRESENT (${getLocalCorpusLoadError() || 'unknown'})`,
      active: localReady,
    },
    approvedProvider: {
      configured: hasApprovedProvider(),
      url: hasApprovedProvider() ? APPROVED_PROVIDER_URL : null,
    },
    externalFallback,
    activeProviderMode: hasLocalCorpus()
      ? PROVIDER_MODE.LOCAL_CORPUS
      : hasApprovedProvider()
        ? PROVIDER_MODE.APPROVED_PROVIDER
        : PROVIDER_MODE.EXTERNAL_FALLBACK,
    cache: getScriptureCacheStats(),
  };
}

module.exports = {
  PROVIDER_MODE,
  getPassage,
  getPassages,
  getProviderHealth,
  hasLocalCorpus,
  hasApprovedProvider,
  clearScriptureCache,
};
