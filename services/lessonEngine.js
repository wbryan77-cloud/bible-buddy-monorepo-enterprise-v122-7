/**
 * Phase 5 — Lesson Engine (candidate / dry-run)
 *
 * Additive Lesson assembly on top of stable Study-Chain Evaluation.
 * Does NOT modify processExtractedReference, AUTO_APPROVE, or production stores.
 * Does NOT call OpenAI. Does NOT activate lessons in runtime.
 *
 * persist:false · candidate artifacts only
 */

const crypto = require('crypto');
const { normalizeRef, recommendOrder, PASSAGE_ROLES: CHAIN_ROLES } = require('./studyChainEvaluation');
const { getLocalPassage } = require('./localKjvCorpusProvider');
const { getAllApprovedCards, retrieveEvidenceCards } = require('./evidenceCards');
const { buildHistoricalEvidence } = require('./historicalEvidenceLayer');
const { expandScriptureParallels } = require('./scriptureParallelExpansion');

const LESSON_VERSION = 'lesson-engine-phase5-v1';
const PACKET_VERSION = 'verified-lesson-packet-v1';
const DISPLAY_CONTRACT_VERSION = 'scripture-first-teaching-v1';

/** Extended role vocabulary (metadata only — not wired to AUTO_APPROVE). */
const LESSON_PASSAGE_ROLES = [
  'primary_text',
  'definition',
  'command',
  'instruction',
  'explanation',
  'example',
  'historical_event',
  'prophecy',
  'fulfillment',
  'warning',
  'consequence',
  'blessing',
  'promise',
  'contrast',
  'limitation',
  'exception',
  'application',
  'supporting_witness',
  'balancing_passage',
  'clarifying_passage',
  'thematic_background',
  'covenant_context',
  'language_context',
  'historical_context',
  ...CHAIN_ROLES,
];

const ROLE_ALIASES = {
  thematic_background: 'thematic_background',
  historical_event: 'historical_event',
  explanation: 'explanation',
  command: 'command',
  definition: 'definition',
  example: 'example',
  warning: 'warning',
  prophecy: 'prophecy',
  fulfillment: 'fulfillment',
  contrast: 'contrast',
  limitation: 'limitation',
  exception: 'exception',
  application: 'application',
  consequence: 'consequence',
};

function sha16(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
}

function mapChainRoleToLessonRole(role, index, isPrimaryHint) {
  const r = ROLE_ALIASES[role] || role || 'explanation';
  if (isPrimaryHint && index === 0) return 'primary_text';
  if (r === 'command') return 'command';
  return r;
}

function roleExplanation(role, ref) {
  const map = {
    primary_text: `Opens the lesson subject at ${ref}.`,
    definition: `Helps define the subject at ${ref}.`,
    command: `States a command or required practice at ${ref}.`,
    instruction: `Gives instructional direction at ${ref}.`,
    explanation: `Explains or develops the subject at ${ref}.`,
    example: `Provides an example related to the subject at ${ref}.`,
    historical_event: `Records a historical event connected to the subject at ${ref}.`,
    prophecy: `Gives prophetic witness related to the subject at ${ref}.`,
    fulfillment: `Shows fulfillment or New Testament application at ${ref}.`,
    warning: `Warns concerning the subject at ${ref}.`,
    consequence: `Shows consequence related to the subject at ${ref}.`,
    blessing: `States blessing connected to the subject at ${ref}.`,
    promise: `States a promise connected to the subject at ${ref}.`,
    contrast: `Provides contrast that clarifies the subject at ${ref}.`,
    limitation: `Limits or qualifies the application at ${ref}.`,
    exception: `Notes an exception relevant to the subject at ${ref}.`,
    application: `Applies the subject at ${ref}.`,
    supporting_witness: `Supports the subject as a witness at ${ref}.`,
    balancing_passage: `Balances or clarifies the subject at ${ref}.`,
    clarifying_passage: `Clarifies the subject at ${ref}.`,
    thematic_background: `Provides thematic background at ${ref}.`,
    covenant_context: `Supplies covenant context at ${ref}.`,
    language_context: `Language context placeholder for ${ref}.`,
    historical_context: `Historical context placeholder for ${ref}.`,
  };
  return map[role] || `Contributes to the study at ${ref}.`;
}

