/**
 * Phase 6D — Governed IOG/ICOJ Scripture-relationship ingestion pipeline.
 *
 * ACQUIRE -> NORMALIZE -> DEDUPE -> VALIDATE -> SCRIPTURE_REFERENCE_VALIDATION
 * -> TAG -> RELATIONSHIP_EXTRACTION -> RULES_APPROVAL -> ADMIN_EXCEPTION_REVIEW
 * -> INDEX -> EVIDENCE_GRAPH -> PRODUCTION
 *
 * Source of record for this batch: the already-extracted ICOJ PDF Scripture
 * reference lists at docs/evidence-candidates/icoj-pdf-extraction-review.json
 * (47 documents, produced by an earlier, separate extraction pass — this
 * module treats that file as RAW_SOURCE input and NEVER assumes its content
 * is already approved).
 *
 * IMPORTANT SCOPE / COPYRIGHT BOUNDARY: this pipeline ingests ONLY the
 * Scripture *reference* discovered in each source document (e.g.
 * "Ezekiel 34:1-10"). It never stores, reproduces, or promotes the source
 * document's own prose/commentary — the only verse text ever attached to a
 * candidate is the local, validated, public-domain KJV text
 * (services/localKjvCorpusProvider). This avoids any third-party licensing
 * exposure from the discovery source's own written material while still
 * preserving IOG/ICOJ as the honest `discoverySource`.
 *
 * GOVERNANCE: Scripture remains the final authority. IOG/ICOJ is recorded
 * only as a `discoverySource` / provenance value. No candidate in this
 * pipeline can become a PRIMARY_WITNESS or SUPPORTING_WITNESS without a
 * human Admin decision — see rulesDecision below. The only rules-engine
 * AUTO_APPROVED outcome is the weakest, most conservative relationship type
 * (CROSS_REFERENCE), and only when Scripture's own chapter structure (not
 * AI judgment) already places the discovered reference in the same chapter
 * as an existing approved PRIMARY witness for that topic.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { parseScriptureRef } = require('./scriptureReferenceNormalizer');
const { getLocalPassage } = require('./localKjvCorpusProvider');
const { buildTopicWitnessRegistry, findTopicMatchesForReference } = require('./topicWitnessRegistry');
const { enqueueSupportGraphCandidate } = require('./supportGraphCandidateQueue');
const { buildKnowledgeTags } = require('./knowledgeTagStage');
const { evaluateCandidate } = require('./knowledgeApprovalRulesEngine');

const ICOJ_SOURCE_PATH = path.join(__dirname, '..', 'docs', 'evidence-candidates', 'icoj-pdf-extraction-review.json');
const APPROVED_CROSS_REFS_PATH = path.join(__dirname, '..', 'data', 'approved-cross-references.jsonl');
const AUDIT_LOG_PATH = path.join(__dirname, '..', 'data', 'knowledge-audit-log.jsonl');

const RULES_DECISION = {
  AUTO_APPROVED: 'AUTO_APPROVED',
  AUTO_REJECTED_DUPLICATE: 'AUTO_REJECTED_DUPLICATE',
  AUTO_REJECTED_INVALID_REFERENCE: 'AUTO_REJECTED_INVALID_REFERENCE',
  AUTO_REJECTED_UNSUPPORTED_RELATIONSHIP: 'AUTO_REJECTED_UNSUPPORTED_RELATIONSHIP',
  AUTO_REJECTED_PROVENANCE: 'AUTO_REJECTED_PROVENANCE',
  NEEDS_ADMIN_REVIEW: 'NEEDS_ADMIN_REVIEW',
};

function ensureDataDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// PHASE_6G Part 3 — idempotency guard. Duplicate detection in
// processExtractedReference() only checks the in-memory topic-witness
// registry (existing PRIMARY/SUPPORTING witnesses), not the file this
// function appends to — so re-running with persist:true before this fix
// would append a second copy of every already-approved cross-reference on
// every rerun. This loads the already-persisted ids once per run and
// skips re-appending (and re-logging) anything already on disk, without
// changing any approval decision.
function loadPersistedCrossReferenceIds() {
  if (!fs.existsSync(APPROVED_CROSS_REFS_PATH)) return new Set();
  try {
    const lines = fs.readFileSync(APPROVED_CROSS_REFS_PATH, 'utf8').trim().split('\n').filter(Boolean);
    return new Set(
      lines.map((line) => {
        try {
          return JSON.parse(line).id;
        } catch (_) {
          return null;
        }
      }).filter(Boolean),
    );
  } catch (_) {
    return new Set();
  }
}

function appendAuditLog(entry) {
  const record = { ...entry, loggedAt: new Date().toISOString() };
  // PHASE_6 security/reliability hardening — never let an audit-log write
  // failure (disk full, permissions) crash the caller (Admin action route or
  // ingestion job). The record is still returned so the caller's in-memory
  // decision is unaffected; only the durable log line may be missing, and
  // that failure is surfaced to the server log for operator follow-up.
  try {
    ensureDataDir(AUDIT_LOG_PATH);
    fs.appendFileSync(AUDIT_LOG_PATH, `${JSON.stringify(record)}\n`, 'utf8');
  } catch (e) {
    console.warn('[iogIcojGovernedIngestion] audit log write failed:', e.message);
  }
  return record;
}

/**
 * 6D.1 — SOURCE ACQUISITION for the ICOJ PDF extraction review file.
 * Every acquired item receives immutable source metadata. Never mutates the
 * raw source file.
 */
