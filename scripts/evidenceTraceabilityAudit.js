#!/usr/bin/env node
/**
 * Phase Zero — evidence traceability audit (retrieval + prompt structure only).
 * Does not call OpenAI. Output used by BibleAuthorityTraceabilityAudit.md
 */
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { retrieveEvidenceCards, resolveCardIds } = require('../services/evidenceCards');
const { getScriptureChain } = require('../services/scriptureChainExpansion');
const { buildApprovedCatalogEvidence, collectApprovedReferences } = require('../services/approvedCatalogEvidence');
const { classifyCurrentMessageIntent } = require('../services/currentMessageIntent');
const { validateBibleOnlyAuthority } = require('../services/bibleOnlyAuthorityValidator');
const { validateReasonFirstReply } = require('../services/doctrineBoundaryValidator');
const { slimEvidencePackForComposer } = require('../services/evidencePackSlimmer');

const TESTS = [
  { id: 't01', message: 'What is the third heaven?' },
  { id: 't02', message: 'What does Logos mean?' },
  { id: 't03', message: 'What does holy mean?' },
  { id: 't04', message: 'Does Acts 10 make pork clean?' },
  { id: 't05', message: 'How do we keep the Sabbath holy?' },
  { id: 't06', message: 'What happens when we die?' },
  { id: 't07', message: 'What is the kingdom of God?' },
];

// Simulated drift replies for validator-only trace (not OpenAI output)
const SIMULATED_REPLIES = {
  t01: 'Believers go to the third heaven when they die. Paul was caught up in 2 Corinthians 12:2, which shows our final destination is the third heaven.',
  t02: 'Logos means the Word. In John 1:1 the Word was with God and was God — one and only Son made flesh.',
  t03: 'Holy means set apart for God. The Sabbath is holy in Exodus 20:8-11.',
  t04: 'Yes, Acts 10 makes all foods clean. Peter learned that God declared all animals permissible to eat.',
  t05: 'Constantine changed the Sabbath to Sunday in AD 321. To keep Sabbath holy, rest on Sunday.',
  t06: 'When we die, we go to heaven immediately. The soul is absent from the body and present with the Lord per 2 Corinthians 5:8.',
  t07: 'The kingdom of God is in heaven where believers go after death. Matthew 6:10 mentions thy kingdom come.',
};

function getChainRefs(topic) {
  const TOPIC_TO_CHAIN = {
    sabbath: 'sabbath',
    dietary_law: 'dietaryLaw',
    heavens: 'heavensLayers',
    kingdom: 'kingdomOnEarth',
    messiah_logos: 'messiah_logos',
  };
  const key = TOPIC_TO_CHAIN[topic];
  if (!key) return [];
  return getScriptureChain(key) || [];
}

function traceTest(test) {
  const message = test.message;
  const intent = classifyCurrentMessageIntent(message);
  const pack = buildRetrievalEvidencePack({ userId: 'trace-audit', message, routingHintsOnly: true });
  const cards = retrieveEvidenceCards({ topic: pack.topic, message });
  const cardIds = resolveCardIds(pack.topic, message);
  const catalog = buildApprovedCatalogEvidence({
    topic: pack.topic,
    message,
    cardTopics: cards.map((c) => c.topic),
  });
  const approvedRefs = collectApprovedReferences(catalog, cards);
  const scriptureRefs = pack.scripture?.references || [];
  const slim = slimEvidencePackForComposer(pack);

  const promptSections = [
    'buildSystemPrompt (North Star, KJV rule, companion style)',
    'BIBLE_ONLY_AUTHORITY_INSTRUCTION (if coreRestoration)',
    'CORE_RESTORATION_INSTRUCTION',
    'COMPANION_TONE_INSTRUCTION',
    'Evidence pack JSON (slimEvidencePackForComposer)',
  ];

  const evidenceKeys = Object.keys(slim);
  const cardPayload = pack.evidenceCards?.cards || [];

  const simReply = SIMULATED_REPLIES[test.id] || '';
  const packForVal = { ...pack, userMessage: message };
  const bibleOnly = validateBibleOnlyAuthority({ reply: simReply, evidencePack: packForVal, message });
  const doctrineVal = validateReasonFirstReply({ reply: simReply, evidencePack: packForVal, historyAllowed: pack.historyAllowed });

  return {
    id: test.id,
    message,
    intent: intent.intent,
    intentReason: intent.reason,
    topic: pack.topic,
    bibleOnlyMode: pack.bibleOnlyMode,
    evidenceRetrieved: {
      cardIds,
      cardTopics: cards.map((c) => c.topic),
      catalogKeys: catalog.catalogKeys,
      catalogWired: catalog.wired,
      approvedReferenceCount: approvedRefs.length,
      approvedReferencesSample: approvedRefs.slice(0, 15),
      scriptureChainRefs: scriptureRefs.slice(0, 12),
      doctrineSnippetTopics: (pack.doctrine?.snippets || []).map((s) => s.topic),
      bindingRules: cardPayload.flatMap((c) => c.bindingRules || []),
      evidenceAuthority: pack.evidenceAuthority,
    },
    promptSections,
    evidencePackKeys: evidenceKeys,
    evidencePackBytes: Buffer.byteLength(JSON.stringify(slim), 'utf8'),
    simulatedValidator: {
      note: 'Simulated drift reply for validator coverage audit — NOT live OpenAI output',
      simulatedReply: simReply.slice(0, 200),
      bibleOnlyPassed: bibleOnly.passed,
      bibleOnlyIssues: bibleOnly.issues,
      doctrinePassed: doctrineVal.passed,
      doctrineIssues: doctrineVal.issues,
      evidenceCitation: bibleOnly.adminFindings?.evidenceCitation,
    },
    claimsExtraction: {
      status: 'NOT_IMPLEMENTED',
      note: 'No claim extractor in codebase — claims cannot be traced per-sentence',
    },
  };
}

const results = TESTS.map(traceTest);
console.log(JSON.stringify({ ranAt: new Date().toISOString(), tests: results }, null, 2));
