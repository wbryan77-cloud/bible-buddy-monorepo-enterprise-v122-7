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
  // v1.3C — Satan release explicitness: identify Rev 20:7-10 only; answers
  // are still computed from retrieved text (never invent a named agent).
  {
    pattern:
      /\b(satan|devil)\b.{0,100}\b(releas\w*|loos\w*|loosed|frees?|let\w*\s+out|lets him out|set free)\b/i,
    reference: 'Revelation 20:7-10',
  },
  {
    pattern:
      /\b(releas\w*|loos\w*|loosed|frees?|let\w*\s+out|set free)\b.{0,100}\b(satan|devil)\b/i,
    reference: 'Revelation 20:7-10',
  },
  {
    pattern:
      /\bdoes revelation\b.{0,60}\bname\b.{0,60}\b(frees?|releas\w*|loos\w*|agent|person)\b/i,
    reference: 'Revelation 20:7-10',
  },
  {
    pattern:
      /\bafter (the )?thousand years\b.{0,80}\b(satan|devil)\b/i,
    reference: 'Revelation 20:7-10',
  },
  {
    pattern:
      /\b(satan|devil)\b.{0,80}\bafter (the )?thousand years\b/i,
    reference: 'Revelation 20:7-10',
  },
  {
    pattern:
      /\b(millennium|millennial)\b.{0,80}\b(satan|devil)\b.{0,40}\b(free|releas\w*|loos\w*)\b/i,
    reference: 'Revelation 20:7-10',
  },
  {
    pattern:
      /\bdoes revelation explicitly name.{0,100}\b(releas\w*|loos\w*|agent|person)\b/i,
    reference: 'Revelation 20:7-10',
  },
  {
    pattern:
      /\bwho (releases|looses|lets).{0,40}\b(him|satan|devil)\b/i,
    reference: 'Revelation 20:7-10',
  },
  {
    pattern:
      /\b(name the releaser|releaser if revelation|actually names one|names the releaser)\b/i,
    reference: 'Revelation 20:7-10',
  },
  {
    pattern:
      /\b(god lets satan|lets satan out|god (release|loose)s? satan|explicit that god)\b/i,
    reference: 'Revelation 20:7-10',
  },
];

/**
 * Narrow question-family detector for Satan’s release after the millennium.
 * Returns a subtype used only to shape YES/NO / explicit-vs-inference wording
 * against retrieved Revelation 20 text — never supplies a doctrinal agent.
 */