function acquireIcojPdfSources() {
  if (!fs.existsSync(ICOJ_SOURCE_PATH)) {
    return { ok: false, error: 'icoj_source_file_not_found', sources: [] };
  }
  const raw = JSON.parse(fs.readFileSync(ICOJ_SOURCE_PATH, 'utf8'));
  const sources = (raw.reviews || []).map((review) => ({
    sourceId: `icoj_pdf_${sha256(review.sourceUrl || review.pdfTitle).slice(0, 16)}`,
    sourceHash: sha256(JSON.stringify(review)),
    acquisitionTimestamp: new Date().toISOString(),
    originalExtractionTimestamp: raw.ranAt || null,
    sourceType: 'ICOJ_PDF_EXTRACT',
    sourceLocation: 'docs/evidence-candidates/icoj-pdf-extraction-review.json',
    sourceUrl: review.sourceUrl || null,
    title: review.pdfTitle || null,
    camp: review.camp || null,
    licensingStatus: 'DISCOVERY_ONLY_NO_SOURCE_PROSE_STORED — only the Scripture reference list is used; the source document\'s own prose/commentary is never stored or promoted.',
    provenance: 'IOG/ICOJ (The Israel of God) published PDF, previously auto-extracted for Scripture references only.',
    rawStorageLocation: ICOJ_SOURCE_PATH,
    extractedReferences: review.scripturesExtracted || review.scriptureOrder || [],
  }));
  return { ok: true, error: null, sources };
}

/**
 * 6D.1 — SOURCE ACQUISITION for raw IOG YouTube transcript files (currently
 * left RAW/ISOLATED per the Known Verified State — this function only
 * inventories them with immutable metadata; it does not parse transcript
 * text in this batch. See BiblicalKnowledgeInventory.md for the documented
 * scope decision and follow-on plan).
 */
