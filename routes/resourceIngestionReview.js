const express = require('express');
const { buildResourceIngestionReview } = require('../services/resourceIngestionReview');
const { checkAdminAuth } = require('../services/adminAuthMiddleware');

const router = express.Router();

function normalizeMetadata(body = {}) {
  const clean = {};
  for (const field of ['title', 'author_or_speaker', 'summary', 'language', 'category', 'resource_type']) {
    clean[field] = body[field] == null ? '' : String(body[field]).trim();
  }
  return clean;
}

router.get('/policy', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const review = buildResourceIngestionReview({});
  res.json({
    ok: true,
    enabled: review.enabled,
    acceptedResourceTypes: review.acceptedResourceTypes,
    requiredMetadata: review.requiredMetadata,
    intakeWorkflow: review.intakeWorkflow,
    aiReviewOutputs: review.aiReviewOutputs,
    moderationRules: review.moderationRules,
    futureIngestion: review.futureIngestion,
  });
});

router.post('/preview', (req, res) => {
  if (!checkAdminAuth(req, res)) return;

  const metadata = normalizeMetadata(req.body || {});
  const review = buildResourceIngestionReview({ metadata });
  const missingMetadata = review.requiredMetadata.filter((field) => !metadata[field]);

  // Issue #11 safety boundary: this endpoint is review-only. It performs no
  // persistence, OCR/transcript extraction, publication, promotion, or knowledge ingestion.
  res.status(missingMetadata.length ? 400 : 200).json({
    ok: missingMetadata.length === 0,
    mode: 'review_preview_only',
    metadata,
    missingMetadata,
    humanReviewRequired: review.aiReviewOutputs.approvalRecommendation === 'human_review_required',
    autoPublish: false,
    autoKnowledgeIngestion: false,
    extractionStatus: review.intakeWorkflow.includes('ocr_or_transcript_extraction_future')
      ? 'future_not_implemented'
      : 'unknown',
    severityModel: review.alignmentSeverity,
    adminReviewPacket: review.adminReviewPacket,
  });
});

module.exports = router;