/**
 * Build passageRoleDetails from a study-chain record (metadata only).
 */
function buildPassageRoleDetails(studyChain = {}) {
  const sourceOrder = studyChain.scriptureReferencesSourceOrder || [];
  const recommended = studyChain.recommendedReadingOrder || [];
  const roles = studyChain.passageRoles || {};
  const passages = studyChain.passages || [];
  const byNorm = new Map(passages.map((p) => [String(p.normalized || '').toLowerCase(), p]));
  const details = [];

  sourceOrder.forEach((raw, index) => {
    const n = normalizeRef(raw);
    const norm = n.normalized || String(raw).toLowerCase();
    const p = byNorm.get(String(norm).toLowerCase()) || {};
    const chainRole = roles[norm] || roles[String(norm).toLowerCase()] || p.role || 'explanation';
    const role = mapChainRoleToLessonRole(chainRole, index, true);
    const recIndex = recommended.findIndex((r) => String(r).toLowerCase() === String(norm).toLowerCase());
    details.push({
      scriptureReference: raw,
      normalizedReference: norm,
      sourceOrder: index + 1,
      recommendedOrder: recIndex >= 0 ? recIndex + 1 : null,
      role,
      roleConfidence: n.valid ? 'medium' : 'low',
      roleExplanation: roleExplanation(role, norm),
      roleSource: 'study_chain_heuristic_v1',
      adminOverride: null,
      sourceLessonLocation: studyChain.sourceLocation || null,
      studyChainId: studyChain.studyChainId || null,
      contextualIntegrity: n.valid ? 'PASS' : 'FAIL',
      kjvValid: !!n.valid,
      doctrineStatus: studyChain.doctrineReviewRequired ? 'NEEDS_ADMIN_REVIEW' : 'NOT_REQUIRED_FOR_STUDY',
      historyStatus: studyChain.historyReviewRequired ? 'UNVERIFIED' : 'NOT_APPLICABLE',
      languageStatus: studyChain.languageReviewRequired ? 'REVIEW_FLAGGED' : 'NOT_APPLICABLE',
    });
  });
  return details;
}

function resolveEvidenceCardIds(topic) {
  try {
    const cards = retrieveEvidenceCards({ topic: topic || '', message: String(topic || '') }) || [];
    return cards.map((c) => c.cardId || c.topic).filter(Boolean);
  } catch (_) {
    return getAllApprovedCards()
      .filter((c) => String(c.topic || '').toLowerCase() === String(topic || '').toLowerCase())
      .map((c) => c.cardId || c.topic);
  }
}

function attachHistoricalContext(topic) {
  const hist = buildHistoricalEvidence(topic) || { evidence: [], separatedFromScripture: true };
  const notes = hist.evidence || [];
  return {
    historicalContextIds: notes.map((_, i) => `hist_${topic || 'unknown'}_${i}`),
    historicalEvidence: notes.map((note, i) => ({
      id: `hist_${topic || 'unknown'}_${i}`,
      note,
      status: 'UNVERIFIED',
      separatedFromScripture: !!hist.separatedFromScripture,
      attribution: 'historicalEvidenceLayer (thin topic notes — not network-verified)',
    })),
    historyStatus: notes.length ? 'UNVERIFIED' : 'NOT_APPLICABLE',
  };
}

function buildScriptureBlocks(roleDetails) {
  return roleDetails
    .filter((d) => d.kjvValid)
    .map((d) => {
      const local = getLocalPassage(d.normalizedReference);
      return {
        reference: d.normalizedReference,
        displayReference: d.scriptureReference,
        role: d.role,
        sourceOrder: d.sourceOrder,
        recommendedOrder: d.recommendedOrder,
        translation: 'KJV',
        text: local.ok ? local.text : null,
        roleExplanation: d.roleExplanation,
      };
    })
    .filter((b) => b.text);
}

