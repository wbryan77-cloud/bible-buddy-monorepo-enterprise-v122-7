#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { buildResourceIngestionReview } = require('../services/resourceIngestionReview');

function includes(list, value) {
  return Array.isArray(list) && list.includes(value);
}

function main() {
  const review = buildResourceIngestionReview({});

  assert.strictEqual(review.enabled, true, 'resource review policy must remain enabled');
  assert.ok(includes(review.acceptedResourceTypes, 'pdf_documents'), 'PDF resources must remain recognized');
  assert.ok(includes(review.acceptedResourceTypes, 'audio_transcripts'), 'transcript resources must remain recognized');

  for (const key of ['title', 'author_or_speaker', 'summary', 'language', 'category', 'resource_type']) {
    assert.ok(includes(review.requiredMetadata, key), `required metadata must include ${key}`);
  }

  assert.ok(includes(review.intakeWorkflow, 'admin_or_reviewer_review'), 'workflow must include human review');
  assert.ok(includes(review.intakeWorkflow, 'approval_or_rejection'), 'workflow must include explicit approval/rejection');
  assert.ok(includes(review.intakeWorkflow, 'future_knowledge_ingestion'), 'knowledge ingestion must remain downstream of review');

  assert.ok(includes(review.moderationRules, 'Do not auto-publish unreviewed materials.'), 'unreviewed resources must not auto-publish');
  assert.ok(includes(review.moderationRules, 'Do not treat AI review as final authority.'), 'AI review must not become final authority');
  assert.ok(includes(review.moderationRules, 'Require human approval before knowledge ingestion.'), 'human approval must remain mandatory before knowledge ingestion');
  assert.strictEqual(review.aiReviewOutputs && review.aiReviewOutputs.approvalRecommendation, 'human_review_required', 'AI output must continue to defer final approval to a human reviewer');
  assert.strictEqual(review.alignmentSeverity && review.alignmentSeverity.highRiskTeaching && review.alignmentSeverity.highRiskTeaching.action, 'lock_from_ingestion_until_human_approval', 'high-risk teaching material must stay locked until human approval');

  console.log('PASS issue11ResourceReviewGuardrails: human-review and ingestion-lock policy characterization verified');
}

main();
