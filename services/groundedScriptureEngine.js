/**
 * Phase 5Q — Grounded Scripture engine.
 *
 * Completes explicit-Scripture responses using ONLY retrieved canonical
 * text (services/canonicalScriptureProvider.js). This module never
 * fabricates verse content, never answers from the doctrine concept graph,
 * and never uses hand-authored witness lists as the source of an answer.
 * Every answer is computed at request time from the literal retrieved
 * text.
 *
 * Four response modes:
 *   READ    — bare reference, no question framing: return the text.
 *   QUOTE   — "what does X say" / "quote X": return the text as an answer.
 *   COMPARE — a claim is present ("... say Jesus had white skin ..."):
 *             check the claim against the literal retrieved text.
 *   YES_NO  — same as COMPARE, but the user explicitly asked "yes or no".
 */

const {
  fetchCanonicalScriptureForReferences,
} = require('./canonicalScriptureProvider');

// Narrow reference-IDENTIFICATION hints only. These never supply an answer,
// witness list, or interpretation — they only tell the engine which
// reference a claim (that carries no explicit chapter:verse) is about, so
// the actual answer can still be computed from live retrieved text.
const CLAIM_REFERENCE_HINTS = [
  {
    pattern: /\bjesus\b.{0,120}\b(white skin|blue eyes|fine straight hair)\b/i,
    reference: 'Revelation 1:14-15',
  },
  {
    pattern: /\b(white skin|blue eyes|fine straight hair)\b.{0,120}\bjesus\b/i,
    reference: 'Revelation 1:14-15',
  },
];

function findHintedReference(message = '') {
  const m = String(message || '');
  for (const hint of CLAIM_REFERENCE_HINTS) {
    if (hint.pattern.test(m)) return hint.reference;
  }
  return null;
}

/**
 * Builds the concept shape consumed by buildBibleWideAnswer's
 * explicit-reference branch. Carries no interpreted directAnswer or
 * witness-derived meaning — directAnswer here is only a neutral statement
 * of which reference was requested; the real answer is always computed
 * later from live retrieved text.
 */
function buildExplicitReferenceConceptShape(references = []) {
  return {
    id: 'explicit_scripture_reference',
    strictTopic: null,
    polarity: null,
    directAnswer:
      references.length === 1
        ? `The requested Scripture passage is ${references[0]}`
        : `The requested Scripture passages are ${references.join(', ')}`,
    directWitnesses: references,
    supportingWitnesses: [],
    explicitScriptureReference: true,
    canonicalReferences: references,
    retrievalMode: 'canonical_reference',
  };
}

const STOP_WORDS = new Set([
  'the', 'that', 'this', 'and', 'with', 'was', 'were', 'his', 'her', 'its',
  'has', 'have', 'had', 'for', 'are', 'you', 'not', 'yes', 'says', 'said',
  'say', 'she', 'they', 'them', 'from', 'about', 'does',
]);