function buildConnections(roleDetails) {
  const ordered = [...roleDetails].filter((d) => d.kjvValid).sort((a, b) => a.sourceOrder - b.sourceOrder);
  const connections = [];
  for (let i = 0; i < ordered.length; i++) {
    const d = ordered[i];
    connections.push({
      index: i + 1,
      reference: d.normalizedReference,
      role: d.role,
      sentence: d.roleExplanation,
    });
  }
  return connections;
}

/**
 * Assemble one Lesson from one Study Chain (additive fields).
 */
function assembleLessonFromStudyChain(studyChain = {}, opts = {}) {
  const topic = studyChain.normalizedTopic || studyChain.sourceTopic || 'unspecified';
  const passageRoleDetails = buildPassageRoleDetails(studyChain);
  const unrelated = studyChain.unrelatedPassages || [];
  const hist = attachHistoricalContext(topic);
  const evidenceCardIds = resolveEvidenceCardIds(topic);
  const balancing = [...(studyChain.balancingPassages || [])];
  const parallelExtras = expandScriptureParallels({
    scriptureChain: studyChain.normalizedReferences || studyChain.scriptureReferencesSourceOrder || [],
  }).filter((r) => !(studyChain.normalizedReferences || []).map(String).map((x) => x.toLowerCase()).includes(String(r).toLowerCase()));

  const clarifyingPassageRefs = parallelExtras.slice(0, 5);
  const sourceReadingOrder = [...(studyChain.scriptureReferencesSourceOrder || [])];
  const recommendedReadingOrder = studyChain.recommendedReadingOrder || recommendOrder(
    (studyChain.normalizedReferences || []).slice(),
  );

  const classification = studyChain.classification || 'STUDY_CHAIN_CANDIDATE';
  const doctrineStatus = studyChain.doctrineReviewRequired
    ? 'NEEDS_ADMIN_REVIEW'
    : 'NOT_REQUIRED_FOR_STUDY_LANE';
  const governanceStatus = 'CANDIDATE_ONLY';

  let teachingReadiness;
  let studyAdminRequired;
  if (classification === 'VERIFIED_STUDY_CHAIN' && passageRoleDetails.filter((d) => d.kjvValid).length >= 2) {
    teachingReadiness = 'LESSON_READY_FOR_TEACHING_CANDIDATE';
    studyAdminRequired = false;
  } else if (classification === 'STUDY_CHAIN_CANDIDATE') {
    teachingReadiness = 'FOCUSED_STUDY_REVIEW';
    studyAdminRequired = true;
  } else if (classification === 'THEMATIC_STUDY_LINK') {
    teachingReadiness = 'FOCUSED_STUDY_REVIEW';
    studyAdminRequired = true;
  } else {
    teachingReadiness = 'BLOCKED_OR_REJECTED';
    studyAdminRequired = true;
  }

  const lessonId = `lesson_${sha16(
    [studyChain.corpus, studyChain.sourceDocument, studyChain.sourceLocation, topic, studyChain.studyChainId].join('::'),
  )}`;

  const blockingFactors = [...(studyChain.blockingFactors || [])];
  if (unrelated.length) {
    blockingFactors.push({ factor: 'unrelated_passages_isolated', refs: unrelated });
  }

  const lesson = {
    lessonId,
    lessonVersion: LESSON_VERSION,
    lessonTitle: studyChain.sourceDocument || topic,
    normalizedTopic: topic,
    sourceTopic: studyChain.sourceTopic || topic,
    userQuestionPatterns: [],
    lessonPurpose: `Study ${topic} from Scripture in source order, with roles as metadata only.`,
    lessonSummary: studyChain.proposedProposition || null,
    learningObjectives: [
      `Read the selected passages on ${topic} together.`,
      'Distinguish Scripture text from history and commentary.',
    ],
    sourceCorpusIds: studyChain.corpus ? [studyChain.corpus] : [],
    sourceLessonIds: studyChain.sourceDocument ? [studyChain.sourceDocument] : [],
    studyChainIds: studyChain.studyChainId ? [studyChain.studyChainId] : [],
    primaryStudyChainId: studyChain.studyChainId || null,
    sections: [
      {
        sectionId: `${lessonId}_sec1`,
        title: studyChain.sourceDocument || topic,
        studyChainIds: studyChain.studyChainId ? [studyChain.studyChainId] : [],
        proposition: studyChain.proposedProposition || null,
      },
    ],
    passageRoleDetails,
    sourceReadingOrder,
    recommendedReadingOrder,
    balancingPassageRefs: balancing,
    clarifyingPassageRefs,
    limitingPassageRefs: passageRoleDetails.filter((d) => d.role === 'limitation').map((d) => d.normalizedReference),
    warningPassageRefs: passageRoleDetails.filter((d) => d.role === 'warning').map((d) => d.normalizedReference),
    prophecyFulfillmentPairs: pairProphecyFulfillment(passageRoleDetails),
    historicalContextIds: hist.historicalContextIds,
    historicalEvidence: hist.historicalEvidence,
    languageContextIds: [],
    languageEvidence: [],
    evidenceCardIds,
    supportGraphIds: [],
    doctrineEvidenceIds: [],
    doctrineStatus,
    historyStatus: hist.historyStatus,
    languageStatus: 'NOT_ATTACHED',
    governanceStatus,
    reflectionQuestions: [
      `What do these passages say about ${topic}?`,
      'Which passage defines, commands, or clarifies the subject?',
    ],
    studyNotes: 'Candidate lesson — not production-activated. Doctrine promotion unchanged.',
    shortPrayer: null,
    displayContractVersion: DISPLAY_CONTRACT_VERSION,
    provenance: {
      ...(studyChain.provenance || {}),
      studyChainId: studyChain.studyChainId,
      corpus: studyChain.corpus,
      sourceDocument: studyChain.sourceDocument,
      sourceLocation: studyChain.sourceLocation,
      sourceAuthorOrOrganization: studyChain.sourceAuthorOrOrganization,
    },
    confidence: studyChain.confidence || 'medium',
    overallStudyChainScore: studyChain.overallStudyChainScore,
    studyChainClassification: classification,
    blockingFactors,
    reviewReasons: studyChain.adminReason ? [studyChain.adminReason] : [],
    createdFrom: 'study_chain_evaluation',
    processingVersion: LESSON_VERSION,
    teachingReadiness,
    studyAdminRequired,
    doctrineReviewRequired: !!studyChain.doctrineReviewRequired,
    historyReviewRequired: hist.historyStatus === 'UNVERIFIED',
    languageReviewRequired: false,
    technicalReviewRequired: !!studyChain.technicalReviewRequired,
    unrelatedPassagesIsolated: unrelated,
    productionActivation: false,
    persist: false,
    openAiUpload: false,
    fineTuneJob: false,
  };

  return lesson;
}

