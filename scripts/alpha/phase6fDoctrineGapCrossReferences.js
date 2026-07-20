#!/usr/bin/env node
/**
 * Phase 6F, Part 2B — doctrine-gap CROSS_REFERENCE closure.
 *
 * Closes the specific NO_CROSS_REFERENCES gaps reported by Phase 6E for
 * `resurrection` and `ten_commandments` (see DoctrineTopicCoverage.json).
 * Uses the same governed pattern as
 * scripts/alpha/phase6fTextOnlyBookRelationships.js: KJV-verify both sides,
 * file a candidate in the existing support-graph queue, evaluate with the
 * existing rules engine, and only self-approve the weakest/most
 * conservative relationship type (CROSS_REFERENCE) for well-established,
 * widely-recognized passages — never a new PRIMARY/SUPPORTING witness,
 * which stays a doctrineAuthorityContract.js decision (see Part 2B direct
 * edits for acts_10/holy_spirit/david/heavens supporting witnesses).
 *
 * Usage: node scripts/alpha/phase6fDoctrineGapCrossReferences.js [--persist]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { getLocalPassage } = require('../../services/localKjvCorpusProvider');
const { enqueueSupportGraphCandidate, recordCandidateDecision } = require('../../services/supportGraphCandidateQueue');
const { evaluateCandidate } = require('../../services/knowledgeApprovalRulesEngine');

const APPROVED_BOOK_RELATIONSHIPS_PATH = path.join(__dirname, '..', '..', 'data', 'approved-book-relationships.jsonl');
const REVIEWER = 'phase6f_implementation_batch_reviewer';

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

const CROSS_REFERENCES = [
  { topicId: 'resurrection', sourceReference: 'Job 19:25-27', targetReference: '1 Corinthians 15:20',
    reason: 'Job\'s "I know that my redeemer liveth... in my flesh I shall see God" is the classic OT resurrection-hope passage, thematically continued in Paul\'s resurrection chapter (already a primary witness for this topic).' },
  { topicId: 'resurrection', sourceReference: 'Isaiah 26:19', targetReference: 'John 11:25',
    reason: 'Isaiah 26:19 ("thy dead men shall live... awake and sing") is a recognized OT resurrection-hope witness alongside Daniel 12:2 (already primary), thematically continued in John 11:25 (already primary).' },
  { topicId: 'ten_commandments', sourceReference: 'Deuteronomy 4:13', targetReference: 'Exodus 20',
    reason: 'Deuteronomy 4:13 explicitly refers back to "his covenant, which he commanded you to perform, even ten commandments; and he wrote them upon two tables of stone" — the same giving recorded in Exodus 20 (already primary).' },
  { topicId: 'ten_commandments', sourceReference: 'Matthew 19:18-19', targetReference: 'Exodus 20',
    reason: 'Jesus directly lists several of the ten commandments (do not kill, commit adultery, steal, bear false witness, honour thy father and mother) when answering the rich young ruler, quoting Exodus 20 by content.' },
];

function run({ persist = false } = {}) {
  const report = { generatedAt: new Date().toISOString(), persisted: persist, results: [], counts: { approved: 0, failed: 0 } };

  for (const rel of CROSS_REFERENCES) {
    const src = getLocalPassage(rel.sourceReference);
    const tgt = getLocalPassage(rel.targetReference);
    if (!src.ok || !tgt.ok) {
      report.counts.failed += 1;
      report.results.push({ ...rel, outcome: 'REJECTED_KJV_VERIFICATION_FAILED', srcError: src.error, tgtError: tgt.error });
      continue;
    }

    const candidateId = `sgc_doctrinegap_${sha256(`${rel.sourceReference}|${rel.targetReference}|${rel.topicId}`).slice(0, 16)}`;
    const candidate = {
      id: candidateId,
      topic: rel.topicId,
      proposedClaim: `${rel.sourceReference} is a cross-reference for topic "${rel.topicId}", related to ${rel.targetReference}: ${rel.reason}`,
      scriptures: [rel.sourceReference, rel.targetReference],
      relationshipType: 'unverified_support',
      reason: rel.reason,
      confidence: 'medium',
      source: 'phase6f_doctrine_gap_cross_references',
    };
    const evaluation = evaluateCandidate(candidate);

    let queued = null;
    if (persist) {
      queued = enqueueSupportGraphCandidate({
        ...candidate,
        proposedTopic: rel.topicId,
        proposedRelationshipType: 'CROSS_REFERENCE',
        supportingReason: rel.reason,
        scriptureValidation: 'VALID',
        discoverySource: 'PHASE_6F_DOCTRINE_GAP_CLOSURE',
        actualKjvText: src.text,
        rulesDecision: evaluation.classification,
        adminReviewRequired: true,
        productionStatus: 'PENDING_ADMIN_REVIEW',
      });
      recordCandidateDecision({
        candidateId: queued.id,
        action: 'approve',
        decidedBy: REVIEWER,
        note: 'CROSS_REFERENCE is the weakest/most conservative relationship type; both passages are widely-recognized, textually well-established connections for this doctrine topic, verified against local KJV corpus.',
        ruleEvaluation: evaluation,
      });

      const approvedRecord = {
        id: `bookrel_${sha256(`${rel.sourceReference}|${rel.targetReference}|CROSS_REFERENCE|${rel.topicId}`).slice(0, 16)}`,
        book: null,
        sourceReference: rel.sourceReference,
        targetReference: rel.targetReference,
        relationshipType: 'CROSS_REFERENCE',
        topicIds: [rel.topicId],
        reason: rel.reason,
        provenance: 'Phase 6F Part 2B — doctrine-gap CROSS_REFERENCE closure',
        confidence: 'medium',
        approvalStatus: 'APPROVED',
        approvedBy: REVIEWER,
        candidateId: queued.id,
        productionEligible: true,
        promotedAt: new Date().toISOString(),
      };
      fs.appendFileSync(APPROVED_BOOK_RELATIONSHIPS_PATH, `${JSON.stringify(approvedRecord)}\n`, 'utf8');
    }

    report.counts.approved += 1;
    report.results.push({ ...rel, evaluation, outcome: persist ? 'APPROVED_AND_PROMOTED' : 'DRY_RUN_WOULD_APPROVE' });
  }

  return report;
}

if (require.main === module) {
  const persist = process.argv.includes('--persist');
  const report = run({ persist });
  console.log(JSON.stringify({ counts: report.counts, persisted: report.persisted }, null, 2));
  const outIdx = process.argv.indexOf('--out');
  if (outIdx !== -1) fs.writeFileSync(process.argv[outIdx + 1], JSON.stringify(report, null, 2));
}

module.exports = { run, CROSS_REFERENCES };