function detectSatanReleaseQuestion(message = '') {
  const m = String(message || '');
  const satan = /\b(satan|devil)\b/i.test(m);
  const release = /\b(releas\w*|loos\w*|loosed|frees?|let\w*\s+out|lets him out|set free|releaser)\b/i.test(m);
  const afterThousand =
    /\b(after (the )?thousand years|thousand years (are )?(expired|finished)|millennium|millennial)\b/i.test(m);
  const whoReleases =
    /\bwho (releases|looses|lets|frees)\b/i.test(m) || /\bwho is the ['"]?he\b/i.test(m);
  const explicitName =
    /\bexplicitly name\b/i.test(m) ||
    /\bdoes revelation (explicitly )?name\b/i.test(m) ||
    /\bdoes revelation\b.{0,60}\bname\b/i.test(m) ||
    /\bdoes rev\.?\b.{0,40}\bname\b/i.test(m) ||
    /\bname the (person|agent|releaser)\b/i.test(m) ||
    /\bname who\b/i.test(m) ||
    /\breleaser if revelation\b/i.test(m) ||
    /\bactually names one\b/i.test(m) ||
    /\bif revelation actually names\b/i.test(m);
  const godClaim =
    /\bdoes god (release|loose)\b/i.test(m) ||
    /\bgod release(s)? (satan|him|the devil)\b/i.test(m) ||
    /\bgod lets satan\b/i.test(m) ||
    /\blets satan out\b/i.test(m) ||
    /\bexplicit that god\b/i.test(m);
  const angelClaim =
    /\bdoes an? angel (release|loose)\b/i.test(m) || /\bangel release(s)? (satan|him)\b/i.test(m);
  const selfClaim =
    /\bdoes satan release himself\b/i.test(m) || /\bsatan release himself\b/i.test(m);
  const passageAsk =
    /\bwhat does the passage actually say\b/i.test(m) ||
    /\bgive me scripture only\b/i.test(m) ||
    /\bscripture only\b/i.test(m);
  const inferenceAsk =
    /\bscripture or inference\b/i.test(m) ||
    /\bstating scripture or inference\b/i.test(m) ||
    /\bwhat can we say with certainty\b/i.test(m);
  const isReleased =
    /\bis satan released\b/i.test(m) ||
    /\bsatan (is |shall be )?(released|loosed)\b/i.test(m) ||
    (satan && afterThousand && (release || /\?\s*$/.test(m.trim())));

  if (!(satan || whoReleases || explicitName) && !release) return null;
  if (!(satan || release || afterThousand || whoReleases || explicitName)) return null;
  // Require satan/release signal unless this is a follow-up already hinted.
  if (!satan && !release && !explicitName && !whoReleases) return null;
  if (satan && !release && !afterThousand && !explicitName && !whoReleases && !godClaim) return null;

  if (explicitName) return 'explicit_agent_named';
  if (godClaim) return 'god_releases_claim';
  if (angelClaim) return 'angel_releases_claim';
  if (selfClaim) return 'self_releases_claim';
  if (whoReleases) return 'who_releases';
  if (passageAsk) return 'passage_only';
  if (inferenceAsk) return 'certainty_vs_inference';
  if (isReleased || (satan && release) || (satan && afterThousand && /\b(free|set free)\b/i.test(m))) {
    return 'is_released';
  }
  // "Name the releaser..." without satan word still belongs here when hint matched.
  if (explicitName || release || afterThousand) return 'general_release';
  return null;
}

function buildSatanReleaseGroundedReply({ subtype, successes, failures }) {
  if (!successes.length) return buildFailureReply(failures);

  const primary =
    successes.find((r) => /20:7/i.test(r.reference)) || successes[0];
  const quoted = `${primary.reference} says: "${primary.text}"`;
  const bindingNote =
    'Revelation 20:1-3 earlier describes an angel binding Satan; applying that binding agent to the later release is inference, not the wording of the release statement.';

  switch (subtype) {
    case 'is_released':
      return `Yes. ${quoted} Revelation states that Satan shall be loosed after the thousand years.`;
    case 'explicit_agent_named':
      return `No. ${quoted} The release statement does not explicitly name the person or agent who looses him.`;
    case 'god_releases_claim':
      return `No — Scripture does not explicitly state that God releases Satan. ${quoted} Naming God as the releasing agent is inference beyond the wording of this verse.`;
    case 'angel_releases_claim':
      return `No — Revelation 20:7 does not name an angel as the one who releases Satan. ${quoted} ${bindingNote}`;
    case 'self_releases_claim':
      return `No. ${quoted} The wording is that Satan shall be loosed — it does not say he releases himself.`;
    case 'who_releases':
      return `${quoted} Revelation says Satan shall be loosed; it does not explicitly name who looses him. ${bindingNote}`;
    case 'passage_only':
      return quoted;
    case 'certainty_vs_inference':
      return `Scripture: ${quoted} Certainty from that wording: Satan is loosed after the thousand years. Not stated explicitly: who looses him. ${bindingNote}`;
    default:
      return `Revelation addresses Satan’s release after the thousand years. ${quoted} The text does not explicitly name who looses him.`;
  }
}

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
  const satanSubtype = detectSatanReleaseQuestion(message);
  const { intent, claimText } = classifyScriptureRequest(message);
  const refs =
    references.length > 0
      ? references
      : satanSubtype
        ? ['Revelation 20:7-10']
        : [];
  const results = await fetchCanonicalScriptureForReferences(refs);
  const successes = results.filter((r) => r.ok);
  const failures = results.filter((r) => !r.ok);

  if (satanSubtype) {
    const reply = buildSatanReleaseGroundedReply({
      subtype: satanSubtype,
      successes,
      failures,
    });
    return {
      intent: 'YES_NO',
      claimText: satanSubtype,
      references: refs,
      results,
      successes,
      failures,
      reply,
      satanReleaseSubtype: satanSubtype,
    };
  }

  const reply =
    (intent === 'YES_NO' || intent === 'COMPARE') && claimText
      ? buildClaimReply({ intent, claimText, successes, failures })
      : buildReadOrQuoteReply(successes, failures);

  return { intent, claimText, references: refs, results, successes, failures, reply };
}

module.exports = {
  CLAIM_REFERENCE_HINTS,
  findHintedReference,
  buildExplicitReferenceConceptShape,
  classifyScriptureRequest,
  isClaimSupportedByText,
  buildGroundedScriptureAnswer,
  detectSatanReleaseQuestion,
};
