const assert = require('assert');
const { buildResourceIngestionReview } = require('../services/resourceIngestionReview');

function run() {
  const review = buildResourceIngestionReview({});

  assert.strictEqual(review.enabled, true, 'resource ingestion review must be enabled');

  for (const field of ['title', 'author_or_speaker', 'summary', 'language', 'category', 'resource_type']) {
    assert.ok(review.requiredMetadata.includes(field), `required metadata missing: ${field}`);
  }

  assert.ok(
    review.intakeWorkflow.includes('ocr_or_transcript_extraction_future'),
    'Issue #11 must explicitly preserve OCR/transcript extraction as future/not-yet-implemented ownership'
  );

  assert.strictEqual(
    review.aiReviewOutputs.approvalRecommendation,
    'human_review_required',
    'AI review must never be final authority'
  );

  assert.ok(
    review.moderationRules.includes('Do not auto-publish unreviewed materials.'),
    'unreviewed materials must not auto-publish'
  );
  assert.ok(
    review.moderationRules.includes('Require human approval before knowledge ingestion.'),
    'knowledge ingestion must remain behind human approval'
  );

  assert.strictEqual(
    review.alignmentSeverity.highRiskTeaching.action,
    'lock_from_ingestion_until_human_approval',
    'high-risk teaching must remain locked until human approval'
  );

  console.log('PASS issue11ResourceIngestionReview: metadata + future extraction ownership + human-review/no-auto-ingestion invariants');
}

if (require.main === module) run();
module.exports = { run };