function pairProphecyFulfillment(details) {
  const prophecies = details.filter((d) => d.role === 'prophecy');
  const fulfillments = details.filter((d) => d.role === 'fulfillment');
  const pairs = [];
  const n = Math.min(prophecies.length, fulfillments.length);
  for (let i = 0; i < n; i++) {
    pairs.push({
      prophecy: prophecies[i].normalizedReference,
      fulfillment: fulfillments[i].normalizedReference,
    });
  }
  return pairs;
}

/**
 * Compact VERIFIED_LESSON_PACKET for a future single OpenAI composition call.
 * Dry-run only — not sent to OpenAI in this phase.
 */
function buildVerifiedLessonPacket(lesson = {}, question = null) {
  const scriptureBlocks = buildScriptureBlocks(lesson.passageRoleDetails || []);
  const connections = buildConnections(lesson.passageRoleDetails || []);
  return {
    packetVersion: PACKET_VERSION,
    question: question || `What does Scripture say about ${lesson.normalizedTopic}?`,
    topic: {
      normalizedTopic: lesson.normalizedTopic,
      sourceTopic: lesson.sourceTopic,
      lessonTitle: lesson.lessonTitle,
    },
    lesson: {
      lessonId: lesson.lessonId,
      lessonTitle: lesson.lessonTitle,
      lessonPurpose: lesson.lessonPurpose,
      lessonSummary: lesson.lessonSummary,
      teachingReadiness: lesson.teachingReadiness,
      sourceReadingOrder: lesson.sourceReadingOrder,
      recommendedReadingOrder: lesson.recommendedReadingOrder,
    },
    scriptureBlocks,
    passageRoles: (lesson.passageRoleDetails || []).map((d) => ({
      reference: d.normalizedReference,
      role: d.role,
      roleExplanation: d.roleExplanation,
      sourceOrder: d.sourceOrder,
    })),
    connections,
    balancingPassages: (lesson.balancingPassageRefs || []).map((r) => ({ reference: r, status: 'from_evidence_card_caution' })),
    clarifyingPassages: (lesson.clarifyingPassageRefs || []).map((r) => ({ reference: r, status: 'parallel_seed' })),
    historicalEvidence: (lesson.historicalEvidence || []).map((h) => ({
      id: h.id,
      note: h.note,
      status: h.status,
      attribution: h.attribution,
      separatedFromScripture: true,
    })),
    languageEvidence: lesson.languageEvidence || [],
    doctrineStatus: lesson.doctrineStatus,
    governanceStatus: lesson.governanceStatus,
    historyStatus: lesson.historyStatus,
    languageStatus: lesson.languageStatus,
    responseContract: {
      version: DISPLAY_CONTRACT_VERSION,
      structure: [
        'Topic',
        'What the Scriptures show',
        'Read these passages together',
        'How the passages connect',
        'Historical context (if any, with status)',
        'Hebrew or Greek context (if any)',
        'What remains under review',
        'Reflection (optional)',
      ],
      rules: [
        'Say less; let Scripture say more',
        'Do not rewrite or contradict scriptureBlocks text',
        'Do not change doctrineStatus or governanceStatus',
        'Do not invent historical citations',
        'Do not claim doctrine is conclusively proved unless doctrineStatus says so',
        'Use headings and separate Scripture blocks',
        'Label KJV',
        'Keep history separatedFromScripture',
      ],
    },
    prohibitedOverstatements: [
      'This doctrine is conclusively proved',
      'History proves the Bible says',
      'All scholars agree',
      'Invented page/URL/author citations',
    ],
    citations: scriptureBlocks.map((b) => ({ reference: b.reference, translation: 'KJV' })),
    provenance: lesson.provenance,
    productionActivation: false,
    persist: false,
    composedBy: 'biblebuddy_lesson_engine',
    openAiMayApproveEvidence: false,
    openAiMayDetermineDoctrine: false,
  };
}

