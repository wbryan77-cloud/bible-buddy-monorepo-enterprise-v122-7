function buildResourceIngestionReview(input = {}) {
  return {
    enabled: true,
    purpose: 'Review uploaded educational resources before they are added to companion knowledge systems.',
    acceptedResourceTypes: [
      'documents',
      'audio_transcripts',
      'study_notes',
      'historical_references',
      'lesson_materials',
    ],
    workflow: [
      'submission',
      'metadata_tagging',
      'admin_review',
      'approval_or_rejection',
      'future_knowledge_ingestion',
    ],
    requiredMetadata: [
      'title',
      'author',
      'summary',
      'language',
      'category',
    ],
    moderationRules: [
      'Track source origin.',
      'Allow removal of disputed materials.',
      'Keep review history.',
      'Do not auto-publish unreviewed materials.',
    ],
  };
}

module.exports = { buildResourceIngestionReview };
