/**
 * PHASE 6F — PART 11: User File / Lesson Upload and Scripture Evaluation.
 *
 * Admin/Founder-only PASTE-TEXT prototype (file upload is explicitly
 * feature-flagged OFF for this batch — see the module-level blocker note
 * below). Analyzes pasted lesson/sermon/doctrine-statement text against
 * real, retrieved KJV Scripture using the SAME governed retrieval this
 * repo already uses everywhere else (`bibleWideReasoningEngine`'s
 * reference extractor + `canonicalScriptureProvider`'s KJV retrieval) —
 * this module never invents Scripture text and never asks an LLM to
 * "recall" a verse from training data.
 *
 * HARD RULES (per batch):
 *  - Never declares an entire person/ministry/lesson "true" or "false"
 *    from an AI judgment — only classifies individual, extracted claims
 *    against retrieved Scripture, and always returns NEEDS_INTERPRETATION
 *    or SCRIPTURE_SILENT rather than a false-confidence verdict when the
 *    text is not a flat quotation match.
 *  - Uploaded/pasted content NEVER auto-enters production knowledge. This
 *    module has no promotion path — it only returns a report object.
 *  - Size-limited (see MAX_TEXT_LENGTH) — never processes an unbounded
 *    document.
 *  - Does not execute, render, or evaluate any embedded content — input
 *    is treated as inert plain text only (no HTML render, no eval, no
 *    markdown execution).
 */

const fs = require('fs');
const path = require('path');
const { extractExplicitScriptureReferences } = require('./bibleWideReasoningEngine');
const { getPassage: getKjvPassage } = require('./bibleTextProvider');
const { appendJsonlSafe } = require('./safeJsonlWriter');

// PHASE_6H Part 5 — Lesson Alignment reports were previously entirely
// ephemeral (analyze -> return -> gone). "Admin review visibility" for
// this Founder-facing tool requires *some* durable record; this reuses
// the same append-only JSONL pattern already used for the IOG/ICOJ audit
// log and alpha feedback captures rather than introducing a new storage
// layer. Only the analysis report is stored (references/claim-types/
// overlap), never a promotion into production Scripture knowledge.
const SUBMISSIONS_LOG_PATH = path.join(__dirname, '..', 'data', 'lesson-alignment-submissions.jsonl');

function recordLessonAlignmentSubmission(report) {
  try {
    appendJsonlSafe(SUBMISSIONS_LOG_PATH, {
      at: report.analyzedAt,
      sourceLabel: report.sourceLabel,
      submittedBy: report.submittedBy,
      textLength: report.textLength,
      summary: report.summary,
      claims: (report.claims || []).slice(0, 40).map((c) => ({
        reference: c.reference,
        claimType: c.claimType,
        overlapRatio: c.overlapRatio,
        quotedInLesson: c.quotedInLesson ? String(c.quotedInLesson).slice(0, 240) : null,
      })),
    });
  } catch (e) {
    console.warn('[lessonAlignment] submission log skipped:', e.message);
  }
}