/**
 * Deterministic user-facing lesson markdown (no OpenAI).
 */
function renderLessonMarkdown(lesson = {}, packet = null) {
  const p = packet || buildVerifiedLessonPacket(lesson);
  const blocks = p.scriptureBlocks || [];
  const lines = [];
  lines.push(`## Topic`);
  lines.push('');
  lines.push(String(p.topic?.lessonTitle || p.topic?.normalizedTopic || 'Lesson'));
  lines.push('');
  lines.push(`## What the Scriptures show`);
  lines.push('');
  lines.push(
    lesson.lessonSummary ||
      `These passages are gathered for a Scripture-first study of ${p.topic?.normalizedTopic || 'the topic'}.`,
  );
  lines.push('');
  lines.push(`## Read these passages together`);
  lines.push('');
  blocks.forEach((b, i) => {
    lines.push(`### ${i + 1}. ${titleCaseRole(b.role)}`);
    lines.push('');
    lines.push(`**${b.displayReference || b.reference}** (King James Version)`);
    lines.push('');
    lines.push(`> ${b.text}`);
    lines.push('');
    if (b.roleExplanation) {
      lines.push(b.roleExplanation);
      lines.push('');
    }
  });
  lines.push(`## How the passages connect`);
  lines.push('');
  (p.connections || []).slice(0, 8).forEach((c) => {
    lines.push(`- ${c.sentence}`);
  });
  lines.push('');
  lines.push(`## Historical context`);
  lines.push('');
  if ((p.historicalEvidence || []).length) {
    p.historicalEvidence.forEach((h) => {
      lines.push(`- [${h.status}] ${h.note} — ${h.attribution}`);
    });
  } else {
    lines.push('No historical notes attached for this candidate lesson.');
  }
  lines.push('');
  lines.push(`## Hebrew or Greek context`);
  lines.push('');
  lines.push('Not attached in this dry-run packet (languageStatus: NOT_ATTACHED).');
  lines.push('');
  lines.push(`## What remains under review`);
  lines.push('');
  lines.push(`- Doctrine status: **${p.doctrineStatus}**`);
  lines.push(`- Governance status: **${p.governanceStatus}**`);
  lines.push(`- History status: **${p.historyStatus}**`);
  lines.push(`- Teaching readiness: **${lesson.teachingReadiness}**`);
  lines.push('');
  lines.push(`## Reflection`);
  lines.push('');
  (lesson.reflectionQuestions || []).forEach((q) => lines.push(`- ${q}`));
  lines.push('');
  lines.push(`_Source reading order preserved. Recommended order is separate metadata and is not shown as a replacement._`);
  lines.push('');
  return lines.join('\n');
}

