/**
 * Architecture Verification & Knowledge Completion — Part 7/8 regression.
 *
 * Verifies:
 *  - the rules engine classifies a clean candidate as AUTO_APPROVE
 *  - the rules engine classifies a candidate with an invalid Scripture ref as REJECT
 *  - the rules engine classifies a candidate from an untrusted source as NEEDS_HUMAN_REVIEW
 *  - the queue + decision recording round-trips through
 *    enqueue -> readSupportGraphCandidates -> recordCandidateDecision -> status overlay
 *  - nothing in this module ever mutates approvedSupportGraph / bibleConceptGraph
 */

const assert = require('assert');
const fs = require('fs');
const {
  QUEUE_PATH,
  DECISIONS_PATH,
  enqueueSupportGraphCandidate,
  readSupportGraphCandidates,
  recordCandidateDecision,
} = require('../../services/supportGraphCandidateQueue');
const { evaluateCandidate, CLASSIFICATION } = require('../../services/knowledgeApprovalRulesEngine');
const { getAllApprovedSupportEdges } = require('../../services/approvedSupportGraph');

let failed = 0;
function report(id, pass, details) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${JSON.stringify({ id, ...details })}`);
  if (!pass) failed++;
}

const edgesBefore = JSON.stringify(getAllApprovedSupportEdges());

// 1. Clean, trusted, well-formed candidate -> AUTO_APPROVE
{
  const candidate = {
    id: `test_${Date.now()}_clean`,
    topic: 'arch_verify_test_topic_clean',
    proposedClaim: 'A brand new precept not covered by any approved edge.',
    scriptures: ['John 3:16'],
    scriptureOrder: ['John 3:16'],
    relationshipType: 'unverified_support',
    reason: 'Regression test candidate.',
    confidence: 'medium',
    source: 'support_relationship_engine',
    status: 'pending_review',
    createdAt: new Date().toISOString(),
  };
  const evaluation = evaluateCandidate(candidate);
  report('clean_trusted_candidate_auto_approve', evaluation.classification === CLASSIFICATION.AUTO_APPROVE, {
    classification: evaluation.classification,
    confidenceScore: evaluation.confidenceScore,
  });
}

// 2. Invalid Scripture reference -> REJECT
{
  const candidate = {
    id: `test_${Date.now()}_badref`,
    topic: 'arch_verify_test_topic_badref',
    proposedClaim: 'Claims a reference that cannot be parsed.',
    scriptures: ['Not A Real Reference 99:99'],
    relationshipType: 'unverified_support',
    reason: 'Regression test candidate.',
    confidence: 'low',
    source: 'support_relationship_engine',
  };
  const evaluation = evaluateCandidate(candidate);
  report('invalid_reference_reject', evaluation.classification === CLASSIFICATION.REJECT, {
    classification: evaluation.classification,
    reasons: evaluation.reasons,
  });
}

// 3. Untrusted source -> NEEDS_HUMAN_REVIEW (never auto-approved)
{
  const candidate = {
    id: `test_${Date.now()}_untrusted`,
    topic: 'arch_verify_test_topic_untrusted',
    proposedClaim: 'A claim proposed by an unverified external scraper.',
    scriptures: ['Romans 8:28'],
    relationshipType: 'unverified_support',
    reason: 'Regression test candidate.',
    confidence: 'low',
    source: 'external_youtube_scrub',
  };
  const evaluation = evaluateCandidate(candidate);
  report('untrusted_source_needs_human_review', evaluation.classification === CLASSIFICATION.NEEDS_HUMAN_REVIEW, {
    classification: evaluation.classification,
    reasons: evaluation.reasons,
  });
}

// 4. Duplicate of an already-approved edge -> REJECT (blocking rule)
{
  const candidate = {
    id: `test_${Date.now()}_duplicate`,
    topic: 'dietary_law',
    proposedClaim: 'Swine and pork are listed as unclean.',
    scriptures: ['Leviticus 11'],
    relationshipType: 'unverified_support',
    reason: 'Regression test candidate.',
    confidence: 'medium',
    source: 'support_relationship_engine',
  };
  const evaluation = evaluateCandidate(candidate);
  report('duplicate_of_approved_edge_reject', evaluation.classification === CLASSIFICATION.REJECT, {
    classification: evaluation.classification,
    reasons: evaluation.reasons,
  });
}

// 5. Full round trip: enqueue -> read -> decide -> status overlay
{
  const record = enqueueSupportGraphCandidate({
    id: `test_${Date.now()}_roundtrip`,
    topic: 'arch_verify_test_topic_roundtrip',
    proposedClaim: 'Round trip regression candidate.',
    scriptures: ['James 1:5'],
    reason: 'Regression test candidate.',
    confidence: 'medium',
    source: 'support_relationship_engine',
  });

  let candidates = readSupportGraphCandidates({ limit: 5000 });
  let found = candidates.find((c) => c.id === record.id);
  const initialStatusOk = found && found.status === 'pending_review';

  const decision = recordCandidateDecision({
    candidateId: record.id,
    action: 'approve',
    decidedBy: 'regression_test',
    note: 'Approved by architecture verification regression.',
  });

  candidates = readSupportGraphCandidates({ limit: 5000 });
  found = candidates.find((c) => c.id === record.id);
  const overlaidStatusOk = found && found.status === 'approved' && found.decision && found.decision.action === 'approve';

  report('round_trip_enqueue_read_decide_overlay', Boolean(initialStatusOk && overlaidStatusOk && decision.status === 'approved'), {
    initialStatusOk,
    overlaidStatusOk,
    decisionStatus: decision.status,
  });
}

// 6. Never mutates production doctrine/support-graph data.
{
  const edgesAfter = JSON.stringify(getAllApprovedSupportEdges());
  report('approved_support_graph_unchanged', edgesAfter === edgesBefore, {
    unchanged: edgesAfter === edgesBefore,
  });
}

console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILURE(S)`}`);
process.exit(failed === 0 ? 0 : 1);