function readLessonAlignmentSubmissions({ limit = 25 } = {}) {
  if (!fs.existsSync(SUBMISSIONS_LOG_PATH)) return [];
  const lines = fs.readFileSync(SUBMISSIONS_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
  return lines
    .slice(-limit)
    .reverse()
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

const MAX_TEXT_LENGTH = 20000; // ~20KB of plain text — a sermon/lesson transcript, not an unbounded document.
const MAX_REFERENCES_PER_ANALYSIS = 60; // bounded work per request; never an unbounded scan.

const CLAIM_TYPE = {
  QUOTED_TEXT_MATCHES_KJV: 'QUOTED_TEXT_MATCHES_KJV',
  QUOTED_TEXT_DOES_NOT_MATCH_KJV: 'QUOTED_TEXT_DOES_NOT_MATCH_KJV',
  REFERENCE_ONLY_NO_QUOTE: 'REFERENCE_ONLY_NO_QUOTE',
  REFERENCE_UNRESOLVED: 'REFERENCE_UNRESOLVED',
};

/**
 * Very small, deliberately conservative near-quote matcher: strips
 * punctuation/case and checks substantial word overlap. This is NOT an
 * AI judgment — it is a plain string-similarity check so this module never
 * has to "decide" a doctrinal question, only whether pasted prose is
 * reasonably close to the actual KJV wording it claims to quote.
 */
function normalizeForCompare(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// PHASE_6F Part 11 — extremely common KJV-English function words. A
// misquotation that keeps the same sentence skeleton but swaps the actual
// content ("...God created the heaven and the earth" -> "...God created
// the moon and stars") would score deceptively high on plain whole-word
// overlap, because most of the shared words are these function words, not
// the substantive content actually being misquoted. Filtering them out
// before scoring forces the comparison to judge the words that actually
// carry the claim.
const STOPWORDS = new Set([
  'the', 'and', 'of', 'in', 'to', 'a', 'an', 'that', 'which', 'is', 'are',
  'was', 'were', 'he', 'his', 'him', 'it', 'this', 'for', 'unto', 'upon',
  'they', 'them', 'shall', 'ye', 'thou', 'thee', 'thy', 'thine', 'us', 'we',
  'i', 'you', 'your', 'not', 'but', 'so', 'as', 'be', 'with', 'from', 'by',
  'on', 'at', 'all', 'my', 'me', 'our', 'their', 'said', 'saith', 'lord',
  'god',
]);

function contentWords(text = '') {
  return normalizeForCompare(text)
    .split(' ')
    .filter((w) => w && !STOPWORDS.has(w));
}

/**
 * Quote-anchored content-word precision: what fraction of the LESSON'S
 * OWN quoted content words actually appear in the real KJV verse. This is
 * deliberately asymmetric (denominator = the quote, not the union) so a
 * short, accurate PARTIAL quote of a long verse still scores high (every
 * word it claims is genuinely there), while a quote that keeps the same
 * sentence skeleton but swaps the substantive content (e.g. "...created
 * the moon and stars" for "...created the heaven and the earth") scores
 * low, because most of what it specifically claims is not actually in the
 * verse. Stopwords are excluded so shared function words never inflate
 * the score. This is a plain string check, not an AI/interpretive
 * judgment — it never resolves an ambiguous case with false confidence,
 * only with a lower score that routes the claim to human review.
 */
function wordOverlapRatio(quotedText = '', kjvText = '') {
  const contentQuote = contentWords(quotedText);
  const contentKjv = new Set(contentWords(kjvText));
  if (!contentQuote.length || !contentKjv.size) return 0;
  let shared = 0;
  const uniqueQuoteWords = new Set(contentQuote);
  uniqueQuoteWords.forEach((w) => {
    if (contentKjv.has(w)) shared += 1;
  });
  return shared / uniqueQuoteWords.size;
}

/**
 * Looks for a quoted span within `windowChars` characters after the
 * reference mention in the source text — this is a plain proximity/quote
 * check, not an interpretation of meaning.
 */
function findNearbyQuote(sourceText, referenceIndex, windowChars = 240) {
  const after = sourceText.slice(referenceIndex, referenceIndex + windowChars);
  const quoteMatch = after.match(/["\u201c]([^"\u201d]{8,220})["\u201d]/);
  return quoteMatch ? quoteMatch[1].trim() : null;
}

async function analyzeLessonText({ text = '', sourceLabel = 'Untitled paste', submittedBy = null } = {}) {
  const raw = String(text || '');
  if (!raw.trim()) {
    return { ok: false, error: 'empty_text', report: null };
  }
  if (raw.length > MAX_TEXT_LENGTH) {
    return {
      ok: false,
      error: 'text_too_large',
      detail: `Pasted text is ${raw.length} characters; the Alpha prototype limit is ${MAX_TEXT_LENGTH} characters.`,
      report: null,
    };
  }

  const references = extractExplicitScriptureReferences(raw).slice(0, MAX_REFERENCES_PER_ANALYSIS);

  const claims = [];
  for (const reference of references) {
    const referenceIndex = raw.toLowerCase().indexOf(reference.toLowerCase().split(/[\s:]/)[0].toLowerCase());
    const nearbyQuote = findNearbyQuote(raw, referenceIndex >= 0 ? referenceIndex : 0);

    let kjvResult;
    try {
      kjvResult = await getKjvPassage(reference);
    } catch (err) {
      kjvResult = { ok: false, error: err && err.message ? err.message : 'retrieval_failed' };
    }

    if (!kjvResult || !kjvResult.ok) {
      claims.push({
        reference,
        claimType: CLAIM_TYPE.REFERENCE_UNRESOLVED,
        quotedInLesson: nearbyQuote,
        actualKjvText: null,
        overlapRatio: null,
        note: `This module could not retrieve verified KJV text for "${reference}" (${kjvResult ? kjvResult.error : 'unknown error'}). Not treated as verified — flagged for Admin, not silently accepted.`,
      });
      continue;
    }

    if (!nearbyQuote) {
      claims.push({
        reference,
        claimType: CLAIM_TYPE.REFERENCE_ONLY_NO_QUOTE,
        quotedInLesson: null,
        actualKjvText: kjvResult.text,
        overlapRatio: null,
        note: 'The lesson cites this reference but this module found no quoted text near it to compare — the reference itself is real Scripture (shown here), but whatever claim the lesson makes about it requires human reading, not an automated verdict.',
      });
      continue;
    }

    const overlap = wordOverlapRatio(nearbyQuote, kjvResult.text);
    claims.push({
      reference,
      claimType: overlap >= 0.7 ? CLAIM_TYPE.QUOTED_TEXT_MATCHES_KJV : CLAIM_TYPE.QUOTED_TEXT_DOES_NOT_MATCH_KJV,
      quotedInLesson: nearbyQuote,
      actualKjvText: kjvResult.text,
      overlapRatio: Math.round(overlap * 100) / 100,
      note:
        overlap >= 0.7
          ? 'The quoted wording substantially matches the KJV text of this reference.'
          : 'The quoted wording does NOT substantially match the actual KJV text of this reference — flagged as a misquotation risk for Admin review. This module does not assert the lesson is dishonest, only that the words differ from KJV.',
    });
  }

  const summary = {
    totalReferencesFound: references.length,
    matchesKjv: claims.filter((c) => c.claimType === CLAIM_TYPE.QUOTED_TEXT_MATCHES_KJV).length,
    misquotes: claims.filter((c) => c.claimType === CLAIM_TYPE.QUOTED_TEXT_DOES_NOT_MATCH_KJV).length,
    referenceOnlyNoQuote: claims.filter((c) => c.claimType === CLAIM_TYPE.REFERENCE_ONLY_NO_QUOTE).length,
    unresolvedReferences: claims.filter((c) => c.claimType === CLAIM_TYPE.REFERENCE_UNRESOLVED).length,
  };

  return {
    ok: true,
    error: null,
    report: {
      sourceLabel,
      submittedBy,
      analyzedAt: new Date().toISOString(),
      textLength: raw.length,
      summary,
      claims,
      governance: {
        promotedToProduction: false,
        promotionRequiresGovernedPipeline: true,
        note: 'This report is diagnostic only. No claim, reference, or relationship from this analysis has been written to any production knowledge store. Promotion into production requires the same governed pipeline (candidate -> rules engine -> Admin review -> approval) used everywhere else in this repository — this module has no auto-promotion path.',
      },
      verdict: null, // PHASE_6F — deliberate: never assert a whole-lesson true/false verdict.
      verdictNote:
        'This tool never declares an entire lesson, sermon, or person "true" or "false." It only classifies individual, extracted Scripture claims against retrieved KJV text. Claims requiring interpretation, historical verification, or original-language verification are marked for human review, not auto-resolved.',
    },
  };
}

module.exports = {
  MAX_TEXT_LENGTH,
  MAX_REFERENCES_PER_ANALYSIS,
  CLAIM_TYPE,
  analyzeLessonText,
  wordOverlapRatio,
  recordLessonAlignmentSubmission,
  readLessonAlignmentSubmissions,
};