function titleCaseRole(role) {
  return String(role || 'passage')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Deterministic format validator for lesson markdown / packet-backed output.
 */
function validateLessonFormat(markdown = '', packet = null) {
  const text = String(markdown || '');
  const errors = [];
  const requireHeading = (h) => {
    if (!new RegExp(`^##\\s+${h}\\s*$`, 'mi').test(text)) errors.push(`missing_heading:${h}`);
  };
  requireHeading('Topic');
  requireHeading('What the Scriptures show');
  requireHeading('Read these passages together');
  requireHeading('How the passages connect');
  requireHeading('What remains under review');

  if (!/\(King James Version\)|KJV/i.test(text)) errors.push('missing_kjv_label');
  if (!/\*\*[^*\n]+\*\*/.test(text)) errors.push('missing_bold_verse_reference');
  if (!/^>/m.test(text)) errors.push('missing_blockquote_scripture');

  // Run-on: any paragraph > 600 chars without newline break inside prose sections
  const proseChunks = text.split(/\n\n+/);
  for (const chunk of proseChunks) {
    if (chunk.startsWith('>') || chunk.startsWith('#') || chunk.startsWith('-') || chunk.startsWith('_')) continue;
    if (chunk.length > 600) errors.push('run_on_paragraph');
  }

  if (/This doctrine is conclusively proved/i.test(text)) errors.push('doctrine_overstatement');

  // Historical claims must include status marker if Historical context has bullets with content
  const histSection = text.split(/## Historical context/i)[1]?.split(/## /)[0] || '';
  if (/Constantine|Council|AD\s*\d+/i.test(histSection) && !/\[(UNVERIFIED|Verified|Partially verified|Disputed)\]/i.test(histSection)) {
    errors.push('historical_claim_without_status');
  }

  if (packet) {
    if (packet.doctrineStatus && !text.includes(packet.doctrineStatus) && !/Doctrine status/i.test(text)) {
      errors.push('doctrine_status_not_surfaced');
    }
    for (const b of packet.scriptureBlocks || []) {
      if (b.text && !text.includes(b.text.slice(0, 40))) {
        // allow if reference present
        if (!text.toLowerCase().includes(String(b.reference).toLowerCase()) &&
            !text.toLowerCase().includes(String(b.displayReference || '').toLowerCase())) {
          errors.push(`missing_scripture_block:${b.reference}`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    repairAttempted: false,
  };
}

/**
 * One deterministic formatter repair (whitespace / ensure headings) — does not alter evidence.
 */
function repairLessonFormat(markdown = '', lesson = null, packet = null) {
  let text = String(markdown || '').replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  if (!/^## Topic/m.test(text) && lesson) {
    text = renderLessonMarkdown(lesson, packet || buildVerifiedLessonPacket(lesson));
  }
  const validation = validateLessonFormat(text, packet);
  return { markdown: text, validation: { ...validation, repairAttempted: true } };
}

module.exports = {
  LESSON_VERSION,
  PACKET_VERSION,
  DISPLAY_CONTRACT_VERSION,
  LESSON_PASSAGE_ROLES,
  assembleLessonFromStudyChain,
  buildPassageRoleDetails,
  buildVerifiedLessonPacket,
  renderLessonMarkdown,
  validateLessonFormat,
  repairLessonFormat,
  buildScriptureBlocks,
};