function acquireIogTranscriptSources() {
  const dir = path.join(__dirname, '..', 'docs', 'evidence-candidates', 'youtube-transcripts');
  if (!fs.existsSync(dir)) return { ok: false, error: 'iog_transcript_dir_not_found', sources: [] };
  const sources = [];
  (function walk(d) {
    for (const entry of fs.readdirSync(d)) {
      const full = path.join(d, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (entry.endsWith('.vtt')) {
        sources.push({
          sourceId: `iog_transcript_${sha256(full).slice(0, 16)}`,
          sourceType: 'IOG_TRANSCRIPT_RAW',
          sourceLocation: full,
          title: path.basename(full),
          isCleaned: !entry.includes('-orig'),
          sizeBytes: stat.size,
          status: 'RAW_ISOLATED_NOT_PARSED_THIS_BATCH',
        });
      }
    }
  })(dir);
  return { ok: true, error: null, sources };
}

// PHASE_6G Part 3 — bounded proof-of-concept spoken-Scripture-reference
// extraction for a small sample of IOG transcripts, reusing the SAME
// validated normalizer (parseScriptureRef) and the SAME governed
// processExtractedReference() decision pipeline as the ICOJ PDF path —
// this is NOT a new knowledge pipeline, it is a second, bounded ACQUIRE
// step feeding the one existing pipeline. Deliberately limited to a small
// sample (default 5 unique episodes) rather than the full ~120 unique
// transcripts: auto-generated caption text requires natural-language
// chapter/verse detection (e.g. "Exodus chapter 20"), which is materially
// higher-risk for false positives than the ICOJ PDFs' pre-structured
// reference lists, so a full-corpus run is deliberately deferred as a
// separate bounded background job rather than run unreviewed here.
const SPOKEN_REFERENCE_RE =
  /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+(?:chapter\s+)?(\d{1,3})(?:\s*(?::|verse)\s*(\d{1,3}))?\b/gi;

function stripVttNoise(rawText) {
  return rawText
    .split('\n')
    .filter((line) => !/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->/.test(line))
    .filter((line) => !/^(WEBVTT|Kind:|Language:)/.test(line))
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

function extractSpokenReferencesFromText(text) {
  const found = new Set();
  let m;
  SPOKEN_REFERENCE_RE.lastIndex = 0;
  while ((m = SPOKEN_REFERENCE_RE.exec(text))) {
    const candidate = `${m[1]} ${m[2]}${m[3] ? `:${m[3]}` : ''}`;
    found.add(candidate);
  }
  return Array.from(found);
}

function runBoundedIogTranscriptSample({ maxFiles = 5, registry } = {}) {
  const acquisition = acquireIogTranscriptSources();
  if (!acquisition.ok) return acquisition;

  // Prefer the "cleaned" caption variant (non "-orig") for each unique
  // episode, deterministically sorted, so repeat runs sample the same set.
  const uniqueEpisodes = acquisition.sources
    .filter((s) => s.isCleaned)
    .sort((a, b) => a.sourceLocation.localeCompare(b.sourceLocation))
    .slice(0, maxFiles);

  const activeRegistry = registry || buildTopicWitnessRegistry();
  const sampleResults = [];

  for (const source of uniqueEpisodes) {
    let text = '';
    try {
      text = stripVttNoise(fs.readFileSync(source.sourceLocation, 'utf8'));
    } catch (e) {
      sampleResults.push({ source: source.title, status: 'READ_FAILED', error: e.message });
      continue;
    }
    const references = extractSpokenReferencesFromText(text);
    const processed = references.map((reference) =>
      processExtractedReference({
        reference,
        source: { ...source, sourceType: 'IOG_TRANSCRIPT_SAMPLE' },
        registry: activeRegistry,
      }),
    );
    sampleResults.push({
      source: source.title,
      sourceLocation: source.sourceLocation,
      sizeBytes: source.sizeBytes,
      referencesFound: references.length,
      processed,
    });
  }

  const totalUniqueEpisodes = acquisition.sources.filter((s) => s.isCleaned).length;

  return {
    ok: true,
    error: null,
    filesSampled: uniqueEpisodes.length,
    totalUniqueEpisodesAvailable: totalUniqueEpisodes,
    remainingDeferred: totalUniqueEpisodes - uniqueEpisodes.length,
    deferredReason:
      'Auto-generated spoken-caption Scripture-reference extraction requires natural-language chapter/verse detection, materially higher false-positive risk than the ICOJ PDFs\u2019 pre-structured reference lists. A small deterministic sample was processed through the existing governed pipeline this batch to prove feasibility; the remaining unique episodes are explicitly deferred to a separate bounded background job rather than run unreviewed.',
    sampleResults,
  };
}

/**
 * NORMALIZE + SCRIPTURE_REFERENCE_VALIDATION + DEDUPE + TAG +
 * RELATIONSHIP_EXTRACTION + RULES_APPROVAL for a single discovered
 * reference from a single source document.
 */
function processExtractedReference({ reference, source, registry }) {
  const parsed = parseScriptureRef(reference);
  const normalizedReference = parsed
    ? `${parsed.book} ${parsed.chapter}${parsed.verseStart ? `:${parsed.verseStart}${parsed.verseEnd && parsed.verseEnd !== parsed.verseStart ? `-${parsed.verseEnd}` : ''}` : ''}`
    : reference;

  const local = getLocalPassage(reference);
  if (!local.ok) {
    return {
      discoverySource: 'IOG/ICOJ',
      sourceDocument: source.title,
      sourceLocation: source.sourceLocation,
      extractedReference: reference,
      normalizedReference,
      actualKjvText: null,
      proposedTopic: null,
      proposedRelationshipType: null,
      supportingReason: `Reference did not resolve against the validated local KJV corpus: ${local.error}`,
      duplicateStatus: 'NOT_APPLICABLE',
      scriptureValidation: 'INVALID',
      rulesDecision: RULES_DECISION.AUTO_REJECTED_INVALID_REFERENCE,
      adminReviewRequired: false,
      productionStatus: 'REJECTED',
    };
  }

  const matches = findTopicMatchesForReference(reference, registry);
  const exactDuplicate = matches.find((m) => m.matchKind === 'EXACT_DUPLICATE');
  const sameChapterAsPrimary = matches.find((m) => m.matchKind === 'SAME_CHAPTER_AS_PRIMARY');
  const sameChapterAsSupporting = matches.find((m) => m.matchKind === 'SAME_CHAPTER_AS_SUPPORTING');

  if (exactDuplicate) {
    return {
      discoverySource: 'IOG/ICOJ',
      sourceDocument: source.title,
      sourceLocation: source.sourceLocation,
      extractedReference: reference,
      normalizedReference,
      actualKjvText: local.text,
      proposedTopic: exactDuplicate.topicId,
      proposedRelationshipType: 'DUPLICATE_OF_EXISTING_WITNESS',
      supportingReason: `Identical to an existing witness (${exactDuplicate.matchedWitness}) already approved for topic "${exactDuplicate.topicId}".`,
      duplicateStatus: 'EXACT_DUPLICATE',
      scriptureValidation: 'VALID',
      rulesDecision: RULES_DECISION.AUTO_REJECTED_DUPLICATE,
      adminReviewRequired: false,
      productionStatus: 'REJECTED',
    };
  }

  if (!matches.length) {
    // No deterministic connection to any existing approved topic. This
    // pipeline never guesses a new topic from AI judgment, so this is
    // recorded honestly as unclassified rather than silently dropped.
    return {
      discoverySource: 'IOG/ICOJ',
      sourceDocument: source.title,
      sourceLocation: source.sourceLocation,
      extractedReference: reference,
      normalizedReference,
      actualKjvText: local.text,
      proposedTopic: null,
      proposedRelationshipType: 'UNCLASSIFIED_SCRIPTURE_MENTION',
      supportingReason: 'Valid Scripture reference, but it does not share a book+chapter with any existing approved topic witness. No new topic was inferred (never approved from AI similarity alone).',
      duplicateStatus: 'NONE',
      scriptureValidation: 'VALID',
      rulesDecision: RULES_DECISION.AUTO_REJECTED_UNSUPPORTED_RELATIONSHIP,
      adminReviewRequired: false,
      productionStatus: 'NOT_QUEUED_NO_TOPIC_MATCH',
    };
  }

  if (sameChapterAsPrimary) {
    return {
      discoverySource: 'IOG/ICOJ',
      sourceDocument: source.title,
      sourceLocation: source.sourceLocation,
      extractedReference: reference,
      normalizedReference,
      actualKjvText: local.text,
      proposedTopic: sameChapterAsPrimary.topicId,
      proposedRelationshipType: 'CROSS_REFERENCE',
      supportingReason: `Same book+chapter as existing approved primary witness (${sameChapterAsPrimary.matchedWitness}) for topic "${sameChapterAsPrimary.topicId}" — deterministic chapter-context match, not an AI inference.`,
      duplicateStatus: 'NONE',
      scriptureValidation: 'VALID',
      rulesDecision: RULES_DECISION.AUTO_APPROVED,
      adminReviewRequired: false,
      productionStatus: 'AUTO_APPROVED_CROSS_REFERENCE',
    };
  }

  // New candidate SUPPORTING_WITNESS/PRIMARY_WITNESS-level relationship, or
  // only a same-chapter-as-supporting overlap — genuinely new doctrinal
  // territory discovered via an external ministry source. Always routed to
  // a human, per governance.
  const bestMatch = sameChapterAsSupporting || matches[0];
  return {
    discoverySource: 'IOG/ICOJ',
    sourceDocument: source.title,
    sourceLocation: source.sourceLocation,
    extractedReference: reference,
    normalizedReference,
    actualKjvText: local.text,
    proposedTopic: bestMatch.topicId,
    proposedRelationshipType: sameChapterAsSupporting ? 'CROSS_REFERENCE' : 'CANDIDATE_SUPPORTING_WITNESS',
    supportingReason: `Discovered in IOG/ICOJ source "${source.title}"; ${bestMatch.matchKind === 'SAME_CHAPTER_AS_SUPPORTING' ? 'same chapter as an existing supporting witness' : 'same book as an existing witness'} for topic "${bestMatch.topicId}" — requires human doctrinal judgment before promotion.`,
    duplicateStatus: 'NONE',
    scriptureValidation: 'VALID',
    rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW,
    adminReviewRequired: true,
    productionStatus: 'PENDING_ADMIN_REVIEW',
  };
}

/**
 * Full pipeline run. `persist=false` (default) performs a dry run useful
 * for reporting; `persist=true` actually writes AUTO_APPROVED cross-refs to
 * data/approved-cross-references.jsonl, enqueues NEEDS_ADMIN_REVIEW
 * candidates into the existing support-graph candidate queue, and appends
 * immutable audit-log entries for every decision category.
 */
function runGovernedIcojIngestion({ persist = false, maxSources = null } = {}) {
  const acquisition = acquireIcojPdfSources();
  if (!acquisition.ok) return acquisition;

  const registry = buildTopicWitnessRegistry();
  const sources = maxSources ? acquisition.sources.slice(0, maxSources) : acquisition.sources;
  const alreadyPersistedIds = persist ? loadPersistedCrossReferenceIds() : new Set();
  const persistedCountBeforeRun = alreadyPersistedIds.size;

  const results = {
    autoApproved: [],
    autoRejectedDuplicate: [],
    autoRejectedInvalid: [],
    unclassifiedNoTopic: [],
    needsAdminReview: [],
  };

  for (const source of sources) {
    const seenInSource = new Set();
    for (const reference of source.extractedReferences) {
      if (seenInSource.has(reference)) continue; // per-source dedupe before scoring
      seenInSource.add(reference);

      const processed = processExtractedReference({ reference, source, registry });
      // PHASE_6E Part 8 — TAG stage: pure, additive metadata derived from
      // fields already computed above. Never gates or changes any decision
      // below; only attaches reporting/filtering metadata to the record.
      processed.tags = buildKnowledgeTags(processed);

      switch (processed.rulesDecision) {
        case RULES_DECISION.AUTO_APPROVED:
          results.autoApproved.push(processed);
          if (persist) {
            const candidateId = `xref_${sha256(`${source.sourceId}|${reference}`).slice(0, 16)}`;
            if (!alreadyPersistedIds.has(candidateId)) {
              ensureDataDir(APPROVED_CROSS_REFS_PATH);
              const record = {
                id: candidateId,
                ...processed,
                discoveredAt: new Date().toISOString(),
                approvedBy: 'rules_engine_deterministic_chapter_match',
                domain: 'BIBLICAL_KNOWLEDGE',
              };
              try {
                fs.appendFileSync(APPROVED_CROSS_REFS_PATH, `${JSON.stringify(record)}\n`, 'utf8');
              } catch (e) {
                console.warn('[iogIcojGovernedIngestion] approved-cross-refs write failed:', e.message);
              }
              appendAuditLog({ action: 'PROMOTE_CROSS_REFERENCE', candidateId: record.id, decision: 'AUTO_APPROVED', topic: processed.proposedTopic, reference });
              alreadyPersistedIds.add(candidateId);
            }
          }
          break;
        case RULES_DECISION.AUTO_REJECTED_DUPLICATE:
          results.autoRejectedDuplicate.push(processed);
          if (persist) appendAuditLog({ action: 'REJECT_CANDIDATE', decision: 'AUTO_REJECTED_DUPLICATE', topic: processed.proposedTopic, reference });
          break;
        case RULES_DECISION.AUTO_REJECTED_INVALID_REFERENCE:
          results.autoRejectedInvalid.push(processed);
          if (persist) appendAuditLog({ action: 'REJECT_CANDIDATE', decision: 'AUTO_REJECTED_INVALID_REFERENCE', reference });
          break;
        case RULES_DECISION.AUTO_REJECTED_UNSUPPORTED_RELATIONSHIP:
          results.unclassifiedNoTopic.push(processed);
          // PHASE_6G Part 3 — previously these were counted in-memory but
          // never written anywhere, making them invisible to any future
          // audit or Admin review even though the batch requires "remaining
          // unprocessed or inaccessible sources are explicitly listed."
          // This does not approve or create an evidence candidate for
          // them — it only records that a Scripture mention was found and
          // could not be matched to any known doctrine topic, for
          // visibility.
          if (persist) {
            appendAuditLog({
              action: 'UNCLASSIFIED_NO_TOPIC_MATCH',
              decision: 'AUTO_REJECTED_UNSUPPORTED_RELATIONSHIP',
              reference,
              sourceDocument: source.title,
            });
          }
          break;
        case RULES_DECISION.NEEDS_ADMIN_REVIEW:
        default: {
          // Also run the general-purpose approval rules engine for a second,
          // independent opinion recorded alongside this pipeline's own
          // deterministic decision (belt-and-suspenders — never silently
          // trusts a single rule path for a doctrinally sensitive add).
          const candidateForGeneralEngine = {
            id: `sgc_icoj_${sha256(`${source.sourceId}|${reference}`).slice(0, 12)}`,
            topic: processed.proposedTopic,
            proposedClaim: `IOG/ICOJ source "${source.title}" cites ${processed.normalizedReference} in connection with topic "${processed.proposedTopic}".`,
            scriptures: [processed.normalizedReference],
            relationshipType: processed.proposedRelationshipType === 'CROSS_REFERENCE' ? 'unverified_support' : 'unverified',
            reason: processed.supportingReason,
            confidence: 'low',
            source: 'iog_icoj_governed_ingestion',
          };
          const generalEvaluation = evaluateCandidate(candidateForGeneralEngine);

          results.needsAdminReview.push({ ...processed, generalRulesEvaluation: generalEvaluation });
          if (persist) {
            const queued = enqueueSupportGraphCandidate({
              ...candidateForGeneralEngine,
              discoverySource: processed.discoverySource,
              sourceDocument: processed.sourceDocument,
              sourceLocation: processed.sourceLocation,
              extractedReference: processed.extractedReference,
              actualKjvText: processed.actualKjvText,
              proposedTopic: processed.proposedTopic,
              proposedRelationshipType: processed.proposedRelationshipType,
              supportingReason: processed.supportingReason,
              duplicateStatus: processed.duplicateStatus,
              scriptureValidation: processed.scriptureValidation,
            rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW,
            adminReviewRequired: true,
            productionStatus: 'PENDING_ADMIN_REVIEW',
            tags: processed.tags,
          });
            appendAuditLog({ action: 'QUEUE_FOR_ADMIN_REVIEW', candidateId: queued.id, topic: processed.proposedTopic, reference });
          }
          break;
        }
      }
    }
  }

  return {
    ok: true,
    error: null,
    sourcesProcessed: sources.length,
    totalSourcesAvailable: acquisition.sources.length,
    persisted: persist,
    counts: {
      autoApproved: results.autoApproved.length,
      autoRejectedDuplicate: results.autoRejectedDuplicate.length,
      autoRejectedInvalid: results.autoRejectedInvalid.length,
      unclassifiedNoTopic: results.unclassifiedNoTopic.length,
      needsAdminReview: results.needsAdminReview.length,
      newlyPersistedThisRun: persist ? alreadyPersistedIds.size - persistedCountBeforeRun : null,
    },
    results,
  };
}

function readApprovedCrossReferences({ topic = null } = {}) {
  if (!fs.existsSync(APPROVED_CROSS_REFS_PATH)) return [];
  const lines = fs.readFileSync(APPROVED_CROSS_REFS_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const records = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  return topic ? records.filter((r) => r.proposedTopic === topic) : records;
}

function readKnowledgeAuditLog({ limit = 200 } = {}) {
  if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
  const lines = fs.readFileSync(AUDIT_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

module.exports = {
  RULES_DECISION,
  APPROVED_CROSS_REFS_PATH,
  AUDIT_LOG_PATH,
  acquireIcojPdfSources,
  acquireIogTranscriptSources,
  processExtractedReference,
  runGovernedIcojIngestion,
  runBoundedIogTranscriptSample,
  readApprovedCrossReferences,
  readKnowledgeAuditLog,
  appendAuditLog,
};