function normalizeForMatch(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classifies a message into one of the four Scripture response modes and
 * extracts the claim text (if any) to be checked against retrieved text.
 * Purely syntactic — no doctrine graph, no witness list, no interpretation.
 */
function classifyScriptureRequest(message = '') {
  const m = String(message || '');
  const hasYesNo = /\byes or no\b/i.test(m);
  const isCompareRequest = /\bcompare\b/i.test(m);

  const sayMatch = m.match(
    /\b(?:say|says|saying|said|state|states|stated|describe|describes|described)\b\s*(?:that\s+)?(.+)/i
  );
  let claimTail = sayMatch ? sayMatch[1] : '';
  claimTail = claimTail
    .replace(/,?\s*yes or no\??\s*$/i, '')
    .replace(/[?.!]+\s*$/, '')
    .trim();

  const isAboutTopic = /^about\b/i.test(claimTail);
  const hasClaim = Boolean(claimTail) && !isAboutTopic;

  if (hasClaim) {
    if (isCompareRequest) return { intent: 'COMPARE', claimText: claimTail };
    // "Does X say/describe Y?" is a yes/no question grammatically even
    // without the literal words "yes or no".
    if (hasYesNo || /\?\s*$/.test(m.trim())) return { intent: 'YES_NO', claimText: claimTail };
    return { intent: 'COMPARE', claimText: claimTail };
  }

  // "Compare Genesis 1:1 and John 1:1" — no claim to verify, just present
  // both retrieved passages side by side so the user can compare them.
  if (isCompareRequest) return { intent: 'COMPARE', claimText: null };

  if (/\?/.test(m) || /\b(quote|read|show me|give me|tell me)\b/i.test(m)) {
    return { intent: 'QUOTE', claimText: null };
  }

  return { intent: 'READ', claimText: null };
}

/**
 * Checks whether a claim's descriptive content is literally present in the
 * retrieved canonical text. Deterministic and grounded: a claim only counts
 * as supported when every one of its content words appears in the actual
 * verse text — never inferred, never generated.
 */
function isClaimSupportedByText(claimText = '', retrievedText = '') {
  const claim = normalizeForMatch(claimText);
  const text = normalizeForMatch(retrievedText);
  if (!claim) return false;

  const phrases = claim
    .split(/\b(?:and|with|,)\b/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!phrases.length) return false;

  return phrases.every((phrase) => {
    const words = phrase
      .split(' ')
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    if (!words.length) return true;
    return words.every((w) => text.includes(w));
  });
}

function quoteRetrievedText(successes = []) {
  return successes.map((r) => `${r.reference} says: "${r.text}"`).join(' ');
}

function buildFailureReply(failures = []) {
  const missing = failures.map((f) => f.reference).join(', ') || 'that reference';
  return `I could not find ${missing} in Scripture. Please double-check the reference — it does not appear to exist.`;
}

function buildReadOrQuoteReply(successes = [], failures = []) {
  const quoted = successes.map((r) => `${r.reference} — "${r.text}" (${r.translation}).`);
  if (successes.length && !failures.length) return quoted.join(' ');
  const missing = failures.map((f) => f.reference).join(', ') || 'that reference';
  if (successes.length && failures.length) {
    return `${quoted.join(' ')} I could not find ${missing} in Scripture — please double-check that reference.`;
  }
  return `I could not find ${missing} in Scripture. Please double-check the reference — it does not appear to exist.`;
}

function buildClaimReply({ intent, claimText, successes, failures }) {
  if (!successes.length) return buildFailureReply(failures);

  const supported = successes.every((r) => isClaimSupportedByText(claimText, r.text));
  const quoted = quoteRetrievedText(successes);

  if (intent === 'YES_NO') {
    return supported
      ? `Yes — Scripture explicitly states that. ${quoted}.`
      : `No — Scripture does not explicitly state that. ${quoted}.`;
  }

  // COMPARE
  return supported
    ? `Yes, that is what Scripture says. ${quoted}.`
    : `No — Scripture does not explicitly state that. ${quoted}.`;
}

/**
 * Given the raw message and the canonical reference(s) already identified
 * for it (explicit extraction or a narrow claim-reference hint), retrieves
 * the live text and builds a fully grounded answer. Never falls back to a
 * doctrine graph directAnswer, a hand-authored witness list, or generated
 * Scripture text.
 */
async function buildGroundedScriptureAnswer({ message = '', references = [] } = {}) {
  const { intent, claimText } = classifyScriptureRequest(message);
  const results = await fetchCanonicalScriptureForReferences(references);
  const successes = results.filter((r) => r.ok);
  const failures = results.filter((r) => !r.ok);

  const reply =
    (intent === 'YES_NO' || intent === 'COMPARE') && claimText
      ? buildClaimReply({ intent, claimText, successes, failures })
      : buildReadOrQuoteReply(successes, failures);

  return { intent, claimText, references, results, successes, failures, reply };
}

module.exports = {
  CLAIM_REFERENCE_HINTS,
  findHintedReference,
  buildExplicitReferenceConceptShape,
  classifyScriptureRequest,
  isClaimSupportedByText,
  buildGroundedScriptureAnswer,
};
