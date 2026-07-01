/**
 * Phase 4A — Sandbox retriever. Reads Phase 3 frozen corpus only.
 * No production paths. No doctrine generation.
 */

const fs = require('fs');
const path = require('path');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { refKey, uniqueRefs } = require('./phase3iRecursiveExpansion');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const SANDBOX_DIR = path.join(OUT_DIR, 'phase4a-sandbox');

const CORPUS_FILES = {
  traceabilityIndex: 'scripture-traceability-index.json',
  chainLibrary: 'scripture-chain-library.json',
  relationshipGraph: 'relationship-graph.json',
  observedLibrary: 'ObservedRelationshipLibrary.json',
  candidateLibrary: 'CandidateRelationshipLibrary.json',
  continuityIndex: 'genesis-to-revelation-continuity-index.json',
  inheritanceMap: 'topic-inheritance-map.json',
  questionCoverage: 'question-coverage-index.json',
  vineNetwork: 'ScriptureVineNetwork.json',
  enrichment: 'bible-wide-scripture-enrichment.json',
  deepPacks: 'deep-recovered-packs.json',
  kjvFreezeSupport: 'kjv-traceability-freeze-support.json',
  freezeAudit: 'corpus-freeze-audit.json',
  reviewQueue: 'review-queue-finalization.json',
};

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function normalizeKey(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function categorizeSection(ref = '') {
  const kjv = verifyKjvReference(ref);
  if (!kjv.valid || !kjv.book) return null;
  const book = kjv.book;
  if (book === 'genesis' || /^(exodus|leviticus|numbers|deuteronomy)$/.test(book)) return 'Torah';
  if (/^(joshua|judges|ruth|1 samuel|2 samuel|1 kings|2 kings)$/.test(book)) return 'Former Prophets';
  if (/^(isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi)$/.test(book)) return 'Latter Prophets';
  if (/^(job|psalm|psalms|proverbs|ecclesiastes|song of solomon|1 chronicles|2 chronicles|ezra|nehemiah|esther)$/.test(book)) return 'Writings';
  if (/^(matthew|mark|luke|john)$/.test(book)) return 'Gospels';
  if (book === 'acts') return 'Acts';
  if (/^(romans|1 corinthians|2 corinthians|galatians|ephesians|philippians|colossians|1 thessalonians|2 thessalonians|1 timothy|2 timothy|titus|philemon|hebrews|james|1 peter|2 peter|1 john|2 john|3 john|jude)$/.test(book)) return 'Epistles';
  if (book === 'revelation') return 'Revelation';
  return null;
}

function validRefs(refs = []) {
  return uniqueRefs(refs.filter((r) => verifyKjvReference(r).valid));
}

class SandboxBibleAuthorityRetriever {
  constructor(corpus = null) {
    this.corpus = corpus || this.loadFrozenCorpus();
    this._buildIndexes();
  }

  loadFrozenCorpus() {
    const corpus = { loadedAt: new Date().toISOString(), files: {}, missing: [] };
    for (const [key, file] of Object.entries(CORPUS_FILES)) {
      const fullPath = path.join(OUT_DIR, file);
      const data = loadJson(fullPath, null);
      if (data === null) corpus.missing.push(file);
      else corpus.files[key] = data;
    }
    corpus.loaded = corpus.missing.length === 0;
    return corpus;
  }

  _buildIndexes() {
    const c = this.corpus.files;
    this.packByTopic = new Map((c.traceabilityIndex?.packs || []).map((p) => [normalizeKey(p.topic), p]));
    this.deepByTopic = new Map((c.deepPacks?.packs || []).map((p) => [normalizeKey(p.topic), p]));
    this.enrichByTopic = new Map((c.enrichment?.packs || []).map((p) => [normalizeKey(p.topic), p]));
    this.kjvByPack = new Map((c.kjvFreezeSupport?.packs || []).map((p) => [normalizeKey(p.packId), p]));
    this.continuityByTopic = new Map((c.continuityIndex?.topics || []).map((t) => [normalizeKey(t.topic), t]));
    this.vineByTopic = new Map((c.vineNetwork?.network || []).map((n) => [n.topic, n]));
    this.inheritanceByTopic = new Map((c.inheritanceMap?.inheritance || []).map((i) => [normalizeKey(i.topic), i]));
  }

  getPackScriptures(packId) {
    const key = normalizeKey(packId);
    const trace = this.packByTopic.get(key);
    const deep = this.deepByTopic.get(key);
    const enrich = this.enrichByTopic.get(key);
    const kjv = this.kjvByPack.get(key);

    const original = validRefs([
      ...(trace?.primaryScriptures || []),
      ...(deep?.originalScriptureChain || []),
      ...(kjv?.primaryScriptures || []),
      ...(enrich?.originalScriptures || []),
    ]);

    const parallel = validRefs([
      ...(trace?.parallelScriptures || []),
      ...(deep?.parallelScriptures || []),
      ...(kjv?.parallelScriptures || []),
      ...(enrich?.parallelScriptures || []),
    ]);

    const supporting = validRefs([
      ...(trace?.supportingScriptures || []),
      ...(deep?.supportingScriptures || []),
      ...(kjv?.supportingScriptures || []),
      ...(enrich?.supportingScriptures || []),
    ]);

    const continuity = validRefs([
      ...(trace?.continuityScriptures || []),
      ...(deep?.continuityScriptures || []),
      ...(enrich?.continuityScriptures || []),
    ]);

    const genesisToRevelation = validRefs([
      ...(deep?.genesisToRevelationChain || []),
      ...original,
      ...continuity,
    ]);

    const chains = [];
    for (const chain of this.corpus.files.chainLibrary?.chains || []) {
      const matches = normalizeKey(chain.topicCandidate) === key
        || (chain.packAttachments || []).some((a) => normalizeKey(a.packId) === key);
      if (matches) chains.push({
        chainId: chain.chainId,
        scriptures: validRefs(chain.scriptures || []),
        sourceCount: chain.sourceCount,
        bookkeepingAttachment: (chain.packAttachments || []).find((a) => normalizeKey(a.packId) === key),
      });
    }

    const sections = new Set();
    for (const ref of [...original, ...continuity, ...genesisToRevelation]) {
      const s = categorizeSection(ref);
      if (s) sections.add(s);
    }

    const traceabilityTier = original.length >= 3 ? 'full'
      : original.length > 0 ? 'partial_primary'
      : supporting.length >= 3 ? 'partial_supporting_inventory'
      : 'none';

    return {
      packId,
      original,
      parallel,
      supporting,
      continuity,
      genesisToRevelation,
      chains,
      sectionsPresent: [...sections],
      traceabilityTier,
      sourceTraceability: [
        trace ? { source: 'scripture-traceability-index', topic: trace.topic, freezeSupport: trace.freezeSupport || false } : null,
        deep ? { source: 'deep-recovered-packs', topic: deep.topic } : null,
        kjv ? { source: 'kjv-traceability-freeze-support', humanReviewRequired: kjv.humanReviewRequired } : null,
        enrich ? { source: 'bible-wide-scripture-enrichment', witnessInventoryComplete: enrich.witnessInventoryComplete } : null,
      ].filter(Boolean),
    };
  }

  getObservedRelationshipsForRefs(refs = []) {
    const keys = new Set(refs.map(refKey));
    const observed = [];
    for (const rel of this.corpus.files.observedLibrary?.relationships || []) {
      const sk = refKey(rel.sourceScripture);
      const tk = refKey(rel.targetScripture);
      if (keys.has(sk) || keys.has(tk)) {
        observed.push({
          ...rel,
          supportLevel: 'observed',
          maySupportAnswer: true,
          autoDoctrine: false,
        });
      }
    }
    return observed.slice(0, 50);
  }

  getCandidateRelationshipsForTopics(topics = []) {
    const topicKeys = new Set(topics.map(normalizeKey));
    const candidates = [];
    for (const rel of this.corpus.files.candidateLibrary?.relationships || []) {
      const src = normalizeKey(rel.sourceTopic || rel.sourceScripture || '');
      const tgt = normalizeKey(rel.targetTopic || rel.targetScripture || '');
      if (topicKeys.has(src) || topicKeys.has(tgt)) {
        candidates.push({
          ...rel,
          supportLevel: 'candidate_review_only',
          maySupportAnswer: true,
          mayBecomeDoctrine: false,
          autoDoctrine: false,
          humanReviewRequired: true,
        });
      }
    }
    return candidates;
  }

  navigateVinePath(topicSequence = []) {
    const steps = [];
    for (let i = 0; i < topicSequence.length; i += 1) {
      const topic = normalizeKey(topicSequence[i]);
      const node = this.vineByTopic.get(topic) || this.vineByTopic.get(topicSequence[i]);
      const prev = i > 0 ? normalizeKey(topicSequence[i - 1]) : null;
      const next = i < topicSequence.length - 1 ? normalizeKey(topicSequence[i + 1]) : null;

      let connectedToPrev = i === 0;
      let connectedToNext = i === topicSequence.length - 1;
      if (node && prev) {
        const allLinks = [...(node.parentTopics || []), ...(node.childTopics || []), ...(node.relatedTopics || []), ...(node.continuityTopics || [])];
        connectedToPrev = allLinks.includes(prev) || normalizeKey(node.topic) === prev;
      }
      if (node && next) {
        const allLinks = [...(node.parentTopics || []), ...(node.childTopics || []), ...(node.relatedTopics || [])];
        connectedToNext = allLinks.includes(next);
      }

      steps.push({
        topic: topicSequence[i],
        nodeFound: !!node,
        connectedToPrevious: connectedToPrev,
        connectedToNext,
        pathwayNavigable: connectedToPrev && (i === topicSequence.length - 1 || connectedToNext),
      });
    }

    const fullyNavigable = steps.every((s) => s.nodeFound && s.connectedToPrevious);
    return { topicSequence, steps, fullyNavigable };
  }

  getQuestionSupport(question = '') {
    const q = normalizeKey(question);
    const matches = (this.corpus.files.questionCoverage?.questions || []).filter(
      (item) => normalizeKey(item.question).includes(q) || normalizeKey(item.lessonTitle).includes(q),
    );
    return matches.slice(0, 5);
  }

  corpusSnapshot() {
    return {
      loaded: this.corpus.loaded,
      missingFiles: this.corpus.missing,
      packCount: this.packByTopic.size,
      chainCount: (this.corpus.files.chainLibrary?.chains || []).length,
      observedCount: (this.corpus.files.observedLibrary?.relationships || []).length,
      candidateCount: (this.corpus.files.candidateLibrary?.relationships || []).length,
      vineNodeCount: (this.corpus.files.vineNetwork?.network || []).length,
      reviewQueueSize: this.corpus.files.reviewQueue?.finalReviewQueueSize,
      freezeStatus: this.corpus.files.freezeAudit?.freezeStatus,
    };
  }
}

function ensureSandboxManifests() {
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });
  const retriever = new SandboxBibleAuthorityRetriever();
  const snapshot = retriever.corpusSnapshot();

  const corpusSnapshot = {
    ranAt: new Date().toISOString(),
    phase: '3W.3-freeze-baseline',
    ...snapshot,
    artifactPaths: Object.fromEntries(
      Object.entries(CORPUS_FILES).map(([k, f]) => [k, path.join(OUT_DIR, f)]),
    ),
  };

  const freezeManifest = {
    ranAt: new Date().toISOString(),
    freezeStatus: retriever.corpus.files.freezeAudit?.freezeStatus || 'prepared',
    corpusExpandableAfterFreeze: true,
    checks: retriever.corpus.files.freezeAudit?.checks || {},
    reviewQueue: retriever.corpus.files.reviewQueue || {},
    safety: retriever.corpus.files.freezeAudit?.safety || {},
    sandboxOnly: true,
  };

  const implementationInputs = {
    ranAt: new Date().toISOString(),
    phase: '4A',
    sandboxOnly: true,
    inputs: {
      traceabilityIndex: 'scripture-traceability-index.json',
      chainLibrary: 'scripture-chain-library.json',
      relationshipGraph: 'relationship-graph.json',
      observedLibrary: 'ObservedRelationshipLibrary.json',
      candidateLibrary: 'CandidateRelationshipLibrary.json',
      continuityIndex: 'genesis-to-revelation-continuity-index.json',
      inheritanceMap: 'topic-inheritance-map.json',
      questionCoverage: 'question-coverage-index.json',
      vineNetwork: 'ScriptureVineNetwork.json',
      enrichment: 'bible-wide-scripture-enrichment.json',
      kjvFreezeSupport: 'kjv-traceability-freeze-support.json',
      reviewQueue: 'review-queue-finalization.json',
      freezeAudit: 'corpus-freeze-audit.json',
    },
    constraints: {
      noProductionDeployment: true,
      noLivePromptChanges: true,
      noDoctrineApproval: true,
      noEvidenceCardChanges: true,
      noGraphDeployment: true,
    },
  };

  fs.writeFileSync(path.join(OUT_DIR, 'Phase3CorpusSnapshot.json'), JSON.stringify(corpusSnapshot, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'Phase3CorpusFreezeManifest.json'), JSON.stringify(freezeManifest, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'Phase4ImplementationInputs.json'), JSON.stringify(implementationInputs, null, 2));

  return { corpusSnapshot, freezeManifest, implementationInputs };
}

module.exports = {
  SandboxBibleAuthorityRetriever,
  ensureSandboxManifests,
  CORPUS_FILES,
  OUT_DIR,
  SANDBOX_DIR,
};
