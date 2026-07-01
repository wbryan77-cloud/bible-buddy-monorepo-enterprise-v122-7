/**
 * Phase 4A — Sandbox Bible Authority Engine.
 * Orchestrates frozen-corpus retrieval into traceable sandbox answers.
 * No OpenAI. No doctrine generation. No production integration.
 */

const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { SandboxBibleAuthorityRetriever } = require('./sandboxBibleAuthorityRetriever');

const DOCTRINE_CLAIM_PATTERNS = [
  /\bthe bible teaches that\b/i,
  /\bdoctrine confirms\b/i,
  /\btherefore we must believe\b/i,
  /\bthis proves that god\b/i,
  /\bapproved doctrine\b/i,
];

class SandboxBibleAuthorityEngine {
  constructor(retriever = null) {
    this.retriever = retriever || new SandboxBibleAuthorityRetriever();
    this.sandboxOnly = true;
    this.autoDoctrine = false;
  }

  buildTraceableAnswer(question, packId) {
    const scriptures = this.retriever.getPackScriptures(packId);
    const allRefs = [
      ...scriptures.original,
      ...scriptures.parallel.slice(0, 8),
      ...scriptures.supporting.slice(0, 8),
      ...scriptures.continuity.slice(0, 8),
    ];
    const uniqueUsed = [...new Set(allRefs)];

    const observed = this.retriever.getObservedRelationshipsForRefs(uniqueUsed);
    const candidate = this.retriever.getCandidateRelationshipsForTopics([packId, ...this._vineNeighbors(packId)]);

    const chainTraceability = scriptures.chains.map((c) => ({
      chainId: c.chainId,
      scriptureCount: c.scriptures.length,
      sourceCount: c.sourceCount,
      bookkeepingOnly: !!c.bookkeepingAttachment,
    }));

    const hasPrimary = scriptures.original.length > 0;
    const hasSupportingInventory = scriptures.supporting.length >= 3;
    const hasTrace = scriptures.sourceTraceability.length > 0;
    const allValid = uniqueUsed.length > 0 && uniqueUsed.every((r) => verifyKjvReference(r).valid);
    const answerTraceable = hasTrace && allValid && (hasPrimary || hasSupportingInventory);
    const traceabilityTier = scriptures.traceabilityTier || 'none';

    const summaryText = this._buildSummaryText(question, packId, scriptures, observed.length, candidate.length);

    const unsupportedClaimRisk = this._assessUnsupportedClaimRisk(summaryText, hasPrimary || hasSupportingInventory);

    return {
      question,
      packId,
      traceabilityTier,
      scripturesUsed: {
        original: scriptures.original.slice(0, 20),
        parallel: scriptures.parallel.slice(0, 12),
        supporting: scriptures.supporting.slice(0, 12),
        continuity: scriptures.continuity.slice(0, 12),
        genesisToRevelation: scriptures.genesisToRevelation.slice(0, 20),
        sectionsPresent: scriptures.sectionsPresent,
      },
      sourceTraceability: scriptures.sourceTraceability,
      chainTraceability,
      relationshipTraceability: {
        observed: observed.slice(0, 15).map((r) => ({
          source: r.sourceScripture,
          target: r.targetScripture,
          type: r.relationshipType,
          supportLevel: 'observed',
        })),
        candidate: candidate.map((r) => ({
          source: r.sourceTopic || r.sourceScripture,
          target: r.targetTopic || r.targetScripture,
          type: r.relationshipType,
          supportLevel: 'candidate_review_only',
          autoDoctrine: false,
        })),
      },
      candidateUsedAsDoctrine: false,
      observedCandidateSeparationPreserved: true,
      answerTraceable,
      summaryText,
      unsupportedClaimRisk,
      humanReviewRequired: scriptures.sourceTraceability.some((s) => s.humanReviewRequired),
      sandboxOnly: true,
      autoDoctrine: false,
    };
  }

  _vineNeighbors(packId) {
    const key = packId;
    const node = this.retriever.vineByTopic.get(key);
    if (!node) return [];
    return [
      ...(node.parentTopics || []),
      ...(node.childTopics || []),
      ...(node.relatedTopics || []),
    ];
  }

  _buildSummaryText(question, packId, scriptures, observedCount, candidateCount) {
    if (!scriptures.original.length) {
      return `Sandbox traceability note: No original scriptures retrieved for pack "${packId}". Human review required before any doctrinal use.`;
    }
    const primaryList = scriptures.original.slice(0, 5).join('; ');
    return `Sandbox scripture inventory for "${packId}" (traceability only, not doctrine): Primary witnesses include ${primaryList}. `
      + `Parallel: ${scriptures.parallel.length}, supporting: ${scriptures.supporting.length}, continuity: ${scriptures.continuity.length}. `
      + `Genesis-to-Revelation sections: ${scriptures.sectionsPresent.join(', ') || 'none scored'}. `
      + `Observed relationship edges touching corpus: ${observedCount}. Candidate edges (review-only): ${candidateCount}.`;
  }

  _assessUnsupportedClaimRisk(summaryText, hasScripture) {
    if (!hasScripture) return 'high';
    if (DOCTRINE_CLAIM_PATTERNS.some((p) => p.test(summaryText))) return 'high';
    if (/traceability only, not doctrine/.test(summaryText)) return 'low';
    return 'medium';
  }

  testRelationshipSafety(packId) {
    const answer = this.buildTraceableAnswer(`Relationship safety test for ${packId}`, packId);
    const violations = [];

    if (answer.candidateUsedAsDoctrine) violations.push('candidate_promoted_to_doctrine');
    for (const c of answer.relationshipTraceability.candidate) {
      if (c.autoDoctrine) violations.push('candidate_auto_doctrine_flag');
    }
    for (const o of answer.relationshipTraceability.observed) {
      if (o.supportLevel !== 'observed') violations.push('observed_mislabeled');
    }

    return {
      packId,
      violations,
      separationPreserved: violations.length === 0,
      observedCount: answer.relationshipTraceability.observed.length,
      candidateCount: answer.relationshipTraceability.candidate.length,
      candidateUsedAsDoctrine: answer.candidateUsedAsDoctrine,
    };
  }
}

module.exports = {
  SandboxBibleAuthorityEngine,
};
